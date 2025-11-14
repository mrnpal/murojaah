const admin = require('firebase-admin');
const User = require('../models/User');

// --- INI PERUBAHANNYA ---
// Inisialisasi Firebase Admin di level atas
const serviceAccount = require('../config/serviceAccountKey.json');
if (!admin.apps.length) { // Cek biar gak error "sudah ada"
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
// -------------------------

// Fungsi "find or create"
exports.findOrCreateUser = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1]; 

  if (!token) {
    return res.status(401).send('Unauthorized. No token provided.');
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const { email, name, picture } = decodedToken;
    let user = await User.findOne({ email: email });

    if (user) {
      console.log('User ditemukan:', user.email, 'Role:', user.role);
      res.json(user);
    } else {
      const newUser = new User({
        email: email,
        username: name,
        avatar: picture,
        googleId: decodedToken.uid,
        role: 'user' // Default role
      });
      await newUser.save();
      console.log('User baru dibuat:', newUser.email, 'Role:', newUser.role);
      res.json(newUser);
    }
  } catch (error) {
    console.error('Error verifikasi auth:', error);
    res.status(401).send('Unauthorized. Invalid token.');
  }
};