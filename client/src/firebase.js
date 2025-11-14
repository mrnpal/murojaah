import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDLAejxgZKsus98Tbq6vpm9uoZ3NokddOU",
  authDomain: "murojaah-c7ce2.firebaseapp.com",
  projectId: "murojaah-c7ce2",
  storageBucket: "murojaah-c7ce2.firebasestorage.app",
  messagingSenderId: "1004835199327",
  appId: "1:1004835199327:web:2e01b936e77301f565beea",
  measurementId: "G-0J5HPZKZR2"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);

// Ekspor service Autentikasi
export const auth = getAuth(app);