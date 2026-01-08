const reportService = require('../services/reportService');

const getFinancialSummary = async (req, res) => {
    try {
        console.log('📊 getFinancialSummary called by:', req.user?.username, 'Role:', req.user?.role);
        console.log('📊 Query params:', req.query);
        console.log('📊 User object:', JSON.stringify(req.user, null, 2));
        const { startDate, endDate, propertyId } = req.query;
        const data = await reportService.getFinancialSummary({ startDate, endDate, propertyId }, req.user);
        res.json({ success: true, data });
    } catch (err) {
        console.error('❌ getFinancialSummary error:', err.message);
        console.error('❌ Full error:', err);
        const statusCode = err.message.includes('Access denied') ? 403 : 500;
        res.status(statusCode).json({ success: false, message: err.message });
    }
};

const getOccupancyStats = async (req, res) => {
    try {
        const { propertyId } = req.query;
        const data = await reportService.getOccupancyStats({ propertyId }, req.user);
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const getRentRoll = async (req, res) => {
    try {
        const { propertyId } = req.query;
        const data = await reportService.getRentRoll({ propertyId }, req.user);
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const getArrearsReport = async (req, res) => {
    try {
        const { propertyId } = req.query;
        const data = await reportService.getArrearsReport({ propertyId }, req.user);
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const getLeaseExpirations = async (req, res) => {
    try {
        const { propertyId, days } = req.query;
        const data = await reportService.getLeaseExpirations({ propertyId, days }, req.user);
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const getVacancyReport = async (req, res) => {
    try {
        const { propertyId } = req.query;
        const data = await reportService.getVacancyReport({ propertyId }, req.user);
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = {
    getFinancialSummary,
    getOccupancyStats,
    getRentRoll,
    getArrearsReport,
    getLeaseExpirations,
    getVacancyReport
};
