import React, { useRef, useState, useCallback, useEffect } from 'react';

interface VirtualJoystickProps {
  onMove: (vector: { x: number; y: number }) => void;
  className?: string;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  onMove,
  className = ''
}) => {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const knobRef = useRef<HTMLDivElement | null>(null);
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);
  const activePointerIdRef = useRef<number | null>(null);

  // Process movement coordinates relative to center of the joystick base
  const handlePointer = useCallback(
    (clientX: number, clientY: number) => {
      if (!baseRef.current) return;
      const rect = baseRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const baseWidth = rect.width;
      const knobWidth = knobRef.current ? knobRef.current.getBoundingClientRect().width : baseWidth * 0.4;
      const maxRadius = Math.max(16, (baseWidth - knobWidth) / 2);

      let dx = clientX - centerX;
      let dy = clientY - centerY;
      const distance = Math.hypot(dx, dy);

      // Clamp knob movement to maxRadius
      if (distance > maxRadius) {
        dx = (dx / distance) * maxRadius;
        dy = (dy / distance) * maxRadius;
      }

      setKnobPos({ x: dx, y: dy });

      // Calculate normalized 360-degree vector (-1.0 to 1.0)
      const normX = dx / maxRadius;
      const normY = dy / maxRadius;
      onMove({ x: normX, y: normY });
    },
    [onMove]
  );

  const resetKnob = useCallback(() => {
    setIsActive(false);
    setKnobPos({ x: 0, y: 0 });
    activePointerIdRef.current = null;
    onMove({ x: 0, y: 0 });
  }, [onMove]);

  // Pointer event handlers (works for both touch & mouse testing)
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Prevent multiple fingers from hijacking the single joystick
    if (activePointerIdRef.current !== null) return;
    activePointerIdRef.current = e.pointerId;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignored if unsupported
    }

    setIsActive(true);
    handlePointer(e.clientX, e.clientY);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    handlePointer(e.clientX, e.clientY);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
    resetKnob();
  };

  // Prevent mobile browser page rubber-banding / gestures
  useEffect(() => {
    const el = baseRef.current;
    if (!el) return;

    const preventTouch = (e: TouchEvent) => {
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    el.addEventListener('touchstart', preventTouch, { passive: false });
    el.addEventListener('touchmove', preventTouch, { passive: false });
    el.addEventListener('touchend', preventTouch, { passive: false });
    el.addEventListener('touchcancel', preventTouch, { passive: false });

    return () => {
      el.removeEventListener('touchstart', preventTouch);
      el.removeEventListener('touchmove', preventTouch);
      el.removeEventListener('touchend', preventTouch);
      el.removeEventListener('touchcancel', preventTouch);
    };
  }, []);

  return (
    <div className="flex flex-col items-center select-none touch-none">
      {/* High-visibility label badge */}
      <div className="mb-1 px-2.5 py-0.5 bg-slate-950/90 border-2 border-indigo-400 text-indigo-300 font-pixel text-[9px] tracking-wider rounded-full shadow-lg flex items-center gap-1.5 backdrop-blur-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
        <span>MOVE</span>
      </div>

      {/* Outer Joystick Base: Responsive clamp sizing for small phones & landscape */}
      <div
        ref={baseRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onLostPointerCapture={resetKnob}
        style={{ touchAction: 'none' }}
        className={`relative select-none rounded-full flex items-center justify-center cursor-pointer transition-all duration-75 w-[clamp(120px,28vw,148px)] h-[clamp(120px,28vw,148px)] ${
          isActive
            ? 'bg-slate-950/95 border-4 border-cyan-400 shadow-[0_0_24px_rgba(6,182,212,0.6),0_10px_24px_rgba(0,0,0,0.9)] scale-102'
            : 'bg-slate-950/85 border-4 border-indigo-400/90 shadow-[0_8px_24px_rgba(0,0,0,0.85),0_0_14px_rgba(99,102,241,0.35)] backdrop-blur-md'
        } ${className}`}
        aria-label="Virtual Movement Joystick"
      >
        {/* Subtle radial glow background */}
        <div className="absolute inset-2 rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.25)_0%,rgba(15,23,42,0.8)_80%)] pointer-events-none" />

        {/* Directional Cardinal Axes & Arrows */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {/* Subtle crosshair grid */}
          <div className="absolute w-[80%] h-[1.5px] bg-indigo-500/35" />
          <div className="absolute h-[80%] w-[1.5px] bg-indigo-500/35" />

          {/* Directional Arrow Indicators with strong contrast */}
          <div className="absolute top-1.5 flex flex-col items-center">
            <span className="text-[10px] font-pixel text-cyan-400 leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">▲</span>
          </div>
          <div className="absolute bottom-1.5 flex flex-col items-center">
            <span className="text-[10px] font-pixel text-cyan-400 leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">▼</span>
          </div>
          <div className="absolute left-1.5 flex items-center">
            <span className="text-[10px] font-pixel text-cyan-400 leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">◀</span>
          </div>
          <div className="absolute right-1.5 flex items-center">
            <span className="text-[10px] font-pixel text-cyan-400 leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">▶</span>
          </div>

          {/* Center Rest Ring Indicator */}
          <div
            className={`w-10 h-10 rounded-full border-2 border-dashed transition-colors ${
              isActive ? 'border-cyan-400/80' : 'border-indigo-400/40'
            }`}
          />
        </div>

        {/* Floating Joystick Thumb Knob with Dynamic Spring Physics */}
        <div
          ref={knobRef}
          style={{
            transform: `translate3d(${knobPos.x}px, ${knobPos.y}px, 0)`,
            transition: isActive ? 'none' : 'transform 0.16s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}
          className={`w-[clamp(48px,11vw,60px)] h-[clamp(48px,11vw,60px)] rounded-full flex items-center justify-center pointer-events-none border-3 transition-shadow ${
            isActive
              ? 'bg-gradient-to-br from-cyan-400 via-indigo-600 to-indigo-900 border-white shadow-[0_0_20px_rgba(6,182,212,0.8),inset_0_2px_4px_rgba(255,255,255,0.6)] ring-4 ring-cyan-400/40'
              : 'bg-gradient-to-br from-slate-600 via-slate-800 to-slate-950 border-slate-300 shadow-[0_4px_12px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.3)]'
          }`}
        >
          {/* Knob Center Jewel / Directional Dot */}
          <div
            className={`w-4 h-4 rounded-full border border-white/60 flex items-center justify-center transition-all ${
              isActive ? 'bg-cyan-200 shadow-[0_0_8px_#38bdf8]' : 'bg-slate-400'
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-indigo-700' : 'bg-slate-700'}`} />
          </div>
        </div>
      </div>
    </div>
  );
};
