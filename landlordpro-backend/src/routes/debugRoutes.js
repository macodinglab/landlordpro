const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// TEMPORARY DEBUG ENDPOINT - Remove after debugging
router.get('/debug/token', (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(400).json({
                success: false,
                message: 'No token provided',
                headers: req.headers
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        res.status(200).json({
            success: true,
            decoded: decoded,
            tokenPreview: token.substring(0, 50) + '...'
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
});

module.exports = router;
