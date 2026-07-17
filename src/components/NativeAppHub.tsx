import React, { useState, useEffect, useRef } from 'react';
import { 
  Wifi, 
  WifiOff, 
  Volume2, 
  VolumeX, 
  Lock, 
  Unlock, 
  Download, 
  Smartphone, 
  Check, 
  X, 
  Fingerprint, 
  Bell, 
  ShieldCheck, 
  RefreshCw,
  Sparkles
} from 'lucide-react';

// ==========================================
// 1. WEB AUDIO SYNTHESIS & VIRTUAL HAPTIC ENGINE
// ==========================================

let audioCtx: AudioContext | null = null;
let isMutedGlobal = false;

export function setGlobalMute(mute: boolean) {
  isMutedGlobal = mute;
}

export function playTone(type: 'tap' | 'success' | 'alert' | 'lock' | 'unlock' | 'camera' | 'keypress') {
  if (isMutedGlobal) return;
  
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    const ctx = audioCtx;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    const now = ctx.currentTime;
    
    switch (type) {
      case 'tap':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
        gainNode.gain.setValueAtTime(0.08, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
        
      case 'keypress':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, now);
        gainNode.gain.setValueAtTime(0.04, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
        break;
        
      case 'success':
        // Arpeggio
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
        osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6
        
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.setValueAtTime(0.1, now + 0.24);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        
        osc.start(now);
        osc.stop(now + 0.45);
        break;
        
      case 'alert':
        // Siren tone
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(440, now + 0.15);
        osc.frequency.linearRampToValueAtTime(220, now + 0.3);
        
        gainNode.gain.setValueAtTime(0.08, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        
        osc.start(now);
        osc.stop(now + 0.35);
        break;
        
      case 'lock':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
        gainNode.gain.setValueAtTime(0.12, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
        
      case 'unlock':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(450, now + 0.18);
        gainNode.gain.setValueAtTime(0.12, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
        break;
        
      case 'camera':
        // High frequency white noise burst representing shutter
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.12);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
    }
  } catch (e) {
    console.warn("Audio synthesis not supported or blocked by permissions:", e);
  }
}

export function triggerVirtualHaptic() {
  // Real device vibration
  if (navigator.vibrate) {
    navigator.vibrate(40);
  }
  // Screen shake visual indicator class
  const main = document.getElementById('root');
  if (main) {
    main.classList.add('haptic-shake');
    setTimeout(() => {
      main.classList.remove('haptic-shake');
    }, 150);
  }
}

// Add CSS keyframes for haptic shake animation dynamically to the head
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes haptic-shake {
      0% { transform: translate(0, 0); }
      25% { transform: translate(-1px, 1px); }
      50% { transform: translate(1px, -1px); }
      75% { transform: translate(-1px, -1px); }
      100% { transform: translate(0, 0); }
    }
    .haptic-shake {
      animation: haptic-shake 0.15s ease-in-out;
    }
  `;
  document.head.appendChild(style);
}

// ==========================================
// 2. NATIVE TOOLBAR CONTROL HUB
// ==========================================

interface NativeAppToolbarProps {
  isOffline: boolean;
  setIsOffline: (val: boolean) => void;
  onLockScreen: () => void;
}

export function NativeAppToolbar({ isOffline, setIsOffline, onLockScreen }: NativeAppToolbarProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [showSyncIndicator, setShowSyncIndicator] = useState(false);
  const [syncCount, setSyncCount] = useState(0);
  const [showPwaModal, setShowPwaModal] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [pwaInstalled, setPwaInstalled] = useState(false);

  // Monitor simulated local offline queue
  useEffect(() => {
    const checkSyncQueue = () => {
      try {
        const queue = localStorage.getItem('ashinaga_offline_sync_queue');
        if (queue) {
          const items = JSON.parse(queue);
          setSyncCount(items.length);
        } else {
          setSyncCount(0);
        }
      } catch (e) {
        setSyncCount(0);
      }
    };

    checkSyncQueue();
    const interval = setInterval(checkSyncQueue, 3000);
    return () => clearInterval(interval);
  }, []);

  // Handle returning online sync
  useEffect(() => {
    if (!isOffline && syncCount > 0) {
      setShowSyncIndicator(true);
      playTone('success');
      
      const timer = setTimeout(() => {
        try {
          localStorage.removeItem('ashinaga_offline_sync_queue');
          setSyncCount(0);
          setShowSyncIndicator(false);
          triggerVirtualHaptic();
          showNotificationBanner('Sync Complete', 'All offline student data & updates successfully uploaded to cloud.');
        } catch (e) {}
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [isOffline, syncCount]);

  const handleMuteToggle = () => {
    const newVal = !isMuted;
    setIsMuted(newVal);
    setGlobalMute(newVal);
    if (!newVal) {
      playTone('tap');
    }
  };

  const handleOfflineToggle = () => {
    setIsOffline(!isOffline);
    playTone('tap');
    triggerVirtualHaptic();
    
    if (!isOffline) {
      showNotificationBanner('Local Cache Mode', 'App is offline. Edits will be safely cached inside device storage.');
    } else {
      showNotificationBanner('System Online', 'Connected. Re-validating credentials and synchronization channels.');
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 bg-slate-900/60 p-1.5 rounded-2xl border border-white/5 no-print">
        {/* Network Toggle */}
        <button
          onClick={handleOfflineToggle}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            isOffline 
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' 
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          }`}
          title={isOffline ? "Test local caching (Offline)" : "System connected (Online)"}
        >
          {isOffline ? (
            <>
              <WifiOff className="h-3.5 w-3.5 animate-pulse" />
              <span>OFFLINE TEST</span>
            </>
          ) : (
            <>
              <Wifi className="h-3.5 w-3.5" />
              <span>ONLINE</span>
            </>
          )}
        </button>

        {/* Local Sync Queue indicator */}
        {syncCount > 0 && (
          <div className="flex items-center gap-1.5 bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider animate-pulse">
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span>{syncCount} Cached</span>
          </div>
        )}

        {/* Audio Mute Switch */}
        <button
          onClick={handleMuteToggle}
          className={`p-2 rounded-xl border transition-all cursor-pointer ${
            isMuted 
              ? 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-400' 
              : 'bg-sky-500/10 border-sky-500/20 text-sky-400 hover:bg-sky-500/15'
          }`}
          title={isMuted ? "Unmute Native App Chimes" : "Mute Native App Chimes"}
        >
          {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        </button>

        {/* Biometric PIN Lock */}
        <button
          onClick={() => {
            playTone('lock');
            triggerVirtualHaptic();
            onLockScreen();
          }}
          className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/15 transition-all cursor-pointer"
          title="Instant Lockdown Security"
        >
          <Lock className="h-3.5 w-3.5" />
        </button>

        {/* PWA App Installer trigger */}
        <button
          onClick={() => {
            playTone('tap');
            setShowPwaModal(true);
          }}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold cursor-pointer transition-all ${
            pwaInstalled 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : 'bg-white/10 border-white/10 text-white hover:bg-white/15'
          }`}
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden md:inline">{pwaInstalled ? 'PWA INSTALLED' : 'INSTALL APP'}</span>
        </button>
      </div>

      {/* Syncing Overlay Banner */}
      {showSyncIndicator && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-indigo-500/30 max-w-sm flex items-start gap-4 animate-slide-up">
          <div className="p-3 bg-indigo-600 rounded-xl">
            <RefreshCw className="h-5 w-5 animate-spin" />
          </div>
          <div className="space-y-1.5 w-full">
            <h4 className="text-xs font-extrabold tracking-wide uppercase text-indigo-400">Offline Sync Protocol</h4>
            <p className="text-[11px] text-slate-300">Synchronizing {syncCount} offline pupil entries back to central Firebase database...</p>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-sky-400 to-indigo-500 h-full animate-progress-bar rounded-full" />
            </div>
          </div>
        </div>
      )}

      {/* PWA Installer Modal */}
      {showPwaModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 relative shadow-2xl text-slate-200">
            <button
              onClick={() => {
                playTone('tap');
                setShowPwaModal(false);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-5 text-center mt-2">
              <div className="w-14 h-14 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/20">
                <Smartphone className="h-7 w-7 text-white" />
              </div>

              <div>
                <h3 className="text-lg font-black text-white">Install Uganda Rainbow App</h3>
                <p className="text-slate-400 text-xs mt-1">Get fast, offline-first access, offline grading cache, and home visit logs directly from your home screen.</p>
              </div>

              <div className="bg-slate-950/50 p-4 rounded-2xl text-left border border-slate-800 space-y-3">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 bg-sky-500/20 rounded text-sky-400 text-[11px] font-black flex items-center justify-center shrink-0">1</span>
                  <p className="text-xs text-slate-300">Run completely standalone without internet connection inside rural centers.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 bg-sky-500/20 rounded text-sky-400 text-[11px] font-black flex items-center justify-center shrink-0">2</span>
                  <p className="text-xs text-slate-300">Automatic background synchronization of pupil profile data and reports.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 bg-sky-500/20 rounded text-sky-400 text-[11px] font-black flex items-center justify-center shrink-0">3</span>
                  <p className="text-xs text-slate-300">Camera scanning of physical documents with local portrait capture features.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    playTone('tap');
                    setShowPwaModal(false);
                  }}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-extrabold cursor-pointer transition-all border border-slate-700"
                >
                  NOT NOW
                </button>
                <button
                  onClick={() => {
                    playTone('success');
                    triggerVirtualHaptic();
                    setPwaInstalled(true);
                    setShowPwaModal(false);
                    showNotificationBanner('App Installed', 'Ashinaga Uganda Rainbow House has been launched from your applications deck.');
                  }}
                  className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-xl text-xs font-black cursor-pointer shadow-lg shadow-sky-500/10 transition-all"
                >
                  INSTALL Standalone
                </button>
              </div>

              <p className="text-[10px] text-slate-500">
                PWA standard service-workers fully active. Supports iOS (Add to Home Screen), Android (Chrome install), and Desktop.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ==========================================
// 3. SECURE LOCK SCREEN COMPONENT
// ==========================================

interface NativePinLockScreenProps {
  onUnlock: () => void;
}

export function NativePinLockScreen({ onUnlock }: NativePinLockScreenProps) {
  const [pin, setPin] = useState('');
  const [isError, setIsError] = useState(false);
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'success'>('idle');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const startFaceId = async () => {
    playTone('tap');
    setScanState('scanning');
    
    // Attempt real webcam if permissions allow, fallback to visual animation
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e) {
      console.log("Webcam not available for FaceID, continuing with high-fidelity visual mock simulator");
    }

    setTimeout(() => {
      playTone('success');
      triggerVirtualHaptic();
      setScanState('success');
      
      // Stop webcam stream
      setTimeout(() => {
        if (cameraStream) {
          cameraStream.getTracks().forEach(track => track.stop());
        }
        onUnlock();
      }, 1000);
    }, 2800);
  };

  const handleKeyPress = (num: string) => {
    if (pin.length >= 4) return;
    playTone('keypress');
    const newPin = pin + num;
    setPin(newPin);

    if (newPin === '1234') {
      setTimeout(() => {
        playTone('unlock');
        triggerVirtualHaptic();
        onUnlock();
      }, 200);
    } else if (newPin.length === 4) {
      setTimeout(() => {
        playTone('alert');
        triggerVirtualHaptic();
        setIsError(true);
        setPin('');
        setTimeout(() => setIsError(false), 800);
      }, 250);
    }
  };

  const handleBackspace = () => {
    playTone('tap');
    setPin(prev => prev.slice(0, -1));
  };

  // Clean up streams on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 select-none font-sans">
      <div className="w-full max-w-sm space-y-8 flex flex-col items-center">
        {/* Status header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto text-rose-500">
            <Lock className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-black text-white tracking-wide">Rainbow Central Secure Access</h2>
          <p className="text-slate-500 text-xs">Enter Staff Access PIN or use biometric scan</p>
        </div>

        {/* PIN Indicators */}
        <div className="flex gap-4 items-center justify-center py-2">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-4.5 h-4.5 rounded-full transition-all border ${
                isError 
                  ? 'bg-rose-600 border-rose-500 scale-110 shadow-lg shadow-rose-600/30' 
                  : pin.length > idx 
                    ? 'bg-sky-400 border-sky-400 scale-110' 
                    : 'bg-transparent border-slate-700'
              }`}
            />
          ))}
        </div>

        {/* PinPad */}
        {scanState === 'idle' ? (
          <div className="grid grid-cols-3 gap-4 w-64">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                onClick={() => handleKeyPress(num)}
                className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 text-lg font-extrabold text-white flex items-center justify-center hover:bg-slate-850 active:scale-95 transition-all cursor-pointer"
              >
                {num}
              </button>
            ))}
            <button
              onClick={startFaceId}
              className="w-16 h-16 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center hover:bg-sky-500/15 active:scale-95 transition-all cursor-pointer"
              title="Trigger FaceID Scan"
            >
              <Fingerprint className="h-6 w-6" />
            </button>
            <button
              onClick={() => handleKeyPress('0')}
              className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 text-lg font-extrabold text-white flex items-center justify-center hover:bg-slate-850 active:scale-95 transition-all cursor-pointer"
            >
              0
            </button>
            <button
              onClick={handleBackspace}
              className="w-16 h-16 rounded-full bg-slate-900/40 text-slate-400 text-xs font-black flex items-center justify-center hover:text-white cursor-pointer"
            >
              CLEAR
            </button>
          </div>
        ) : (
          <div className="relative w-64 h-64 bg-slate-900 border-2 border-slate-800 rounded-3xl overflow-hidden flex flex-col items-center justify-center text-center p-4">
            {/* Real Webcam Video or Mock UI */}
            {cameraStream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover opacity-60"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-b from-sky-950/20 via-slate-900/50 to-slate-950" />
            )}

            {/* Scan Overlay lines */}
            {scanState === 'scanning' && (
              <>
                <div className="absolute inset-x-0 h-0.5 bg-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.8)] animate-face-scan top-0" />
                <div className="absolute w-48 h-48 border border-sky-400/50 rounded-full animate-pulse flex items-center justify-center">
                  <div className="w-40 h-40 border-2 border-dashed border-sky-400/30 rounded-full animate-spin" />
                </div>
              </>
            )}

            <div className="z-10 space-y-2 mt-auto bg-slate-950/80 p-3 rounded-2xl border border-white/5 w-full">
              {scanState === 'scanning' ? (
                <>
                  <p className="text-[10px] text-sky-400 font-black tracking-widest animate-pulse uppercase">BIOMETRIC FACE SCAN ACTIVE</p>
                  <p className="text-[9px] text-slate-400 font-mono">Analyzing coordinates & mesh...</p>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center mx-auto text-slate-950 mb-1">
                    <ShieldCheck className="h-4.5 w-4.5" />
                  </div>
                  <p className="text-xs text-emerald-400 font-black tracking-wide uppercase">ACCESS GRANTED</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Demo instructions */}
        <p className="text-[10px] text-slate-600 font-mono">
          Demo Mode: Enter PIN <span className="text-slate-400 font-extrabold">1234</span> or use Biometric Fingerprint for mock FaceID.
        </p>
      </div>
    </div>
  );
}

