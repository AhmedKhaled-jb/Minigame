import { PlayerData, Skin } from '../types/game';
import { WorldMap } from './WorldMap';
import { drawPixelCharacter, Direction, AnimState } from './CharacterRenderer';
import { sound } from '../services/audio';
import { getSkinById } from '../data/skins';

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  opacity: number;
  life: number;
}

export interface TouchRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface CrownSparkle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export interface SleepParticle {
  id: string;
  x: number;
  y: number;
  baseX: number;
  size: number;
  text: string;
  opacity: number;
  life: number;
  maxLife: number;
  target: 'player' | 'bot';
}

export type CrownHolder = 'none' | 'player' | 'bot';
export type MatchState = 'countdown' | 'active' | 'victory' | 'defeat';

export class GameEngine {
  public map: WorldMap;

  // Player state: starts close below crown (120px away)
  public playerX: number;
  public playerY: number;
  public playerDir: Direction = 'up';
  public isMoving: boolean = false;
  public baseSpeed: number = 3.3;
  public playerSpeed: number = 3.3;
  public playerStunTime: number = 0; // 2 seconds stun when crown is stolen

  // Player Dash Boost (gives exciting tactical mobile chase play)
  public isDashing: boolean = false;
  public dashDuration: number = 0;
  public dashCooldown: number = 0;

  public animState: AnimState = {
    walkPhase: 0,
    walkWeight: 0,
    idleTime: 0
  };

  // Bot state: starts close above crown (120px away)
  public botX: number;
  public botY: number;
  public botDir: Direction = 'down';
  public botSpeed: number = 3.1; // Balanced fair speed
  public botStunTime: number = 0; // 2 seconds stun when crown is stolen
  public botSkin: Skin;
  public botAnimState: AnimState = {
    walkPhase: 0,
    walkWeight: 0,
    idleTime: 0
  };

  // Crown Challenge State
  public crownHolder: CrownHolder = 'none';
  public crownX: number;
  public crownY: number;
  public playerHoldTimer: number = 30.0; // 30.0s countdown when player holds crown
  public botHoldTimer: number = 30.0;    // 30.0s countdown when bot holds crown
  public matchState: MatchState = 'countdown';
  public countdownTimer: number = 5.0; // 5-second pre-match countdown
  public lastAnnouncedNumber: number = 6;

  // Active inputs
  public keys: { [key: string]: boolean } = {};
  public touchVector: { x: number; y: number } = { x: 0, y: 0 };

  // Visual effects
  public floatingTexts: FloatingText[] = [];
  public touchRipples: TouchRipple[] = [];
  public crownSparkles: CrownSparkle[] = [];
  public sleepParticles: SleepParticle[] = [];

  // Callbacks
  public onCoinsChanged?: (newCoins: number) => void;
  public onMatchEnd?: (winner: 'player' | 'bot') => void;

  private playerData: PlayerData;
  private activeSkin: Skin;

  constructor(playerData: PlayerData, activeSkin: Skin) {
    this.playerData = playerData;
    this.activeSkin = activeSkin;
    this.map = new WorldMap();

    // Set close equidistant spawns (120px each) to center crown (640, 640)
    this.crownX = this.map.centerX;
    this.crownY = this.map.centerY;

    this.playerX = this.map.playerSpawnX - 12; // 640 - 12 = 628, Y = 760 - 14 = 746
    this.playerY = this.map.playerSpawnY - 14;

    this.botX = this.map.botSpawnX - 12; // 640 - 12 = 628, Y = 520 - 14 = 506
    this.botY = this.map.botSpawnY - 14;

    // Distinctive rival knight skin for bot
    this.botSkin = getSkinById('sir_valiant');
  }

  public resetMatch() {
    this.crownHolder = 'none';
    this.crownX = this.map.centerX;
    this.crownY = this.map.centerY;

    // Reset close equidistant spawns (120px each) for quick round start
    this.playerX = this.map.playerSpawnX - 12;
    this.playerY = this.map.playerSpawnY - 14;
    this.playerDir = 'up';
    this.playerStunTime = 0;
    this.playerHoldTimer = 30.0;
    this.isDashing = false;
    this.dashDuration = 0;
    this.dashCooldown = 0;

    this.botX = this.map.botSpawnX - 12;
    this.botY = this.map.botSpawnY - 14;
    this.botDir = 'down';
    this.botStunTime = 0;
    this.botHoldTimer = 30.0;

    this.matchState = 'countdown';
    this.countdownTimer = 5.0;
    this.lastAnnouncedNumber = 6;

    this.floatingTexts = [];
    this.touchRipples = [];
    this.crownSparkles = [];
    this.sleepParticles = [];
  }

  public updatePlayerData(data: PlayerData, skin: Skin) {
    this.playerData = data;
    this.activeSkin = skin;
  }

