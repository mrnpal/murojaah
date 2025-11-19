require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const CorrectionLog = require('./models/CorrectionLog');
const Room = require('./models/Room'); // Import Room
const { koreksiHafalan } = require('./services/aiService');

connectDB();
const app = express();
const server = http.createServer(app);

// --- CORS ---
const allowedOrigins = [ 'http://localhost:5173', process.env.FRONTEND_URL ];
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.use(express.json());

// --- ROUTES ---
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/rooms', require('./routes/roomRoutes')); 
app.get('/', (req, res) => res.send('API Quran Recitation is Running...'));

// --- SOCKET.IO ---
const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ["GET", "POST"] }
});

io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // 1. JOIN ROOM
  socket.on('join_room', async (roomId) => {
    try {
      const room = await Room.findOne({ roomId: roomId });
      if (!room) {
        socket.emit('room_error', 'Room tidak ditemukan');
        return;
      }
      
      socket.join(roomId);
      
      // Kirim data surah ke user yang baru join
      socket.emit('room_data', { 
        fullAyatText: room.fullAyatText,
        targetSurah: room.targetSurah
      });

      socket.to(roomId).emit('user_joined', socket.id);
      console.log(`User ${socket.id} joined room: ${roomId}`);

    } catch (error) {
      console.error("Join room error:", error);
      socket.emit('room_error', 'Gagal join room');
    }
  });

  // 2. TOGGLE REVEAL (PENTING: Ini yang hilang!)
  socket.on('admin_toggle_reveal', ({ roomId, isRevealed }) => {
    // Broadcast status 'terbuka/tertutup' ke semua orang di room
    io.to(roomId).emit('sync_ayat_reveal', isRevealed);
  });

  // 3. WebRTC & Toggles
  socket.on("callUser", (data) => { io.to(data.userToCall).emit("callUser", { signal: data.signalData, from: data.from }); });
  socket.on("answerCall", (data) => { io.to(data.to).emit("callAccepted", data.signal); });
  socket.on('camera_status', ({ roomId, status }) => { socket.to(roomId).emit('remote_camera_status', { status }); });
  socket.on('mic_status', ({ roomId, status }) => { socket.to(roomId).emit('remote_mic_status', { status }); });

  // 4. Admin Controls
  socket.on('admin_change_ayat', ({ roomId, newIndex }) => {
    io.to(roomId).emit('sync_ayat_index', newIndex);
  });
  socket.on('admin_force_repeat', ({ roomId, feedback }) => {
    io.to(roomId).emit('res_correction', feedback);
  });

  // 5. Live Transcript
  socket.on('live_transcript', ({ roomId, text }) => {
    socket.to(roomId).emit('remote_live_transcript', { text });
  });

  // 6. Koreksi AI (req_correction)
  socket.on('req_correction', async (data) => {
    const { roomId, userId, userText, targetAyatText, expectedAyatIndex } = data;
    
    try {
      const room = await Room.findOne({ roomId: roomId });
      if (!room) throw new Error(`Room ${roomId} tidak ditemukan.`);
      
      const fullSurahData = room.fullAyatText;
      if (!fullSurahData) throw new Error(`Data Surah kosong di room ${roomId}.`);
      
      const hasilKoreksi = await koreksiHafalan(
        userText, targetAyatText, expectedAyatIndex, fullSurahData
      );
      
      if (userId) {
        const log = new CorrectionLog({
          room: room._id, 
          user: userId,
          surahName: room.targetSurah,
          ayahNumber: expectedAyatIndex + 1,
          transcribedText: userText,
          aiFeedback: {
            isCorrect: hasilKoreksi.isCorrect,
            correctionMessage: hasilKoreksi.adminMessage,
            detailedAnalysis: hasilKoreksi
          }
        });
        await log.save();
        console.log(`💾 Log koreksi tersimpan untuk user ${userId}`);
      }
      
      io.to(roomId).emit('res_correction', hasilKoreksi);
      
    } catch (error) {
      console.error("AI/DB Error:", error.message);
      io.to(roomId).emit('res_correction', { 
        isCorrect: false, 
        adminMessage: "Gagal memproses (Server Error): " + error.message, 
        santriGuidance: "Error, coba lagi." 
      });
    }
  });

  // 7. Disconnect
  socket.on('disconnect', () => {
    console.log(`User Disconnected: ${socket.id}`);
    socket.broadcast.emit("callEnded");
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} 🚀`);
});