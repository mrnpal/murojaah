require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const CorrectionLog = require('./models/CorrectionLog');

// Initialize DB
connectDB();

const app = express();
const server = http.createServer(app);

// --- 🔥 FIX CORS (BACA ENV VAR) 🔥 ---
// Daftar origin yang kita izinkan
const allowedOrigins = [
  'http://localhost:5173',      // Izin untuk development lokal
  process.env.FRONTEND_URL    // Izin untuk Vercel (dari Railway Variables)
];

const corsOptions = {
  origin: function (origin, callback) {
    // Izinkan jika origin ada di daftar, atau jika origin undefined (misal: request dari Postman)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Pasang CORS untuk semua request API
app.use(cors(corsOptions));
// ------------------------------------

app.use(express.json());

// --- ROUTES ---
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/rooms', require('./routes/roomRoutes')); 

app.get('/', (req, res) => {
  res.send('API Quran Recitation is Running...');
});

// --- 🔥 FIX CORS SOCKET.IO 🔥 ---
const io = new Server(server, {
  cors: {
    origin: allowedOrigins, // Pakai daftar izin yang sama
    methods: ["GET", "POST"]
  }
});
// ----------------------------------

io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit('user_joined', socket.id);
    console.log(`User ${socket.id} joined room: ${roomId}`);
  });

  socket.on("callUser", (data) => {
    io.to(data.userToCall).emit("callUser", { 
      signal: data.signalData, 
      from: data.from 
    });
  });

  socket.on("answerCall", (data) => {
    io.to(data.to).emit("callAccepted", data.signal);
  });
  
  socket.on('camera_status', ({ roomId, status }) => {
    socket.to(roomId).emit('remote_camera_status', { status });
  });

  socket.on('mic_status', ({ roomId, status }) => {
    socket.to(roomId).emit('remote_mic_status', { status });
  });

  socket.on('admin_change_ayat', ({ roomId, newIndex }) => {
    io.to(roomId).emit('sync_ayat_index', newIndex);
  });

  socket.on('live_transcript', ({ roomId, text }) => {
    socket.to(roomId).emit('remote_live_transcript', { text });
  });

  // Event baru dari Admin "Ulangi"
  socket.on('admin_force_repeat', ({ roomId, feedback }) => {
    io.to(roomId).emit('res_correction', feedback);
  });

  socket.on('req_correction', async (data) => {
    const { 
      roomId, 
      userId, 
      userText, 
      targetAyatText, 
      expectedAyatIndex 
    } = data;
    
    const { koreksiHafalan } = require('./services/aiService');
    // NOTE: Ini masih pakai DUMMY, nanti kita harus ambil dari DB
    const DUMMY_AL_FATIHAH_DATA = require('./controllers/roomController').DUMMY_AL_FATIHAH_DATA; 

    try {
      const fullSurahData = DUMMY_AL_FATIHAH_DATA; 
      
      const hasilKoreksi = await koreksiHafalan(
        userText, 
        targetAyatText, 
        expectedAyatIndex,
        fullSurahData
      );
      
      if (userId) {
        const log = new CorrectionLog({
          room: roomId, 
          user: userId,
          surahName: "Al-Fatihah",
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
      console.error("AI Service Error:", error);
      io.to(roomId).emit('res_correction', { 
        isCorrect: false, 
        adminMessage: "Gagal memproses di server AI.", 
        santriGuidance: "Error, coba lagi." 
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(`User Disconnected: ${socket.id}`);
    socket.broadcast.emit("callEnded");
  });
});

const PORT = process.env.PORT || 3001;
// 🔥 FIX BINDING (Agar disukai Render/Railway)
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} 🚀`);
});