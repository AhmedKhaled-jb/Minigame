/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  auth, 
  fbSignOut, 
  onAuthStateChanged, 
  testConnection 
} from './firebase/config';
import { PlayerData, GameScreen, Skin } from './types/game';
import { 
  loadPlayerProfile, 
  syncPlayerProgress, 
  getInitialGuestData, 
  loadLocalPlayerProgress 
} from './services/playerService';
import { AuthScreen } from './components/AuthScreen';
import { MainMenu } from './components/MainMenu';
import { PlayScreen } from './components/PlayScreen';
import { InventoryScreen } from './components/InventoryScreen';
import { ShopScreen } from './components/ShopScreen';
import { SettingsScreen } from './components/SettingsScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<GameScreen>('menu');
  const [playerData, setPlayerData] = useState<PlayerData>(() => {
    return loadLocalPlayerProgress() || getInitialGuestData();
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'offline'>('synced');
  const [bootLoading, setBootLoading] = useState(true);

  // Sync debounce timer ref
  const saveTimeoutRef = useRef<number | null>(null);

  // 1. Initial boot: verify Firestore connection and listen for Auth state
  useEffect(() => {
    testConnection().catch(err => console.warn('Initial connection check notice:', err));

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoggedIn(true);
        setSyncStatus('saving');
        try {
          const cloudData = await loadPlayerProfile(
            user.uid,
            user.email || '',
            user.displayName || ''
          );
          setPlayerData(cloudData);
          setSyncStatus('synced');
        } catch (error) {
          console.error('Failed to sync user data on auth change:', error);
          setSyncStatus('offline');
        }
      } else {
        setIsLoggedIn(false);
        const local = loadLocalPlayerProgress();
        if (local && !local.userId.startsWith('guest_')) {
          // If previous account logged out, reset to guest
          setPlayerData(getInitialGuestData());
        }
        setSyncStatus('offline');
      }
      setBootLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Auto-save handler whenever playerData changes
  const queueSync = useCallback((data: PlayerData) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    setSyncStatus('saving');
    saveTimeoutRef.current = window.setTimeout(async () => {
      const ok = await syncPlayerProgress(data);
      setSyncStatus(ok ? 'synced' : 'offline');
    }, 1200);
  }, []);

  const updatePlayerData = useCallback((updater: (prev: PlayerData) => PlayerData) => {
    setPlayerData(prev => {
      const updated = updater(prev);
      queueSync(updated);
      return updated;
    });
  }, [queueSync]);

  // Auth Handlers
  const handleLoginSuccess = async (userId: string, email: string, displayName: string) => {
    setSyncStatus('saving');
    const cloudData = await loadPlayerProfile(userId, email, displayName);
    setPlayerData(cloudData);
    setIsLoggedIn(true);
    setSyncStatus('synced');
    setCurrentScreen('menu');
  };

  const handlePlayGuest = () => {
    const existing = loadLocalPlayerProgress();
    if (!existing) {
      const guest = getInitialGuestData();
      setPlayerData(guest);
      syncPlayerProgress(guest);
    }
    setCurrentScreen('menu');
  };

  const handleLogout = async () => {
    try {
      await fbSignOut(auth);
    } catch (e) {
      console.warn('Sign out error:', e);
    }
    const guest = getInitialGuestData();
    setPlayerData(guest);
    syncPlayerProgress(guest);
    setIsLoggedIn(false);
    setCurrentScreen('auth');
  };

  // Inventory & Shop Handlers
  const handleEquipSkin = (skinId: string) => {
    updatePlayerData(prev => ({
      ...prev,
      equippedSkin: skinId,
      ownedSkins: prev.ownedSkins.includes(skinId) ? prev.ownedSkins : [...prev.ownedSkins, skinId]
    }));
  };

  const handleBuySkin = (skin: Skin) => {
    updatePlayerData(prev => {
      if (prev.ownedSkins.includes(skin.id)) return prev;
      if (prev.coins < skin.price) return prev;

      return {
        ...prev,
        coins: prev.coins - skin.price,
        ownedSkins: [...prev.ownedSkins, skin.id],
        equippedSkin: skin.id // auto-equip upon purchase
      };
    });
  };

  if (bootLoading) {
    return (
      <div className="w-screen h-screen bg-slate-950 flex flex-col items-center justify-center font-pixel text-yellow-400 gap-4">
        <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs tracking-wider animate-pulse">BOOTING MINIWORLD...</span>
      </div>
    );
  }

  // Render current screen
  switch (currentScreen) {
    case 'auth':
      return (
        <AuthScreen
          onLoginSuccess={handleLoginSuccess}
          onPlayGuest={handlePlayGuest}
        />
      );

    case 'play':
      return (
        <PlayScreen
          playerData={playerData}
          onUpdatePlayerData={updatePlayerData}
          onNavigate={setCurrentScreen}
          syncStatus={syncStatus}
        />
      );

    case 'inventory':
      return (
        <InventoryScreen
          playerData={playerData}
          onEquipSkin={handleEquipSkin}
          onNavigate={setCurrentScreen}
        />
      );

    case 'shop':
      return (
        <ShopScreen
          playerData={playerData}
          onBuySkin={handleBuySkin}
          onEquipSkin={handleEquipSkin}
          onNavigate={setCurrentScreen}
        />
      );

    case 'settings':
      return (
        <SettingsScreen
          playerData={playerData}
          onLogout={handleLogout}
          onNavigate={setCurrentScreen}
          isLoggedIn={isLoggedIn}
          onSyncComplete={() => setSyncStatus('synced')}
        />
      );

    case 'menu':
    default:
      return (
        <MainMenu
          playerData={playerData}
          onNavigate={setCurrentScreen}
          onOpenAuth={() => setCurrentScreen('auth')}
          isLoggedIn={isLoggedIn}
        />
      );
  }
}
