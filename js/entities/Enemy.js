import { ItemType } from "../core/constants.js";

export class Enemy {
  constructor(game, type = "normal") {
    this.game = game;
    this.type = type;
    this.dead = false;
    this.init();
  }

  init() {
    switch (this.type) {
      case "normal":
        this.initNormal();
        break;
      case "boss":
        this.initBoss();
        break;
      case "miniBoss":
        this.initMiniBoss();
        break;
    }
  }

  initNormal() {
    this.x = Math.random() * (this.game.canvas.width - 50) + 25;
    this.y = Math.random() * 50 + 25;
    this.vx = 0;
    this.vy = 1 + Math.random() * 0.4;
    this.size = 24;
    this.hp = 10;
    this.maxHp = 10;
    this.bulletTimer = 0;
    this.bulletInterval = 2;
  }

  initBoss() {
    this.x = this.game.canvas.width / 2;
    this.y = 60;
    this.vx = 0;
    this.vy = 0.5;
    this.size = 100;
    this.hp = 400;
    this.maxHp = 400;
    this.bulletTimer = 0;
    this.bulletInterval = 1;
  }

  initMiniBoss() {
    this.x = this.game.canvas.width / 2;
    this.y = 80;
    this.vx = 0;
    this.vy = 0.8;
    this.size = 60;
    this.hp = 120;
    this.maxHp = 120;
    this.bulletTimer = 0;
    this.bulletInterval = 1.5;
  }

  update(dt) {
    if (this.dead) return;
    this.x += this.vx;
    this.y += this.vy;
    this.x = Math.max(
      this.size,
      Math.min(this.game.canvas.width - this.size, this.x)
    );
    this.y = Math.max(
      this.size,
      Math.min(this.game.canvas.height - this.size, this.y)
    );
    this.bulletTimer += dt;
    if (this.bulletTimer >= this.bulletInterval) {
      this.bulletTimer = 0;
      this.shoot();
    }
  }

  shoot() {
    if (this.dead) return;
    const angle = Math.atan2(
      this.game.player.y - this.y,
      this.game.player.x - this.x
    );
    this.game.bulletManager.spawnEnemyBullet(
      this.x,
      this.y,
      Math.cos(angle),
      Math.sin(angle)
    );
  }

  draw(ctx) {
    if (this.dead) return;
    ctx.save();
    if (this.type === "boss") {
      const grd = ctx.createRadialGradient(
        this.x,
        this.y,
        this.size * 0.2,
        this.x,
        this.y,
        this.size
      );
      grd.addColorStop(0, "#ff4444");
      grd.addColorStop(1, "#800000");
      ctx.fillStyle = grd;
      ctx.shadowColor = "#ff0000";
      ctx.shadowBlur = 20;
    } else if (this.type === "miniBoss") {
      const grd = ctx.createRadialGradient(
        this.x,
        this.y,
        this.size * 0.3,
        this.x,
        this.y,
        this.size
      );
      grd.addColorStop(0, "#44ff44");
      grd.addColorStop(1, "#008000");
      ctx.fillStyle = grd;
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#fff";
    } else {
      const grd = ctx.createRadialGradient(
        this.x,
        this.y,
        this.size * 0.1,
        this.x,
        this.y,
        this.size
      );
      grd.addColorStop(0, "#ff8888");
      grd.addColorStop(1, "#aa0000");
      ctx.fillStyle = grd;
    }
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    if (this.type === "miniBoss") ctx.stroke();
    if (this.hp < this.maxHp) {
      const barWidth = this.size * 2,
        barHeight = 4,
        barX = this.x - barWidth / 2,
        barY = this.y - this.size - 10,
        hpRatio = this.hp / this.maxHp;
      ctx.fillStyle = "#333";
      ctx.fillRect(barX, barY, barWidth, barHeight);
      ctx.fillStyle = "#f00";
      ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);
    }
    ctx.restore();
  }

  takeDamage(amount) {
    if (this.dead) return;
    this.hp -= amount;
    this.game.particleSystem.createHitEffect(this.x, this.y);
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      this.game.addScore(this.getScoreValue());
      // 적 처치 시 경험치 추가
      const xpValue =
        this.type === "boss" ? 50 : this.type === "miniBoss" ? 30 : 10;
      this.game.player.addXp(xpValue);
      this.dropItems();
      // Reduce particle count to 10 to lower resource usage
      this.game.particleSystem.createExplosion(this.x, this.y, "#f66", 10);
    }
  }

  getScoreValue() {
    if (this.type === "boss") return 1000;
    else if (this.type === "miniBoss") return 500;
    return 100;
  }

  dropItems() {
    const random = Math.random();
    if (this.type === "boss") {
      this.game.itemManager.spawnItem(ItemType.GEM, this.x, this.y);
      return;
    }
    if (random < 0.4)
      this.game.itemManager.spawnItem(ItemType.COIN, this.x, this.y);
    else if (random < 0.5)
      this.game.itemManager.spawnItem(ItemType.HEALTH, this.x, this.y);
    else if (random < 0.55)
      this.game.itemManager.spawnItem(ItemType.POWER, this.x, this.y);
    else if (random < 0.58)
      this.game.itemManager.spawnItem(ItemType.SPEED, this.x, this.y);
    else if (random < 0.6)
      this.game.itemManager.spawnItem(ItemType.SHIELD, this.x, this.y);
  }
}
