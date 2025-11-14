const axios = require('axios'); // 1. Import axios
const Room = require('../models/Room');

// --- 🔥 DATA DUMMY SUDAH DIHAPUS 🔥 ---

// --- FUNGSI BARU: Fetch data surah dari API publik ---
const fetchSurahData = async (surahNumber) => {
  try {
    // Kita ambil data teks 'imlaei' (standar) dari quran.com
    const response = await axios.get(`https://api.quran.com/api/v4/quran/verses/imlaei?chapter_number=${surahNumber}`);
    
    // Format data API agar sesuai dengan Schema 'fullAyatText' kita
    const verses = response.data.verses;
    const formattedData = verses.map(verse => {
      // Ekstrak nomor ayat dari 'verse_key', misal "1:5" -> 5
      const ayatNumber = parseInt(verse.verse_key.split(':')[1]);
      
      return {
        number: ayatNumber,
        textArab: verse.text_imlaei, // Teks Arab asli
        textLatin: `Ayat ${ayatNumber}` // Kita gak punya data latin, jadi pakai placeholder
      };
    });
    
    return formattedData;
    
  } catch (error) {
    console.error(`Gagal fetch Surah ${surahNumber}:`, error.message);
    throw new Error('Gagal mengambil data surah dari API eksternal');
  }
};


// --- FUNGSI CREATE ROOM (DI-UPGRADE) ---
exports.createRoom = async (req, res) => {
  const { roomName, targetSurah } = req.body;
  const adminId = req.user._id; 

  try {
    // 2. Terjemahkan nama surah (dari dropdown) ke nomor
    // Nanti kita akan ganti ini pakai Surah ID (1-114)
    let surahNumber;
    if (targetSurah === 'Al-Fatihah') {
      surahNumber = 1;
    } else {
      // TODO: Tambahkan surah lain
      surahNumber = 1; // Default
    }

    // 3. Ambil data ayat ASLI dari API
    const ayatData = await fetchSurahData(surahNumber);

    const newRoom = new Room({
      roomId: `ROOM-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      roomName: roomName || 'Setoran Room',
      createdBy: adminId,
      targetSurah: targetSurah, // Misal: "Al-Fatihah"
      targetAyat: {
        start: 1,
        end: ayatData.length
      },
      fullAyatText: ayatData // 4. Simpan data ASLI ke DB
    });
    
    await newRoom.save();
    res.status(201).json(newRoom);

  } catch (error) {
    console.error("Create room error:", error);
    res.status(500).json({ message: 'Server error' });
  }
};

// --- (getMyRooms, getAllActiveRooms, deleteRoom SAMA PERSIS) ---

exports.getMyRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
    res.json(rooms);
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
};

exports.getAllActiveRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ isActive: true }) 
      .populate('createdBy', 'username') 
      .sort({ createdAt: -1 }); 
    res.json(rooms);
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
};

exports.deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room tidak ditemukan' });
    if (room.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Tidak diizinkan' });
    }
    await Room.findByIdAndDelete(req.params.id);
    res.json({ message: 'Room berhasil dihapus' });
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
};