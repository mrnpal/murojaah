const admin = require('firebase-admin');
const User = require('../models/User');

// Middleware untuk cek token (Berlaku untuk semua user login)
exports.protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // 1. Verifikasi token ke Firebase
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // 2. Ambil data user dari MongoDB (buat cek role)
    const user = await User.findOne({ email: decodedToken.email });

    if (!user) {
      return res.status(404).json({ message: 'User not found in DB' });
    }

    // 3. PENTING: Tempel info user ke request
    req.user = user;
    next();

  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Middleware untuk cek role Admin
exports.adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next(); // Lolos
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};