const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const uploadController = require('../controllers/uploadController');
const authMiddleware = require('../middleware/authMiddleware'); // Optional: Protect upload if needed

// Route: POST /api/upload
// Uses 'image' as the form field name
router.post('/', upload.single('image'), uploadController.uploadFile);

module.exports = router;
