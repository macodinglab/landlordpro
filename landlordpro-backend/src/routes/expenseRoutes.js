const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { authenticate, adminOnly } = require('../middleware/authMiddleware');
const { uploadProof, processProof } = require('../utils/fileUpload');

// ✅ All routes require authentication
router.use(authenticate);

// -------------------- AGGREGATE / SUMMARY ROUTES --------------------
router.get('/expenses/summary', expenseController.getExpenseSummary);
router.get('/expenses/overdue', expenseController.getOverdueExpenses);
router.get('/expenses/entity/:entityType/:entityId', expenseController.getExpensesByEntity);

// -------------------- COLLECTION ROUTES --------------------
router.get('/expenses', expenseController.getAllExpenses);
router.post(
  '/expenses',
  uploadProof.single('proof'),
  processProof,
  expenseController.createExpense
);

// -------------------- INDIVIDUAL RESOURCE ROUTES --------------------
router.get('/expenses/:id', expenseController.getExpenseById);
router.put(
  '/expenses/:id',
  uploadProof.single('proof'),
  processProof,
  expenseController.updateExpense
);

// -------------------- FILE SERVING --------------------
router.get('/expenses/:expenseId/proof/:filename', expenseController.getProofFile);

// -------------------- ADMIN-ONLY ROUTES --------------------
router.use('/expenses', adminOnly); // All routes below are admin-only

// Soft & hard delete
router.delete('/expenses/:id', expenseController.deleteExpense);
router.delete('/expenses/:id/hard', expenseController.hardDeleteExpense);

// Restore & approve
router.patch('/expenses/:id/restore', expenseController.restoreExpense);
router.patch('/expenses/:id/approve', expenseController.approveExpense);

// Bulk operations
router.patch('/expenses/bulk/payment-status', expenseController.bulkUpdatePaymentStatus);

module.exports = router;
