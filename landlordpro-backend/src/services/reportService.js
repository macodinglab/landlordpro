const { Op } = require('sequelize');
const { Payment, Expense, Lease, Local, Property, Tenant } = require('../models');

/**
 * 📊 Financial Summary (Income vs Expenses)
 */
/**
 * 📊 Financial Summary (Income vs Expenses)
 */
const getFinancialSummary = async ({ startDate, endDate, propertyId }, user) => {
    // Normalize propertyId
    if (propertyId === 'null' || propertyId === 'undefined') propertyId = null;

    // SECURITY: Enforce manager access
    if (user?.role === 'manager') {
        if (propertyId) {
            // Verify ownership
            const property = await Property.findByPk(propertyId);
            if (!property || String(property.manager_id) !== String(user.id)) {
                console.log('🔒 Access Denied (Financial Summary):', {
                    propertyId,
                    propertyManagerId: property?.manager_id,
                    userId: user.id
                });
                throw new Error('Access denied: You are not assigned to this property');
            }
        }
    }

    const dateFilter = {};
    if (startDate && endDate) {
        // Ensure we cover the entire end day (set to end of day)
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter[Op.between] = [new Date(startDate), end];
    }

    // 1. Calculate Income (Payments)
    const paymentWhere = {};
    if (startDate && endDate) paymentWhere.date = dateFilter; // Use transaction date
    if (propertyId) paymentWhere.property_id = propertyId;

    // SECURITY: Filter payments by manager properties if no specific propertyId provided
    const paymentInclude = [];
    if (user?.role === 'manager') {
        paymentInclude.push({
            model: Lease,
            as: 'leaseForPayment',
            required: true,
            include: [{
                model: Local,
                as: 'local',
                required: true,
                include: [{
                    model: Property,
                    as: 'property',
                    where: { manager_id: user.id },
                    required: true
                }]
            }]
        });

        // If propertyId WAS provided, we already checked ownership above.
        // If NOT provided, the include ensures we only get payments for manager's properties.
    }

    const payments = await Payment.findAll({
        where: paymentWhere,
        include: paymentInclude,
        attributes: ['amount']
    });

    const totalIncome = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    // 2. Calculate Expenses
    const expenseWhere = {
        payment_status: 'paid' // Only count paid expenses for cash flow
    };
    if (startDate && endDate) expenseWhere.date = dateFilter;
    if (propertyId) expenseWhere.property_id = propertyId;

    // SECURITY: Filter expenses by manager
    const expenseInclude = [];
    if (user?.role === 'manager') {
        // Complex because expenses can be linked to Property directly OR Local
        expenseInclude.push(
            {
                model: Property,
                as: 'propertyForExpense',
                where: { manager_id: user.id },
                required: false // We use OR logic usually, but here let's be careful
            },
            {
                model: Local,
                as: 'localForExpense',
                include: [{
                    model: Property,
                    as: 'property',
                    where: { manager_id: user.id },
                    required: true
                }],
                required: false
            }
        );
        // Note: This naive include approach might not filter strictly "EITHER A OR B matches manager".
        // A better approach for Expense security query:
        // Filter in JS for simplicity or use complex Op.or in where clause with subqueries.
        // Given Sequelize limitations with mixed associations, let's post-filter or use where clause on top-level if possible.
        // Actually, existing expenseService uses required: user.role === 'manager' inside includes.
        // Let's replicate that structure but adapted for calculation.
    }

    // Better Expense Security Strategy: Fetch all candidates then filter if needed, OR construct strict where.
    // Since we need SUM, let's assume if user is manager, we MUST join.

    // REVISED STRATEGY for Expenses:
    // If manager, we need to ensure the expense belongs to a property they manage.
    // Expense -> Property (property_id) OR Expense -> Local -> Property.

    let expenses = await Expense.findAll({
        where: expenseWhere,
        include: [
            { model: Property, as: 'propertyForExpense', attributes: ['id', 'manager_id'] },
            {
                model: Local,
                as: 'localForExpense',
                attributes: ['id'],
                include: [{ model: Property, as: 'property', attributes: ['id', 'manager_id'] }]
            }
        ],
        attributes: ['amount', 'category', 'vat_amount']
    });

    if (user?.role === 'manager') {
        expenses = expenses.filter(e => {
            const p1 = e.propertyForExpense;
            const p2 = e.localForExpense?.property;
            return (p1 && String(p1.manager_id) === String(user.id)) || (p2 && String(p2.manager_id) === String(user.id));
        });
    }

    const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount || 0) + Number(e.vat_amount || 0), 0);

    // Group expenses by category
    const expensesByCategory = expenses.reduce((acc, curr) => {
        const cat = curr.category || 'Uncategorized';
        const amt = Number(curr.amount || 0) + Number(curr.vat_amount || 0);
        acc[cat] = (acc[cat] || 0) + amt;
        return acc;
    }, {});

    return {
        totalIncome,
        totalExpense,
        netIncome: totalIncome - totalExpense,
        expensesByCategory,
        period: { startDate, endDate }
    };
};

