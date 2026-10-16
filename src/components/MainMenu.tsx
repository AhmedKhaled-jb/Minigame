import React, { useState } from 'react';
import { PlayerData, GameScreen } from '../types/game';
import { sound } from '../services/audio';
import { 
  Play, 
  ShoppingBag, 
  Settings, 
  Coins, 
  Volume2, 
  VolumeX, 
  Music, 
  Sparkles, 
  Trophy, 
  Compass,
  Crown
} from 'lucide-react';

interface MainMenuProps {
  playerData: PlayerData;
  onNavigate: (screen: GameScreen) => void;
  onOpenAuth: () => void;
  isLoggedIn: boolean;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  playerData,
  onNavigate,
  onOpenAuth,
  isLoggedIn
}) => {
  const [sfxOn, setSfxOn] = useState(sound.sfxEnabled);
  const [musicOn, setMusicOn] = useState(sound.musicEnabled);

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

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-8 relative select-none overflow-x-hidden">
      {/* Background retro grid pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-50" />
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/20 via-transparent to-slate-950 pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 max-w-3xl w-full mx-auto flex items-center justify-between bg-slate-900/95 border-2 border-slate-700/80 rounded-2xl p-3 sm:px-6 pixel-box backdrop-blur-md shadow-xl">
        {/* User profile tag */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-indigo-600/30 border-2 border-indigo-400/50 flex items-center justify-center font-pixel text-xs text-indigo-300">
            {playerData.username.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-xs sm:text-sm font-pixel text-slate-100 flex items-center gap-1.5">
              <span>{playerData.username}</span>
              {isLoggedIn ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Cloud Synced" />
              ) : (
                <span className="text-[9px] font-sans px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded border border-amber-500/40">Guest</span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 font-body flex items-center gap-1">
              <Crown className="w-3 h-3 text-amber-400 inline" />
              <span>Adventurer</span>
            </div>
          </div>
        </div>

        {/* Coins & Audio Toggles */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Coin Counter */}
          <div className="flex items-center gap-1.5 bg-amber-500/15 border-2 border-amber-500/60 px-3 py-1.5 rounded-xl font-pixel text-amber-300 text-xs sm:text-sm shadow-inner">
            <Coins className="w-4 h-4 text-amber-400 animate-bounce" />
            <span>{playerData.coins}</span>
          </div>

          {/* Sound FX Toggle */}
          <button
            type="button"
            onClick={handleToggleSfx}
            className={`p-2.5 rounded-xl border-2 transition-all cursor-pointer ${
              sfxOn
                ? 'bg-slate-800 border-slate-600 text-slate-200'
                : 'bg-slate-900 border-slate-800 text-slate-600'
            }`}
            title="Toggle Sound Effects"
          >
            {sfxOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Chiptune Music Toggle */}
          <button
            type="button"
            onClick={handleToggleMusic}
            className={`p-2.5 rounded-xl border-2 transition-all cursor-pointer ${
              musicOn
                ? 'bg-indigo-600 border-indigo-400 text-white shadow-[0_0_12px_rgba(99,102,241,0.5)]'
                : 'bg-slate-900 border-slate-800 text-slate-600'
            }`}
            title="Toggle 8-bit Music"
          >
            <Music className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Hero / Main Menu Center - Focused strictly on clean interface without character */}
      <main className="relative z-10 max-w-xl w-full mx-auto my-auto py-8 sm:py-12 flex flex-col items-center text-center">
        {/* Retro Badge */}
        <div className="inline-flex items-center gap-2 bg-yellow-500/15 border-2 border-yellow-500/40 text-yellow-300 px-4 py-1.5 rounded-xl text-xs font-pixel mb-4 shadow-md">
          <Crown className="w-4 h-4 text-yellow-400" />
          CROWN-CAPTURE CHALLENGE
        </div>

        {/* Game Title */}
        <h1 className="text-4xl sm:text-6xl font-pixel text-yellow-400 tracking-wider drop-shadow-[0_4px_0_#b45309] mb-4">
          MINIWORLD
        </h1>

        <p className="text-slate-300 text-sm sm:text-base font-body max-w-md mb-8 sm:mb-10 leading-relaxed px-4">
          Grab the royal crown at the center of the arena and hold it for 30 seconds to win! Touch your opponent to steal and stun them!
        </p>

        {/* Main Menu Action Buttons (Strictly: Play, Shop, Settings) */}
        <div className="w-full max-w-md px-4 space-y-4">
          {/* 1. PLAY BUTTON */}
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onNavigate('play');
            }}
            className="w-full py-4 sm:py-5 px-6 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-pixel text-sm sm:text-base rounded-2xl pixel-btn flex items-center justify-center gap-3 transition-transform cursor-pointer shadow-xl border-2 border-emerald-400"
          >
            <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
            <span>PLAY</span>
          </button>

          {/* 2. SHOP BUTTON */}
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onNavigate('shop');
            }}
            className="w-full py-4 sm:py-5 px-6 bg-amber-600 hover:bg-amber-500 active:scale-[0.98] text-white font-pixel text-sm sm:text-base rounded-2xl pixel-btn flex items-center justify-center gap-3 transition-transform cursor-pointer shadow-xl border-2 border-amber-400"
          >
            <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
            <span>SHOP</span>
          </button>

          {/* 3. SETTINGS BUTTON */}
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onNavigate('settings');
            }}
            className="w-full py-4 sm:py-5 px-6 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-100 font-pixel text-sm sm:text-base rounded-2xl pixel-btn flex items-center justify-center gap-3 transition-transform cursor-pointer shadow-xl border-2 border-slate-600"
          >
            <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
            <span>SETTINGS</span>
          </button>
        </div>
      </main>

      {/* Bottom Footer Statistics */}
      <footer className="relative z-10 max-w-3xl w-full mx-auto mt-6 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-around gap-4 text-xs font-body text-slate-400 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>Chests: <strong className="text-white font-pixel text-[11px]">{playerData.chestsOpened?.length || 0}/8</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>Flowers: <strong className="text-white font-pixel text-[11px]">{playerData.flowersWatered || 0}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-emerald-400" />
          <span>Steps: <strong className="text-white font-pixel text-[11px]">{playerData.stepsTaken || 0}</strong></span>
        </div>
        {!isLoggedIn && (
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onOpenAuth();
            }}
            className="text-[11px] font-pixel text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
          >
            Sign in to Sync
          </button>
        )}
      </footer>
    </div>
  );
};
