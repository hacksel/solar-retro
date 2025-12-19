import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChristmasTree } from './components/ChristmasTree';
import { SnowEffect } from './components/SnowEffect';
import { FireplaceEffect } from './components/FireplaceEffect';
import type { Decoration, DecorationType } from './types';
import { EditDecorationModal } from './components/EditDecorationModal';

interface UserSession {
  nickname: string;
  mood: 'happy' | 'grumpy' | 'worried' | 'cheeky' | 'tired' | 'overwhelmed';
  moodMessage: string;
}

const MOODS = [
  { id: 'happy', label: 'Happy Elf', image: '/elf-happy.png', color: 'bg-green-500/20 border-green-500' },
  { id: 'grumpy', label: 'Grumpy Elf', image: '/elf-grumpy.png', color: 'bg-red-500/20 border-red-500' },
  { id: 'worried', label: 'Worried Elf', image: '/elf-worried.png', color: 'bg-orange-500/20 border-orange-500' },
  { id: 'cheeky', label: 'Cheeky Elf', image: '/elf-cheeky.png', color: 'bg-blue-500/20 border-blue-500' },
  { id: 'tired', label: 'Tired Elf', image: '/elf-tired.png', color: 'bg-purple-500/20 border-purple-500' },
  { id: 'overwhelmed', label: 'Overwhelmed Elf', image: '/elf-overwhelmed.png', color: 'bg-pink-500/20 border-pink-500' },
] as const;

