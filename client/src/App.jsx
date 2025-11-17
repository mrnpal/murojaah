import React, { useState, useEffect } from 'react'; // 1. Import useEffect
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { auth } from './firebase'; 
import RoomPage from './pages/RoomPage';
import LoginPage from './pages/LoginPage';
import axios from 'axios';
import { X, Loader2 } from 'lucide-react'; // Import Loader

// 1. DEFINISIKAN BASE URL API (UDAH BENER)
const rawBaseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const API_BASE_URL = rawBaseUrl.replace(/\/$/, ""); 

// --- Halaman Dashboard Utama (SAMA) ---
const DashboardPage = () => {
  const { logout, currentUser } = useAuth();
  const userRole = currentUser.role || 'user'; 
  return (
    <div className="discord-container" style={{ padding: 40, flexDirection: 'column', alignItems: 'flex-start', gap: '20px' }}>
      <h1>Dashboard</h1>
      <p style={{ color: '#dbdee1' }}>Login sebagai: <strong style={{ color: 'white' }}>{currentUser.email}</strong></p>
      {userRole === 'admin' ? <AdminDashboard /> : <SantriDashboard />}
      <button onClick={logout} style={{ background: '#da373c', border: 'none', padding: '10px 15px', borderRadius: '4px', color: 'white', cursor: 'pointer', marginTop: 'auto' }}>
        Logout
      </button>
    </div>
  );
};

