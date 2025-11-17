const CorrectionLog = require('../models/CorrectionLog');
const Room = require('../models/Room');

// API untuk mengambil rangkuman/rapor
exports.getRoomSummary = async (req, res) => {
  try {
    // 1. Ambil ID unik room (misal: "ROOM-ABC12") dari URL
    const { roomId } = req.params; 
    // 2. Ambil ID user (dari Mongo) yang sedang login
    const userId = req.user._id;

    // 3. Cari room di database
    const room = await Room.findOne({ roomId: roomId });
    if (!room) {
      return res.status(404).json({ message: 'Room tidak ditemukan' });
    }

    // 4. Cari SEMUA log setoran milik user ini di room ini
    const logs = await CorrectionLog.find({
      room: room._id, // Pakai Mongo _id dari room
      user: userId    // Pakai Mongo _id dari user
    });

    if (logs.length === 0) {
      return res.json({
        message: 'Belum ada data setoran untuk room ini.',
        correct: 0,
        incorrect: 0,
        total: 0,
        score: 0,
        roomName: room.roomName,
        targetSurah: room.targetSurah,
      });
    }

    // 5. Hitung Skor (Kalkulator)
    let correct = 0;
    let incorrect = 0;

    logs.forEach(log => {
      if (log.aiFeedback.isCorrect) {
        correct++;
      } else {
        incorrect++;
      }
    });

    const total = logs.length;
    const score = Math.round((correct / total) * 100); // Skor 0-100

    console.log(`Rapor Dibuat: User ${userId} di Room ${roomId} - Skor: ${score}`);

    // 6. Kirim Rapor (JSON) ke frontend
    res.json({
      roomName: room.roomName,
      targetSurah: room.targetSurah,
      correct,
      incorrect,
      total,
      score,
      logs // (Opsional) kirim semua detail log
    });

  } catch (error) {
    console.error("Gagal membuat summary:", error);
    res.status(500).json({ message: 'Server error' });
  }
};