const admin = require('firebase-admin');
const User = require('../models/User');

let serviceAccount;

try {
  // --- CARA 1: Coba ambil dari file (Ini akan jalan di LOKAL kamu) ---
  serviceAccount = require('../config/serviceAccountKey.json');
  console.log("Firebase Admin: Menggunakan serviceAccountKey.json dari file.");
  
} catch (error) {
  // --- CARA 2: Ambil dari Environment Variable (Ini akan jalan di RAILWAY) ---
  console.log("File serviceAccountKey.json tidak ditemukan (ini wajar saat deploy), mencoba ambil dari Env Variable...");
  
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    // Parse string JSON dari Env Var
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    console.log("Firebase Admin: Berhasil load kunci dari Environment Variable.");
  } else {
    // Jika di deploy tapi Env Var tidak ada, matikan server
    console.error("FATAL ERROR: FIREBASE_SERVICE_ACCOUNT_JSON environment variable not set.");
    process.exit(1); 
  }
}

// Inisialisasi Firebase Admin
if (!admin.apps.length) { 
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

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