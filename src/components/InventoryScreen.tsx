import React, { useState, useRef, useEffect } from 'react';
import { PlayerData, GameScreen, Skin } from '../types/game';
import { SKINS, getSkinById } from '../data/skins';
import { renderSkinPreviewCanvas, Direction } from '../game/CharacterRenderer';
import { sound } from '../services/audio';
import confetti from 'canvas-confetti';
import { 
  ArrowLeft, 
  Shirt, 
  Check, 
  ShoppingBag, 
  Coins, 
  Sparkles, 
  ShieldCheck, 
  RotateCw 
} from 'lucide-react';

interface InventoryScreenProps {
  playerData: PlayerData;
  onEquipSkin: (skinId: string) => void;
  onNavigate: (screen: GameScreen) => void;
}

export const InventoryScreen: React.FC<InventoryScreenProps> = ({
  playerData,
  onEquipSkin,
  onNavigate
}) => {
  const [selectedSkinId, setSelectedSkinId] = useState<string>(playerData.equippedSkin);
  const [previewDir, setPreviewDir] = useState<Direction>('down');
  const [isWalking, setIsWalking] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Filter owned skins
  const ownedSkins: Skin[] = SKINS.filter(s => playerData.ownedSkins.includes(s.id));
  const selectedSkin = getSkinById(selectedSkinId);

  // 60fps smooth continuous animation for Inventory Preview
  useEffect(() => {
    let animId: number;
    const startTime = performance.now();

    const loop = (time: number) => {
      const elapsed = (time - startTime) * 0.001;
      if (canvasRef.current) {
        renderSkinPreviewCanvas(
          canvasRef.current,
          selectedSkin,
          previewDir,
          {
            walkPhase: isWalking ? elapsed * 4.6 : 0,
            walkWeight: isWalking ? 0.9 : 0,
            idleTime: elapsed
          },
          5.5
        );
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [selectedSkin, previewDir, isWalking]);

  const handleRotate = () => {
    sound.playClick();
    const dirs: Direction[] = ['down', 'down-right', 'right', 'up-right', 'up', 'up-left', 'left', 'down-left'];
    const nextIdx = (dirs.indexOf(previewDir) + 1) % dirs.length;
    setPreviewDir(dirs[nextIdx]);
  };

  const handleEquip = () => {
    if (selectedSkinId === playerData.equippedSkin) return;
    sound.playEquip();
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.6 }
    });
    onEquipSkin(selectedSkinId);
  };

  const getRarityBadge = (rarity: Skin['rarity']) => {
    switch (rarity) {
      case 'common':
        return <span className="bg-slate-700 text-slate-300 border border-slate-600 px-2 py-0.5 rounded text-[10px] font-pixel">COMMON</span>;
      case 'rare':
        return <span className="bg-sky-600/30 text-sky-300 border border-sky-500/50 px-2 py-0.5 rounded text-[10px] font-pixel">RARE</span>;
      case 'epic':
        return <span className="bg-purple-600/30 text-purple-300 border border-purple-500/50 px-2 py-0.5 rounded text-[10px] font-pixel">EPIC</span>;
      case 'legendary':
        return <span className="bg-amber-500/30 text-amber-300 border border-amber-400/60 px-2 py-0.5 rounded text-[10px] font-pixel">LEGENDARY</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col p-4 sm:p-6 relative select-none">
      <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-40" />

      {/* Header Bar */}
      <header className="relative z-10 max-w-5xl w-full mx-auto flex items-center justify-between mb-6 bg-slate-900/90 border-2 border-slate-700 rounded-2xl p-4 pixel-box">
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
          <Shirt className="w-5 h-5 text-indigo-400" />
          <h1 className="text-sm sm:text-base font-pixel text-yellow-400">
            WARDROBE & CUSTOMIZATION
          </h1>
        </div>

        <div className="flex items-center gap-2 bg-amber-500/15 border-2 border-amber-500/50 px-3 py-1.5 rounded-xl font-pixel text-amber-300 text-xs">
          <Coins className="w-4 h-4 text-amber-400" />
          <span>{playerData.coins}</span>
        </div>
      </header>

      {/* Main Content: Left details/preview, Right owned grid */}
      <main className="relative z-10 max-w-5xl w-full mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 my-auto">
        {/* Left Side: Selected Skin Showcase & 360 preview */}
        <div className="md:col-span-5 bg-slate-900 border-4 border-slate-700 rounded-2xl p-5 pixel-box flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-3">
            {getRarityBadge(selectedSkin.rarity)}
            <button
              onClick={handleRotate}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-600 text-[10px] font-pixel flex items-center gap-1 cursor-pointer"
              title="Rotate Preview Direction"
            >
              <RotateCw className="w-3.5 h-3.5" /> ROTATE
            </button>
          </div>

          {/* Canvas Display */}
          <div className="w-48 h-52 bg-slate-950 border-2 border-indigo-500/40 rounded-2xl flex items-center justify-center relative overflow-hidden mb-4 shadow-inner">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.2)_0%,transparent_70%)] pointer-events-none" />
            <canvas
              ref={canvasRef}
              width={160}
              height={180}
              className="w-40 h-44 relative z-10"
            />
          </div>

          {/* Details */}
          <div className="w-full text-center mb-5">
            <h2 className="text-sm font-pixel text-white mb-1">
              {selectedSkin.name}
            </h2>
            <p className="text-xs text-slate-400 font-body px-2 mb-3 leading-relaxed">
              {selectedSkin.description}
            </p>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-body bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-slate-300">
              <div>
                <span className="text-slate-500 block text-[9px] font-pixel">HEADWEAR</span>
                <span className="capitalize">{selectedSkin.hatType || 'None'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] font-pixel">CAPE STYLE</span>
                <span className="capitalize">{selectedSkin.capeType || 'None'}</span>
              </div>
            </div>
          </div>

          {/* Equip Button */}
          {selectedSkinId === playerData.equippedSkin ? (
            <div className="w-full py-3 bg-slate-800 border-2 border-emerald-500/50 text-emerald-400 rounded-xl font-pixel text-xs flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4" /> CURRENTLY EQUIPPED
            </div>
          ) : (
            <button
              onClick={handleEquip}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-pixel text-xs rounded-xl pixel-btn flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-lg"
            >
              <Check className="w-4 h-4" /> EQUIP THIS SKIN
            </button>
          )}
        </div>

        {/* Right Side: Grid of Owned Skins & Shop Banner */}
        <div className="md:col-span-7 flex flex-col justify-between">
          <div className="bg-slate-900 border-4 border-slate-700 rounded-2xl p-5 pixel-box">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-pixel text-xs text-slate-200">
                UNLOCKED OUTFITS ({ownedSkins.length}/{SKINS.length})
              </h3>
              <span className="text-[11px] text-slate-400 font-body">
                Select an outfit to view & equip
              </span>
            </div>

            {/* Grid of Owned Skins */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {ownedSkins.map((skin) => {
                const isSelected = skin.id === selectedSkinId;
                const isEquipped = skin.id === playerData.equippedSkin;

                return (
                  <button
                    key={skin.id}
                    onClick={() => {
                      sound.playClick();
                      setSelectedSkinId(skin.id);
                    }}
                    className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer relative flex flex-col items-center ${
                      isSelected
                        ? 'bg-indigo-950/80 border-indigo-400 shadow-md ring-2 ring-indigo-500/40'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    {isEquipped && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400" title="Equipped" />
                    )}

                    {/* Color Swatch palette circle */}
                    <div className="w-10 h-10 rounded-full border-2 border-slate-700 mb-2 flex items-center justify-center overflow-hidden" style={{ backgroundColor: skin.palette.shirt }}>
                      <div className="w-5 h-5 rounded-full" style={{ backgroundColor: skin.palette.hat || skin.palette.hair }} />
                    </div>

                    <div className="text-[11px] font-pixel text-white text-center truncate w-full mb-1">
                      {skin.name}
                    </div>

                    <div className="text-[9px] font-pixel text-slate-400 uppercase">
                      {isEquipped ? (
                        <span className="text-emerald-400">EQUIPPED</span>
                      ) : (
                        skin.rarity
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Shop Callout Banner */}
          <div className="mt-4 p-4 bg-gradient-to-r from-amber-950/40 to-slate-900 border-2 border-amber-500/40 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h4 className="text-xs font-pixel text-yellow-300">
                  DISCOVER MORE SKINS
                </h4>
                <p className="text-xs text-slate-400 font-body">
                  Visit the Boutique Shop to unlock knights, wizards, cyber warriors & pandas!
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                onNavigate('shop');
              }}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-pixel text-[11px] rounded-xl pixel-btn shrink-0 cursor-pointer transition-colors"
            >
              VISIT SHOP
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