/**
 * 🏠 Occupancy Statistics
 */
/**
 * 🏠 Occupancy Statistics
 */
const getOccupancyStats = async ({ propertyId }, user) => {
    // Normalize propertyId
    if (propertyId === 'null' || propertyId === 'undefined') propertyId = null;

    // SECURITY: Enforce manager access
    if (user?.role === 'manager') {
        if (propertyId) {
            const property = await Property.findByPk(propertyId);
            if (!property || String(property.manager_id) !== String(user.id)) {
                throw new Error('Access denied: You are not assigned to this property');
            }
        }
    }

    const where = {};
    if (propertyId) where.property_id = propertyId;

    const include = [];
    if (user?.role === 'manager') {
        include.push({
            model: Property,
            as: 'property',
            where: { manager_id: user.id },
            required: true
        });
    }

    const locals = await Local.findAll({
        where,
        attributes: ['id', 'status'],
        include
    });

    const totalUnits = locals.length;
    const occupiedUnits = locals.filter(l => l.status === 'occupied').length;
    const vacantUnits = totalUnits - occupiedUnits;
    const occupancyRate = totalUnits ? ((occupiedUnits / totalUnits) * 100).toFixed(1) : 0;

    return {
        totalUnits,
        occupiedUnits,
        vacantUnits,
        occupancyRate: Number(occupancyRate)
    };
};

/**
 * 📜 Rent Roll (Active Lease Snapshot)
 */
/**
 * 📜 Rent Roll (Active Lease Snapshot)
 */
const getRentRoll = async ({ propertyId }, user) => {
    // Normalize propertyId
    if (propertyId === 'null' || propertyId === 'undefined') propertyId = null;

    // SECURITY checks
    if (user?.role === 'manager' && propertyId) {
        const property = await Property.findByPk(propertyId);
        if (!property || String(property.manager_id) !== String(user.id)) throw new Error('Access denied');
    }

    const include = [
        {
            model: Local,
            as: 'local',
            attributes: ['id', 'reference_code', 'property_id'],
            required: true,
            include: [
                {
                    model: Property,
                    as: 'property',
                    attributes: ['id', 'name'],
                    where: {
                        ...(propertyId ? { id: propertyId } : {}),
                        ...(user?.role === 'manager' ? { manager_id: user.id } : {})
                    },
                    required: true
                }
            ]
        },
        {
            model: Tenant,
            as: 'tenant',
            attributes: ['id', 'name', 'email', 'phone']
        }
    ];

    const leases = await Lease.findAll({
        where: { status: 'active' }, // Only active leases
        include,
        order: [['created_at', 'DESC']]
    });

    return leases.map(lease => ({
        leaseId: lease.id,
        property: lease.local?.property?.name,
        unit: lease.local?.reference_code,
        tenantName: lease.tenant?.name,
        leaseStart: lease.start_date,
        leaseEnd: lease.end_date,
        monthlyRent: Number(lease.lease_amount),
        status: lease.status
    }));
};

/**
 * ⚠️ Arrears Report (Late Payments)
 * Finds active leases that haven't paid for the current month
 */
/**
 * ⚠️ Arrears Report (Late Payments)
 * Finds active leases that haven't paid for the current month
 */
