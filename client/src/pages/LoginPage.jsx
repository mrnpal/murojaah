import React from 'react';
import { useAuth } from '../context/AuthContext';
import './RoomPage.css'; // Kita pinjam CSS Discord-nya

const LoginPage = () => {
  const { loginWithGoogle } = useAuth();

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
      // Gak perlu redirect, App.jsx akan handle otomatis
    } catch (error) {
      console.error("Gagal login:", error);
    }
  };

  return (
    <div className="discord-container" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      <div className="sidebar-panel" style={{ width: 400, height: 'auto' }}>
        <div className="sidebar-header" style={{ justifyContent: 'center' }}>
          <h1 className="header-title">Selamat Datang di Ngaji AI</h1>
        </div>
        <div className="input-area">
          <p style={{ color: '#949ba4', fontSize: 14 }}>
            Silakan login menggunakan akun Google Anda untuk memulai setoran hafalan.
          </p>
          <button className="send-btn" onClick={handleLogin}>
            Login dengan Google
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;