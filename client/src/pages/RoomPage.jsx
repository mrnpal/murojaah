import React, { useEffect, useState, useRef, useContext } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { SocketContext } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import Peer from 'simple-peer';
import { Mic, MicOff, Video, VideoOff, Send, Hash, User, Activity, Bot, ShieldAlert, ChevronLeft, ChevronRight, Check, X } from 'lucide-react'; 
import './RoomPage.css';

// --- DATA SURAT (SAMA) ---
const SURAH_DATA = [
  { id: 1, text: "Bismillah ir-rahman ir-rahim" },
  { id: 2, text: "Alhamdu lillahi rabbil alamin" },
  { id: 3, text: "Ar rahman ir rahim" },
  { id: 4, text: "Maliki yaumid din" },
  { id: 5, text: "Iyyaka na'budu wa iyyaka nasta'in" },
  { id: 6, text: "Ihdinas siratal mustaqim" },
  { id: 7, text: "Siratal lazina an'amta alaihim ghairil maghdubi alaihim walad dallin" },
];

const RoomPage = () => {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role'); 

  const { socket, me } = useContext(SocketContext);
  const { currentUser } = useAuth();
  const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();

  // --- STATE ---
  const [currentIndex, setCurrentIndex] = useState(0); 
  const [isFinished, setIsFinished] = useState(false); 
  const [aiFeedback, setAiFeedback] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [score, setScore] = useState({ correct: 0, incorrect: 0 });
  
  const [stream, setStream] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true); 
  const [isRemoteCameraOn, setIsRemoteCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);       
  const [isRemoteMicOn, setIsRemoteMicOn] = useState(true); 
  const [remoteTranscript, setRemoteTranscript] = useState("");

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();
  const streamRef = useRef();

  // --- (LOGIKA useEffect SAMA SEMUA, TIDAK BERUBAH) ---
  useEffect(() => {
    if (role === 'user' && listening && transcript && !isProcessing) {
      const silenceTimer = setTimeout(() => handleKoreksi(transcript), 1500); 
      return () => clearTimeout(silenceTimer);
    }
  }, [transcript, listening, role, isProcessing]);

  useEffect(() => {
    if (role === 'user' && socket) socket.emit('live_transcript', { roomId, text: transcript });
  }, [transcript, role, socket, roomId]);

  useEffect(() => {
    if (socket) {
      socket.on('remote_live_transcript', ({ text }) => setRemoteTranscript(text));
      return () => socket.off('remote_live_transcript');
    }
  }, [socket]);

  useEffect(() => {
    if (myVideo.current && stream) myVideo.current.srcObject = stream;
  }, [isCameraOn, stream]);

  useEffect(() => {
    if (socket) {
      socket.on('sync_ayat_index', (newIndex) => {
        setCurrentIndex(newIndex);
        if (newIndex >= SURAH_DATA.length) setIsFinished(true);
        else setIsFinished(false);
        setAiFeedback(null);
        if (role === 'user') resetTranscript();
      });
      return () => socket.off('sync_ayat_index');
    }
  }, [socket, role, resetTranscript]);

  useEffect(() => {
    if (aiFeedback && !aiFeedback.isCorrect) {
      setScore(s => ({ ...s, incorrect: s.incorrect + 1 }));
    }
  }, [aiFeedback]);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((currentStream) => {
        setStream(currentStream);
        streamRef.current = currentStream;
        if (myVideo.current) myVideo.current.srcObject = currentStream;
        setupSocketListeners(currentStream);
      }).catch(err => console.error("Gagal akses kamera:", err));
    return () => { if (socket) { /* ... cleanup listeners ... */ } };
  }, [socket, roomId]);

  const setupSocketListeners = (currentStream) => {
    if (!socket) return;
    socket.off('user_joined'); socket.off('callUser'); socket.off('callAccepted'); 
    socket.off('res_correction'); socket.off('remote_camera_status'); socket.off('remote_mic_status');
    socket.off('sync_ayat_index');
    
    socket.emit('join_room', roomId);
    socket.emit('camera_status', { roomId, status: true });
    socket.emit('mic_status', { roomId, status: true });

    socket.on('user_joined', (userId) => callUser(userId, currentStream));
    socket.on("callUser", (data) => answerCall(data, currentStream));
    socket.on("callAccepted", (signal) => { setCallAccepted(true); connectionRef.current.signal(signal); });
    socket.on('res_correction', (data) => { setAiFeedback(data); setIsProcessing(false); });
    socket.on('remote_camera_status', ({ status }) => setIsRemoteCameraOn(status));
    socket.on('remote_mic_status', ({ status }) => setIsRemoteMicOn(status));
    socket.on('sync_ayat_index', (newIndex) => {
        setCurrentIndex(newIndex);
        if (newIndex >= SURAH_DATA.length) setIsFinished(true);
        else setIsFinished(false);
        setAiFeedback(null);
        if (role === 'user') resetTranscript();
      });
  };

  const callUser = (id, stream) => {
    const peer = new Peer({ initiator: true, trickle: false, stream });
    peer.on("signal", data => socket.emit("callUser", { userToCall: id, signalData: data, from: me }));
    peer.on("stream", remote => { if (userVideo.current) userVideo.current.srcObject = remote; setIsRemoteCameraOn(true); setIsRemoteMicOn(true); });
    socket.on("callAccepted", signal => { setCallAccepted(true); peer.signal(signal); });
    connectionRef.current = peer;
  };

  const answerCall = (data, stream) => {
    setCallAccepted(true);
    const peer = new Peer({ initiator: false, trickle: false, stream });
    peer.on("signal", signal => socket.emit("answerCall", { signal, to: data.from }));
    peer.on("stream", remote => { if (userVideo.current) userVideo.current.srcObject = remote; setIsRemoteCameraOn(true); setIsRemoteMicOn(true); });
    peer.signal(data.signal);
    connectionRef.current = peer;
  };

  const toggleCamera = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) { videoTrack.enabled = !videoTrack.enabled; setIsCameraOn(videoTrack.enabled); socket.emit('camera_status', { roomId, status: videoTrack.enabled }); }
    }
  };

  const toggleMic = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) { audioTrack.enabled = !audioTrack.enabled; setIsMicOn(audioTrack.enabled); socket.emit('mic_status', { roomId, status: audioTrack.enabled }); }
    }
  };

  const handleKoreksi = (textOverride) => {
    if (role !== 'user') return;
    const textToSend = (typeof textOverride === 'string' && textOverride) ? textOverride : transcript;
    if (!textToSend) return;
    setIsProcessing(true); setAiFeedback(null);
    SpeechRecognition.stopListening(); 
    if (!SURAH_DATA[currentIndex]) return;
    const currentTarget = SURAH_DATA[currentIndex].text;
    socket.emit('req_correction', { roomId, userId: currentUser._id, userText: textToSend, targetAyatText: currentTarget, expectedAyatIndex: currentIndex, fullSurahData: SURAH_DATA });
  };
  
  // --- KONTROL ADMIN (Loloskan / Ulangi) ---
  const handleAdminNav = (direction) => {
    let newIndex = currentIndex + direction;
    if (newIndex < 0) newIndex = 0;
    if (newIndex >= SURAH_DATA.length) newIndex = SURAH_DATA.length; 
    
    if (direction > 0 && newIndex <= SURAH_DATA.length) {
      setScore(s => ({ ...s, correct: s.correct + 1 }));
      if(aiFeedback && !aiFeedback.isCorrect) {
        setScore(s => ({ ...s, incorrect: Math.max(0, s.incorrect - 1) }));
      }
    }
    socket.emit('admin_change_ayat', { roomId, newIndex });
  };
  
  // 🔥 FIX BUG (io.to -> socket.emit)
  const handleAdminUlangi = () => {
    setScore(s => ({ ...s, incorrect: s.incorrect + 1 }));
    // Kirim event baru ke server, biar server yang broadcast
    socket.emit('admin_force_repeat', { 
      roomId, 
      feedback: {
        isCorrect: false,
        adminMessage: "ADMIN OVERRIDE: Ustadz meminta santri mengulang.",
        santriGuidance: "Ustadz meminta Anda mengulang ayat ini."
      }
    });
  };

  if (!browserSupportsSpeechRecognition) return <div>No STT Support</div>;

  return (
    <div className="discord-container">
      
      {/* 1. MAIN STREAM AREA (KIRI) */}
      <div className="stream-area">
        
        {/* 🔥 FIX: KODE VIDEO YANG HILANG SAYA KEMBALIKAN 🔥 */}
        <div className="video-grid">
          
          {/* --- VIDEO LAWAN (ANIMATED) --- */}
          <div className="video-wrapper">
            <video 
              playsInline 
              ref={userVideo} 
              autoPlay 
              style={{ opacity: (callAccepted && isRemoteCameraOn) ? 1 : 0 }}
            />
            <div 
              className="discord-avatar" 
              style={{ 
                opacity: (callAccepted && isRemoteCameraOn) ? 0 : 1,
                zIndex: (callAccepted && isRemoteCameraOn) ? -1 : 5
              }}
            >
              <div className="avatar-circle" style={{background:'#eb459e'}}><User /></div>
              <span style={{fontSize:'14px', fontWeight:'bold'}}>
                {!callAccepted ? "Menunggu..." : (role === 'admin' ? "Santri (Cam Off)" : "Ustadz (Cam Off)")}
              </span>
            </div>
            <div className="user-tag">{role === 'admin' ? "Santri" : "Ustadz"}</div>
            {callAccepted && !isRemoteMicOn && (
                <div className="mute-indicator" style={{background:'#da373c'}}><MicOff size={20} color="white" /></div>
            )}
          </div>

          {/* --- VIDEO SAYA (ANIMATED) --- */}
          <div className="video-wrapper">
            <video 
              playsInline 
              muted 
              ref={myVideo} 
              autoPlay 
              style={{
                transform:'scaleX(-1)', 
                opacity: isCameraOn ? 1 : 0
              }} 
            />
            <div 
              className="discord-avatar"
              style={{ 
                opacity: isCameraOn ? 0 : 1,
                zIndex: isCameraOn ? -1 : 5
              }}
            >
              <div className="avatar-circle"><User /></div>
              <span style={{fontSize:'14px', fontWeight:'bold'}}>Saya ({role})</span>
            </div>
            <div className="user-tag">Saya ({role})</div>
            {!isMicOn && <div className="mute-indicator"><MicOff size={20} color="#da373c" /></div>}
          </div>

        </div>
        {/* 🔥 BATAS KODE YANG HILANG 🔥 */}


        {/* 2. FLOATING CONTROLS (SAMA) */}
        <div className="control-dock">
           <button className={`dock-btn ${!isMicOn ? 'active' : ''}`} onClick={toggleMic} title="Mute">
             {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
           </button>
           <button className={`dock-btn ${!isCameraOn ? 'active' : ''}`} onClick={toggleCamera} title="Camera">
             {isCameraOn ? <Video size={24} /> : <VideoOff size={24} />}
           </button>
           {role === 'user' && (
             <button 
               className={`dock-btn ${listening ? 'listening' : ''}`} 
               onClick={listening ? SpeechRecognition.stopListening : () => SpeechRecognition.startListening({ language: 'id-ID', continuous: true })}
               title="Rekam Hafalan"
             >
               <Activity size={24} />
             </button>
           )}
           <button className="dock-btn red-btn" onClick={() => window.location.href='/'} title="Keluar">
             <div style={{width:'16px', height:'16px', background:'#da373c', borderRadius:'2px'}}></div>
           </button>
        </div>
      </div>

      {/* 3. RIGHT SIDEBAR (DENGAN KONTROL ADMIN) */}
      <div className="sidebar-panel">
        <div className="sidebar-header">
           <div className="channel-name"><Hash size={20} color="#949ba4"/> setoran-hafalan</div>
           <span className="room-pill" style={{background: role === 'admin' ? '#da373c' : '#5865f2', color:'white'}}>
             {role === 'admin' ? 'MODE USTADZ' : 'MODE SANTRI'}
           </span>
        </div>

        <div className="sidebar-content">
          
          {/* Panel Target Ayat */}
          <div className="target-msg">
             <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
               <div className="msg-label">Target Ayat ({currentIndex + 1 > SURAH_DATA.length ? "Selesai" : `${currentIndex + 1}/${SURAH_DATA.length}`})</div>
               {/* Navigasi Ayat (Hanya Admin) */}
               {role === 'admin' && (
                 <div style={{display:'flex', gap:'5px'}}>
                   <button onClick={() => handleAdminNav(-1)} disabled={currentIndex <= 0} className="nav-btn">
                     <ChevronLeft size={16} />
                   </button>
                   <button onClick={() => handleAdminNav(1)} disabled={isFinished} className="nav-btn">
                     <ChevronRight size={16} />
                   </button>
                 </div>
               )}
             </div>
             
             <div className="msg-content">
               {isFinished ? (
                 "Shadaqallahul 'adzim"
               ) : (
                 role === 'admin' ? (
                   <span style={{fontSize:'18px', fontWeight:'bold', display:'block', marginTop:'5px'}}>
                     {SURAH_DATA[currentIndex]?.text || "Selesai"}
                   </span>
                 ) : (
                   <div style={{background:'#1e1f22', padding:'15px', borderRadius:'8px', textAlign:'center', border:'1px dashed #4e5058', marginTop:'5px'}}>
                      <div style={{filter:'blur(4px)', opacity:0.4, marginBottom:'5px'}}>بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>
                      <span style={{fontSize:'12px', color:'#949ba4', fontStyle:'italic'}}>(Bacakan Ayat ke-{currentIndex + 1})</span>
                   </div>
                 )
               )}
             </div>
          </div>
          
          {/* Panel Admin: Skor & Override */}
          {role === 'admin' && (
            <div className="admin-controls">
              <div className="scorecard">
                <div className="score-item correct">
                  <span>BENAR</span>
                  <strong>{score.correct}</strong>
                </div>
                <div className="score-item incorrect">
                  <span>SALAH</span>
                  <strong>{score.incorrect}</strong>
                </div>
              </div>
              <div className="override-buttons">
                <button className="nav-btn-manual fail" onClick={handleAdminUlangi} disabled={isFinished}><X size={16}/> Ulangi</button>
                <button className="nav-btn-manual pass" onClick={() => handleAdminNav(1)} disabled={isFinished}><Check size={16}/> Loloskan</button>
              </div>
            </div>
          )}
          
          <div style={{textAlign:'center', margin:'10px 0', color:'#585b60', fontSize:'12px', fontWeight:'bold'}}>
             AI Assistant
          </div>

          {/* AI Feedback */}
          {isProcessing && (
            <div className="chat-bubble">
              <div className="bot-avatar"><Activity size={16} color="white"/></div>
              <div className="chat-content">
                 <div className="chat-user">AI Assistant <span className="room-pill" style={{background:'#5865f2', color:'white'}}>BOT</span></div>
                 <div className="chat-text" style={{fontStyle:'italic'}}>Menganalisa bacaan...</div>
              </div>
            </div>
          )}
          {aiFeedback && (
            <div className="chat-bubble">
               <div className="bot-avatar" style={{background: aiFeedback.isCorrect ? '#23a559' : '#da373c'}}>
                 <Bot size={16} color="white"/>
               </div>
               <div className="chat-content">
                  <div className="chat-user">AI Assistant <span className="room-pill" style={{background:'#5865f2', color:'white'}}>BOT</span></div>
                  <div className="chat-text" style={{color: 'white', fontWeight:'bold', fontSize: '13px'}}>
                    {aiFeedback.adminMessage}
                  </div>
                  {aiFeedback.santriGuidance && (
                    <div className="chat-text" style={{background:'#1e1f22', padding:'8px', borderRadius:'4px', fontSize:'12px', fontFamily:'monospace'}}>
                      Saran Santri: "{aiFeedback.santriGuidance}"
                    </div>
                  )}
               </div>
            </div>
          )}
        </div>

        {/* INPUT AREA (User Disederhanakan) */}
        <div className="input-area">
           {role === 'user' ? (
             <>
               <div className="transcript-input" style={{ border: listening ? '1px solid #23a559' : '1px solid transparent', color: listening ? '#fff' : '#949ba4', transition: 'all 0.3s' }}>
                 {transcript || (listening ? "Mendengarkan... (Diam 1.5dtk untuk kirim)" : "Klik tombol gelombang...")}
               </div>
               <div style={{fontSize:'12px', color:'#949ba4', textAlign:'center', marginTop:'5px'}}>
                 <Activity size={12} style={{display:'inline', marginRight:'4px'}}/>
                 Setoran akan terkirim otomatis saat hening.
               </div>
             </>
           ) : (
             <>
               <div style={{marginBottom:'8px', fontSize:'11px', color:'#949ba4', fontWeight:'bold', textTransform:'uppercase'}}>
                 Monitor Live Santri
               </div>
               <div className="transcript-input" style={{opacity: 0.8, fontStyle:'italic', background:'#2b2d31', border:'1px dashed #4e5058'}}>
                 {remoteTranscript || "Menunggu santri bicara..."}
               </div>
             </>
           )}
        </div>
      </div>

    </div>
  );
};

export default RoomPage;