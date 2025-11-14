import React, { createContext, useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

// Ganti URL ini kalau nanti deploy (misal ke Vercel/Heroku)
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const SocketProvider = ({ children }) => {
  const [stream, setStream] = useState(null);
  const [me, setMe] = useState('');
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  
  // Ref agar socket instance tidak berubah-ubah
  const socket = useRef(null);

  useEffect(() => {
    // 1. Inisialisasi koneksi ke Backend
    socket.current = io(BACKEND_URL);

    // 2. Simpan ID socket kita sendiri (buat identitas di room)
    socket.current.on('connect', () => {
      setMe(socket.current.id);
      console.log('Terhubung ke server dengan ID:', socket.current.id);
    });

    // Cleanup saat aplikasi ditutup
    return () => {
      socket.current.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{
      socket: socket.current, // Instance socket biar bisa dipake di semua page
      me,
      stream,
      setStream,
      callAccepted,
      setCallAccepted,
      callEnded,
      setCallEnded
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export { SocketProvider, SocketContext };