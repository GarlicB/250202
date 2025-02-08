import { MAX_BULLETS } from "../core/constants.js";

export class BulletManager {
  constructor(game) {
    this.game = game;
    this.playerBullets = [];
    this.enemyBullets = [];
    this.lasers = [];
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
    for (let laser of this.lasers) {
      laser.life -= dt * 2;
      if (laser.life <= 0) laser.remove = true;
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
    this.lasers = this.lasers.filter((l) => !l.remove);
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
      isBeam: options.isBeam || false,
      beamLength: options.beamLength || 0,
      trailEffect: options.trailEffect || false,
      isHoming: options.isHoming || false,
      target: options.target || null,
      trackingStrength: options.trackingStrength || 0.05,
      isChainLightning: options.isChainLightning || false,
      chainData: options.chainData || null,
      isMeteor: options.isMeteor || false,
      explosionRadius: options.explosionRadius || 0,
      burnDamage: options.burnDamage || 0,
      burnDuration: options.burnDuration || 0,
      groundFireDuration: options.groundFireDuration || 0,
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
  spawnLaser(x, y, angle, damage, options = {}) {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const endX = x;
    const endY = -100;
    this.lasers.push({
      startX: x,
      startY: y,
      endX: endX,
      endY: endY,
      angle: angle,
      damage: damage,
      life: options.life || 0.3,
      maxLife: options.life || 0.3,
      width: options.width || 12,
      remove: false,
    });
    const particleCount = Math.floor(options.width || 12);
    this.game.particleSystem.createExplosion(x, y, "#FFD700", particleCount);
  }
  draw(ctx) {
    ctx.save();
    for (let laser of this.lasers) {
      const alpha = laser.life / laser.maxLife;
      ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
      ctx.lineWidth = laser.width;
      ctx.beginPath();
      ctx.moveTo(laser.startX, laser.startY);
      ctx.lineTo(laser.endX, laser.endY);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
      ctx.lineWidth = laser.width * 1.5;
      ctx.beginPath();
      ctx.moveTo(laser.startX, laser.startY);
      ctx.lineTo(laser.endX, laser.endY);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = laser.width * 0.5;
      ctx.beginPath();
      ctx.moveTo(laser.startX, laser.startY);
      ctx.lineTo(laser.endX, laser.endY);
      ctx.stroke();
    }
    for (let bullet of this.playerBullets) {
      if (bullet.isBeam) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = bullet.color;
        ctx.fillRect(
          bullet.x - bullet.size / 2,
          bullet.y - bullet.beamLength,
          bullet.size,
          bullet.beamLength
        );
        ctx.restore();
      } else {
        ctx.fillStyle = bullet.color || "#fc6";
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = "#f66";
    for (let bullet of this.enemyBullets) {
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  clear() {
    this.playerBullets = [];
    this.enemyBullets = [];
    this.lasers = [];
  }
}