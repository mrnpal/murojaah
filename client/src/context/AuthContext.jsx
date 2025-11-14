import React, { useContext, useState, useEffect } from 'react';
import { auth } from '../firebase'; // Import dari file firebase.js
import { 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut 
} from "firebase/auth";
import axios from 'axios'; // 1. Import axios

const AuthContext = React.createContext();

// Alamat API Backend
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/auth';

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  // currentUser SEKARANG BERISI DATA DARI MONGODB (termasuk .role)
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fungsi Login (Tetap sama)
  function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  }

  // Fungsi Logout (Sekarang juga membersihkan state)
  function logout() {
    return signOut(auth).then(() => {
      setCurrentUser(null); // Bersihkan state MongoDB user
    });
  }

  // Monitor status login (LISTENER UTAMA)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // --- BAGIAN BARU: SINKRONISASI KE BACKEND ---
        try {
          // 1. Dapatkan Token ID dari Firebase
          const token = await user.getIdToken();

          // 2. Kirim token itu ke Backend kita untuk verifikasi
          const response = await axios.post(
            `${API_URL}/verify`, 
            {}, // Body bisa kosong
            { headers: { Authorization: `Bearer ${token}` } } // Kirim di header
          );

          // 3. Simpan data user DARI MONGODB (yang ada role-nya) ke state
          console.log("Sinkronisasi sukses, data user MongoDB:", response.data);
          setCurrentUser(response.data);

        } catch (error) {
          console.error("Gagal sinkronisasi ke backend:", error);
          // Jika gagal (misal server mati), paksa logout
          signOut(auth);
        }
        
      } else {
        // User logout
        setCurrentUser(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loading, // <-- 🔥 FIX DI SINI: Tambahkan 'loading' ke value
    loginWithGoogle,
    logout
  };

  // Jangan render aplikasi sebelum status login dicek
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}