// --- Komponen Dashboard Admin (UPDATED) ---
const AdminDashboard = () => {
  // State untuk form
  const [roomName, setRoomName] = useState("Setoran Pagi");
  const [surahNumber, setSurahNumber] = useState("1"); // 🔥 Ganti ke Nomor Surah
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // State untuk data
  const [myRooms, setMyRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [surahList, setSurahList] = useState([]); // 🔥 Daftar surah
  const [loadingSurahs, setLoadingSurahs] = useState(true);

  const { currentUser } = useAuth(); 
  const navigate = useNavigate();

  // --- 🔥 Fetch Daftar Surah (BARU) ---
  useEffect(() => {
    const fetchSurahList = async () => {
      try {
        const response = await axios.get('https://api.quran.com/api/v4/chapters?language=id');
        setSurahList(response.data.chapters);
        setLoadingSurahs(false);
      } catch (err) {
        setError("Gagal memuat daftar surah.");
        setLoadingSurahs(false);
      }
    };
    fetchSurahList();
  }, []);

  // Fetch rooms
  useEffect(() => {
    const fetchMyRooms = async () => {
      try {
        if (!auth.currentUser) throw new Error("Firebase auth not ready");
        const token = await auth.currentUser.getIdToken(); 
        
        // 🔥 FIX: Pakai API_BASE_URL
        const response = await axios.get(
          `${API_BASE_URL}/api/rooms/my-rooms`, 
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMyRooms(response.data);
      } catch (err) {
        setError("Gagal memuat room.");
      } finally {
        setLoadingRooms(false);
      }
    };
    if (currentUser) { fetchMyRooms(); }
  }, [currentUser]);

  // Create room
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!auth.currentUser) throw new Error("Firebase auth not ready");
      const token = await auth.currentUser.getIdToken(); 
      
      // 🔥 FIX: Pakai API_BASE_URL dan kirim 'surahNumber'
      const response = await axios.post(
        `${API_BASE_URL}/api/rooms/create`, 
        { roomName, surahNumber }, // Kirim nomor
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setLoading(false);
      const newRoom = response.data;
      setMyRooms([newRoom, ...myRooms]); 
      navigate(`/room/${newRoom.roomId}?role=admin`);
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || "Gagal membuat room.");
    }
  };

  // Delete room
  const handleDeleteRoom = async (roomId) => {
    if (!window.confirm("Yakin mau hapus room ini?")) return;
    try {
      if (!auth.currentUser) throw new Error("Firebase auth not ready");
      const token = await auth.currentUser.getIdToken();
      
      // 🔥 FIX: Pakai API_BASE_URL
      await axios.delete(
        `${API_BASE_URL}/api/rooms/${roomId}`, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMyRooms(myRooms.filter(room => room._id !== roomId));
    } catch (err) {
      setError(err.response?.data?.message || "Gagal menghapus room.");
    }
  };

  return (
    <div className="sidebar-panel" style={{ width: '100%', height: 'auto', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
      <div className="sidebar-header" style={{ justifyContent: 'center' }}>
        <h2 style={{ color: '#da373c' }}>Mode Ustadz (Admin)</h2>
      </div>
      
      {/* Form Create Room (UPDATED) */}
      <form className="input-area" onSubmit={handleCreateRoom} style={{flexShrink: 0}}>
        <p style={{marginTop: 0, fontWeight: 'bold'}}>Buat Room Baru:</p>
        <input 
          type="text" 
          className="transcript-input" 
          style={{background: '#1e1f22', color: 'white', border: 'none', width: '100%'}}
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          required
        />
        
        {/* 🔥 Dropdown Surah Asli (BARU) */}
        <label style={{fontSize: 12, color: '#949ba4', marginTop: 10}}>Target Surah</label>
        <select 
          className="transcript-input"
          style={{background: '#1e1f22', color: 'white', border: 'none', width: '100%'}}
          value={surahNumber}
          onChange={(e) => setSurahNumber(e.target.value)}
          disabled={loadingSurahs}
        >
          {loadingSurahs ? (
            <option>Memuat surah...</option>
          ) : (
            surahList.map(surah => (
              <option key={surah.id} value={surah.id}>
                {surah.id}. {surah.name_simple} ({surah.translated_name.name})
              </option>
            ))
          )}
        </select>
        
        <button type="submit" className="send-btn" style={{ background: '#23a559', marginTop: 15 }} disabled={loading || loadingSurahs}>
          {loading ? 'Membuat...' : '+ Buat Room Baru'}
        </button>
        {error && <p style={{color: '#da373c', fontSize: 12, textAlign: 'center'}}>{error}</p>}
      </form>
      
      {/* Daftar Room (SAMA) */}
      <div className="sidebar-content" style={{borderTop: '1px solid #1f2023', marginTop: 10}}>
        <h3 style={{fontWeight: 'bold', color: '#dbdee1', fontSize: 14, margin: 0, marginBottom: 10}}>Room yang Sudah Dibuat:</h3>
        {loadingRooms ? (
          <p style={{color: '#949ba4', fontSize: 12}}>Memuat room...</p>
        ) : (
          myRooms.map(room => (
            <div key={room._id} style={{display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center'}}>
              <Link to={`/room/${room.roomId}?role=admin`} className="send-btn" style={{ background: '#5865f2', textDecoration: 'none', textAlign: 'center', flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{room.roomName || room.roomId}</span>
                <span style={{fontSize: 11, background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: 4}}>{room.targetSurah}</span>
              </Link>
              <button onClick={() => handleDeleteRoom(room._id)} className="dock-btn active" title="Hapus Room" style={{width: 44, height: 44, borderRadius: 8}}><X size={20} /></button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// --- Komponen Dashboard Santri (FIXED) ---
const SantriDashboard = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAllRooms = async () => {
      try {
        if (!auth.currentUser) throw new Error("Firebase auth not ready");
        const token = await auth.currentUser.getIdToken();
        
        // 🔥 FIX: Pakai API_BASE_URL
        const response = await axios.get(
          `${API_BASE_URL}/api/rooms/all`, 
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setRooms(response.data);
      } catch (err) {
        setError("Gagal memuat room.");
      } finally {
        setLoading(false);
      }
    };
    fetchAllRooms();
  }, []);

  return (
    <div className="sidebar-panel" style={{ width: '100%', height: 'auto', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
      <div className="sidebar-header" style={{ justifyContent: 'center' }}>
        <h2 style={{ color: '#5865f2' }}>Mode Santri (User)</h2>
      </div>
      <div className="sidebar-content">
        <h3 style={{fontWeight: 'bold', color: '#dbdee1', fontSize: 14, margin: 0, marginBottom: 10}}>Daftar Room Tersedia:</h3>
        {loading ? (
          <p style={{color: '#949ba4', fontSize: 12}}>Memuat room...</p>
        ) : error ? (
          <p style={{color: '#da373c', fontSize: 12}}>{error}</p>
        ) : rooms.length === 0 ? (
          <p style={{color: '#949ba4', fontSize: 12}}>Belum ada room.</p>
        ) : (
          rooms.map(room => (
            <Link 
              to={`/room/${room.roomId}?role=user`} 
              key={room._id}
              className="send-btn"
              style={{ background: '#4e5058', textDecoration: 'none', marginBottom: '10px', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div>
                <span style={{color: 'white', fontWeight:'bold'}}>{room.roomName || room.roomId}</span>
                <span style={{fontSize: 11, color: '#949ba4', display: 'block'}}>
                  Ustadz: {room.createdBy?.username || '...'}
                </span>
              </div>
              <span style={{fontSize: 11, background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: 4, color: '#dbdee1'}}>
                {room.targetSurah}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};


// --- ProtectedRoute & App Router (SAMA) ---
function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  const { currentUser, loading } = useAuth();
  if (loading) {
    return <div className="discord-container" style={{justifyContent:'center', alignItems:'center', color:'white'}}><h1>Memuat Sesi...</h1></div>;
  }
  return (
    <Routes>
      <Route path="/login" element={ currentUser ? <Navigate to="/" replace /> : <LoginPage /> } />
      <Route path="/" element={ <ProtectedRoute><DashboardPage /></ProtectedRoute> } />
      <Route path="/room/:roomId" element={ <ProtectedRoute><RoomPage /></ProtectedRoute> } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;