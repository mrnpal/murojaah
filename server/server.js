require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const CorrectionLog = require('./models/CorrectionLog'); // 1. IMPORT MODEL

// Initialize DB
connectDB();

const app = express();
const server = http.createServer(app);

// --- MIDDLEWARE (CORS, JSON) ---
const corsOptions = {
  // Izinkan localhost (buat development) DAN URL Vercel-mu nanti
  origin: [process.env.FRONTEND_URL, 'http://localhost:5173'], 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.use(express.json());

// --- ROUTES ---
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/rooms', require('./routes/roomRoutes')); 

app.get('/', (req, res) => {
  res.send('API Quran Recitation is Running...');
});

// --- SETUP SOCKET.IO ---
const io = new Server(server, {
  cors: { origin: "http://localhost:5173" }
});

io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit('user_joined', socket.id);
    console.log(`User ${socket.id} joined room: ${roomId}`);
  });

  socket.on("callUser", (data) => {
    console.log(`📞 Server: Menerima Call dari ${data.from} menuju ${data.userToCall}`);
    io.to(data.userToCall).emit("callUser", { 
      signal: data.signalData, 
      from: data.from 
    });
  });

  socket.on("answerCall", (data) => {
    console.log(`✅ Server: Call Diangkat oleh ${socket.id} menuju ${data.to}`);
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

  socket.on('admin_force_repeat', ({ roomId, feedback }) => {
    // Broadcast feedback ini ke semua orang di room (Admin dan User)
    io.to(roomId).emit('res_correction', feedback);
  });

  // --- 2. UPDATE LOGIKA KOREKSI ---
  socket.on('req_correction', async (data) => {
    const { 
      roomId, 
      userId, // Kita butuh ini dari client
      userText, 
      targetAyatText, 
      expectedAyatIndex 
    } = data;
    
    // (Kita ambil full surah dari controller aja biar aman)
    const { koreksiHafalan } = require('./services/aiService');
    const Room = require('./models/Room');
    const DUMMY_AL_FATIHAH_DATA = require('./controllers/roomController').DUMMY_AL_FATIHAH_DATA; // Ambil data dummy

    try {
      // Ambil data surah (dummy, nanti bisa ganti dari DB Room)
      const fullSurahData = DUMMY_AL_FATIHAH_DATA; 
      
      const hasilKoreksi = await koreksiHafalan(
        userText, 
        targetAyatText, 
        expectedAyatIndex,
        fullSurahData
      );
      
      // --- 3. SIMPAN KE DATABASE (LOGIKA BARU) ---
      if (userId) { // Hanya simpan jika user ID ada
        const log = new CorrectionLog({
          room: roomId, // Nanti kita ganti ini jadi Room Mongo ID
          user: userId,
          surahName: "Al-Fatihah", // Hardcode
          ayahNumber: expectedAyatIndex + 1,
          transcribedText: userText,
          aiFeedback: {
            isCorrect: hasilKoreksi.isCorrect,
            correctionMessage: hasilKoreksi.adminMessage, // Simpan pesan detail
            detailedAnalysis: hasilKoreksi // Simpan semua JSON
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
server.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));