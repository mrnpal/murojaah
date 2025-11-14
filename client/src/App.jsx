import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { auth } from './firebase'; 
import RoomPage from './pages/RoomPage';
import LoginPage from './pages/LoginPage';
import axios from 'axios';
import { X } from 'lucide-react'; // 1. Import Ikon X

// --- DashboardPage (SAMA) ---
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
  const [roomName, setRoomName] = useState("Setoran Pagi");
  const [targetSurah, setTargetSurah] = useState("Al-Fatihah");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [myRooms, setMyRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const { currentUser } = useAuth(); 
  const navigate = useNavigate();

  // Fetch rooms (SAMA)
  useEffect(() => {
    const fetchMyRooms = async () => {
      try {
        if (!auth.currentUser) throw new Error("Firebase auth not ready");
        const token = await auth.currentUser.getIdToken(); 
        const response = await axios.get(
          'http://localhost:3001/api/rooms/my-rooms',
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

  // Create room (SAMA)
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!auth.currentUser) throw new Error("Firebase auth not ready");
      const token = await auth.currentUser.getIdToken(); 
      const response = await axios.post(
        'http://localhost:3001/api/rooms/create',
        { roomName, targetSurah },
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

  // --- 🔥 FUNGSI BARU UNTUK DELETE ROOM (FRONTEND) 🔥 ---
  const handleDeleteRoom = async (roomId) => {
    // Konfirmasi dulu
    if (!window.confirm("Yakin mau hapus room ini? Data hafalan terkait akan hilang.")) {
      return;
    }

    try {
      if (!auth.currentUser) throw new Error("Firebase auth not ready");
      const token = await auth.currentUser.getIdToken();

      // Panggil API DELETE
      await axios.delete(
        `http://localhost:3001/api/rooms/${roomId}`, // Kirim Mongo _id
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update UI: Hapus room dari state 'myRooms'
      setMyRooms(myRooms.filter(room => room._id !== roomId));

    } catch (err) {
      console.error("Gagal hapus room:", err);
      setError(err.response?.data?.message || "Gagal menghapus room.");
    }
  };

  return (
    <div className="sidebar-panel" style={{ width: '100%', height: 'auto', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
      <div className="sidebar-header" style={{ justifyContent: 'center' }}>
        <h2 style={{ color: '#da373c' }}>Mode Ustadz (Admin)</h2>
      </div>
      
      {/* Form Create Room (SAMA) */}
      <form className="input-area" onSubmit={handleCreateRoom} style={{flexShrink: 0}}>
        {/* ... (Isi form sama) ... */}
        <p style={{marginTop: 0, fontWeight: 'bold'}}>Buat Room Baru:</p>
        <input 
          type="text" 
          className="transcript-input" 
          style={{background: '#1e1f22', color: 'white', border: 'none', width: '100%'}}
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          required
        />
        <select 
          className="transcript-input"
          style={{background: '#1e1f22', color: 'white', border: 'none', width: '100%', marginTop: 10}}
          value={targetSurah}
          onChange={(e) => setTargetSurah(e.target.value)}
        >
          <option value="Al-Fatihah">Al-Fatihah</option>
        </select>
        <button type="submit" className="send-btn" style={{ background: '#23a559', marginTop: 15 }} disabled={loading}>
          {loading ? 'Membuat...' : '+ Buat Room Baru'}
        </button>
        {error && <p style={{color: '#da373c', fontSize: 12, textAlign: 'center'}}>{error}</p>}
      </form>
      
      {/* --- TAMPILAN DAFTAR ROOM (UPDATED) --- */}
      <div className="sidebar-content" style={{borderTop: '1px solid #1f2023', marginTop: 10}}>
        <h3 style={{fontWeight: 'bold', color: '#dbdee1', fontSize: 14, margin: 0, marginBottom: 10}}>Room yang Sudah Dibuat:</h3>
        {loadingRooms ? (
          <p style={{color: '#949ba4', fontSize: 12}}>Memuat room...</p>
        ) : (
          myRooms.length === 0 ? (
            <p style={{color: '#949ba4', fontSize: 12}}>Belum ada room dibuat.</p>
          ) : (
            myRooms.map(room => (
              // Kita bungkus Link dan Tombol Hapus
              <div key={room._id} style={{display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center'}}>
                {/* Tombol Masuk (Link) */}
                <Link 
                  to={`/room/${room.roomId}?role=admin`} 
                  className="send-btn"
                  style={{
                    background: '#5865f2', textDecoration: 'none',
                    textAlign: 'center', flex: 1, // Bikin dia memanjang
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}
                >
                  <span>{room.roomName || room.roomId}</span>
                  <span style={{fontSize: 11, background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: 4}}>{room.targetSurah}</span>
                </Link>
                {/* Tombol Hapus (Button) */}
                <button 
                  onClick={() => handleDeleteRoom(room._id)} 
                  className="dock-btn active" // Pinjam style dock-btn
                  title="Hapus Room"
                  style={{width: 44, height: 44, borderRadius: 8}}
                >
                  <X size={20} />
                </button>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
};

// --- Komponen Dashboard Santri (SAMA) ---
const SantriDashboard = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAllRooms = async () => {
      try {
        if (!auth.currentUser) throw new Error("Firebase auth not ready");
        const token = await auth.currentUser.getIdToken();
        const response = await axios.get(
          'http://localhost:3001/api/rooms/all',
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
              style={{
                background: '#4e5058', textDecoration: 'none',
                marginBottom: '10px', textAlign: 'left',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}
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