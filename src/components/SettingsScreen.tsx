import React, { useState } from 'react';
import { PlayerData, GameScreen } from '../types/game';
import { sound } from '../services/audio';
import { syncPlayerProgress } from '../services/playerService';
import { 
  ArrowLeft, 
  Settings as SettingsIcon, 
  Volume2, 
  VolumeX, 
  Music, 
  Cloud, 
  LogOut, 
  Check, 
  ShieldCheck, 
  RefreshCw, 
  Gamepad2, 
  User, 
  Sparkles 
} from 'lucide-react';

interface SettingsScreenProps {
  playerData: PlayerData;
  onLogout: () => void;
  onNavigate: (screen: GameScreen) => void;
  isLoggedIn: boolean;
  onSyncComplete?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  playerData,
  onLogout,
  onNavigate,
  isLoggedIn,
  onSyncComplete
}) => {
  const [sfxOn, setSfxOn] = useState(sound.sfxEnabled);
  const [musicOn, setMusicOn] = useState(sound.musicEnabled);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  const handleToggleSfx = () => {
    sound.sfxEnabled = !sound.sfxEnabled;
    setSfxOn(sound.sfxEnabled);
    if (sound.sfxEnabled) sound.playClick();
  };

  const handleToggleMusic = () => {
    sound.toggleMusic();
    setMusicOn(sound.musicEnabled);
    sound.playClick();
  };

  const handleManualSync = async () => {
    sound.playClick();
    setSyncing(true);
    setSyncSuccess(false);
    try {
      await syncPlayerProgress(playerData);
      setSyncSuccess(true);
      if (onSyncComplete) onSyncComplete();
      setTimeout(() => setSyncSuccess(false), 3000);
    } finally {
      setSyncing(false);
    }
  };

  const handleSignOut = () => {
    sound.playClick();
    onLogout();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col p-4 sm:p-6 relative select-none">
      <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-40" />

      {/* Header */}
      <header className="relative z-10 max-w-3xl w-full mx-auto flex items-center justify-between mb-6 bg-slate-900/90 border-2 border-slate-700 rounded-2xl p-4 pixel-box">
        <button
          onClick={() => {
            sound.playClick();
            onNavigate('menu');
          }}
          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-600 pixel-btn flex items-center gap-2 text-xs font-pixel cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>BACK</span>
        </button>

        <div className="flex items-center gap-2 text-center">
          <SettingsIcon className="w-5 h-5 text-indigo-400" />
          <h1 className="text-sm sm:text-base font-pixel text-yellow-400">
            SETTINGS & ACCOUNT
          </h1>
        </div>

        <div className="w-16" /> {/* spacer */}
      </header>

      {/* Main Settings Panel */}
      <main className="relative z-10 max-w-3xl w-full mx-auto space-y-6 my-auto">
        {/* 1. Audio Preferences */}
        <section className="bg-slate-900 border-4 border-slate-700 rounded-2xl p-5 pixel-box">
          <h2 className="text-xs font-pixel text-indigo-300 mb-4 flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-indigo-400" /> AUDIO CONFIGURATION
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Sound FX Toggle */}
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-pixel text-white block">SOUND EFFECTS</span>
                <span className="text-[11px] text-slate-400 font-body">Footsteps, coins, chests, water</span>
              </div>
              <button
                onClick={handleToggleSfx}
                className={`px-3 py-1.5 rounded-lg font-pixel text-[10px] border-2 transition-all cursor-pointer ${
                  sfxOn
                    ? 'bg-emerald-600 border-emerald-400 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-500'
                }`}
              >
                {sfxOn ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Chiptune Music Toggle */}
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-pixel text-white block">8-BIT CHIPTUNE BGM</span>
                <span className="text-[11px] text-slate-400 font-body">Synthesized nostalgic village tune</span>
              </div>
              <button
                onClick={handleToggleMusic}
                className={`px-3 py-1.5 rounded-lg font-pixel text-[10px] border-2 transition-all cursor-pointer ${
                  musicOn
                    ? 'bg-indigo-600 border-indigo-400 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-500'
                }`}
              >
                {musicOn ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </section>

        {/* 2. Account & Cloud Database */}
        <section className="bg-slate-900 border-4 border-slate-700 rounded-2xl p-5 pixel-box">
          <h2 className="text-xs font-pixel text-amber-300 mb-4 flex items-center gap-2">
            <Cloud className="w-4 h-4 text-amber-400" /> ACCOUNT & CLOUD SAVES
          </h2>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3 mb-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-body">Account Status:</span>
              <span className="font-pixel text-[11px] flex items-center gap-1.5">
                {isLoggedIn ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-emerald-400">AUTHENTICATED (FIRESTORE)</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-amber-400">LOCAL GUEST</span>
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-body">Player Username:</span>
              <span className="font-pixel text-[11px] text-white">{playerData.username}</span>
            </div>

            {playerData.email && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-body">Linked Email:</span>
                <span className="font-body text-slate-300">{playerData.email}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-body">Database Engine:</span>
              <span className="font-pixel text-[10px] text-indigo-300">Google Cloud Firestore</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={handleManualSync}
              disabled={syncing}
              className="w-full sm:w-auto flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-pixel text-[11px] rounded-xl pixel-btn flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'SYNCING TO CLOUD...' : syncSuccess ? 'SAVED TO CLOUD!' : 'FORCE CLOUD SYNC'}
            </button>

            <button
              onClick={handleSignOut}
              className="w-full sm:w-auto py-2.5 px-5 bg-rose-950/80 hover:bg-rose-900 border-2 border-rose-500/60 text-rose-300 font-pixel text-[11px] rounded-xl pixel-btn flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              {isLoggedIn ? 'LOG OUT' : 'SWITCH ACCOUNT'}
            </button>
          </div>
        </section>

        {/* 3. Controls Reference */}
        <section className="bg-slate-900 border-4 border-slate-700 rounded-2xl p-5 pixel-box">
          <h2 className="text-xs font-pixel text-slate-300 mb-3 flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-emerald-400" /> CONTROLS REFERENCE
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-body text-slate-300">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <strong className="text-white font-pixel text-[10px] block mb-1">DESKTOP KEYS:</strong>
              <p>Move: <code className="bg-slate-800 px-1 rounded text-amber-300">WASD</code> or <code className="bg-slate-800 px-1 rounded text-amber-300">Arrow Keys</code></p>
              <p>Action: <code className="bg-slate-800 px-1 rounded text-amber-300">E</code> or <code className="bg-slate-800 px-1 rounded text-amber-300">Spacebar</code></p>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <strong className="text-white font-pixel text-[10px] block mb-1">MOBILE & TOUCH:</strong>
              <p>360° Virtual Joystick on bottom-left for smooth analog & diagonal movement.</p>
              <p>Tactile Action button on bottom-right for interacting with chests, flowers, and shop.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
