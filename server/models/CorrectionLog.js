const mongoose = require('mongoose');

const CorrectionLogSchema = new mongoose.Schema({
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  surahName: String,
  ayahNumber: Number, // Ayat ke berapa yang sedang dibaca
  
  // Input User
  audioUrl: String, // (Opsional) Jika mau simpan rekaman suaranya di Cloud Storage
  transcribedText: {
    type: String,
    required: true, // Hasil Speech-to-Text yang didengar komputer
  },
  
  // Output Gemini AI
  aiFeedback: {
    isCorrect: {
      type: Boolean,
      required: true, // True jika bacaan benar
    },
    confidenceScore: Number, // (Opsional) seberapa yakin AI
    correctionMessage: String, // Pesan dari AI: "Anda salah di kata X, seharusnya Y"
    detailedAnalysis: mongoose.Schema.Types.Mixed // JSON mentah dari AI jika butuh detail
  },
  
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('CorrectionLog', CorrectionLogSchema);