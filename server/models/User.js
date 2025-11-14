const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  googleId: {
    type: String,
    required: true, // Karena wajib login Google
  },
  avatar: {
    type: String, // URL foto profil dari Google
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user', // Default user biasa, ubah manual di DB jadi 'admin' untuk Owner
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('User', UserSchema);