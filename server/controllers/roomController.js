const Room = require('../models/Room');

// Data dummy (biarkan)
const DUMMY_AL_FATIHAH_DATA = [
    { number: 1, textArab: "...", textLatin: "Bismillah ir-rahman ir-rahim" },
    { number: 2, textArab: "...", textLatin: "Alhamdu lillahi rabbil alamin" },
    { number: 3, textArab: "...", textLatin: "Ar rahman ir rahim" },
    { number: 4, textArab: "...", textLatin: "Maliki yaumid din" },
    { number: 5, textArab: "...", textLatin: "Iyyaka na'budu wa iyyaka nasta'in" },
    { number: 6, textArab: "...", textLatin: "Ihdinas siratal mustaqim" },
    { number: 7, textArab: "...", textLatin: "Siratal lazina an'amta alaihim ghairil maghdubi alaihim walad dallin" },
];
// Export data dummy (biarkan)
exports.DUMMY_AL_FATIHAH_DATA = DUMMY_AL_FATIHAH_DATA;

// Fungsi createRoom (biarkan)
exports.createRoom = async (req, res) => {
  const { roomName, targetSurah } = req.body;
  const adminId = req.user._id; 

  try {
    // ... (kode create room yang sudah ada, jangan diubah) ...
    const newRoom = new Room({
      roomId: `ROOM-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      roomName: roomName || 'Setoran Room', // Pastikan roomName ada
      createdBy: adminId,
      targetSurah: targetSurah,
      targetAyat: { start: 1, end: 7 }, // Sesuaikan
      fullAyatText: DUMMY_AL_FATIHAH_DATA.map(a => ({
        number: a.number,
        textArab: a.textArab,
        textLatin: a.textLatin
      }))
    });
    await newRoom.save();
    res.status(201).json(newRoom);
  } catch (error) {
    console.error("Create room error:", error);
    res.status(500).json({ message: 'Server error' });
  }
};

// --- 🔥 FUNGSI BARU DI SINI 🔥 ---
// Mengambil semua room yang dibuat oleh admin yang sedang login
exports.getMyRooms = async (req, res) => {
  try {
    // req.user._id didapat dari middleware 'protect'
    const rooms = await Room.find({ createdBy: req.user._id }).sort({ createdAt: -1 }); // Urutkan dari terbaru
    res.json(rooms);
  } catch (error) {
    console.error("Get my rooms error:", error);
    res.status(500).json({ message: 'Server error' });
  }
};

// --- 🔥 FUNGSI BARU UNTUK SANTRI 🔥 ---
exports.getAllActiveRooms = async (req, res) => {
  try {
    // Kita cari semua room, lalu 'populate' data Ustadz-nya (ambil nama)
    const rooms = await Room.find({ isActive: true }) // Nanti kita bisa filter yg aktif aja
      .populate('createdBy', 'username') // Ambil 'username' dari model 'User'
      .sort({ createdAt: -1 }); 
      
    res.json(rooms);
  } catch (error) {
    console.error("Get all rooms error:", error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id); // req.params.id adalah Mongo _id

    if (!room) {
      return res.status(404).json({ message: 'Room tidak ditemukan' });
    }

    // Keamanan: Pastikan yang mau hapus adalah admin yang BIKIN room itu
    if (room.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Tidak diizinkan menghapus room orang lain' });
    }

    // Hapus room
    await Room.findByIdAndDelete(req.params.id);

    res.json({ message: 'Room berhasil dihapus' });
  } catch (error) {
    console.error("Delete room error:", error);
    res.status(500).json({ message: 'Server error' });
  }
};