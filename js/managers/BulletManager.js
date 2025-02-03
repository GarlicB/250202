// BulletManager.js
import { MAX_BULLETS } from "../core/constants.js";

export class BulletManager {
  constructor(game) {
    this.game = game;
    this.playerBullets = [];
    this.enemyBullets = [];
  }

  update(dt) {
    for (let bullet of this.playerBullets) {
      bullet.x += bullet.vx * bullet.speed;
      bullet.y += bullet.vy * bullet.speed;
      if (
        bullet.x < 0 ||
        bullet.x > this.game.canvas.width ||
        bullet.y < 0 ||
        bullet.y > this.game.canvas.height
      )
        bullet.remove = true;
      if (bullet.isHoming && bullet.target && !bullet.target.dead) {
        const angle = Math.atan2(
          bullet.target.y - bullet.y,
          bullet.target.x - bullet.x
        );
        bullet.vx += (Math.cos(angle) - bullet.vx) * bullet.trackingStrength;
        bullet.vy += (Math.sin(angle) - bullet.vy) * bullet.trackingStrength;
        const speed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
        bullet.vx = (bullet.vx / speed) * bullet.speed;
        bullet.vy = (bullet.vy / speed) * bullet.speed;
      }
    }
    for (let bullet of this.enemyBullets) {
      bullet.x += bullet.vx * bullet.speed;
      bullet.y += bullet.vy * bullet.speed;
      if (
        bullet.x < 0 ||
        bullet.x > this.game.canvas.width ||
        bullet.y < 0 ||
        bullet.y > this.game.canvas.height
      )
        bullet.remove = true;
    }
    this.playerBullets = this.playerBullets.filter((b) => !b.remove);
    this.enemyBullets = this.enemyBullets.filter((b) => !b.remove);
  }

  spawnPlayerBullet(x, y, vx, vy, options = {}) {
    if (this.playerBullets.length >= MAX_BULLETS) return;
    this.playerBullets.push({
      x,
      y,
      vx,
      vy,
      speed: options.speed || 12,
      size: options.size || this.game.player.bulletSize,
      damage: options.damage || this.game.player.bulletDamage,
      color: options.color || "#fc6",
      remove: false,
    });
  }

  spawnEnemyBullet(x, y, vx, vy) {
    if (this.enemyBullets.length >= MAX_BULLETS) return;
    this.enemyBullets.push({
      x,
      y,
      vx,
      vy,
      speed: 8,
      size: 6,
      damage: 1,
      remove: false,
    });
  }

  spawnHomingLaser(x, y, angle, damage, target) {
    if (this.playerBullets.length >= MAX_BULLETS) return;
    this.playerBullets.push({
      x,
      y,
      vx: Math.cos(angle),
      vy: Math.sin(angle),
      speed: 15,
      size: 12,
      damage,
      isHoming: true,
      target,
      trackingStrength: 0.1,
      remove: false,
    });
  }

  draw(ctx) {
    ctx.save();
    for (let bullet of this.playerBullets) {
      ctx.fillStyle = bullet.color || "#fc6";
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#f66";
    for (let bullet of this.enemyBullets) {
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
