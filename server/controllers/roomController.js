const axios = require('axios'); // Pastikan axios sudah terinstall di server (npm install axios)
const Room = require('../models/Room');
const { AccessToken } = require('livekit-server-sdk');

// --- 🔥 FUNGSI BARU: Fetch data surah dari API publik ---
const fetchSurahData = async (surahNumber) => {
  try {
    console.log(`Fetching data untuk Surah #${surahNumber}...`);
    
    // 1. Ambil Teks Arab (Imlaei)
    const arabicResponse = await axios.get(`https://api.quran.com/api/v4/quran/verses/imlaei?chapter_number=${surahNumber}`);
    const arabicVerses = arabicResponse.data.verses;

    // 2. Ambil Teks Latin (Transliterasi)
    const latinResponse = await axios.get(`https://api.quran.com/api/v4/quran/verses/transliteration?chapter_number=${surahNumber}&language=en`);
    const latinVerses = latinResponse.data.verses;

    // 3. Gabungkan datanya
    const formattedData = arabicVerses.map((verse, index) => {
      const ayatNumber = parseInt(verse.verse_key.split(':')[1]);
      
      // Pastikan data latin-nya sinkron
      const latinText = latinVerses[index] ? latinVerses[index].text_transliteration : `Ayat ${ayatNumber}`;
      
      return {
        number: ayatNumber,
        textArab: verse.text_imlaei, // Teks Arab untuk Ustadz
        textLatin: latinText        // Teks Latin untuk AI
      };
    });
    
    console.log(`Fetch sukses, total ${formattedData.length} ayat.`);
    return formattedData;
    
  } catch (error) {
    console.error(`Gagal fetch Surah ${surahNumber}:`, error.message);
    throw new Error('Gagal mengambil data surah dari API eksternal');
  }
};


// --- FUNGSI CREATE ROOM (DI-UPGRADE) ---
exports.createRoom = async (req, res) => {
  // Sekarang kita terima 'surahNumber' (misal "1" atau "114")
  const { roomName, surahNumber } = req.body; 
  const adminId = req.user._id; 

  try {
    if (!roomName || !surahNumber) {
      return res.status(400).json({ message: 'Nama Room dan Surah wajib diisi' });
    }

    // 1. Ambil data ayat ASLI dari API
    const ayatData = await fetchSurahData(surahNumber);
    
    // Ambil nama Surah dari API (opsional tapi bagus)
    const surahInfo = await axios.get(`https://api.quran.com/api/v4/chapters/${surahNumber}?language=id`);
    const targetSurah = surahInfo.data.chapter.name_simple;

    const newRoom = new Room({
      roomId: `ROOM-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      roomName: roomName || 'Setoran Room',
      createdBy: adminId,
      targetSurah: targetSurah, // Misal: "Al-Fatihah"
      targetAyat: {
        start: 1,
        end: ayatData.length
      },
      fullAyatText: ayatData // 2. Simpan data ASLI ke DB
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

// --- FUNGSI LIVEKIT TOKEN (FIXED CRASH) ---
exports.getLiveKitToken = async (req, res) => {
    const { roomId } = req.params;
    const userId = req.user._id.toString();
    const username = req.user.username || req.user.email;
    const roomName = roomId; 

    try {
        if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
            // Ini seharusnya dicegah di middleware, tapi kita tambahkan lagi
            return res.status(500).json({ message: 'LiveKit API keys are not configured on the server.' });
        }
        
        // 2. TOKEN GENERATION
        const token = new AccessToken(
            process.env.LIVEKIT_API_KEY, 
            process.env.LIVEKIT_API_SECRET, 
            { identity: userId, name: username } 
        );

        token.addGrant({
            room: roomName,
            roomJoin: true,
            canPublish: true, 
            canSubscribe: true,
        });

        res.json({ token: token.toJwt() }); // 200 OK

    } catch (error) {
        // Jika ada crash di atas, kita pastikan di-log sebelum 500
        console.error("FATAL CRASH DURING TOKEN GENERATION:", error);
        res.status(500).json({ message: 'Token generation failed. Check server dependencies.' });
    }
};