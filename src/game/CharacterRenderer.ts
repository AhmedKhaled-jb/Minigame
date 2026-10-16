import { Skin } from '../types/game';

export type Direction = 
  | 'down' 
  | 'up' 
  | 'left' 
  | 'right' 
  | 'down-left' 
  | 'down-right' 
  | 'up-left' 
  | 'up-right';

export interface AnimState {
  walkPhase: number;  // Continuous angle 0..2*PI
  walkWeight: number; // 0 (full idle) to 1 (full walk)
  idleTime: number;   // Elapsed seconds for idle breathing/blink
}

/**
 * Procedurally draws crisp pixel-art characters with natural walk cycles,
 * 8-directional perspective (including diagonals), idle breathing, eye blinks,
 * and skin accessories.
 */
export function drawPixelCharacter(
  ctx: CanvasRenderingContext2D,
  skin: Skin,
  x: number,
  y: number,
  dir: Direction = 'down',
  anim: AnimState = { walkPhase: 0, walkWeight: 0, idleTime: 0 },
  scale: number = 1
) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(scale, scale);

  const p = skin.palette;
  const { walkPhase, walkWeight, idleTime } = anim;

  // 1. Idle Breathing & Blink Cycles
  // Subtle chest rise (0 to 1px) with gentle sine curve
  const breatheOffset = Math.sin(idleTime * 2.8) * 0.7 * (1 - walkWeight * 0.8);
  // Blink cycle: blinks for ~140ms every 3.8s
  const blinkCycle = idleTime % 3.8;
  const isBlinking = blinkCycle > 3.66;

  // 2. Walk Dynamics: Sine/Cosine mechanics for realistic human gait
  // Leg strides (-3.5 to +3.5 px)
  const legSwing = Math.sin(walkPhase) * 3.2 * walkWeight;
  // Arm swing opposite to leg swing
  const armSwing = -Math.sin(walkPhase) * 2.6 * walkWeight;
  // Subtle vertical bounce: rises at passing phase, dips on contact
  const walkBounce = Math.abs(Math.sin(walkPhase)) * 1.2 * walkWeight;
  // Net vertical displacement combining bounce and breathing
  const bodyY = Math.round(-walkBounce - breatheOffset);

  // Direction classification
  const isFacingUp = dir === 'up' || dir === 'up-left' || dir === 'up-right';
  const isFacingDown = dir === 'down' || dir === 'down-left' || dir === 'down-right';
  const isDiagonal = dir.includes('-');
  const isLeft = dir === 'left' || dir === 'down-left' || dir === 'up-left';
  const isRight = dir === 'right' || dir === 'down-right' || dir === 'up-right';

  // -------------------------------------------------------------
  // Layer 1: Ground Shadow
  // -------------------------------------------------------------
  const shadowScale = 1 - walkBounce * 0.08;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.38)';
  ctx.beginPath();
  ctx.ellipse(8, 22, 6 * shadowScale, 2.8 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();

  // -------------------------------------------------------------
  // Layer 2: Cape (Back layer when facing forward or side)
  // -------------------------------------------------------------
  if (skin.capeType && skin.capeType !== 'none' && p.cape) {
    const capeFlutter = Math.sin(walkPhase * 1.2) * 1.5 * walkWeight;
    ctx.fillStyle = p.cape;

    if (isFacingUp) {
      // Cape on the player's back
      ctx.fillRect(4, 10 + bodyY, 8, 9 + Math.round(capeFlutter));
      if (skin.capeType === 'royal' && p.accent) {
        ctx.fillStyle = p.accent;
        ctx.fillRect(4, 18 + bodyY, 8, 2);
      }
    } else if (dir === 'left') {
      ctx.fillRect(8 + Math.round(capeFlutter), 11 + bodyY, 4, 8);
    } else if (dir === 'right') {
      ctx.fillRect(4 - Math.round(capeFlutter), 11 + bodyY, 4, 8);
    } else if (dir === 'down-left') {
      ctx.fillRect(8, 11 + bodyY, 3, 8);
    } else if (dir === 'down-right') {
      ctx.fillRect(5, 11 + bodyY, 3, 8);
    }
  }

  // -------------------------------------------------------------
  // Layer 3: Legs & Boots
  // -------------------------------------------------------------
  ctx.fillStyle = p.pants;

  if (dir === 'down' || dir === 'up') {
    // Left leg
    const lOff = Math.round(legSwing);
    const rOff = Math.round(-legSwing);

    ctx.fillRect(5, 16 + lOff, 2, 4);
    ctx.fillRect(9, 16 + rOff, 2, 4);

    // Boots
    ctx.fillStyle = p.boots;
    ctx.fillRect(5, 19 + lOff, 2, 3);
    ctx.fillRect(9, 19 + rOff, 2, 3);
  } else if (dir === 'left') {
    // Side view left
    const frontLegOff = Math.round(legSwing);
    const backLegOff = Math.round(-legSwing);

    ctx.fillRect(6 + frontLegOff, 16, 3, 4);
    ctx.fillRect(7 - backLegOff, 16, 3, 4);

    ctx.fillStyle = p.boots;
    ctx.fillRect(5 + frontLegOff, 19, 4, 3);
    ctx.fillRect(7 - backLegOff, 19, 3, 3);
  } else if (dir === 'right') {
    // Side view right
    const frontLegOff = Math.round(-legSwing);
    const backLegOff = Math.round(legSwing);

    ctx.fillRect(7 + frontLegOff, 16, 3, 4);
    ctx.fillRect(6 - backLegOff, 16, 3, 4);

    ctx.fillStyle = p.boots;
    ctx.fillRect(7 + frontLegOff, 19, 4, 3);
    ctx.fillRect(6 - backLegOff, 19, 3, 3);
  } else if (dir === 'down-left' || dir === 'up-left') {
    // 3/4 Diagonal Left
    const lOff = Math.round(legSwing);
    const rOff = Math.round(-legSwing);

    ctx.fillRect(4, 16 + lOff, 3, 4);
    ctx.fillRect(8, 16 + rOff, 3, 4);

    ctx.fillStyle = p.boots;
    ctx.fillRect(4, 19 + lOff, 3, 3);
    ctx.fillRect(8, 19 + rOff, 3, 3);
  } else if (dir === 'down-right' || dir === 'up-right') {
    // 3/4 Diagonal Right
    const lOff = Math.round(-legSwing);
    const rOff = Math.round(legSwing);

    ctx.fillRect(5, 16 + lOff, 3, 4);
    ctx.fillRect(9, 16 + rOff, 3, 4);

    ctx.fillStyle = p.boots;
    ctx.fillRect(5, 19 + lOff, 3, 3);
    ctx.fillRect(9, 19 + rOff, 3, 3);
  }

  // -------------------------------------------------------------
  // Layer 4: Torso / Outfit
  // -------------------------------------------------------------
  ctx.fillStyle = p.shirt;
  ctx.fillRect(4, 10 + bodyY, 8, 7);

  // Shirt Details & Accents
  if (p.accent) {
    ctx.fillStyle = p.accent;
    if (skin.id === 'panda') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(6, 12 + bodyY, 4, 4);
    } else if (skin.id === 'monarch') {
      // Royal golden sash
      if (isLeft) {
        ctx.fillRect(5, 11 + bodyY, 3, 5);
      } else if (isRight) {
        ctx.fillRect(8, 11 + bodyY, 3, 5);
      } else {
        ctx.fillRect(5, 11 + bodyY, 2, 5);
        ctx.fillRect(7, 13 + bodyY, 2, 3);
      }
    } else if (skin.id === 'cyberpunk') {
      ctx.fillRect(isLeft ? 5 : isRight ? 9 : 7, 11 + bodyY, 2, 5);
    } else if (skin.id === 'knight') {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(5, 11 + bodyY, 6, 2);
    }
  }

  // -------------------------------------------------------------
  // Layer 5: Arms & Hands
  // -------------------------------------------------------------
  ctx.fillStyle = p.shirt;
  const lArmOff = Math.round(armSwing);
  const rArmOff = Math.round(-armSwing);

  if (dir === 'down' || dir === 'up') {
    // Left Arm
    ctx.fillRect(2, 11 + bodyY + lArmOff, 2, 5);
    // Right Arm
    ctx.fillRect(12, 11 + bodyY + rArmOff, 2, 5);

    // Hands
    ctx.fillStyle = p.skin;
    ctx.fillRect(2, 15 + bodyY + lArmOff, 2, 2);
    ctx.fillRect(12, 15 + bodyY + rArmOff, 2, 2);
  } else if (dir === 'left') {
    // Left side view - front arm swings
    ctx.fillRect(7 + lArmOff, 11 + bodyY, 2, 5);
    ctx.fillStyle = p.skin;
    ctx.fillRect(7 + lArmOff, 15 + bodyY, 2, 2);
  } else if (dir === 'right') {
    // Right side view - front arm swings
    ctx.fillRect(7 + rArmOff, 11 + bodyY, 2, 5);
    ctx.fillStyle = p.skin;
    ctx.fillRect(7 + rArmOff, 15 + bodyY, 2, 2);
  } else if (dir === 'down-left' || dir === 'up-left') {
    // 3/4 Diagonal Left Arms
    ctx.fillRect(2, 11 + bodyY + lArmOff, 2, 5);
    ctx.fillRect(10, 11 + bodyY + rArmOff, 2, 5);

    ctx.fillStyle = p.skin;
    ctx.fillRect(2, 15 + bodyY + lArmOff, 2, 2);
    ctx.fillRect(10, 15 + bodyY + rArmOff, 2, 2);
  } else if (dir === 'down-right' || dir === 'up-right') {
    // 3/4 Diagonal Right Arms
    ctx.fillRect(4, 11 + bodyY + lArmOff, 2, 5);
    ctx.fillRect(12, 11 + bodyY + rArmOff, 2, 5);

    ctx.fillStyle = p.skin;
    ctx.fillRect(4, 15 + bodyY + lArmOff, 2, 2);
    ctx.fillRect(12, 15 + bodyY + rArmOff, 2, 2);
  }

  // -------------------------------------------------------------
  // Layer 6: Head & Facial Features
  // -------------------------------------------------------------
  ctx.fillStyle = p.skin;
  ctx.fillRect(4, 4 + bodyY, 8, 6);

  // Eyes and Blush Rendering
  if (isFacingDown) {
    if (skin.hatType === 'visor') {
      // Cyber neon visor
      ctx.fillStyle = p.accent || '#06b6d4';
      if (dir === 'down-left') {
        ctx.fillRect(4, 6 + bodyY, 6, 2);
      } else if (dir === 'down-right') {
        ctx.fillRect(6, 6 + bodyY, 6, 2);
      } else {
        ctx.fillRect(4, 6 + bodyY, 8, 2);
      }
    } else if (skin.id === 'pirate') {
      ctx.fillStyle = '#0f172a';
      if (dir === 'down-left') {
        ctx.fillRect(4, 6 + bodyY, 2, 2);
      } else {
        ctx.fillRect(5, 6 + bodyY, 2, 2);
        if (!isBlinking) {
          ctx.fillRect(9, 6 + bodyY, 2, 2);
        }
      }
    } else {
      // Cute pixel eyes with natural blink
      ctx.fillStyle = '#1e293b';

      if (dir === 'down') {
        if (!isBlinking) {
          ctx.fillRect(5, 6 + bodyY, 2, 2);
          ctx.fillRect(9, 6 + bodyY, 2, 2);
        } else {
          // Closed eyelid line
          ctx.fillRect(5, 7 + bodyY, 2, 1);
          ctx.fillRect(9, 7 + bodyY, 2, 1);
        }
        // Cheeks
        ctx.fillStyle = '#fca5a5';
        ctx.fillRect(4, 8 + bodyY, 1, 1);
        ctx.fillRect(11, 8 + bodyY, 1, 1);
      } else if (dir === 'down-left') {
        if (!isBlinking) {
          ctx.fillRect(4, 6 + bodyY, 2, 2);
          ctx.fillRect(8, 6 + bodyY, 2, 2);
        } else {
          ctx.fillRect(4, 7 + bodyY, 2, 1);
          ctx.fillRect(8, 7 + bodyY, 2, 1);
        }
        ctx.fillStyle = '#fca5a5';
        ctx.fillRect(3, 8 + bodyY, 1, 1);
      } else if (dir === 'down-right') {
        if (!isBlinking) {
          ctx.fillRect(6, 6 + bodyY, 2, 2);
          ctx.fillRect(10, 6 + bodyY, 2, 2);
        } else {
          ctx.fillRect(6, 7 + bodyY, 2, 1);
          ctx.fillRect(10, 7 + bodyY, 2, 1);
        }
        ctx.fillStyle = '#fca5a5';
        ctx.fillRect(12, 8 + bodyY, 1, 1);
      }
    }
  } else if (dir === 'left') {
    if (skin.hatType === 'visor') {
      ctx.fillStyle = p.accent || '#06b6d4';
      ctx.fillRect(4, 6 + bodyY, 4, 2);
    } else if (!isBlinking) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(4, 6 + bodyY, 2, 2);
    } else {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(4, 7 + bodyY, 2, 1);
    }
  } else if (dir === 'right') {
    if (skin.hatType === 'visor') {
      ctx.fillStyle = p.accent || '#06b6d4';
      ctx.fillRect(8, 6 + bodyY, 4, 2);
    } else if (!isBlinking) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(10, 6 + bodyY, 2, 2);
    } else {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(10, 7 + bodyY, 2, 1);
    }
  }

  // -------------------------------------------------------------
  // Layer 7: Hair & Headwear
  // -------------------------------------------------------------
  if (isFacingUp) {
    // Back of head has full hair coverage
    ctx.fillStyle = p.hat || p.hair;
    ctx.fillRect(4, 3 + bodyY, 8, 7);
  } else {
    // Hair on top
    ctx.fillStyle = p.hair;
    ctx.fillRect(3, 3 + bodyY, 10, 2);
    if (isFacingDown) {
      ctx.fillRect(3, 5 + bodyY, 1, 3);
      ctx.fillRect(12, 5 + bodyY, 1, 3);
    }
  }

  // Specific Hat Overlays
  if (p.hat) {
    ctx.fillStyle = p.hat;
    if (skin.hatType === 'cap') {
      ctx.fillRect(3, 2 + bodyY, 10, 3);
      if (isFacingDown) ctx.fillRect(2, 4 + bodyY, 12, 1);
      if (isLeft) ctx.fillRect(1, 4 + bodyY, 6, 1);
      if (isRight) ctx.fillRect(9, 4 + bodyY, 6, 1);
    } else if (skin.hatType === 'helmet') {
      ctx.fillRect(3, 1 + bodyY, 10, 5);
      if (p.cape) {
        // Feather plume with bounce
        ctx.fillStyle = p.cape;
        ctx.fillRect(7, -2 + bodyY, 2, 3);
      }
    } else if (skin.hatType === 'hood') {
      ctx.fillRect(3, 1 + bodyY, 10, 5);
      ctx.fillRect(2, 3 + bodyY, 2, 6);
      ctx.fillRect(12, 3 + bodyY, 2, 6);
    } else if (skin.hatType === 'wizard') {
      ctx.fillRect(2, 3 + bodyY, 12, 2);
      ctx.fillRect(4, 0 + bodyY, 8, 3);
      ctx.fillRect(6, -3 + bodyY, 4, 3);
      ctx.fillRect(7, -5 + bodyY, 2, 2);
      if (p.accent) {
        ctx.fillStyle = p.accent;
        ctx.fillRect(7, 2 + bodyY, 2, 2);
      }
    } else if (skin.hatType === 'crown') {
      ctx.fillStyle = '#facc15';
      ctx.fillRect(4, 0 + bodyY, 8, 4);
      ctx.clearRect(6, 0 + bodyY, 1, 2);
      ctx.clearRect(9, 0 + bodyY, 1, 2);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(5, 2 + bodyY, 1, 1);
      ctx.fillRect(7, 2 + bodyY, 2, 1);
      ctx.fillRect(10, 2 + bodyY, 1, 1);
    } else if (skin.hatType === 'panda') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(2, 0 + bodyY, 3, 3);
      ctx.fillRect(11, 0 + bodyY, 3, 3);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(3, 2 + bodyY, 10, 3);
    } else if (skin.hatType === 'pirate') {
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(1, 1 + bodyY, 14, 3);
      ctx.fillRect(4, -1 + bodyY, 8, 2);
      if (p.accent) {
        ctx.fillStyle = p.accent;
        ctx.fillRect(7, 0 + bodyY, 2, 2);
      }
    } else if (skin.hatType === 'ninja') {
      ctx.fillStyle = p.hat || '#dc2626';
      ctx.fillRect(3, 3 + bodyY, 10, 2);
      // mask
      ctx.fillStyle = '#18181b';
      ctx.fillRect(4, 7 + bodyY, 8, 3);
    } else if (skin.hatType === 'astronaut') {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(2, 0 + bodyY, 12, 10);
      // gold visor
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(4, 4 + bodyY, 8, 4);
    } else if (skin.hatType === 'viking') {
      ctx.fillStyle = '#71717a';
      ctx.fillRect(3, 1 + bodyY, 10, 4);
      // white horns
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(1, -1 + bodyY, 2, 4);
      ctx.fillRect(13, -1 + bodyY, 2, 4);
    } else if (skin.hatType === 'chef') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(3, -3 + bodyY, 10, 7);
      ctx.fillRect(2, -2 + bodyY, 12, 4);
    } else if (skin.hatType === 'cat') {
      ctx.fillStyle = p.hat || '#e879f9';
      ctx.fillRect(2, 0 + bodyY, 3, 3);
      ctx.fillRect(11, 0 + bodyY, 3, 3);
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(3, 1 + bodyY, 1, 1);
      ctx.fillRect(12, 1 + bodyY, 1, 1);
    } else if (skin.hatType === 'detective') {
      ctx.fillStyle = p.hat || '#854d0e';
      ctx.fillRect(1, 3 + bodyY, 14, 2);
      ctx.fillRect(4, 0 + bodyY, 8, 3);
    } else if (skin.hatType === 'firefighter') {
      ctx.fillStyle = p.hat || '#eab308';
      ctx.fillRect(2, 2 + bodyY, 12, 3);
      ctx.fillRect(4, 0 + bodyY, 8, 3);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(7, 1 + bodyY, 2, 2);
    } else if (skin.id === 'punk') {
      ctx.fillStyle = p.hair;
      ctx.fillRect(7, -2 + bodyY, 2, 5);
    }
  }

  ctx.restore();
}

/**
 * Utility to render a live animated preview in Wardrobe, Shop, or Main Menu
 */
export function renderSkinPreviewCanvas(
  canvas: HTMLCanvasElement,
  skin: Skin,
  direction: Direction = 'down',
  anim: AnimState | number = 0,
  scale: number = 3.5
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const cx = (canvas.width - 16 * scale) / 2;
  const cy = (canvas.height - 24 * scale) / 2;

  // Adapt legacy integer frame if passed, or full AnimState
  const animState: AnimState = typeof anim === 'number'
    ? {
        walkPhase: (anim / 4) * Math.PI * 2,
        walkWeight: anim > 0 ? 1 : 0,
        idleTime: performance.now() * 0.001
      }
    : anim;

  drawPixelCharacter(ctx, skin, cx, cy, direction, animState, scale);
}
