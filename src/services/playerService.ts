import { doc, getDoc, setDoc, handleFirestoreError, OperationType, db } from '../firebase/config';
import { PlayerData } from '../types/game';
import { SKINS, DEFAULT_SKIN_ID } from '../data/skins';

const LOCAL_STORAGE_KEY = 'miniworld_player_progress';

export function getInitialGuestData(id = 'guest_player', name = 'Explorer'): PlayerData {
  return {
    userId: id,
    username: name,
    email: '',
    coins: 100, // starting coins
    ownedSkins: SKINS.map(s => s.id),
    equippedSkin: DEFAULT_SKIN_ID,
    chestsOpened: [],
    flowersWatered: 0,
    stepsTaken: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function saveLocalPlayerProgress(data: PlayerData) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Could not save to localStorage', err);
  }
}

export function loadLocalPlayerProgress(): PlayerData | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlayerData;
    if (parsed) {
      parsed.ownedSkins = Array.from(new Set([...(parsed.ownedSkins || []), ...SKINS.map(s => s.id)]));
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Loads player profile and progress from Firestore.
 * If user has no record yet, initializes with starting balance and default skin.
 */
export async function loadPlayerProfile(userId: string, email = '', displayName = ''): Promise<PlayerData> {
  const userDocRef = doc(db, 'users', userId);
  try {
    const snapshot = await getDoc(userDocRef);
    if (snapshot.exists()) {
      const data = snapshot.data() as Partial<PlayerData>;
      const merged: PlayerData = {
        userId,
        username: data.username || displayName || 'Adventurer',
        email: email || data.email || '',
        coins: typeof data.coins === 'number' ? data.coins : 100,
        ownedSkins: Array.from(new Set([...(Array.isArray(data.ownedSkins) ? data.ownedSkins : []), ...SKINS.map(s => s.id)])),
        equippedSkin: data.equippedSkin || DEFAULT_SKIN_ID,
        chestsOpened: Array.isArray(data.chestsOpened) ? data.chestsOpened : [],
        flowersWatered: typeof data.flowersWatered === 'number' ? data.flowersWatered : 0,
        stepsTaken: typeof data.stepsTaken === 'number' ? data.stepsTaken : 0,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      };
      saveLocalPlayerProgress(merged);
      return merged;
    } else {
      // First time player initializes in Firestore
      const initialName = displayName || (email ? email.split('@')[0] : 'Adventurer');
      const sanitizedName = initialName.replace(/[^a-zA-Z0-9_ ]/g, '').slice(0, 24) || 'Explorer';
      const newPlayer = getInitialGuestData(userId, sanitizedName);
      newPlayer.email = email;

      await setDoc(userDocRef, newPlayer);
      saveLocalPlayerProgress(newPlayer);
      return newPlayer;
    }
  } catch (error) {
    console.error('Failed to load profile from Firestore:', error);
    // If permission or network issue, fallback to local data but also log using standard error handler
    const local = loadLocalPlayerProgress();
    if (local && local.userId === userId) {
      return local;
    }
    // Return a safe initialized state if network failed
    return getInitialGuestData(userId, displayName || 'Explorer');
  }
}

/**
 * Saves player progress to Firestore with defensive limits conforming to blueprint schema.
 */
export async function syncPlayerProgress(data: PlayerData): Promise<boolean> {
  // Always update local cache immediately for snappy responsiveness
  const cleanData: PlayerData = {
    userId: data.userId,
    username: (data.username || 'Explorer').slice(0, 24),
    email: (data.email || '').slice(0, 128),
    coins: Math.max(0, Math.floor(data.coins)),
    ownedSkins: Array.from(new Set(data.ownedSkins)).slice(0, 50),
    equippedSkin: data.equippedSkin || DEFAULT_SKIN_ID,
    chestsOpened: Array.from(new Set(data.chestsOpened || [])).slice(0, 50),
    flowersWatered: Math.max(0, data.flowersWatered || 0),
    stepsTaken: Math.max(0, data.stepsTaken || 0),
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  saveLocalPlayerProgress(cleanData);

  // If user is guest/offline, local save is sufficient
  if (data.userId.startsWith('guest_')) {
    return true;
  }

  const userDocRef = doc(db, 'users', data.userId);
  try {
    await setDoc(userDocRef, cleanData);
    return true;
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.WRITE, `users/${data.userId}`);
    } catch {
      // Caught and handled for logging
    }
    return false;
  }
}
