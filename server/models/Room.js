const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true, // Misal: "SETORAN-001"
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Mengacu pada Admin
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true, // True = Room buka, False = Sesi selesai
  },
  targetSurah: {
    type: String,
    required: true, // Misal: "Al-Mulk"
  },
  targetAyat: {
    start: Number, // Misal: 1
    end: Number,   // Misal: 30
  },
  // Teks lengkap ayat yang akan diuji (disimpan agar tidak perlu fetch API terus)
  // Field ini nanti dikirim ke Frontend Admin saja
  fullAyatText: [
    {
      number: Number,
      textArab: String,
      textLatin: String, // Opsional, bantu admin monitor
    }
  ],
  currentParticipant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // User yang sedang ada di dalam room (opsional)
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('Room', RoomSchema);