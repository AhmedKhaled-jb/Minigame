export type GameScreen = 'auth' | 'menu' | 'play' | 'inventory' | 'shop' | 'settings';

export interface SkinPalette {
  hair: string;
  skin: string;
  shirt: string;
  pants: string;
  boots: string;
  hat?: string;
  cape?: string;
  accessory?: string;
  accent?: string;
}

export interface Skin {
  id: string;
  name: string;
  description: string;
  price: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  palette: SkinPalette;
  hatType?: 
    | 'cap' 
    | 'helmet' 
    | 'hood' 
    | 'crown' 
    | 'wizard' 
    | 'visor' 
    | 'panda' 
    | 'pirate'
    | 'ninja'
    | 'astronaut'
    | 'viking'
    | 'chef'
    | 'cat'
    | 'detective'
    | 'firefighter'
    | 'none';
  capeType?: 'none' | 'short' | 'long' | 'royal';
}

export interface PlayerData {
  userId: string;
  username: string;
  email: string;
  coins: number;
  ownedSkins: string[];
  equippedSkin: string;
  chestsOpened: string[];
  flowersWatered: number;
  stepsTaken: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorldItem {
  id: string;
  type: 'coin' | 'chest' | 'flower' | 'npc' | 'shop_door';
  x: number;
  y: number;
  width: number;
  height: number;
  collected?: boolean;
  state?: number; // e.g. 0 = unwatered, 1 = watered
  name?: string;
  dialogue?: string;
  coinsReward?: number;
}
