import { ItemType } from "../core/constants.js";

export class Enemy {
  constructor(game, type = "normal") {
    this.game = game;
    this.type = type;
    this.x = Math.random() * game.canvas.width;
    this.y = -20;
    this.speed = type === "boss" ? 2 : type === "miniBoss" ? 3 : 4;
    this.size = type === "boss" ? 40 : type === "miniBoss" ? 30 : 20;
    this.hp = type === "boss" ? 100 : type === "miniBoss" ? 30 : 10;
    this.maxHp = this.hp;
    this.dead = false;
    this.hitEffect = 0; // 피격 효과 타이머
    this.laserHitEffect = 0; // 레이저 피격 효과 타이머
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
    this.vx = 0;
    this.vy = 1 + Math.random() * 0.4;
    this.bulletTimer = 0;
    this.bulletInterval = 2;
  }

  initBoss() {
    this.vx = 0;
    this.vy = 0.5;
    this.bulletTimer = 0;
    this.bulletInterval = 1;
  }

  initMiniBoss() {
    this.vx = 0;
    this.vy = 0.8;
    this.bulletTimer = 0;
    this.bulletInterval = 1.5;
  }

  update(dt) {
    if (this.dead) return;
    this.x += this.vx;
    this.y += this.vy;

    // 화면 좌우 경계 처리
    this.x = Math.max(
      this.size,
      Math.min(this.game.canvas.width - this.size, this.x)
    );

    // 화면 아래로 내려갔을 때 처리
    if (this.y > this.game.canvas.height + 50) {
      // 적 강화
      this.powerUp();
      // 위치 초기화
      this.y = -20;
      this.x =
        Math.random() * (this.game.canvas.width - this.size * 2) + this.size;
    }

    this.bulletTimer += dt;
    if (this.bulletTimer >= this.bulletInterval) {
      this.bulletTimer = 0;
      this.shoot();
    }

    // 피격 효과 감소
    if (this.hitEffect > 0) {
      this.hitEffect -= dt * 5;
    }

    // 레이저 피격 효과 감소
    if (this.laserHitEffect > 0) {
      this.laserHitEffect -= dt * 3;
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

    // 레이저 피격 효과 (밝은 금색 글로우)
    if (this.laserHitEffect > 0) {
      ctx.shadowColor = "#FFD700";
      ctx.shadowBlur = 20;
      ctx.fillStyle = `rgba(255, 215, 0, ${this.laserHitEffect * 0.3})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size + 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 기본 적 색상 (RGB 형식으로 변경) - 강화 상태일 때 더 진한 색상
    let baseColor =
      this.type === "boss"
        ? { r: 255, g: this.isPoweredUp ? 0 : 68, b: this.isPoweredUp ? 0 : 68 }
        : this.type === "miniBoss"
        ? {
            r: 255,
            g: this.isPoweredUp ? 68 : 136,
            b: this.isPoweredUp ? 0 : 68,
          }
        : {
            r: 255,
            g: this.isPoweredUp ? 0 : 102,
            b: this.isPoweredUp ? 0 : 102,
          };

    // 피격 효과 (하얀색 블렌드)
    if (this.hitEffect > 0) {
      const blendedColor = this.blendColors(
        baseColor,
        { r: 255, g: 255, b: 255 },
        Math.min(this.hitEffect, 1)
      );
      ctx.fillStyle = blendedColor;
    } else {
      ctx.fillStyle = `rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b})`;
    }

    // 강화 상태일 때 외곽선 추가
    if (this.isPoweredUp) {
      ctx.strokeStyle = "#ff0000";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();

    // HP 바
    let barWidth = this.size * 1.2 * (this.hp / this.maxHp);
    ctx.fillStyle = this.isPoweredUp ? "#ff0000" : "#fff";
    ctx.fillRect(
      this.x - this.size * 0.6,
      this.y - this.size - 10,
      barWidth,
      3
    );

    ctx.restore();
  }

  takeDamage(amount) {
    if (this.dead) return;
    this.hp -= amount;
    this.hitEffect = 1;
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

  // 레이저에 맞았을 때 호출되는 새로운 메서드
  hitByLaser() {
    this.laserHitEffect = 1;
  }

  // 색상 블렌딩 헬퍼 함수 (RGB 객체를 직접 사용)
  blendColors(color1, color2, ratio) {
    const r = Math.round(color1.r + (color2.r - color1.r) * ratio);
    const g = Math.round(color1.g + (color2.g - color1.g) * ratio);
    const b = Math.round(color1.b + (color2.b - color1.b) * ratio);

    return `rgb(${r}, ${g}, ${b})`;
  }

  // 적 강화 메서드 추가
  powerUp() {
    // HP 증가
    this.maxHp = Math.floor(this.maxHp * 1.5);
    this.hp = this.maxHp;

    // 크기 증가
    this.size = Math.min(
      this.size * 1.2,
      this.type === "boss" ? 60 : this.type === "miniBoss" ? 45 : 30
    );

    // 속도 증가
    this.vy *= 1.2;

    // 총알 발사 간격 감소
    this.bulletInterval = Math.max(this.bulletInterval * 0.8, 0.5);

    // 시각적 효과
    this.game.particleSystem.createExplosion(this.x, this.y, "#ff0000", 15);

    // 색상 변경을 위한 플래그
    this.isPoweredUp = true;
  }
}