const getArrearsReport = async ({ propertyId }, user) => {
    // Normalize propertyId
    if (propertyId === 'null' || propertyId === 'undefined') propertyId = null;

    // SECURITY checks
    if (user?.role === 'manager' && propertyId) {
        const property = await Property.findByPk(propertyId);
        if (!property || String(property.manager_id) !== String(user.id)) throw new Error('Access denied');
    }

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // 1. Get all active leases
    const leaseWhere = { status: 'active' };

    const leases = await Lease.findAll({
        where: leaseWhere,
        include: [
            {
                model: Local,
                as: 'local',
                attributes: ['id', 'reference_code', 'property_id'],
                required: true,
                include: [
                    {
                        model: Property, // Ensure property filter applies if provided
                        as: 'property',
                        attributes: ['id', 'name'],
                        where: {
                            ...(propertyId ? { id: propertyId } : {}),
                            ...(user?.role === 'manager' ? { manager_id: user.id } : {})
                        },
                        required: true
                    }
                ]
            },
            {
                model: Tenant,
                as: 'tenant',
                attributes: ['id', 'name', 'email', 'phone']
            },
            {
                model: Payment,
                as: 'paymentsForLease',
                required: false, // Left join to check for existence
                attributes: ['id', 'amount', 'date', 'start_date', 'end_date'],
                where: {
                    // Check if any payment covers the current month
                    [Op.or]: [
                        {
                            start_date: { [Op.lte]: endOfMonth },
                            end_date: { [Op.gte]: startOfMonth }
                        }
                    ]
                }
            }
        ]
    });

    // Filter leases that have NO matching payments for this month
    const arrears = leases.filter(lease => lease.paymentsForLease.length === 0).map(lease => ({
        leaseId: lease.id,
        property: lease.local?.property?.name,
        unit: lease.local?.reference_code,
        tenantName: lease.tenant?.name,
        tenantPhone: lease.tenant?.phone,
        monthlyRent: Number(lease.lease_amount),
        daysLate: Math.max(0, Math.floor((today - startOfMonth) / (1000 * 60 * 60 * 24))) // Days since 1st of month
    }));

    return arrears;
};

/**
 * ⏳ Lease Expiration Forecast
 * Lists leases expiring within N days
 */
/**
 * ⏳ Lease Expiration Forecast
 * Lists leases expiring within N days
 */
const getLeaseExpirations = async ({ days = 90, propertyId }, user) => {
    // Normalize propertyId
    if (propertyId === 'null' || propertyId === 'undefined') propertyId = null;

    // SECURITY checks
    if (user?.role === 'manager' && propertyId) {
        const property = await Property.findByPk(propertyId);
        if (!property || String(property.manager_id) !== String(user.id)) throw new Error('Access denied');
    }

    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + Number(days));

    const where = {
        status: 'active',
        end_date: {
            [Op.between]: [today, futureDate]
        }
    };

    const leases = await Lease.findAll({
        where,
        order: [['end_date', 'ASC']],
        include: [
            {
                model: Local,
                as: 'local',
                attributes: ['id', 'reference_code', 'property_id'],
                required: true,
                include: [
                    {
                        model: Property,
                        as: 'property',
                        attributes: ['id', 'name'],
                        where: {
                            ...(propertyId ? { id: propertyId } : {}),
                            ...(user?.role === 'manager' ? { manager_id: user.id } : {})
                        },
                        required: true
                    }
                ]
            },
            {
                model: Tenant,
                as: 'tenant',
                attributes: ['id', 'name', 'email', 'phone']
            }
        ]
    });

    return leases.map(lease => ({
        leaseId: lease.id,
        property: lease.local?.property?.name,
        unit: lease.local?.reference_code,
        tenantName: lease.tenant?.name,
        expiryDate: lease.end_date,
        daysRemaining: Math.ceil((new Date(lease.end_date) - today) / (1000 * 60 * 60 * 24))
    }));
};

/**
 * 🏚️ Vacancy Report (List of Empty Units)
 */
const getVacancyReport = async ({ propertyId }, user) => {
    // Normalize propertyId
    if (propertyId === 'null' || propertyId === 'undefined') propertyId = null;

    // SECURITY: Enforce manager access
    if (user?.role === 'manager') {
        if (propertyId) {
            const property = await Property.findByPk(propertyId);
            if (!property || String(property.manager_id) !== String(user.id)) {
                throw new Error('Access denied: You are not assigned to this property');
            }
        }
    }

    const where = { status: 'available' }; // Only available/vacant units
    if (propertyId) where.property_id = propertyId;

    const include = [
        {
            model: Property,
            as: 'property',
            attributes: ['id', 'name', 'location'],
            required: true,
            where: user?.role === 'manager' ? { manager_id: user.id } : undefined
        }
    ];

    const vacancies = await Local.findAll({
        where,
        attributes: ['id', 'reference_code', 'size_m2', 'rent_price', 'status', 'updated_at'],
        include,
        order: [['updated_at', 'DESC']]
    });

    return vacancies.map(local => ({
        localId: local.id,
        property: local.property?.name,
        location: local.property?.location,
        unit: local.reference_code,
        size: local.size_m2,
        price: Number(local.rent_price || 0),
        status: local.status,
        daysVacant: Math.floor((new Date() - new Date(local.updated_at)) / (1000 * 60 * 60 * 24))
    }));
};

module.exports = {
    getFinancialSummary,
    getOccupancyStats,
    getRentRoll,
    getArrearsReport,
    getLeaseExpirations,
    getVacancyReport
};