  public handleKeyDown(code: string) {
    if (this.matchState !== 'active') return;
    this.keys[code] = true;
    if (code === 'Space' || code === 'ShiftLeft' || code === 'KeyE') {
      this.triggerDash();
    }
  }

  public handleKeyUp(code: string) {
    this.keys[code] = false;
  }

  public setTouchDirection(dx: number, dy: number) {
    if (this.matchState !== 'active') {
      this.touchVector = { x: 0, y: 0 };
      return;
    }
    this.touchVector = { x: dx, y: dy };
  }

  public triggerDash(): boolean {
    if (this.matchState !== 'active' || this.playerStunTime > 0 || this.dashCooldown > 0 || this.isDashing) return false;
    this.isDashing = true;
    this.dashDuration = 0.8;
    this.dashCooldown = 3.0;
    sound.playSteal();
    this.addFloatingText('SPRINT!', this.playerX + 12, this.playerY - 16, '#38bdf8');
    return true;
  }

  /**
   * Handle direct touchscreen tap on game canvas
   */
  public handleScreenTouch(
    screenX: number,
    screenY: number,
    canvasWidth: number,
    canvasHeight: number,
    interactionType: 'tap' | 'hold' | 'drag'
  ): boolean {
    if (this.matchState !== 'active') return false;
    let camX = this.playerX + 12 - canvasWidth / 2;
    let camY = this.playerY + 14 - canvasHeight / 2;
    camX = Math.max(0, Math.min(this.map.width - canvasWidth, camX));
    camY = Math.max(0, Math.min(this.map.height - canvasHeight, camY));

    const worldX = screenX + camX;
    const worldY = screenY + camY;

    if (interactionType === 'tap') {
      this.addTouchRipple(worldX, worldY, 'rgba(56, 189, 248, 0.7)', 32);

      // Tap directly on bot when nearby to steal
      const distToBot = Math.hypot(worldX - (this.botX + 12), worldY - (this.botY + 14));
      if (distToBot < 48) {
        const playerToBot = Math.hypot((this.playerX + 12) - (this.botX + 12), (this.playerY + 14) - (this.botY + 14));
        if (playerToBot < 54 && this.crownHolder === 'bot') {
          this.stealCrown('player');
          return true;
        }
      }

      // Tap on crown when nearby to pick up
      if (this.crownHolder === 'none') {
        const distToCrown = Math.hypot(worldX - this.crownX, worldY - this.crownY);
        if (distToCrown < 44) {
          const playerToCrown = Math.hypot((this.playerX + 12) - this.crownX, (this.playerY + 14) - this.crownY);
          if (playerToCrown < 50) {
            this.claimCrown('player');
            return true;
          }
        }
      }
    }

    return false;
  }

  private claimCrown(claimant: 'player' | 'bot') {
    if (this.crownHolder !== 'none' || this.matchState !== 'active') return;

    this.crownHolder = claimant;
    sound.playCrownGrab();

    if (claimant === 'player') {
      this.playerHoldTimer = 30.0;
      this.addFloatingText('👑 CROWN CLAIMED! HOLD FOR 30s!', this.playerX + 12, this.playerY - 24, '#facc15');
      this.addCrownSparkles(this.playerX + 12, this.playerY + 14, 25, '#facc15');
    } else {
      this.botHoldTimer = 30.0;
      this.addFloatingText('👑 BOT CLAIMED THE CROWN!', this.botX + 12, this.botY - 24, '#ef4444');
      this.addCrownSparkles(this.botX + 12, this.botY + 14, 25, '#ef4444');
    }
  }

  private stealCrown(newHolder: 'player' | 'bot') {
    if (this.matchState !== 'active') return;

    sound.playSteal();
    sound.playSleep();

    if (newHolder === 'player') {
      // Player steals from bot: Bot gets stunned / put to sleep for 2.0s!
      this.crownHolder = 'player';
      this.playerHoldTimer = 30.0; // Reset countdown to fresh 30.0s
      this.botStunTime = 2.0;       // Stun bot for 2 seconds

      this.addFloatingText('👑 CROWN STOLEN! BOT ASLEEP (2s)!', this.playerX + 12, this.playerY - 26, '#facc15');
      this.addCrownSparkles(this.playerX + 12, this.playerY + 14, 25, '#facc15');
      this.spawnSleepBurst('bot');
    } else {
      // Bot steals from player: Player gets stunned / put to sleep for 2.0s!
      this.crownHolder = 'bot';
      this.botHoldTimer = 30.0;    // Reset countdown to fresh 30.0s
      this.playerStunTime = 2.0;    // Stun player for 2 seconds

      this.addFloatingText('👑 BOT STOLE CROWN! YOU SLEEP (2s)!', this.playerX + 12, this.playerY - 26, '#ef4444');
      this.addCrownSparkles(this.botX + 12, this.botY + 14, 25, '#ef4444');
      this.spawnSleepBurst('player');
    }
  }