function App() {
  const [decorations, setDecorations] = useState<Decoration[]>([]);
  const [activeType, setActiveType] = useState<DecorationType | null>(null);
  const [message, setMessage] = useState('');

  // Login State
  const [nickname, setNickname] = useState('');
  const [mood, setMood] = useState<UserSession['mood']>('happy');
  const [moodMessage, setMoodMessage] = useState('');
  const [direction, setDirection] = useState(0);

  const [connectedUsers, setConnectedUsers] = useState<UserSession[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [view, setView] = useState<'splash' | 'login' | 'summary' | 'tree'>('splash');
  // State for editing
  const [editingDecoration, setEditingDecoration] = useState<Decoration | null>(null);
  const [isTeamCollapsed, setIsTeamCollapsed] = useState(false);
  const [summaryIndex, setSummaryIndex] = useState(0);
  const [summaryDirection, setSummaryDirection] = useState(0);
  const [decoratingEnabled, setDecoratingEnabled] = useState(false);
  const [workshopEnabled, setWorkshopEnabled] = useState(false);

  useEffect(() => {
    console.log("App mounted");
    // Basic WebSocket setup
    if (view === 'login') return;

    // Load initial tree
    fetch('https://unforcible-theresa-undelaying.ngrok-free.dev/api/tree', {
      headers: {
        'ngrok-skip-browser-warning': '69420'
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setDecorations(data);
        } else {
          console.error('Expected array of decorations, got:', data);
          setDecorations([]);
        }
      })
      .catch(err => {
        console.error('Failed to fetch tree:', err);
        setDecorations([]);
      });

    const socket = new WebSocket(`wss://unforcible-theresa-undelaying.ngrok-free.dev/ws?nickname=${encodeURIComponent(nickname)}&mood=${mood}&moodMessage=${encodeURIComponent(moodMessage)}`);
    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'new_decoration') {
        setDecorations(prev => [...prev, msg.payload]);
      } else if (msg.type === 'user_list') {
        setConnectedUsers(msg.payload); // Expecting UserSession[] now
      } else if (msg.type === 'decoration_updated') {
        setDecorations(prev => prev.map(d => d.id === msg.payload.id ? msg.payload : d));
      } else if (msg.type === 'decoration_deleted') {
        setDecorations(prev => prev.filter(d => d.id !== msg.payload));
      } else if (msg.type === 'decorating_status') {
        setDecoratingEnabled(msg.payload);
      }
    };
    setWs(socket);

    return () => socket.close();
  }, [view, nickname, mood, moodMessage]); // Re-run if view changes (or login details)


  const handleDropDecoration = (type: string, x: number, y: number) => {
    if (!ws) return;
    const payload = {
      action: "create",
      decoration: {
        type: type, // Ensure type matches valid types
        position: { x, y }, // Backend expects Position struct inside Decoration? No, check backend models.
        // Backend models: Decoration struct has Position {X, Y}.
        // Go struct tags map json:"position".
        // Ensure we send correct structure.
        // Frontend 'Decoration' type: position: {x,y}.
        message,
        author: nickname,
        roomId: "default"
      }
    };

    // Slight structure fix for backend compatibility if needed?
    // Go backend: Decoration has `Position Position` json:"position".
    // Position struct has X, Y json:"x", "y".
    // So sending `decoration: { ..., position: {x, y} }` is correct.
    ws.send(JSON.stringify(payload));
    setMessage('');
    setActiveType(null);
  };

  // Map old onPlace (click) to same logic if we still allow click placement
  // But sidebar says "Drag & Drop".
  // Let's support both for accessibility or ease.
  const handleClickPlace = (x: number, y: number) => {
    // Just redirect to warning to drag? Or allow it?
    // Allow it if activeType is set.
    if (activeType) {
      handleDropDecoration(activeType, x, y);
    }
  };

  const handleMoveDecoration = (id: string, x: number, y: number) => {
    // Find orig decoration to keep other fields
    const orig = decorations.find(d => d.id === id);
    if (!orig) return;

    const payload = {
      action: "update",
      decoration: {
        ...orig,
        position: { x, y }
      }
    };
    ws?.send(JSON.stringify(payload));
  };

  const handleUpdateDecoration = (id: string, newMessage: string) => {
    const orig = decorations.find(d => d.id === id);
    if (!orig || !ws) return;

    const payload = {
      action: "update",
      decoration: {
        ...orig,
        message: newMessage
      }
    };
    ws.send(JSON.stringify(payload));
    setEditingDecoration(null);
  };

  const handleDeleteDecoration = (id: string) => {
    if (!ws) return;
    const payload = {
      action: "delete",
      decorationId: id
    };
    ws.send(JSON.stringify(payload));
    setEditingDecoration(null);
  };

  const handleClearMyDecorations = () => {
    const myDecorations = decorations.filter(d => d.author === nickname);
    if (myDecorations.length === 0) return;

    if (window.confirm(`Are you sure you want to delete all ${myDecorations.length} of your decorations?`)) {
      myDecorations.forEach(d => handleDeleteDecoration(d.id));
    }
  };

  const handleDragStart = (e: React.DragEvent, type: DecorationType) => {
    e.dataTransfer.setData("decorationType", type);
    e.dataTransfer.effectAllowed = "copy";
  };

  // Compute visible decorations based on filter
  const visibleDecorations = selectedUser
    ? decorations.filter(d => d.author === selectedUser)
    : decorations;


  // Animation variants for specific parts of the UI
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  if (view === 'splash') {
    return (
      <div className="w-full h-screen bg-[url('/room-bg.png')] bg-cover bg-center flex items-center justify-center relative overflow-hidden font-christmas text-white">
        <SnowEffect />
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

        {/* Animator Control - Top Right (only visible to Axel) */}
        {nickname === 'Axel' && (
          <div className="absolute top-6 right-6 z-20">
            <button
              onClick={() => setWorkshopEnabled(!workshopEnabled)}
              className={`px-4 py-2 rounded-full font-sans text-sm font-medium transition-all backdrop-blur-md border-2 flex items-center gap-2 ${workshopEnabled
                ? 'bg-green-500/20 border-green-500 text-green-300 hover:bg-green-500/30'
                : 'bg-red-500/20 border-red-500 text-red-300 hover:bg-red-500/30'
                }`}
            >
              {workshopEnabled ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Workshop Open
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Workshop Closed
                </>
              )}
            </button>
          </div>
        )}

        <div className="z-10 flex flex-col items-center gap-8 text-center px-6">
          {/* Main Title */}
          <div className="flex flex-col gap-3">
            <h1 className="text-5xl md:text-7xl font-bold text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.7)] animate-pulse-slow leading-tight">
              Welcome to the
            </h1>
            <h2 className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-red-500 via-green-500 to-red-500 bg-clip-text text-transparent drop-shadow-[0_0_40px_rgba(220,38,38,0.8)] animate-pulse-slow">
              Christmas Solar Retro!
            </h2>
          </div>

          {/* Decorative Elements */}
          <div className="flex items-center gap-4 text-4xl md:text-6xl">
            <span className="animate-bounce" style={{ animationDelay: '0s' }}>🎄</span>
            <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>🎁</span>
            <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>⭐</span>
            <span className="animate-bounce" style={{ animationDelay: '0.6s' }}>🎅</span>
          </div>


          {/* Enter Button */}
          <button
            onClick={() => setView('login')}
            className="mt-8 group relative px-16 py-5 bg-gradient-to-r from-red-700 via-green-600 to-red-700 rounded-full shadow-[0_0_40px_rgba(220,38,38,0.6)] transition-all hover:shadow-[0_0_60px_rgba(220,38,38,0.9)] hover:scale-110 text-2xl font-bold uppercase tracking-widest border-3 border-yellow-400/60 animate-pulse cursor-pointer"
          >
            <span className="relative z-10">Entrer dans cette rétro</span>
            <span className="absolute -top-2 -right-2 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-yellow-500"></span>
            </span>
          </button>
        </div>
      </div>
    );
  }



  if (view === 'login') {
    return (
      <div className="w-full h-screen bg-[url('/room-bg.png')] bg-cover bg-center flex items-center justify-center relative overflow-hidden font-christmas tracking-wider text-white">
        <SnowEffect />

        {/* Fullscreen Carousel Container */}
        <div className="z-10 w-full max-w-4xl flex flex-col items-center gap-4 p-4">

          {/* Header & Nickname */}
          <div className="flex flex-col items-center gap-2 w-full max-w-2xl">
            <h1 className="text-2xl md:text-4xl text-yellow-400 font-bold drop-shadow-[0_0_25px_rgba(250,204,21,0.6)] text-center animate-pulse-slow leading-tight">
              Quel Lutin Solar es tu aujourd'hui?
            </h1>
            <input
              type="text"
              placeholder="Enter your nickname..."
              className="w-full max-w-xs bg-white/10 border-b border-white/30 p-2 text-center text-lg placeholder-white/30 focus:border-yellow-400 outline-none transition-all font-sans bg-transparent"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
            />
          </div>

          {/* Huge Carousel */}
          <div className="flex items-center justify-between w-full mt-6">
            {/* Prev Button */}
            <button
              onClick={() => {
                setDirection(-1);
                const currentIndex = MOODS.findIndex(m => m.id === mood);
                const newIndex = (currentIndex - 1 + MOODS.length) % MOODS.length;
                setMood(MOODS[newIndex].id as UserSession['mood']);
              }}
              className="p-2 bg-black/40 hover:bg-black/60 text-white border border-white/20 hover:border-yellow-400 rounded-full transition-all transform hover:scale-110 z-20 backdrop-blur-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </button>

            {/* Active Mood Display - HUGE & Borderless with Slide Animation */}
            <div className="relative w-full h-[350px] flex items-center justify-center overflow-hidden">
              <AnimatePresence initial={false} custom={direction}>
                {(() => {
                  const currentMood = MOODS.find(m => m.id === mood) || MOODS[0];
                  return (
                    <motion.div
                      key={mood}
                      custom={direction}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{
                        x: { type: "spring", stiffness: 300, damping: 30 },
                        opacity: { duration: 0.2 }
                      }}
                      className="absolute flex flex-col items-center gap-2"
                    >
                      <div className="relative group cursor-pointer transition-transform hover:scale-105 duration-300">
                        {/* Glow effect matching mood color */}
                        <div className={`absolute inset-0 blur-3xl opacity-30 ${currentMood.color.replace('border-', 'bg-').split(' ')[0]}`} />
                        <img
                          src={currentMood.image}
                          alt={currentMood.label}
                          className="h-[300px] w-auto object-contain filter drop-shadow-2xl relative z-10"
                          draggable={false}
                        />
                      </div>
                      <span className="text-xl md:text-3xl font-bold text-yellow-100 tracking-[0.2em] font-christmas drop-shadow-md mt-1">
                        {currentMood.label}
                      </span>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </div>

            {/* Next Button */}
            <button
              onClick={() => {
                setDirection(1);
                const currentIndex = MOODS.findIndex(m => m.id === mood);
                const newIndex = (currentIndex + 1) % MOODS.length;
                setMood(MOODS[newIndex].id as UserSession['mood']);
              }}
              className="p-2 bg-black/40 hover:bg-black/60 text-white border border-white/20 hover:border-yellow-400 rounded-full transition-all transform hover:scale-110 z-20 backdrop-blur-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </div>

          {/* Footer Input & Button */}
          <div className="flex flex-col items-center gap-3 w-full max-w-sm">
            <input
              type="text"
              placeholder="Pourquoi ce choix en deux mots ? (Optionnel)"
              className="w-full bg-white/15 border border-white/20 rounded-full px-4 py-2 text-center text-white placeholder-gray-300 focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-sans backdrop-blur-sm transition-all hover:bg-white/20"
              value={moodMessage}
              onChange={e => setMoodMessage(e.target.value)}
            />

            <button
              onClick={() => {
                if (nickname.trim()) setView('summary');
              }}
              disabled={!nickname.trim()}
              className="group relative px-6 py-2 bg-gradient-to-r from-red-800 to-red-600 rounded-full shadow-[0_0_30px_rgba(220,38,38,0.5)] transition-all hover:shadow-[0_0_50px_rgba(220,38,38,0.7)] hover:scale-105 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
            >
              <span className="text-lg font-bold text-white tracking-widest uppercase">Enter Workshop</span>
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
              </span>
            </button>
          </div>
        </div>
      </div>
    );

  }

  if (view === 'summary') {
    return (
      <div className="w-full h-screen bg-[url('/room-bg.png')] bg-cover bg-center flex flex-col items-center justify-center relative overflow-hidden font-christmas text-white">
        <SnowEffect />
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* Animator Control - Top Right (only visible to Axel) */}
        {nickname === 'Axel' && (
          <div className="absolute top-6 right-6 z-20">
            <button
              onClick={() => {
                if (ws) {
                  ws.send(JSON.stringify({ action: 'toggle_decorating' }));
                }
              }}
              className={`px-4 py-2 rounded-full font-sans text-sm font-medium transition-all backdrop-blur-md border-2 flex items-center gap-2 ${decoratingEnabled
                ? 'bg-green-500/20 border-green-500 text-green-300 hover:bg-green-500/30'
                : 'bg-red-500/20 border-red-500 text-red-300 hover:bg-red-500/30'
                }`}
            >
              {decoratingEnabled ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Decorating Enabled
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Decorating Disabled
                </>
              )}
            </button>
          </div>
        )}

        <div className="z-10 w-full max-w-7xl p-6 flex flex-col items-center gap-6 h-full overflow-y-auto">
          <div className="flex items-center gap-4 mt-4">
            <h1 className="text-4xl md:text-6xl text-yellow-400 font-bold drop-shadow-[0_0_25px_rgba(250,204,21,0.6)] text-center animate-pulse-slow">
              The Solar Elf Team
            </h1>
            <span className="px-3 py-1 bg-green-500/20 border border-green-500/50 rounded-full text-sm font-sans text-green-300 shadow-[0_0_10px_rgba(34,197,94,0.3)]">
              {connectedUsers.length} {connectedUsers.length === 1 ? 'Member' : 'Members'}
            </span>
          </div>

          {/* Team Grid */}


          {/* Team Carousel */}
          <div className="w-full flex flex-col items-center justify-center relative max-h-[350px] mt-12">
            {connectedUsers.length === 0 ? (
              <p className="text-gray-400">Waiting for team members...</p>
            ) : (
              <div className="flex items-center justify-between w-full max-w-4xl">
                {/* Prev Button */}
                <button
                  onClick={() => {
                    setSummaryDirection(-1);
                    setSummaryIndex(prev => (prev - 1 + connectedUsers.length) % connectedUsers.length);
                  }}
                  className="p-3 bg-black/40 hover:bg-black/60 text-white border border-white/20 hover:border-yellow-400 rounded-full transition-all transform hover:scale-110 z-20 backdrop-blur-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                </button>

                {/* Carousel Content */}
                <div className="relative w-full h-[400px] flex items-center justify-center overflow-hidden">
                  <AnimatePresence initial={false} custom={summaryDirection}>
                    {(() => {
                      const safeIndex = summaryIndex % connectedUsers.length;
                      const user = connectedUsers[safeIndex];
                      if (!user) return null; // Should not happen with check above
                      const moodData = MOODS.find(m => m.id === user.mood) || MOODS[0];
                      const isMe = user.nickname === nickname;

                      return (
                        <motion.div
                          key={user.nickname}
                          custom={summaryDirection}
                          variants={slideVariants}
                          initial="enter"
                          animate="center"
                          exit="exit"
                          transition={{
                            x: { type: "spring", stiffness: 300, damping: 30 },
                            opacity: { duration: 0.2 }
                          }}
                          className="absolute flex flex-col items-center gap-4 text-center max-w-lg"
                        >
                          <div className="relative">
                            {/* Glow effect */}
                            <div className={`absolute inset-0 blur-3xl opacity-30 ${moodData.color.replace('border-', 'bg-').split(' ')[0]}`} />
                            <img
                              src={moodData.image}
                              alt={user.mood}
                              className="h-[250px] w-auto object-contain drop-shadow-2xl relative z-10"
                              draggable={false}
                            />
                            {isMe && <div className="absolute top-0 right-0 bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-full drop-shadow-md">YOU</div>}
                          </div>

                          <div className="flex flex-col items-center">
                            <h2 className="text-3xl md:text-5xl font-bold text-yellow-100 font-christmas tracking-wider drop-shadow-lg mb-1">
                              {user.nickname}
                            </h2>
                            <span className="text-sm md:text-base text-gray-300 uppercase tracking-[0.2em] mb-4">
                              {moodData.label}
                            </span>

                            {user.moodMessage && (
                              <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-xl p-4 text-lg italic text-gray-200 relative max-w-md">
                                <span className="absolute -top-3 -left-2 text-4xl text-white/20 font-serif">"</span>
                                {user.moodMessage}
                                <span className="absolute -bottom-6 -right-2 text-4xl text-white/20 font-serif">"</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })()}
                  </AnimatePresence>
                </div>

                {/* Next Button */}
                <button
                  onClick={() => {
                    setSummaryDirection(1);
                    setSummaryIndex(prev => (prev + 1) % connectedUsers.length);
                  }}
                  className="p-3 bg-black/40 hover:bg-black/60 text-white border border-white/20 hover:border-yellow-400 rounded-full transition-all transform hover:scale-110 z-20 backdrop-blur-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                </button>
              </div>
            )}

            {/* Pagination Dots */}
            {connectedUsers.length > 1 && (
              <div className="flex items-center gap-2 mt-4">
                {connectedUsers.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === summaryIndex % connectedUsers.length ? 'w-6 bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'bg-white/20'}`}
                  />
                ))}
              </div>
            )}
          </div>


          {/* Action Buttons */}
          <div className="relative w-full flex items-center justify-center mb-8 mt-8">
            {/* Edit Profile - positioned to the left */}
            <button
              onClick={() => setView('login')}
              className="absolute left-0 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/20 hover:border-white/40 rounded-full text-xs text-gray-300 hover:text-white transition-all flex items-center gap-2"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Profile
            </button>

            {/* Start Decorating - centered */}
            <button
              onClick={() => decoratingEnabled && setView('tree')}
              disabled={!decoratingEnabled}
              className={`px-12 py-4 rounded-full shadow-[0_0_30px_rgba(34,197,94,0.5)] transition-all text-2xl font-bold uppercase tracking-widest border-2 ${decoratingEnabled
                ? 'bg-gradient-to-r from-green-700 to-green-500 border-green-400/50 hover:scale-105 hover:shadow-[0_0_50px_rgba(34,197,94,0.7)] cursor-pointer'
                : 'bg-gray-600 border-gray-500 opacity-50 cursor-not-allowed'
                }`}
            >
              {decoratingEnabled ? 'Start Decorating' : 'Waiting for Elf Axel...'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-[url('/room-bg.png')] bg-cover bg-center flex overflow-hidden font-sans">
      <SnowEffect />
      <FireplaceEffect />

      {editingDecoration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <EditDecorationModal
            decoration={editingDecoration}
            onUpdate={(dec) => handleUpdateDecoration(dec.id, dec.message)}
            onDelete={() => handleDeleteDecoration(editingDecoration.id)}
            onClose={() => setEditingDecoration(null)}
          />
        </div>
      )}

      {/* Sidebar Controls */}
      <div className="w-80 backdrop-blur-md bg-black/60 border-r border-white/10 p-6 flex flex-col gap-6 z-10 shadow-2xl overflow-y-auto">
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-3xl font-bold font-christmas tracking-widest text-yellow-400">Decorate Tree</h2>
            <button
              onClick={() => setView('summary')}
              className="text-xs text-blue-300 hover:text-white underline decoration-blue-500/50 hover:decoration-white transition-all flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Team
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Show current user avatar */}
              <img
                src={MOODS.find(m => m.id === mood)?.image}
                alt="My Elf Avatar"
                className="w-10 h-10 object-contain drop-shadow-md"
              />
              <p className="text-sm text-gray-400 flex flex-col">
                <span>Logged in as:</span>
                <span className="text-white font-mono">{nickname}</span>
              </p>
            </div>
            <button
              onClick={handleClearMyDecorations}
              className="text-xs bg-red-900/30 hover:bg-red-900/50 text-red-200 px-2 py-1 rounded border border-red-900/50 transition-colors"
              title="Remove all my items"
            >
              Clear Mine
            </button>
          </div>
        </div>

        {/* Connected Team Filter */}
        <div className="space-y-2">
          <div
            className="flex items-center gap-2 cursor-pointer group select-none hover:opacity-80 transition-opacity"
            onClick={() => setIsTeamCollapsed(!isTeamCollapsed)}
          >
            <svg
              className={`w-4 h-4 text-yellow-500/80 transition-transform duration-200 ${isTeamCollapsed ? '-rotate-90' : 'rotate-0'}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
            </svg>
            <h3 className="text-lg font-semibold uppercase text-gray-400 font-christmas tracking-wider text-yellow-500/80">Team ({connectedUsers.length})</h3>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setSelectedUser(null)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors border ${selectedUser === null ? 'bg-green-900/40 border-green-500 text-white' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'}`}
            >
              See All Decorations
            </button>

            {/* List online users (from connectedUsers which has rich data) */}
            {!isTeamCollapsed && (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1 transition-all">
                {connectedUsers.map(user => {
                  const moodData = MOODS.find(m => m.id === user.mood) || MOODS[0];
                  return (
                    <button
                      key={user.nickname}
                      onClick={(e) => { e.stopPropagation(); setSelectedUser(user.nickname === selectedUser ? null : user.nickname); }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors border group relative ${selectedUser === user.nickname ? 'bg-green-900/40 border-green-500 text-white' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'}`}
                      title={user.moodMessage || user.mood}
                    >
                      <img src={moodData.image} alt={moodData.label} className="w-8 h-8 object-contain drop-shadow-sm" />
                      <span className="font-medium text-left flex-1 text-white truncate min-w-0">{user.nickname}</span>
                      {/* Status dot */}
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.5)]" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold uppercase text-gray-400 font-christmas tracking-wider text-yellow-500/80">1. Select Decoration</h3>
          <div className="grid grid-cols-2 gap-4">
            <div
              draggable
              onDragStart={(e) => handleDragStart(e, 'bright')}
              onClick={() => setActiveType('bright')}
              className={`flex flex-col items-center gap-2 transition-all cursor-grab active:cursor-grabbing group ${activeType === 'bright' ? 'scale-110 opacity-100' : 'opacity-70 hover:opacity-100 hover:scale-105'}`}
            >
              <img
                src="/ornament-gold.png"
                alt="Bright Ball"
                className={`w-14 h-14 object-contain drop-shadow-md transition-all ${activeType === 'bright' ? 'drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]' : ''}`}
                draggable={false}
              />
              <span className="text-xs font-medium text-gray-300 group-hover:text-white">Bright Ball (Good)</span>
            </div>
            <div
              draggable
              onDragStart={(e) => handleDragStart(e, 'black')}
              onClick={() => setActiveType('black')}
              className={`flex flex-col items-center gap-2 transition-all cursor-grab active:cursor-grabbing group ${activeType === 'black' ? 'scale-110 opacity-100' : 'opacity-70 hover:opacity-100 hover:scale-105'}`}
            >
              <img
                src="/ornament-black.png"
                alt="Black Ball"
                className={`w-14 h-14 object-contain drop-shadow-md transition-all ${activeType === 'black' ? 'drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]' : ''}`}
                draggable={false}
              />
              <span className="text-xs font-medium text-gray-300 group-hover:text-white">Black Ball (Bad)</span>
            </div>
            <div
              draggable
              onDragStart={(e) => handleDragStart(e, 'gift')}
              onClick={() => setActiveType('gift')}
              className={`flex flex-col items-center gap-2 transition-all cursor-grab active:cursor-grabbing group ${activeType === 'gift' ? 'scale-110 opacity-100' : 'opacity-70 hover:opacity-100 hover:scale-105'}`}
            >
              <img
                src="/gift-box.png"
                alt="Gift"
                className={`w-14 h-14 object-contain drop-shadow-md transition-all ${activeType === 'gift' ? 'drop-shadow-[0_0_10px_rgba(248,113,113,0.6)]' : ''}`}
                draggable={false}
              />
              <span className="text-xs font-medium text-gray-300 group-hover:text-white">Gift (Kudos)</span>
            </div>
            <div
              draggable
              onDragStart={(e) => handleDragStart(e, 'star')}
              onClick={() => setActiveType('star')}
              className={`flex flex-col items-center gap-2 transition-all cursor-grab active:cursor-grabbing group ${activeType === 'star' ? 'scale-110 opacity-100' : 'opacity-70 hover:opacity-100 hover:scale-105'}`}
            >
              <img
                src="/star-topper.png"
                alt="Star"
                className={`w-14 h-14 object-contain drop-shadow-md transition-all ${activeType === 'star' ? 'drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]' : ''}`}
                draggable={false}
              />
              <span className="text-xs font-medium text-gray-300 group-hover:text-white">Star (Next objective)</span>
            </div>
          </div>
        </div>

        {activeType && (
          <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
            <h3 className="text-lg font-semibold uppercase text-gray-400 font-christmas tracking-wider text-yellow-500/80">2. Write Message</h3>
            <textarea
              className="w-full h-32 bg-black/40 border border-white/20 rounded-lg p-3 text-white placeholder-white/40 focus:ring-2 focus:ring-yellow-400/50 outline-none text-base font-sans transition-all resize-none backdrop-blur-sm"
              placeholder="What went well? / What went wrong? / Kudos..."
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
            <div className="p-3 bg-blue-900/30 text-blue-200 text-xs rounded border border-blue-900">
              <h3 className="font-bold mb-1 uppercase font-christmas tracking-wider text-lg text-yellow-400">3. Place on Tree</h3>
              <p>Drag & Drop the ornament onto the tree to place it!</p>
            </div>
          </div>
        )}
      </div>

      {/* Main Area */}
      <div className="flex-1 relative bg-transparent">
        <ChristmasTree
          decorations={visibleDecorations}
          onPlaceDecoration={handleClickPlace}
          onDropDecoration={handleDropDecoration}
          onMoveDecoration={handleMoveDecoration}
          onSelectDecoration={setEditingDecoration}
          pendingDecorationType={activeType}
          currentUser={nickname}
        />

        {/* Connection Status Indicator */}
        <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
          <div className={`px-3 py-1 rounded-full text-xs font-mono border backdrop-blur-md ${ws?.readyState === 1 ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-red-500/20 border-red-500/50 text-red-400'}`}>
            {ws?.readyState === 1 ? '● Connected' : '○ Disconnected'}
          </div>
          {selectedUser && (
            <div className="px-3 py-1 rounded-full text-xs font-mono border backdrop-blur-md bg-blue-500/20 border-blue-500/50 text-blue-300">
              Filtering: {selectedUser}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