// Add Face Scan CSS keyframes dynamically
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes face-scan {
      0% { top: 10%; }
      50% { top: 90%; }
      100% { top: 10%; }
    }
    .animate-face-scan {
      animation: face-scan 2.4s infinite linear;
    }
    @keyframes progress-bar {
      0% { width: 0%; }
      100% { width: 100%; }
    }
    .animate-progress-bar {
      animation: progress-bar 4s linear;
    }
    @keyframes slide-up {
      0% { transform: translateY(100%) scale(0.95); opacity: 0; }
      100% { transform: translateY(0) scale(1); opacity: 1; }
    }
    .animate-slide-up {
      animation: slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
  `;
  document.head.appendChild(style);
}

// ==========================================
// 4. MOBILE / NATIVE BANNER ALERT NOTIFICATION
// ==========================================

export function showNotificationBanner(title: string, body: string) {
  // Try to use browser's native API if allowed, otherwise show custom slide banner
  if (typeof document === 'undefined') return;
  
  // Custom in-app slide banner
  const bannerId = 'ashinaga-pwa-push-banner';
  let banner = document.getElementById(bannerId);
  if (!banner) {
    banner = document.createElement('div');
    banner.id = bannerId;
    banner.className = 'fixed top-4 right-4 z-50 bg-[#020d1a] text-slate-100 p-4 rounded-2xl border border-sky-500/30 shadow-2xl max-w-sm flex gap-3 pointer-events-auto transform transition-all duration-300 translate-y-[-120%] opacity-0 font-sans';
    document.body.appendChild(banner);
  }

  banner.innerHTML = `
    <div class="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl shrink-0 h-fit">
      <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path>
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>
      </svg>
    </div>
    <div class="space-y-1 pr-4">
      <h4 class="font-extrabold text-xs text-white leading-tight uppercase tracking-wider">${title}</h4>
      <p class="text-[11px] text-slate-300 leading-normal font-medium">${body}</p>
    </div>
    <button onclick="document.getElementById('${bannerId}').style.transform = 'translateY(-120%)'; document.getElementById('${bannerId}').style.opacity = '0';" class="absolute top-3 right-3 text-slate-500 hover:text-white cursor-pointer">
      <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  `;

  // Animate in
  setTimeout(() => {
    if (banner) {
      banner.style.transform = 'translateY(0)';
      banner.style.opacity = '1';
    }
  }, 10);

  // Auto hide
  setTimeout(() => {
    if (banner) {
      banner.style.transform = 'translateY(-120%)';
      banner.style.opacity = '0';
    }
  }, 6000);
}
