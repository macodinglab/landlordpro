const { Op } = require('sequelize');
const Staff = require('../models/Staff');

// Get all staff (pagination + optional search)
async function getAllStaff({ page = 1, limit = 10, search = '', includeDeleted = false }) {
  const offset = (page - 1) * limit;

  const where = {};

  if (search) {
    const like = { [Op.iLike]: `%${search}%` };
    where[Op.or] = [
      { full_name: like },
      { email: like },
      { phone: like },
      { position: like },
      { department: like },
      { social_security_number: like },
    ];
  }

  const { rows: staff, count } = await Staff.findAndCountAll({
    where,
    limit,
    offset,
    order: [['full_name', 'ASC']],
    paranoid: !includeDeleted,
  });

  return {
    staff,
    total: count,
    totalPages: Math.ceil(count / limit),
    page,
    limit,
  };
}

// Get single staff member
async function getStaffById(id) {
  const staff = await Staff.findByPk(id, { paranoid: true });
  if (!staff) throw new Error('Staff member not found');
  return staff;
}

// Create staff member
async function createStaff(data) {
  if (!data.full_name) throw new Error('Full name is required');
  if (!data.position) throw new Error('Position is required');
  if (!data.base_salary) throw new Error('Base salary is required');
  if (!data.social_security_number) throw new Error('Social security number is required');
  if (!data.hire_date) throw new Error('Hire date is required');

  const baseSalary = Number(data.base_salary);
  const allowance = data.allowance != null ? Number(data.allowance) : 0;
  const grossSalary = baseSalary + allowance;
  const rssbContribution = baseSalary * 0.06; // 6% of base salary
  const tpr = grossSalary * 0.05; // 5% of gross salary
  const netSalary = grossSalary - rssbContribution - tpr;

  return await Staff.create({
    full_name: data.full_name,
    email: data.email || null,
    phone: data.phone || null,
    position: data.position,
    department: data.department || null,
    base_salary: baseSalary,
    allowance,
    gross_salary: grossSalary,
    rssb_contribution: rssbContribution,
    tpr,
    net_salary: netSalary,
    currency: data.currency || 'RWF',
    social_security_number: data.social_security_number,
    national_id: data.national_id || null,
    picture_url: data.picture_url || null,
    hire_date: data.hire_date,
    status: data.status || 'active',
  });
}

// Update staff member
async function updateStaff(id, data) {
  const staff = await Staff.findByPk(id, { paranoid: false });
  if (!staff || staff.deleted_at) throw new Error('Staff member not found');

  const baseSalary = data.base_salary != null ? Number(data.base_salary) : Number(staff.base_salary);
  const allowance = data.allowance != null ? Number(data.allowance) : Number(staff.allowance || 0);
  const grossSalary = baseSalary + allowance;
  const rssbContribution = baseSalary * 0.06;
  const tpr = grossSalary * 0.05; // 5% of gross salary
  const netSalary = grossSalary - rssbContribution - tpr;

  const fieldsToUpdate = {
    full_name: data.full_name ?? staff.full_name,
    email: data.email ?? staff.email,
    phone: data.phone ?? staff.phone,
    position: data.position ?? staff.position,
    department: data.department ?? staff.department,
    base_salary: baseSalary,
    allowance,
    gross_salary: grossSalary,
    rssb_contribution: rssbContribution,
    tpr,
    net_salary: netSalary,
    currency: data.currency ?? staff.currency,
    social_security_number: data.social_security_number ?? staff.social_security_number,
    national_id: data.national_id ?? staff.national_id,
    picture_url: data.picture_url ?? staff.picture_url,
    hire_date: data.hire_date ?? staff.hire_date,
    status: data.status ?? staff.status,
  };

  await staff.update(fieldsToUpdate);
  return staff;
}

// Soft delete staff member
async function deleteStaff(id) {
  const staff = await Staff.findByPk(id, { paranoid: true });
  if (!staff) throw new Error('Staff member not found');

  await staff.destroy();
  return { message: 'Staff member soft deleted successfully' };
}

// Restore staff member
async function restoreStaff(id) {
  const staff = await Staff.findByPk(id, { paranoid: false });
  if (!staff || !staff.deleted_at) throw new Error('Staff member not found or already active');

  await staff.restore();
  return staff;
}

module.exports = {
  getAllStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  restoreStaff,
};
