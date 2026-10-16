import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PlayerData, GameScreen, Skin } from '../types/game';
import { SKINS } from '../data/skins';
import { Character3DViewer } from './Character3DViewer';
import { renderSkinPreviewCanvas } from '../game/CharacterRenderer';
import { sound } from '../services/audio';
import { ArrowLeft, ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface ShopScreenProps {
  playerData: PlayerData;
  onBuySkin?: (skin: Skin) => void;
  onEquipSkin: (skinId: string) => void;
  onNavigate: (screen: GameScreen) => void;
}

// Compact mini thumbnail for the horizontal thumbnail row
const SkinThumbnailItem: React.FC<{
  skin: Skin;
  isSelected: boolean;
  isEquipped: boolean;
  onSelect: () => void;
}> = ({ skin, isSelected, isEquipped, onSelect }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      renderSkinPreviewCanvas(canvasRef.current, skin, 'down', 0, 2.0);
    }
  }, [skin]);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 flex items-center justify-center cursor-pointer transition-all active:scale-95 ${
        isSelected
          ? 'bg-indigo-950 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)] ring-2 ring-amber-400/50'
          : 'bg-slate-900/90 border-slate-700 hover:border-slate-500'
      }`}
      title={skin.name}
    >
      <canvas ref={canvasRef} width={40} height={40} className="w-10 h-10 pointer-events-none" />

      {/* Small green dot indicator if equipped */}
      {isEquipped && (
        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-emerald-400 border border-slate-950 rounded-full" />
      )}
    </button>
  );
};

export const ShopScreen: React.FC<ShopScreenProps> = ({
  playerData,
  onEquipSkin,
  onNavigate
}) => {
  const initialIndex = Math.max(0, SKINS.findIndex((s) => s.id === playerData.equippedSkin));
  const [selectedIndex, setSelectedIndex] = useState<number>(initialIndex);
  const thumbnailsScrollRef = useRef<HTMLDivElement | null>(null);

  const selectedSkin = SKINS[selectedIndex] || SKINS[0];
  const isEquipped = playerData.equippedSkin === selectedSkin.id;

  // Previous skin
  const handlePrev = useCallback(() => {
    sound.playClick();
    setSelectedIndex((prev) => (prev - 1 + SKINS.length) % SKINS.length);
  }, []);

  // Next skin
  const handleNext = useCallback(() => {
    sound.playClick();
    setSelectedIndex((prev) => (prev + 1) % SKINS.length);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext]);

  // Center selected thumbnail in the scrollable row
  useEffect(() => {
    if (!thumbnailsScrollRef.current) return;
    const container = thumbnailsScrollRef.current;
    const button = container.children[selectedIndex] as HTMLElement | undefined;
    if (button) {
      const targetScroll = button.offsetLeft - container.clientWidth / 2 + button.clientWidth / 2;
      container.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }
  }, [selectedIndex]);

  // Equip handler
  const handleEquip = () => {
    if (isEquipped) return;
    sound.playEquip();
    onEquipSkin(selectedSkin.id);
  };

  return (
    <div className="w-screen h-screen bg-slate-950 text-white flex flex-col justify-between p-3 sm:p-5 select-none overflow-hidden touch-none">
      {/* Background styling */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none opacity-40" />

      {/* Top Header: Small Back Button & Skin Title */}
      <header className="relative z-20 flex items-center justify-between w-full max-w-4xl mx-auto mb-2 shrink-0">
        <button
          type="button"
          onClick={() => {
            sound.playClick();
            onNavigate('menu');
          }}
          className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl flex items-center gap-1.5 text-xs font-pixel cursor-pointer active:scale-95 transition-transform shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>BACK</span>
        </button>

        {/* Selected Skin Name & Free Tag */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-xl shadow-md">
          <span className="font-pixel text-xs sm:text-sm text-yellow-400">
            {selectedSkin.name}
          </span>
          <span className="font-pixel text-[10px] text-emerald-400 bg-emerald-950/70 border border-emerald-500/50 px-1.5 py-0.5 rounded">
            FREE
          </span>
        </div>

        {/* Counter */}
        <span className="font-pixel text-[11px] text-slate-400">
          {selectedIndex + 1}/{SKINS.length}
        </span>
      </header>

      {/* ELEMENT 1: Large 3D Character Preview (Swipe to rotate on mobile, drag on desktop) */}
      <div className="relative z-10 flex-1 w-full max-w-4xl mx-auto my-1 flex items-center justify-center min-h-[220px]">
        <div className="w-full h-full max-h-[500px] relative rounded-2xl overflow-hidden border-2 border-indigo-500/30 bg-slate-900/40 shadow-2xl">
          <Character3DViewer skin={selectedSkin} className="w-full h-full" />
        </div>
      </div>

      {/* ELEMENT 2: Skin Switching Controls (Thumbnails, Arrows, and Equip Button) */}
      <div className="relative z-20 w-full max-w-4xl mx-auto flex flex-col gap-2.5 shrink-0 pt-2 pb-1">
        {/* Row of Skin Thumbnails with Previous and Next Arrows */}
        <div className="flex items-center gap-2 w-full">
          {/* Previous Arrow Button */}
          <button
            type="button"
            onClick={handlePrev}
            className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 border-2 border-slate-700 text-white flex items-center justify-center cursor-pointer shadow-md transition-transform"
            title="Previous Skin"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Horizontal Scrollable Thumbnails Carousel */}
          <div
            ref={thumbnailsScrollRef}
            className="flex-1 flex items-center gap-2 overflow-x-auto py-1 px-1 scrollbar-none"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {SKINS.map((skin, idx) => (
              <SkinThumbnailItem
                key={skin.id}
                skin={skin}
                isSelected={idx === selectedIndex}
                isEquipped={playerData.equippedSkin === skin.id}
                onSelect={() => {
                  sound.playClick();
                  setSelectedIndex(idx);
                }}
              />
            ))}
          </div>

          {/* Next Arrow Button */}
          <button
            type="button"
            onClick={handleNext}
            className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 border-2 border-slate-700 text-white flex items-center justify-center cursor-pointer shadow-md transition-transform"
            title="Next Skin"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* One Simple Equip Button */}
        <div className="w-full">
          {isEquipped ? (
            <div className="w-full py-3 sm:py-3.5 bg-emerald-950/80 border-2 border-emerald-500 text-emerald-300 rounded-xl font-pixel text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>EQUIPPED</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleEquip}
              className="w-full py-3 sm:py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-pixel text-xs sm:text-sm rounded-xl pixel-btn flex items-center justify-center gap-2 cursor-pointer shadow-xl border-2 border-emerald-400 transition-all"
            >
              <span>EQUIP</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