  private spawnSleepBurst(target: 'player' | 'bot') {
    for (let i = 0; i < 5; i++) {
      const baseX = target === 'player' ? this.playerX + 12 : this.botX + 12;
      const baseY = target === 'player' ? this.playerY - 6 : this.botY - 6;
      this.sleepParticles.push({
        id: Math.random().toString(),
        x: baseX + (Math.random() - 0.5) * 16,
        y: baseY - i * 8,
        baseX,
        size: 10 + i * 2,
        text: i % 2 === 0 ? 'Z' : 'z',
        opacity: 1,
        life: 1400 + i * 200,
        maxLife: 1600 + i * 200,
        target
      });
    }
  }

  public update(deltaTime: number) {
    const dtSeconds = deltaTime * 0.001;

    // 0. Pre-Match 5-Second Countdown
    if (this.matchState === 'countdown') {
      this.countdownTimer -= dtSeconds;

      // Keep both characters strictly locked at their starting positions
      this.playerX = this.map.playerSpawnX - 12;
      this.playerY = this.map.playerSpawnY - 14;
      this.playerDir = 'up';
      this.isMoving = false;
      this.animState.walkWeight = 0;

      this.botX = this.map.botSpawnX - 12;
      this.botY = this.map.botSpawnY - 14;
      this.botDir = 'down';
      this.botAnimState.walkWeight = 0;

      // Play audio beep on each countdown number: 5, 4, 3, 2, 1
      const currentNumber = Math.max(1, Math.ceil(this.countdownTimer));
      if (currentNumber < this.lastAnnouncedNumber && currentNumber >= 1) {
        this.lastAnnouncedNumber = currentNumber;
        sound.playCountdownBeep(false);
      }

      // Start match after 1 reaches 0
      if (this.countdownTimer <= 0) {
        this.countdownTimer = 0;
        this.matchState = 'active';
        sound.playCountdownBeep(true);
      }

      this.updateParticles(deltaTime);
      return;
    }

    if (this.matchState !== 'active') {
      this.updateParticles(deltaTime);
      return;
    }

    // 1. Advance Idle Timers
    this.animState.idleTime += dtSeconds;
    this.botAnimState.idleTime += dtSeconds;

    // 2. Dash cooldown and duration
    if (this.dashCooldown > 0) {
      this.dashCooldown = Math.max(0, this.dashCooldown - dtSeconds);
    }
    if (this.dashDuration > 0) {
      this.dashDuration = Math.max(0, this.dashDuration - dtSeconds);
      if (this.dashDuration <= 0) {
        this.isDashing = false;
      }
    }

    // 3. Stun timers countdown (cannot move while stunned)
    if (this.playerStunTime > 0) {
      this.playerStunTime = Math.max(0, this.playerStunTime - dtSeconds);
      if (Math.random() < 0.15) {
        this.sleepParticles.push({
          id: Math.random().toString(),
          x: this.playerX + 12 + (Math.random() - 0.5) * 12,
          y: this.playerY - 10,
          baseX: this.playerX + 12,
          size: 11 + Math.random() * 4,
          text: Math.random() > 0.5 ? 'Z' : 'z',
          opacity: 1,
          life: 1200,
          maxLife: 1200,
          target: 'player'
        });
      }
    }

    if (this.botStunTime > 0) {
      this.botStunTime = Math.max(0, this.botStunTime - dtSeconds);
      if (Math.random() < 0.15) {
        this.sleepParticles.push({
          id: Math.random().toString(),
          x: this.botX + 12 + (Math.random() - 0.5) * 12,
          y: this.botY - 10,
          baseX: this.botX + 12,
          size: 11 + Math.random() * 4,
          text: Math.random() > 0.5 ? 'Z' : 'z',
          opacity: 1,
          life: 1200,
          maxLife: 1200,
          target: 'bot'
        });
      }
    }

    // 4. Update Player Movement (if not stunned)
    this.updatePlayerMovement(deltaTime);

    // 5. Update Bot AI Movement (using direct shortest path navigation)
    this.updateBotAI(deltaTime);

    // 6. Crown Position & Continuous 30-Second Timers
    if (this.crownHolder === 'player') {
      this.crownX = this.playerX + 12;
      this.crownY = this.playerY - 14;

      this.playerHoldTimer -= dtSeconds;
      if (this.playerHoldTimer <= 0) {
        this.playerHoldTimer = 0;
        this.triggerVictory();
        return;
      }
    } else if (this.crownHolder === 'bot') {
      this.crownX = this.botX + 12;
      this.crownY = this.botY - 14;

      this.botHoldTimer -= dtSeconds;
      if (this.botHoldTimer <= 0) {
        this.botHoldTimer = 0;
        this.triggerDefeat();
        return;
      }
    } else {
      // Standalone crown rests at the center of the arena (640, 640)
      this.crownX = this.map.centerX;
      this.crownY = this.map.centerY;
    }

    // 7. Check Crown Pickups (when crown is unclaimed at center)
    if (this.crownHolder === 'none') {
      const playerDistToCrown = Math.hypot((this.playerX + 12) - this.crownX, (this.playerY + 14) - this.crownY);
      const botDistToCrown = Math.hypot((this.botX + 12) - this.crownX, (this.botY + 14) - this.crownY);

      if (playerDistToCrown < 26 && this.playerStunTime <= 0) {
        this.claimCrown('player');
      } else if (botDistToCrown < 26 && this.botStunTime <= 0) {
        this.claimCrown('bot');
      }
    }

    // 8. Check Physical Touching / Stealing
    const touchDist = Math.hypot((this.playerX + 12) - (this.botX + 12), (this.playerY + 14) - (this.botY + 14));
    if (touchDist < 28) {
      if (this.crownHolder === 'bot' && this.playerStunTime <= 0) {
        // Player touches Bot holding crown: Player steals crown! Bot is stunned for 2s
        this.stealCrown('player');
      } else if (this.crownHolder === 'player' && this.botStunTime <= 0) {
        // Bot touches Player holding crown: Bot steals crown! Player is stunned for 2s
        this.stealCrown('bot');
      }
    }

    // 9. Particle & Visual Updates
    this.updateParticles(deltaTime);
  }

