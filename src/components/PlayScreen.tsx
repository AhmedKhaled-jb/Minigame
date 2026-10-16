import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PlayerData, GameScreen } from '../types/game';
import { getSkinById } from '../data/skins';
import { GameEngine, CrownHolder, MatchState } from '../game/GameEngine';
import { VirtualJoystick } from './VirtualJoystick';
import { sound } from '../services/audio';
import { 
  ArrowLeft, 
  Coins, 
  Volume2, 
  VolumeX, 
  Music, 
  HelpCircle, 
  Sparkles,
  Gamepad2,
  Crown,
  Zap,
  RotateCcw,
  Trophy,
  Skull,
  Compass
} from 'lucide-react';

interface PlayScreenProps {
  playerData: PlayerData;
  onUpdatePlayerData: (updater: (prev: PlayerData) => PlayerData) => void;
  onNavigate: (screen: GameScreen) => void;
  syncStatus: 'synced' | 'saving' | 'offline';
}

export const PlayScreen: React.FC<PlayScreenProps> = ({
  playerData,
  onUpdatePlayerData,
  onNavigate,
  syncStatus
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const isPointerDownRef = useRef(false);

  // Match and timer HUD states
  const [crownHolder, setCrownHolder] = useState<CrownHolder>('none');
  const [playerTimer, setPlayerTimer] = useState<number>(30.0);
  const [botTimer, setBotTimer] = useState<number>(30.0);
  const [playerStunned, setPlayerStunned] = useState<number>(0);
  const [botStunned, setBotStunned] = useState<number>(0);
  const [matchState, setMatchState] = useState<MatchState>('countdown');
  const [countdownNum, setCountdownNum] = useState<number>(5);
  const [dashReady, setDashReady] = useState<boolean>(false);
  const [dashCooldownRatio, setDashCooldownRatio] = useState<number>(0);

  // General settings & audio
  const [coinsDisplay, setCoinsDisplay] = useState(playerData.coins);
  const [showHelp, setShowHelp] = useState(false);
  const [sfxOn, setSfxOn] = useState(sound.sfxEnabled);
  const [musicOn, setMusicOn] = useState(sound.musicEnabled);

  // Mobile controls auto-detection
  const [showTouchControls, setShowTouchControls] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches ||
      window.innerWidth <= 1024
    );
  });

  const activeSkin = getSkinById(playerData.equippedSkin);

  // Resize listener
  useEffect(() => {
    const checkTouch = () => {
      const isMobile = window.innerWidth <= 1024 || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      if (isMobile) {
        setShowTouchControls(true);
      }
    };
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  // Initialize Game Engine
  useEffect(() => {
    if (!engineRef.current) {
      const engine = new GameEngine(playerData, activeSkin);
      engine.onCoinsChanged = (newCoins) => {
        setCoinsDisplay(newCoins);
        onUpdatePlayerData((prev) => ({ ...prev, coins: newCoins }));
      };
      engine.onMatchEnd = (winner) => {
        setMatchState(winner === 'player' ? 'victory' : 'defeat');
      };
      engineRef.current = engine;
    } else {
      engineRef.current.updatePlayerData(playerData, activeSkin);
    }
  }, [playerData, activeSkin, onUpdatePlayerData]);

  // Main 60fps render loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      const engine = engineRef.current;
      const canvas = canvasRef.current;

      if (engine && canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          engine.update(deltaTime);
          engine.render(ctx, canvas.width, canvas.height, currentTime);

          // Sync HUD states
          setCrownHolder(engine.crownHolder);
          setPlayerTimer(engine.playerHoldTimer);
          setBotTimer(engine.botHoldTimer);
          setPlayerStunned(engine.playerStunTime);
          setBotStunned(engine.botStunTime);
          setMatchState(engine.matchState);
          if (engine.matchState === 'countdown') {
            setCountdownNum(Math.max(1, Math.ceil(engine.countdownTimer)));
          }
          setDashReady(engine.matchState === 'active' && engine.dashCooldown <= 0 && engine.playerStunTime <= 0);
          setDashCooldownRatio(engine.dashCooldown / 3.0);
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Responsive canvas resizing
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      canvasRef.current.width = rect.width;
      canvasRef.current.height = rect.height;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Desktop Keyboard controls (WASD, Arrow keys, Space/Shift to Dash)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      engineRef.current?.handleKeyDown(e.code);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      engineRef.current?.handleKeyUp(e.code);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Virtual Joystick movement vector callback
  const handleJoystickMove = useCallback((vector: { x: number; y: number }) => {
    if (engineRef.current?.matchState !== 'active') return;
    engineRef.current?.setTouchDirection(vector.x, vector.y);
  }, []);

  // Direct Touch / Pointer Interaction Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !engineRef.current) return;
    if (engineRef.current.matchState !== 'active') return;

    const clientX = e.clientX;
    const clientY = e.clientY;

    // Ignore if touch is inside the bottom-left joystick zone
    if (showTouchControls && clientX < 180 && clientY > window.innerHeight - 200) {
      return;
    }

    // Ignore if touch is inside the bottom-right dash button zone
    if (showTouchControls && clientX > window.innerWidth - 120 && clientY > window.innerHeight - 150) {
      return;
    }

    isPointerDownRef.current = true;
    const rect = canvas.getBoundingClientRect();
    const canvasX = (clientX - rect.left) * (canvas.width / rect.width);
    const canvasY = (clientY - rect.top) * (canvas.height / rect.height);

    engineRef.current.handleScreenTouch(canvasX, canvasY, canvas.width, canvas.height, 'tap');
  };

  const handlePointerUp = () => {
    isPointerDownRef.current = false;
  };

  const handlePointerCancel = () => {
    isPointerDownRef.current = false;
  };

  const handleDashPress = () => {
    if (engineRef.current?.matchState !== 'active') return;
    sound.playClick();
    engineRef.current?.triggerDash();
  };

  const handleRematch = () => {
    sound.playClick();
    engineRef.current?.resetMatch();
    setMatchState('countdown');
    setCountdownNum(5);
    prevMatchStateRef.current = 'countdown';
  };

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
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none flex flex-col touch-none">
      {/* Top Navigation & Status Bar */}
      <header className="absolute top-0 left-0 right-0 z-30 pt-[max(0.5rem,env(safe-area-inset-top,8px))] px-[max(0.75rem,env(safe-area-inset-left,12px))] pr-[max(0.75rem,env(safe-area-inset-right,12px))] pointer-events-none flex items-center justify-between gap-2">
        {/* Left: Back to Main Menu */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={() => {
              sound.playClick();
              onNavigate('menu');
            }}
            className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-slate-900/95 hover:bg-slate-800 text-white rounded-xl border-2 border-slate-600 pixel-btn flex items-center gap-1 text-[11px] sm:text-xs font-pixel shadow-xl cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">MENU</span>
          </button>

          {/* Sync status */}
          <div className="bg-slate-900/95 border-2 border-slate-700 rounded-xl px-2 sm:px-2.5 py-1 sm:py-1.5 text-[9px] sm:text-[10px] font-pixel text-slate-300 flex items-center gap-1 shadow-lg">
            <span
              className={`w-2 h-2 rounded-full ${
                syncStatus === 'synced'
                  ? 'bg-emerald-400'
                  : syncStatus === 'saving'
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-slate-400'
              }`}
            />
            <span className="hidden md:inline">
              {syncStatus === 'synced' ? 'SAVED' : syncStatus === 'saving' ? 'SAVING...' : 'OFFLINE'}
            </span>
          </div>
        </div>

        {/* Center: Crown Challenge Banner & 30-Second Countdown */}
        <div className="pointer-events-auto flex flex-col items-center max-w-[260px] sm:max-w-md w-full">
          {matchState === 'countdown' ? (
            <div className="bg-slate-900/95 border-2 border-amber-400 rounded-2xl px-3.5 py-1.5 shadow-[0_0_20px_rgba(250,204,21,0.5)] flex items-center gap-2 text-amber-300 font-pixel text-[10px] sm:text-xs backdrop-blur-md">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <span>MATCH STARTS IN {countdownNum}s</span>
            </div>
          ) : crownHolder === 'player' ? (
            <div className="w-full bg-gradient-to-r from-amber-500/95 via-yellow-400/95 to-amber-500/95 border-2 sm:border-3 border-yellow-200 rounded-2xl px-3 py-1.5 shadow-[0_0_24px_rgba(234,179,8,0.7)] text-slate-950 flex flex-col items-center">
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-pixel font-bold">
                <Crown className="w-4 h-4 text-slate-950 animate-bounce" />
                <span>YOU HOLD CROWN:</span>
                <span className="text-xs sm:text-sm bg-slate-950 text-amber-300 px-2 py-0.5 rounded-lg border border-yellow-300 font-mono font-bold tracking-wider">
                  {playerTimer.toFixed(1)}s
                </span>
              </div>
              {/* Progress bar (fills as 30s ticks down) */}
              <div className="w-full bg-slate-900/40 rounded-full h-1.5 sm:h-2 mt-1 overflow-hidden border border-slate-900/30">
                <div 
                  className="bg-slate-950 h-full rounded-full transition-all duration-100 ease-linear"
                  style={{ width: `${Math.max(0, Math.min(100, ((30 - playerTimer) / 30) * 100))}%` }}
                />
              </div>
            </div>
          ) : crownHolder === 'bot' ? (
            <div className="w-full bg-gradient-to-r from-rose-600/95 via-red-500/95 to-rose-600/95 border-2 sm:border-3 border-red-200 rounded-2xl px-3 py-1.5 shadow-[0_0_24px_rgba(239,68,68,0.7)] text-white flex flex-col items-center animate-pulse">
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-pixel">
                <Crown className="w-4 h-4 text-yellow-300" />
                <span>BOT HAS CROWN:</span>
                <span className="text-xs sm:text-sm bg-slate-950 text-red-400 px-2 py-0.5 rounded-lg border border-red-400 font-mono font-bold tracking-wider">
                  {botTimer.toFixed(1)}s
                </span>
              </div>
              <span className="text-[8px] sm:text-[9px] font-pixel text-yellow-200 tracking-wide mt-0.5">
                TOUCH BOT TO STEAL & STUN (2s)!
              </span>
              <div className="w-full bg-slate-900/50 rounded-full h-1.5 sm:h-2 mt-0.5 overflow-hidden border border-slate-900/30">
                <div 
                  className="bg-yellow-300 h-full rounded-full transition-all duration-100 ease-linear"
                  style={{ width: `${Math.max(0, Math.min(100, ((30 - botTimer) / 30) * 100))}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/90 border-2 border-amber-400/80 rounded-2xl px-3 py-1.5 shadow-xl flex items-center gap-1.5 text-amber-300 font-pixel text-[10px] sm:text-xs backdrop-blur-md">
              <Crown className="w-4 h-4 text-amber-400 animate-spin" />
              <span>CROWN UNCLAIMED! SPRINT TO CENTER</span>
            </div>
          )}
        </div>

        {/* Right: Coins, Sound, Music, Guide */}
        <div className="pointer-events-auto flex items-center gap-1 sm:gap-2">
          {/* Coins */}
          <div className="flex items-center gap-1 sm:gap-1.5 bg-amber-500/25 border-2 border-amber-400 backdrop-blur-md px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl font-pixel text-amber-300 text-[11px] sm:text-xs shadow-xl">
            <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
            <span>{coinsDisplay}</span>
          </div>

          {/* Toggle Mobile Controls */}
          <button
            onClick={() => {
              sound.playClick();
              setShowTouchControls(!showTouchControls);
            }}
            className={`p-1.5 sm:p-2 rounded-xl border-2 transition-all cursor-pointer shadow-lg ${
              showTouchControls
                ? 'bg-indigo-600 border-indigo-300 text-white'
                : 'bg-slate-900/95 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="Toggle Mobile Controls"
          >
            <Gamepad2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Sound toggle */}
          <button
            onClick={handleToggleSfx}
            className="p-1.5 sm:p-2 bg-slate-900/95 hover:bg-slate-800 text-slate-200 rounded-xl border-2 border-slate-700 cursor-pointer shadow-lg"
            title="Toggle Sound Effects"
          >
            {sfxOn ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />}
          </button>

          {/* Music toggle */}
          <button
            onClick={handleToggleMusic}
            className={`p-1.5 sm:p-2 rounded-xl border-2 cursor-pointer transition-colors shadow-lg ${
              musicOn
                ? 'bg-indigo-600 border-indigo-300 text-white'
                : 'bg-slate-900/95 border-slate-700 text-slate-500'
            }`}
            title="Toggle Chiptune Music"
          >
            <Music className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Help Guide */}
          <button
            onClick={() => {
              sound.playClick();
              setShowHelp(!showHelp);
            }}
            className="p-1.5 sm:p-2 bg-slate-900/95 hover:bg-slate-800 text-slate-200 rounded-xl border-2 border-slate-700 cursor-pointer shadow-lg"
            title="Crown Challenge Rules"
          >
            <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </header>

      {/* Main Canvas Container */}
      <div ref={containerRef} className="w-full h-full relative overflow-hidden">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          className="w-full h-full block cursor-crosshair touch-none"
        />

        {/* Pre-Match 5-Second Countdown (5, 4, 3, 2, 1 clearly in center) */}
        {/* Pre-Match 5-Second Countdown: Only large, clear numbers (5, 4, 3, 2, 1) in center without any circle, background panel, overlay, or graphic */}
        {matchState === 'countdown' && (
          <div className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center select-none">
            <span
              key={countdownNum}
              className="text-8xl sm:text-9xl md:text-[140px] font-pixel font-black text-amber-300 drop-shadow-[0_8px_20px_rgba(0,0,0,0.95)]"
              style={{
                textShadow:
                  '0 0 24px rgba(0,0,0,0.95), 0 4px 12px rgba(0,0,0,0.95), -3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000, 3px 3px 0 #000'
              }}
            >
              {countdownNum}
            </span>
          </div>
        )}

        {/* Sleep / Stun Overlay Banner on Screen when Player is Stunned */}
        {playerStunned > 0 && (
          <div className="absolute top-20 sm:top-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none px-3">
            <div className="bg-slate-950/95 border-2 border-blue-400 text-blue-300 font-pixel text-xs px-4 py-2 rounded-2xl pixel-box shadow-[0_0_24px_rgba(59,130,246,0.8)] flex items-center gap-2 animate-pulse">
              <span className="text-base">💤</span>
              <span>YOU ARE ASLEEP! ({playerStunned.toFixed(1)}s)</span>
            </div>
          </div>
        )}

        {/* Victory Modal */}
        {matchState === 'victory' && (
          <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="max-w-sm sm:max-w-md w-full bg-gradient-to-b from-slate-900 via-slate-900 to-amber-950/90 border-4 border-yellow-400 rounded-3xl p-6 pixel-box text-center shadow-[0_0_50px_rgba(250,204,21,0.6)]">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 bg-gradient-to-b from-yellow-300 to-amber-500 rounded-2xl flex items-center justify-center border-3 border-yellow-100 shadow-xl animate-bounce">
                <Trophy className="w-10 h-10 sm:w-12 sm:h-12 text-slate-950" />
              </div>
              <h2 className="text-xl sm:text-2xl font-pixel text-yellow-300 mb-1">
                VICTORY!
              </h2>
              <p className="text-sm font-pixel text-amber-200 mb-3">
                CROWN CHAMPION
              </p>
              <p className="text-xs sm:text-sm font-body text-slate-200 mb-5 leading-relaxed">
                You successfully held the royal crown for 30 uninterrupted seconds! You outsmarted the rival bot and claimed the arena throne.
              </p>
              <div className="bg-slate-950/80 border-2 border-amber-400/60 rounded-xl py-2 px-3 mb-6 inline-flex items-center gap-2 font-pixel text-amber-300 text-xs">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>+100 COINS REWARD!</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleRematch}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-pixel text-xs sm:text-sm rounded-xl pixel-btn shadow-xl cursor-pointer flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> PLAY AGAIN
                </button>
                <button
                  onClick={() => {
                    sound.playClick();
                    onNavigate('menu');
                  }}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-pixel text-xs sm:text-sm rounded-xl border-2 border-slate-600 pixel-btn cursor-pointer"
                >
                  MAIN MENU
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Defeat Modal */}
        {matchState === 'defeat' && (
          <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="max-w-sm sm:max-w-md w-full bg-gradient-to-b from-slate-900 via-slate-900 to-red-950/90 border-4 border-red-500 rounded-3xl p-6 pixel-box text-center shadow-[0_0_50px_rgba(239,68,68,0.6)]">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 bg-gradient-to-b from-red-500 to-rose-700 rounded-2xl flex items-center justify-center border-3 border-red-200 shadow-xl">
                <Skull className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-pixel text-red-400 mb-1">
                DEFEAT!
              </h2>
              <p className="text-sm font-pixel text-red-200 mb-3">
                RIVAL BOT WON THE CROWN
              </p>
              <p className="text-xs sm:text-sm font-body text-slate-300 mb-6 leading-relaxed">
                The rival bot defended the crown for 30 uninterrupted seconds. Don't let it keep the crown—steal it back next round!
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleRematch}
                  className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-pixel text-xs sm:text-sm rounded-xl pixel-btn shadow-xl cursor-pointer flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> REMATCH
                </button>
                <button
                  onClick={() => {
                    sound.playClick();
                    onNavigate('menu');
                  }}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-pixel text-xs sm:text-sm rounded-xl border-2 border-slate-600 pixel-btn cursor-pointer"
                >
                  MAIN MENU
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Crown Challenge Rules & Guide Modal */}
        {showHelp && (
          <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-900 border-4 border-slate-700 rounded-3xl p-5 pixel-box max-h-[90vh] overflow-y-auto">
              <h2 className="text-sm sm:text-base font-pixel text-yellow-400 mb-3 flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" /> CROWN-CAPTURE RULES
              </h2>
              <div className="space-y-3 text-xs font-body text-slate-300 mb-5">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <strong className="text-amber-400 font-pixel text-[10px] block mb-1">1. THE 30-SECOND OBJECTIVE:</strong>
                  <p>
                    Race to grab the crown from the exact center shrine. Hold the crown continuously for <strong>30.0 uninterrupted seconds</strong> to win the match!
                  </p>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <strong className="text-cyan-400 font-pixel text-[10px] block mb-1">2. EQUAL-DISTANCE STARTS:</strong>
                  <p>
                    Both you and the rival bot start at the exact same distance (360px) from the center crown. Bot starts above, you start below.
                  </p>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <strong className="text-rose-400 font-pixel text-[10px] block mb-1">3. PHYSICAL TOUCH & 2-SECOND SLEEP:</strong>
                  <p>
                    To steal the crown from the holder, <strong>physically touch them</strong>! When touched, the previous holder is <strong>stunned asleep for 2 seconds</strong> with floating Zzz symbols and cannot move. The 30-second countdown resets for the new holder!
                  </p>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <strong className="text-emerald-400 font-pixel text-[10px] block mb-1">4. CONTROLS:</strong>
                  <p className="mb-1">
                    <strong>Mobile:</strong> Virtual joystick on bottom-left for smooth 360° movement. Tap SPRINT button on bottom-right for a tactical burst!
                  </p>
                  <p>
                    <strong>Desktop:</strong> Move with <code className="bg-slate-800 px-1 rounded text-amber-300">WASD / Arrow Keys</code>. Press <code className="bg-slate-800 px-1 rounded text-amber-300">Spacebar / Shift</code> to SPRINT!
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  sound.playClick();
                  setShowHelp(false);
                }}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-pixel text-xs rounded-xl pixel-btn cursor-pointer"
              >
                GOT IT, LET'S PLAY!
              </button>
            </div>
          </div>
        )}

        {/* Mobile Gaming Controls Layer */}
        {showTouchControls && (
          <div className="fixed inset-0 pointer-events-none z-30 flex items-end justify-between p-3 sm:p-5 pb-[max(1.25rem,env(safe-area-inset-bottom,16px))] pl-[max(1rem,env(safe-area-inset-left,14px))] pr-[max(1rem,env(safe-area-inset-right,14px))]">
            {/* LEFT SIDE: Responsive Virtual Movement Joystick */}
            <div className="pointer-events-auto select-none touch-none">
              <VirtualJoystick onMove={handleJoystickMove} />
            </div>

            {/* RIGHT SIDE: Tactical SPRINT / DASH Button */}
            <div className="pointer-events-auto select-none touch-none">
              <button
                onTouchStart={(e) => {
                  if (e.cancelable) e.preventDefault();
                  handleDashPress();
                }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleDashPress();
                }}
                disabled={!dashReady}
                className={`w-[clamp(68px,18vw,84px)] h-[clamp(68px,18vw,84px)] rounded-3xl border-3 flex flex-col items-center justify-center gap-0.5 cursor-pointer pixel-btn transition-all ${
                  dashReady
                    ? 'bg-gradient-to-b from-cyan-400 via-sky-500 to-blue-600 border-cyan-200 text-white shadow-[0_6px_0_#0369a1,0_10px_24px_rgba(2,132,199,0.7)] active:translate-y-1.5 active:shadow-[0_2px_0_#0369a1]'
                    : 'bg-slate-900/90 border-slate-700 text-slate-500 cursor-not-allowed opacity-75'
                }`}
                aria-label="Sprint Boost"
              >
                <Zap className={`w-6 h-6 sm:w-7 sm:h-7 ${dashReady ? 'text-yellow-200 fill-yellow-200 animate-pulse' : 'text-slate-500'}`} />
                <span className="font-pixel text-[9px] sm:text-[10px] tracking-wider leading-none">
                  {dashReady ? 'SPRINT' : `${(dashCooldownRatio * 3.0).toFixed(1)}s`}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
