const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Daftarkan endpoint POST di /api/auth/verify
router.post('/verify', authController.findOrCreateUser);

module.exports = router;