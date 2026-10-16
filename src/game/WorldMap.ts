export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class WorldMap {
  // Balanced Open Arena: 1280 x 1280
  public readonly width: number = 1280;
  public readonly height: number = 1280;
  public readonly tileSize: number = 32;

  // Center coordinate of map
  public readonly centerX: number = 640;
  public readonly centerY: number = 640;

  // Spawn points with closer equal distance (120px) to center crown for quick start
  public readonly botSpawnX: number = 640;
  public readonly botSpawnY: number = 520; // 120px above crown

  public readonly playerSpawnX: number = 640;
  public readonly playerSpawnY: number = 760; // 120px below crown

  // Arena Perimeter Colliders
  public colliders: Rect[] = [];

  constructor() {
    this.buildColliders();
  }

  private buildColliders() {
    // 4 Outer Arena Boundary Walls
    this.colliders = [
      { x: 0, y: 0, w: this.width, h: 40 }, // Top wall
      { x: 0, y: this.height - 40, w: this.width, h: 40 }, // Bottom wall
      { x: 0, y: 0, w: 40, h: this.height }, // Left wall
      { x: this.width - 40, y: 0, w: 40, h: this.height }, // Right wall
    ];
  }

  public checkCollision(x: number, y: number, w: number, h: number): boolean {
    // Arena boundary clamp
    if (x < 42 || x + w > this.width - 42 || y < 42 || y + h > this.height - 42) {
      return true;
    }

    for (const c of this.colliders) {
      if (
        x < c.x + c.w &&
        x + w > c.x &&
        y < c.y + c.h &&
        y + h > c.y
      ) {
        return true;
      }
    }
    return false;
  }

  public render(
    ctx: CanvasRenderingContext2D,
    animTime: number,
    camX: number,
    camY: number,
    viewW: number,
    viewH: number
  ) {
    const left = Math.max(0, camX - 32);
    const top = Math.max(0, camY - 32);
    const right = Math.min(this.width, camX + viewW + 32);
    const bottom = Math.min(this.height, camY + viewH + 32);

    // 1. Lush arena grass base
    ctx.fillStyle = '#15803d';
    ctx.fillRect(left, top, right - left, bottom - top);

    // 2. Checkerboard mowed lawn pattern (32x32 tiles)
    const startTileX = Math.floor(left / this.tileSize);
    const endTileX = Math.ceil(right / this.tileSize);
    const startTileY = Math.floor(top / this.tileSize);
    const endTileY = Math.ceil(bottom / this.tileSize);

    for (let ty = startTileY; ty <= endTileY; ty++) {
      for (let tx = startTileX; tx <= endTileX; tx++) {
        if ((tx + ty) % 2 === 0) {
          ctx.fillStyle = '#16a34a';
          ctx.fillRect(tx * this.tileSize, ty * this.tileSize, this.tileSize, this.tileSize);
        }
      }
    }

    // 3. Subtle Arena Field Lines (Center Line & Boundary Track)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 4;
    // Outer field boundary line
    ctx.strokeRect(60, 60, this.width - 120, this.height - 120);

    // Midfield horizontal divider line
    ctx.beginPath();
    ctx.moveTo(60, this.centerY);
    ctx.lineTo(this.width - 60, this.centerY);
    ctx.stroke();

    // 4. Outer Arena Perimeter Wooden Fences
    ctx.fillStyle = '#78350f';
    // Top fence
    for (let x = 20; x < this.width - 20; x += 32) {
      ctx.fillRect(x, 24, 6, 18);
      ctx.fillRect(x - 2, 28, 36, 4);
    }
    // Bottom fence
    for (let x = 20; x < this.width - 20; x += 32) {
      ctx.fillRect(x, this.height - 38, 6, 18);
      ctx.fillRect(x - 2, this.height - 34, 36, 4);
    }
    // Left fence
    for (let y = 20; y < this.height - 20; y += 32) {
      ctx.fillRect(24, y, 18, 6);
      ctx.fillRect(28, y - 2, 4, 36);
    }
    // Right fence
    for (let y = 20; y < this.height - 20; y += 32) {
      ctx.fillRect(this.width - 38, y, 18, 6);
      ctx.fillRect(this.width - 34, y - 2, 4, 36);
    }

    // 5. Corner decorative stone torch braziers (in the far corners)
    const corners = [
      { x: 90, y: 90 },
      { x: this.width - 90, y: 90 },
      { x: 90, y: this.height - 90 },
      { x: this.width - 90, y: this.height - 90 },
    ];
    for (const c of corners) {
      ctx.fillStyle = '#475569';
      ctx.fillRect(c.x - 10, c.y - 10, 20, 20);
      ctx.fillStyle = '#ef4444';
      const flame = Math.sin((animTime + c.x) * 0.01) * 3;
      ctx.beginPath();
      ctx.arc(c.x, c.y - 4, 7 + flame * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(c.x, c.y - 6, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