  private updatePlayerMovement(deltaTime: number) {
    if (this.playerStunTime > 0) {
      this.isMoving = false;
      this.animState.walkWeight += (0 - this.animState.walkWeight) * Math.min(1, deltaTime * 0.02);
      return;
    }

    let dx = 0;
    let dy = 0;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) dy -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) dy += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1;

    if (this.touchVector.x !== 0 || this.touchVector.y !== 0) {
      dx = this.touchVector.x;
      dy = this.touchVector.y;
    }

    const mag = Math.hypot(dx, dy);
    if (mag > 0.08) {
      this.isMoving = true;
      const speedMultiplier = this.isDashing ? 1.45 : 1.0;
      const curSpeed = this.baseSpeed * speedMultiplier * Math.min(1, mag);
      const moveX = (dx / mag) * curSpeed;
      const moveY = (dy / mag) * curSpeed;

      this.playerDir = this.calculateFacing(moveX, moveY);

      const newX = this.playerX + moveX;
      if (!this.map.checkCollision(newX, this.playerY, 24, 28)) {
        this.playerX = newX;
      }
      const newY = this.playerY + moveY;
      if (!this.map.checkCollision(this.playerX, newY, 24, 28)) {
        this.playerY = newY;
      }

      this.animState.walkWeight += (1 - this.animState.walkWeight) * Math.min(1, deltaTime * 0.02);
      this.animState.walkPhase = (this.animState.walkPhase + (curSpeed / this.baseSpeed) * deltaTime * 0.013) % (Math.PI * 2);
    } else {
      this.isMoving = false;
      this.animState.walkWeight += (0 - this.animState.walkWeight) * Math.min(1, deltaTime * 0.016);
      this.animState.walkPhase *= Math.max(0, 1 - deltaTime * 0.01);
    }
  }

  /**
   * Direct Shortest Path Bot Navigation:
   * Moves directly toward the crown or directly chases the player without taking unnecessary detours.
   */
  private updateBotAI(deltaTime: number) {
    if (this.botStunTime > 0) {
      this.botAnimState.walkWeight += (0 - this.botAnimState.walkWeight) * Math.min(1, deltaTime * 0.02);
      return;
    }

    let targetX = this.crownX;
    let targetY = this.crownY;

    if (this.crownHolder === 'none') {
      // 1. Direct shortest path straight to the crown at the center
      targetX = this.crownX;
      targetY = this.crownY;
    } else if (this.crownHolder === 'player') {
      // 2. Direct shortest path straight to chase and tag the player
      targetX = this.playerX + 12;
      targetY = this.playerY + 14;
    } else {
      // 3. Bot has the crown: move directly away from player without detours
      const diffFromPlayerX = (this.botX + 12) - (this.playerX + 12);
      const diffFromPlayerY = (this.botY + 14) - (this.playerY + 14);
      const playerDist = Math.hypot(diffFromPlayerX, diffFromPlayerY) || 1;

      let fleeDirX = diffFromPlayerX / playerDist;
      let fleeDirY = diffFromPlayerY / playerDist;

      // Wall avoidance: slide along boundary rather than pushing into walls
      const margin = 70;
      if (this.botX < margin && fleeDirX < 0) fleeDirX = 0;
      if (this.botX > this.map.width - margin && fleeDirX > 0) fleeDirX = 0;
      if (this.botY < margin && fleeDirY < 0) fleeDirY = 0;
      if (this.botY > this.map.height - margin && fleeDirY > 0) fleeDirY = 0;

      targetX = (this.botX + 12) + fleeDirX * 100;
      targetY = (this.botY + 14) + fleeDirY * 100;
    }

    // Direct movement toward target along the shortest straight line
    const diffX = targetX - (this.botX + 12);
    const diffY = targetY - (this.botY + 14);
    const dist = Math.hypot(diffX, diffY);

    if (dist > 3) {
      const dirX = diffX / dist;
      const dirY = diffY / dist;

      const moveX = dirX * this.botSpeed;
      const moveY = dirY * this.botSpeed;

      this.botDir = this.calculateFacing(diffX, diffY);

      // Direct movement: move on clear path, sliding on clear axis if touching a boundary
      const nextX = this.botX + moveX;
      const nextY = this.botY + moveY;
      const collidesX = this.map.checkCollision(nextX, this.botY, 24, 28);
      const collidesY = this.map.checkCollision(this.botX, nextY, 24, 28);

      if (!collidesX) {
        this.botX = nextX;
      }
      if (!collidesY) {
        this.botY = nextY;
      }

      this.botAnimState.walkWeight += (1 - this.botAnimState.walkWeight) * Math.min(1, deltaTime * 0.02);
      this.botAnimState.walkPhase = (this.botAnimState.walkPhase + (this.botSpeed / 3.1) * deltaTime * 0.013) % (Math.PI * 2);
    } else {
      this.botAnimState.walkWeight += (0 - this.botAnimState.walkWeight) * Math.min(1, deltaTime * 0.016);
    }
  }

  private calculateFacing(dx: number, dy: number): Direction {
    const deg = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
    if (deg >= 337.5 || deg < 22.5) return 'right';
    if (deg >= 22.5 && deg < 67.5) return 'down-right';
    if (deg >= 67.5 && deg < 112.5) return 'down';
    if (deg >= 112.5 && deg < 157.5) return 'down-left';
    if (deg >= 157.5 && deg < 202.5) return 'left';
    if (deg >= 202.5 && deg < 247.5) return 'up-left';
    if (deg >= 247.5 && deg < 292.5) return 'up';
    return 'up-right';
  }

  private triggerVictory() {
    this.matchState = 'victory';
    sound.playVictory();
    this.playerData.coins += 100;
    if (this.onCoinsChanged) this.onCoinsChanged(this.playerData.coins);
    if (this.onMatchEnd) this.onMatchEnd('player');
  }

  private triggerDefeat() {
    this.matchState = 'defeat';
    sound.playDefeat();
    if (this.onMatchEnd) this.onMatchEnd('bot');
  }

  private updateParticles(deltaTime: number) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 0.6;
      ft.life -= deltaTime;
      ft.opacity = Math.max(0, ft.life / 1000);
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }

    for (let i = this.touchRipples.length - 1; i >= 0; i--) {
      const rip = this.touchRipples[i];
      rip.life -= deltaTime;
      const progress = 1 - (rip.life / rip.maxLife);
      rip.radius = 4 + (rip.maxRadius - 4) * progress;
      if (rip.life <= 0) this.touchRipples.splice(i, 1);
    }

    for (let i = this.crownSparkles.length - 1; i >= 0; i--) {
      const sp = this.crownSparkles[i];
      sp.x += sp.vx;
      sp.y += sp.vy;
      sp.life -= deltaTime;
      if (sp.life <= 0) this.crownSparkles.splice(i, 1);
    }

    for (let i = this.sleepParticles.length - 1; i >= 0; i--) {
      const sp = this.sleepParticles[i];
      sp.life -= deltaTime;
      sp.y -= 0.55;
      const sway = Math.sin((sp.maxLife - sp.life) * 0.005) * 6;
      const currentTargetX = sp.target === 'player' ? this.playerX + 12 : this.botX + 12;
      sp.x = currentTargetX + sway;
      sp.opacity = Math.max(0, sp.life / sp.maxLife);
      if (sp.life <= 0) this.sleepParticles.splice(i, 1);
    }
  }

  public addCrownSparkles(x: number, y: number, count = 10, color = '#facc15') {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.8 + Math.random() * 2.2;
      this.crownSparkles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5,
        color,
        size: 2 + Math.random() * 3,
        life: 400 + Math.random() * 300,
        maxLife: 700
      });
    }
  }

  public addTouchRipple(x: number, y: number, color = '#38bdf8', maxRadius = 38) {
    this.touchRipples.push({
      x,
      y,
      radius: 4,
      maxRadius,
      color,
      life: 380,
      maxLife: 380
    });
  }

  public addFloatingText(text: string, x: number, y: number, color = '#ffffff') {
    this.floatingTexts.push({
      id: Math.random().toString(),
      text,
      x,
      y,
      color,
      opacity: 1,
      life: 1400
    });
  }

  public render(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, animTime: number) {
    ctx.save();

    // Camera smoothly centers on Player
    let camX = this.playerX + 12 - canvasWidth / 2;
    let camY = this.playerY + 14 - canvasHeight / 2;
    camX = Math.max(0, Math.min(this.map.width - canvasWidth, camX));
    camY = Math.max(0, Math.min(this.map.height - canvasHeight, camY));

    ctx.translate(-Math.round(camX), -Math.round(camY));

    // 1. Render World Arena
    this.map.render(ctx, animTime, camX, camY, canvasWidth, canvasHeight);

    // 2. Render Touch Ripples
    for (const rip of this.touchRipples) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, rip.life / rip.maxLife) * 0.9;
      ctx.strokeStyle = rip.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Render Crown Sparkles
    for (const sp of this.crownSparkles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, sp.life / sp.maxLife);
      ctx.fillStyle = sp.color;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 4. Render Bot Character
    this.renderBot(ctx);

    // 5. Render Player Character
    this.renderPlayer(ctx);

    // 6. Render Crown Entity (SHOWS ONLY THE STANDALONE 3D CROWN ITSELF)
    this.renderCrown(ctx, animTime);

    // 7. Render Sleep / Stun "Zzz" Particles
    this.renderSleepParticles(ctx);

    // 8. Render Floating Texts
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = ft.opacity;
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(ft.text, ft.x + 1, ft.y + 1);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    ctx.restore();

    // 9. Screen-Space Offscreen Bot Arrow Indicator:
    // Points toward the bot whenever the bot is outside the player's visible screen.
    // Hides the arrow when the bot is visible.
    this.renderOffscreenBotIndicator(ctx, canvasWidth, canvasHeight, camX, camY, animTime);
  }

  private renderPlayer(ctx: CanvasRenderingContext2D) {
    // Draw Player sprite
    drawPixelCharacter(
      ctx,
      this.activeSkin,
      this.playerX,
      this.playerY,
      this.playerDir,
      this.animState,
      1.5
    );

    // Floating Username & Status Badge
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';

    if (this.playerStunTime > 0) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(this.playerX - 24, this.playerY - 26, 72, 14);
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(this.playerX - 24, this.playerY - 26, 72, 14);

      ctx.fillStyle = '#93c5fd';
      ctx.fillText(`💤 STUNNED ${this.playerStunTime.toFixed(1)}s`, this.playerX + 12, this.playerY - 16);
    } else {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(this.playerX - 20, this.playerY - 14, 64, 12);
      ctx.fillStyle = this.crownHolder === 'player' ? '#fde047' : '#f8fafc';
      ctx.fillText(this.playerData.username || 'YOU', this.playerX + 12, this.playerY - 5);
    }
  }

  private renderBot(ctx: CanvasRenderingContext2D) {
    // Draw Bot sprite
    drawPixelCharacter(
      ctx,
      this.botSkin,
      this.botX,
      this.botY,
      this.botDir,
      this.botAnimState,
      1.5
    );

    // Floating Bot Name & Status Badge
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';

    if (this.botStunTime > 0) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(this.botX - 24, this.botY - 26, 72, 14);
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(this.botX - 24, this.botY - 26, 72, 14);

      ctx.fillStyle = '#fca5a5';
      ctx.fillText(`💤 ASLEEP ${this.botStunTime.toFixed(1)}s`, this.botX + 12, this.botY - 16);
    } else {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(this.botX - 24, this.botY - 14, 72, 12);
      ctx.fillStyle = this.crownHolder === 'bot' ? '#f87171' : '#fca5a5';
      ctx.fillText('RIVAL BOT', this.botX + 12, this.botY - 5);
    }
  }

  /**
   * Standalone 3D Crown Renderer:
   * Shows ONLY the crown itself with crisp 3D isometric facets and embedded jewels.
   * Completely removes all circular platforms, ground rings, glowing circles, and base markers.
   */
  private renderCrown(ctx: CanvasRenderingContext2D, animTime: number) {
    const isFree = this.crownHolder === 'none';
    const bob = isFree ? Math.sin(animTime * 0.006) * 4 : 0;
    const cx = this.crownX;
    const cy = this.crownY + bob;

    ctx.save();
    ctx.translate(cx, cy);

    // 1. Soft natural ground drop shadow ONLY when floating free in the arena
    if (isFree) {
      const shadowScale = 1 - bob * 0.04;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 16 - bob, 14 * shadowScale, 6 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Standalone 3D Crown Geometry
    // Back Interior Rim (adds 3D cylinder depth)
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#831843'; // Royal crimson interior velvet
    ctx.beginPath();
    ctx.ellipse(0, 1, 11, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3D Back Spikes (shaded in darker gold for perspective)
    ctx.fillStyle = '#b45309';
    ctx.fillRect(-10, -8, 3, 8);
    ctx.fillRect(-5, -11, 3, 11);
    ctx.fillRect(2, -11, 3, 11);
    ctx.fillRect(7, -8, 3, 8);

    // Front Circlet Band (Polished 3D Gold with Bevels)
    // Dark bottom bevel
    ctx.fillStyle = '#713f12';
    ctx.fillRect(-15, 6, 30, 3);
    // Main gold band
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-15, 1, 30, 6);
    // Top highlight bevel
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-14, 1, 28, 2);
    // Right side shadow bevel
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(10, 1, 5, 6);

    // 5 Front 3D Crown Peaks with highlighted & shaded facets
    // Outer Left Peak
    ctx.fillStyle = '#eab308';
    ctx.fillRect(-14, -6, 5, 8);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-14, -6, 2, 8);

    // Mid-Left Peak
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-8, -10, 5, 12);
    ctx.fillStyle = '#fef9c3';
    ctx.fillRect(-8, -10, 2, 12);

    // Center Tall Peak (Hero Peak)
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-3, -15, 6, 17);
    ctx.fillStyle = '#fef9c3';
    ctx.fillRect(-3, -15, 2, 17);
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(1, -15, 2, 17);

    // Mid-Right Peak
    ctx.fillStyle = '#eab308';
    ctx.fillRect(3, -10, 5, 12);
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(6, -10, 2, 12);

    // Outer Right Peak
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(9, -6, 5, 8);
    ctx.fillStyle = '#a16207';
    ctx.fillRect(12, -6, 2, 8);

    // 3D Cut Gemstones
    // Center Ruby
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-2, -9, 4, 5);
    ctx.fillStyle = '#fca5a5';
    ctx.fillRect(-2, -9, 2, 2);
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(0, -6, 2, 2);

    // Left Sapphire
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-7, -5, 3, 4);
    ctx.fillStyle = '#7dd3fc';
    ctx.fillRect(-7, -5, 1, 2);

    // Right Emerald
    ctx.fillStyle = '#16a34a';
    ctx.fillRect(4, -5, 3, 4);
    ctx.fillStyle = '#86efac';
    ctx.fillRect(4, -5, 1, 2);

    // Bottom Band Jewels
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-10, 3, 2, 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-1, 3, 2, 2);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(8, 3, 2, 2);

    // Subtle jewel glint animation at crown center
    const shineTime = (animTime * 0.004) % (Math.PI * 2);
    if (shineTime < 0.6) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-1, -14, 2, 2);
      ctx.fillRect(-2, -13, 4, 1);
      ctx.fillRect(0, -15, 1, 4);
    }

    ctx.restore();
  }

  private renderSleepParticles(ctx: CanvasRenderingContext2D) {
    for (const sp of this.sleepParticles) {
      ctx.save();
      ctx.globalAlpha = sp.opacity;
      ctx.font = `bold ${Math.round(sp.size)}px sans-serif`;
      ctx.fillStyle = sp.target === 'player' ? '#60a5fa' : '#f87171';
      ctx.textAlign = 'center';
      ctx.fillText(sp.text, sp.x, sp.y);
      ctx.restore();
    }
  }

  /**
   * Screen-Space Offscreen Bot Arrow Indicator:
   * Points toward the bot whenever the bot is outside the player's visible screen.
   * Hides the arrow when the bot is visible on screen.
   */
  private renderOffscreenBotIndicator(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    camX: number,
    camY: number,
    animTime: number
  ) {
    if (this.matchState !== 'active') return;

    // Bot bounding box on screen (including status tag above character)
    const botScreenLeft = this.botX - camX;
    const botScreenRight = this.botX + 24 - camX;
    const botScreenTop = this.botY - 26 - camY;
    const botScreenBottom = this.botY + 28 - camY;

    // Check if the bot is visible on the player's screen
    const isBotVisible = (
      botScreenRight >= 0 &&
      botScreenLeft <= canvasWidth &&
      botScreenBottom >= 0 &&
      botScreenTop <= canvasHeight
    );

    // Hide the arrow when the bot is visible
    if (isBotVisible) return;

    // Screen positions of centers
    const screenPlayerX = (this.playerX + 12) - camX;
    const screenPlayerY = (this.playerY + 14) - camY;
    const screenBotX = (this.botX + 12) - camX;
    const screenBotY = (this.botY + 14) - camY;

    // Direction vector from player center to bot center
    const dx = screenBotX - screenPlayerX;
    const dy = screenBotY - screenPlayerY;
    const angle = Math.atan2(dy, dx);
    const dist = Math.hypot(dx, dy);

    // Safe boundaries along screen edges (avoids top HUD bar and bottom screen padding)
    const minX = 32;
    const maxX = canvasWidth - 32;
    const minY = 72;
    const maxY = canvasHeight - 74;

    // Ray origin clamped inside safe area
    const originX = Math.max(minX, Math.min(maxX, screenPlayerX));
    const originY = Math.max(minY, Math.min(maxY, screenPlayerY));

    // Intersection with the safe screen boundary
    let t = Infinity;
    if (dx > 0) {
      t = Math.min(t, (maxX - originX) / dx);
    } else if (dx < 0) {
      t = Math.min(t, (minX - originX) / dx);
    }
    if (dy > 0) {
      t = Math.min(t, (maxY - originY) / dy);
    } else if (dy < 0) {
      t = Math.min(t, (minY - originY) / dy);
    }

    if (!isFinite(t) || t < 0) t = 0;

    let arrowX = originX + dx * t;
    let arrowY = originY + dy * t;

    arrowX = Math.max(minX, Math.min(maxX, arrowX));
    arrowY = Math.max(minY, Math.min(maxY, arrowY));

    // Prevent overlap with mobile bottom-left virtual joystick
    if (arrowY > canvasHeight - 165 && arrowX < 165) {
      if (arrowY >= maxY - 8) {
        arrowX = 170;
      } else {
        arrowY = canvasHeight - 170;
      }
    }

    // Prevent overlap with mobile bottom-right sprint boost button
    if (arrowY > canvasHeight - 150 && arrowX > canvasWidth - 135) {
      if (arrowY >= maxY - 8) {
        arrowX = canvasWidth - 140;
      } else {
        arrowY = canvasHeight - 155;
      }
    }

    // Subtle gentle pulsation along pointer angle
    const pulse = Math.sin(animTime * 0.007) * 3;
    const finalX = arrowX + Math.cos(angle) * pulse;
    const finalY = arrowY + Math.sin(angle) * pulse;

    // Theme according to bot state
    const botHasCrown = this.crownHolder === 'bot';
    const botIsStunned = this.botStunTime > 0;

    const mainColor = botHasCrown ? '#facc15' : (botIsStunned ? '#60a5fa' : '#ef4444');
    const glowColor = botHasCrown ? 'rgba(250, 204, 21, 0.75)' : (botIsStunned ? 'rgba(96, 165, 250, 0.75)' : 'rgba(239, 68, 68, 0.75)');

    ctx.save();
    ctx.translate(finalX, finalY);

    // 1. Arrow Head Pointer (pointing directly toward the bot)
    ctx.save();
    ctx.rotate(angle);

    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 10;

    // Dark high-contrast outer background & border
    ctx.beginPath();
    ctx.moveTo(24, 0);       // Pointer tip
    ctx.lineTo(6, -13);      // Upper wing
    ctx.lineTo(10, -4);      // Inner notch top
    ctx.lineTo(-12, -4);     // Shaft top
    ctx.lineTo(-12, 4);      // Shaft bottom
    ctx.lineTo(10, 4);       // Inner notch bottom
    ctx.lineTo(6, 13);       // Lower wing
    ctx.closePath();

    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.fill();
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Vibrant inner chevron
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(8, -8);
    ctx.lineTo(10, -2);
    ctx.lineTo(-8, -2);
    ctx.lineTo(-8, 2);
    ctx.lineTo(10, 2);
    ctx.lineTo(8, 8);
    ctx.closePath();
    ctx.fillStyle = mainColor;
    ctx.fill();

    ctx.restore(); // Restore rotation for upright text and status badge

    // 2. Upright Status Badge behind the pointer
    const badgeDist = 24;
    const badgeX = -Math.cos(angle) * badgeDist;
    const badgeY = -Math.sin(angle) * badgeDist;

    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 6;

    ctx.beginPath();
    ctx.arc(badgeX, badgeY, 14, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.fill();
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (botHasCrown) {
      ctx.font = '12px sans-serif';
      ctx.fillText('👑', badgeX, badgeY);
    } else if (botIsStunned) {
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#93c5fd';
      ctx.fillText('💤', badgeX, badgeY);
    } else {
      ctx.font = 'bold 8px monospace';
      ctx.fillStyle = '#fca5a5';
      ctx.fillText('BOT', badgeX, badgeY);
    }

    // Distance label in meters
    const meters = Math.max(1, Math.round(dist / 20));
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#f8fafc';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    ctx.fillText(`${meters}m`, badgeX, badgeY + 20);

    ctx.restore();
  }
}
