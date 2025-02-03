// --- BulletManager.js ---
import { MAX_BULLETS } from "./constants.js";

export class BulletManager {
  constructor(game) {
    this.game = game;
    this.playerBullets = [];
    this.enemyBullets = [];
    this.bulletPool = [];
    this.maxBullets = 1000;

    // 총알 풀 초기화
    this.initBulletPool();
  }

  initBulletPool() {
    for (let i = 0; i < this.maxBullets; i++) {
      this.bulletPool.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        speed: 0,
        damage: 0,
        size: 0,
        color: "",
        trail: false,
        trailColor: "",
        pattern: "",
        remove: false,
        isPlayerBullet: false,
        time: 0,
        initialX: 0,
        initialY: 0,
        spiralSpeed: 0,
        isZigzag: false,
        zigzagFrequency: 0,
        zigzagAmplitude: 0,
        originalX: 0,
        homing: false,
        homingStrength: 0,
        penetrate: false,
        chainCount: 0,
        chainRange: 0,
        isMeteor: false,
      });
    }
  }

  getBullet() {
    return this.bulletPool.find((bullet) => !bullet.active) || null;
  }

  clear() {
    this.playerBullets = [];
    this.enemyBullets = [];
    this.bulletPool.forEach((bullet) => (bullet.active = false));
  }

  update(dt) {
    // 플레이어 총알 업데이트
    for (let bullet of this.playerBullets) {
      if (!bullet.active) continue;
      this.updateBullet(bullet, dt);
      if (bullet.remove) {
        bullet.active = false;
        continue;
      }
      this.checkBulletCollisions(bullet);
    }

    // 적 총알 업데이트
    for (let bullet of this.enemyBullets) {
      if (!bullet.active) continue;
      this.updateBullet(bullet, dt);
      if (bullet.remove) {
        bullet.active = false;
        continue;
      }
      this.checkPlayerCollision(bullet);
    }

    // 제거된 총알 필터링
    this.playerBullets = this.playerBullets.filter((b) => b.active);
    this.enemyBullets = this.enemyBullets.filter((b) => b.active);
  }

  updateBullet(bullet, dt) {
    bullet.time = (bullet.time || 0) + dt;

    // 패턴별 총알 업데이트
    switch (bullet.pattern) {
      case "spiral":
        this.updateSpiralBullet(bullet, dt);
        break;
      case "zigzag":
        this.updateZigzagBullet(bullet, dt);
        break;
      case "homing":
        this.updateHomingBullet(bullet, dt);
        break;
      default:
        this.updateNormalBullet(bullet, dt);
    }

    // 궤적 효과
    if (bullet.trail) {
      this.game.particleSystem.createTrail(
        bullet.x,
        bullet.y,
        bullet.trailColor
      );
    }

    // 화면 밖으로 나간 총알 제거
    if (this.isOutOfBounds(bullet)) {
      bullet.remove = true;
    }
  }

  updateNormalBullet(bullet, dt) {
    bullet.x += bullet.vx * bullet.speed * dt;
    bullet.y += bullet.vy * bullet.speed * dt;
  }

  updateSpiralBullet(bullet, dt) {
    const angle = bullet.time * bullet.spiralSpeed;
    const radius = bullet.speed * bullet.time;
    bullet.x = bullet.initialX + Math.cos(angle) * radius;
    bullet.y = bullet.initialY + Math.sin(angle) * radius;
  }

  updateZigzagBullet(bullet, dt) {
    const baseX = bullet.originalX + bullet.vx * bullet.speed * bullet.time;
    const zigzagOffset =
      Math.sin(bullet.time * bullet.zigzagFrequency) * bullet.zigzagAmplitude;
    bullet.x = baseX + zigzagOffset;
    bullet.y += bullet.vy * bullet.speed * dt;
  }

  updateHomingBullet(bullet, dt) {
    if (!this.game.player || this.game.player.dead) return;

    const targetX = this.game.player.x;
    const targetY = this.game.player.y;
    const angle = Math.atan2(targetY - bullet.y, targetX - bullet.x);

    const currentAngle = Math.atan2(bullet.vy, bullet.vx);
    let angleDiff = angle - currentAngle;

    // 각도 보정
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    // 유도 강도에 따른 각도 변경
    const turnSpeed = bullet.homingStrength || 3;
    const maxTurn = turnSpeed * dt;
    const turn = Math.max(-maxTurn, Math.min(maxTurn, angleDiff));

    const newAngle = currentAngle + turn;
    bullet.vx = Math.cos(newAngle);
    bullet.vy = Math.sin(newAngle);

    bullet.x += bullet.vx * bullet.speed * dt;
    bullet.y += bullet.vy * bullet.speed * dt;
  }

  isOutOfBounds(bullet) {
    const margin = 50;
    return (
      bullet.x < -margin ||
      bullet.x > this.game.canvas.width + margin ||
      bullet.y < -margin ||
      bullet.y > this.game.canvas.height + margin
    );
  }

  checkBulletCollisions(bullet) {
    for (let enemy of this.game.enemies) {
      if (enemy.dead) continue;

      const dist = Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y);
      if (dist < enemy.size + bullet.size / 2) {
        // 크리티컬 히트 계산
        let damage = bullet.damage;
        const isCritical =
          Math.random() < (this.game.player.criticalChance || 0.05);
        if (isCritical) {
          damage *= this.game.player.criticalDamage || 2;
          this.game.effectManager.createEffect("critical", enemy.x, enemy.y);
        }

        enemy.takeDamage(damage);

        // 특수 효과 처리
        if (bullet.isMeteor) {
          this.handleMeteorExplosion(bullet, enemy);
        }
        if (bullet.isZigzag) {
          this.handleZigzagSplash(bullet, enemy);
        }

        if (!bullet.penetrate) {
          bullet.remove = true;
          break;
        }
      }
    }
  }

  handleMeteorExplosion(bullet, hitEnemy) {
    this.game.particleSystem.createExplosion(bullet.x, bullet.y, "#f66", 30);
    const EXPLOSION_RADIUS = 100;

    for (let enemy of this.game.enemies) {
      if (enemy !== hitEnemy && !enemy.dead) {
        const dist = Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y);
        if (dist < EXPLOSION_RADIUS) {
          const damage = bullet.damage * (1 - dist / EXPLOSION_RADIUS) * 0.5;
          enemy.takeDamage(damage);
        }
      }
    }
  }

  handleZigzagSplash(bullet, hitEnemy) {
    let chainsLeft = bullet.chainCount;
    let lastHit = hitEnemy;
    const hitEnemies = new Set([hitEnemy]);

    while (chainsLeft > 0) {
      let nearestEnemy = this.findNearestValidTarget(
        lastHit,
        bullet.chainRange,
        hitEnemies
      );
      if (!nearestEnemy) break;

      this.game.effectManager.createLightningEffect(
        lastHit.x,
        lastHit.y,
        nearestEnemy.x,
        nearestEnemy.y
      );
      nearestEnemy.takeDamage(bullet.damage * 0.7);
      lastHit = nearestEnemy;
      hitEnemies.add(nearestEnemy);
      chainsLeft--;
    }
  }

  findNearestValidTarget(source, range, excludeSet) {
    let nearest = null;
    let minDist = range;

    for (let enemy of this.game.enemies) {
      if (enemy.dead || excludeSet.has(enemy)) continue;

      const dist = Math.hypot(enemy.x - source.x, enemy.y - source.y);
      if (dist < minDist) {
        minDist = dist;
        nearest = enemy;
      }
    }

    return nearest;
  }

  checkPlayerCollision(bullet) {
    if (this.game.player.dead || this.game.player.invincible) return;

    const dist = Math.hypot(
      bullet.x - this.game.player.x,
      bullet.y - this.game.player.y
    );

    if (dist < this.game.player.radius + bullet.size / 2) {
      this.game.player.takeDamage(bullet.damage);
      bullet.remove = true;
    }
  }

  spawnPlayerBullet(x, y, vx, vy, options = {}) {
    const bullet = this.getBullet();
    if (!bullet) return;

    // 기본 옵션
    const defaults = {
      speed: 400,
      size: 8,
      damage: 10,
      color: "#fc6",
      pattern: "normal",
      spreadAngle: 15,
      bulletCount: 1,
      spiralSpeed: 0,
      penetrate: false,
      trail: false,
      trailColor: "#fc6",
    };

    const finalOptions = { ...defaults, ...options };

    // 패턴별 총알 생성
    switch (finalOptions.pattern) {
      case "spread":
        this.createSpreadBullets(x, y, vx, vy, finalOptions);
        break;
      case "spiral":
        this.createSpiralBullets(x, y, vx, vy, finalOptions);
        break;
      default:
        this.createBullet(x, y, vx, vy, {
          ...finalOptions,
          isPlayerBullet: true,
        });
    }
  }

  spawnEnemyBullet(x, y, vx, vy, options = {}) {
    const bullet = this.getBullet();
    if (!bullet) return;

    // 기본 옵션
    const defaults = {
      speed: 200,
      size: 6,
      damage: 10,
      color: "#f66",
      pattern: "normal",
    };

    this.createBullet(x, y, vx, vy, {
      ...defaults,
      ...options,
      isPlayerBullet: false,
    });
  }

  createBullet(x, y, vx, vy, options) {
    const bullet = this.getBullet();
    if (!bullet) return;

    // 총알 초기화
    Object.assign(bullet, {
      active: true,
      x,
      y,
      vx,
      vy,
      initialX: x,
      initialY: y,
      originalX: x,
      time: 0,
      remove: false,
      ...options,
    });

    // 총알 목록에 추가
    if (options.isPlayerBullet) {
      this.playerBullets.push(bullet);
    } else {
      this.enemyBullets.push(bullet);
    }
  }

  createSpreadBullets(x, y, vx, vy, options) {
    const angleStep =
      (options.spreadAngle * Math.PI) / 180 / (options.bulletCount - 1);
    const baseAngle =
      Math.atan2(vy, vx) -
      ((options.spreadAngle * Math.PI) / 360) * (options.bulletCount - 1);

    for (let i = 0; i < options.bulletCount; i++) {
      const angle = baseAngle + angleStep * i;
      this.createBullet(x, y, Math.cos(angle), Math.sin(angle), options);
    }
  }

  createSpiralBullets(x, y, vx, vy, options) {
    const baseAngle = Math.atan2(vy, vx);
    for (let i = 0; i < options.bulletCount; i++) {
      const angle = baseAngle + (Math.PI * 2 * i) / options.bulletCount;
      this.createBullet(x, y, Math.cos(angle), Math.sin(angle), {
        ...options,
        spiralSpeed: options.spiralSpeed + (i * Math.PI) / 8,
      });
    }
  }

  draw(ctx) {
    ctx.save();

    // 플레이어 총알 그리기
    for (let bullet of this.playerBullets) {
      if (!bullet.active) continue;
      this.drawBullet(ctx, bullet);
    }

    // 적 총알 그리기
    for (let bullet of this.enemyBullets) {
      if (!bullet.active) continue;
      this.drawBullet(ctx, bullet);
    }

    ctx.restore();
  }

  drawBullet(ctx, bullet) {
    ctx.beginPath();
    ctx.fillStyle = bullet.color;
    ctx.shadowColor = bullet.color;
    ctx.shadowBlur = 5;

    if (bullet.pattern === "meteor") {
      // 메테오 이펙트
      const gradient = ctx.createRadialGradient(
        bullet.x,
        bullet.y,
        0,
        bullet.x,
        bullet.y,
        bullet.size
      );
      gradient.addColorStop(0, "#fff");
      gradient.addColorStop(0.3, bullet.color);
      gradient.addColorStop(1, "rgba(255, 0, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.arc(bullet.x, bullet.y, bullet.size * 1.5, 0, Math.PI * 2);
    } else {
      ctx.arc(bullet.x, bullet.y, bullet.size / 2, 0, Math.PI * 2);
    }

    ctx.fill();
  }
}

// --- EffectManager.js ---
export class EffectManager {
  constructor(game) {
    this.game = game;
    this.effects = [];
  }

  update(dt) {
    this.effects = this.effects.filter((effect) => !effect.update(dt));
  }

  draw(ctx) {
    this.effects.forEach((effect) => effect.draw(ctx));
  }

  createEffect(type, x, y, options = {}) {
    let effect;
    switch (type) {
      case "levelUp":
        effect = new LevelUpEffect(x, y);
        break;
      case "skillActivate":
        effect = new SkillActivateEffect(x, y, options.color);
        break;
      case "damage":
        effect = new DamageEffect(x, y, options.amount);
        break;
      case "heal":
        effect = new HealEffect(x, y, options.amount);
        break;
      case "buff":
        effect = new BuffEffect(x, y, options.type);
        break;
      case "lightning":
        effect = new LightningEffect(x, y, options.targetX, options.targetY);
        break;
    }
    if (effect) this.effects.push(effect);
  }

  // 편의를 위한 직접 생성 메서드들
  createLightningEffect(x1, y1, x2, y2) {
    this.createEffect("lightning", x1, y1, { targetX: x2, targetY: y2 });
  }

  createHealEffect(x, y, amount = 0) {
    this.createEffect("heal", x, y, { amount });
  }

  clear() {
    this.effects = [];
  }
}

class Effect {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.alpha = 1;
    this.fadeSpeed = 1;
    this.lifetime = 0;
    this.maxLifetime = 1;
  }

  update(dt) {
    this.lifetime += dt;
    this.alpha = Math.max(0, 1 - this.lifetime / this.maxLifetime);
    return this.lifetime >= this.maxLifetime;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    this.drawEffect(ctx);
    ctx.restore();
  }

  drawEffect(ctx) {
    // 하위 클래스에서 구현
  }
}

class LevelUpEffect extends Effect {
  constructor(x, y) {
    super(x, y);
    this.maxLifetime = 2;
    this.size = 100;
  }

  drawEffect(ctx) {
    const progress = this.lifetime / this.maxLifetime;
    const size = this.size * (1 + progress);

    ctx.strokeStyle = "#ffff00";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = "bold 24px Arial";
    ctx.fillStyle = "#ffff00";
    ctx.textAlign = "center";
    ctx.fillText("LEVEL UP!", this.x, this.y);
  }
}

class SkillActivateEffect extends Effect {
  constructor(x, y, color) {
    super(x, y);
    this.maxLifetime = 1;
    this.color = color || "#44ff44";
    this.size = 50;
  }

  drawEffect(ctx) {
    const progress = this.lifetime / this.maxLifetime;
    const size = this.size * (1 + progress);

    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
    ctx.stroke();
  }
}

class DamageEffect extends Effect {
  constructor(x, y, amount) {
    super(x, y);
    this.maxLifetime = 1;
    this.amount = amount;
    this.offsetY = 0;
  }

  update(dt) {
    super.update(dt);
    this.offsetY -= dt * 50;
    return this.lifetime >= this.maxLifetime;
  }

  drawEffect(ctx) {
    ctx.font = "bold 16px Arial";
    ctx.fillStyle = "#ff4444";
    ctx.textAlign = "center";
    ctx.fillText(`-${this.amount}`, this.x, this.y + this.offsetY);
  }
}

class HealEffect extends Effect {
  constructor(x, y, amount) {
    super(x, y);
    this.maxLifetime = 1;
    this.amount = amount;
    this.offsetY = 0;
  }

  update(dt) {
    super.update(dt);
    this.offsetY -= dt * 50;
    return this.lifetime >= this.maxLifetime;
  }

  drawEffect(ctx) {
    ctx.font = "bold 16px Arial";
    ctx.fillStyle = "#44ff44";
    ctx.textAlign = "center";
    ctx.fillText(`+${this.amount}`, this.x, this.y + this.offsetY);
  }
}

class BuffEffect extends Effect {
  constructor(x, y, type) {
    super(x, y);
    this.maxLifetime = 1;
    this.type = type;
    this.size = 30;
  }

  drawEffect(ctx) {
    const progress = this.lifetime / this.maxLifetime;
    const size = this.size * (1 + progress);

    let color;
    switch (this.type) {
      case "power":
        color = "#ff4444";
        break;
      case "speed":
        color = "#4444ff";
        break;
      case "shield":
        color = "#44ffff";
        break;
      default:
        color = "#ffffff";
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = "bold 14px Arial";
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.fillText(this.type.toUpperCase(), this.x, this.y);
  }
}

class LightningEffect extends Effect {
  constructor(x, y, targetX, targetY) {
    super(x, y);
    this.targetX = targetX;
    this.targetY = targetY;
    this.maxLifetime = 0.3;
    this.segments = this.generateSegments();
  }

  generateSegments() {
    const segments = [];
    const segmentCount = 8;
    let prevX = this.x;
    let prevY = this.y;

    for (let i = 1; i <= segmentCount; i++) {
      const t = i / segmentCount;
      const nextX = this.x + (this.targetX - this.x) * t;
      const nextY = this.y + (this.targetY - this.y) * t;

      // 약간의 랜덤 오프셋 추가
      const offset = 10 * (1 - t); // 끝으로 갈수록 오프셋 감소
      const randX = nextX + (Math.random() - 0.5) * offset;
      const randY = nextY + (Math.random() - 0.5) * offset;

      segments.push({
        x1: prevX,
        y1: prevY,
        x2: randX,
        y2: randY,
      });

      prevX = randX;
      prevY = randY;
    }

    return segments;
  }

  drawEffect(ctx) {
    const alpha = this.alpha * 0.8;
    ctx.strokeStyle = `rgba(100, 200, 255, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.shadowColor = "#4af";
    ctx.shadowBlur = 10;

    this.segments.forEach((segment) => {
      ctx.beginPath();
      ctx.moveTo(segment.x1, segment.y1);
      ctx.lineTo(segment.x2, segment.y2);
      ctx.stroke();
    });
  }
}

// --- Enemy.js ---
import { WaveSystem, ItemType } from "./constants.js";

export class Enemy {
  constructor(game, type = "normal") {
    this.game = game;
    this.type = type;
    this.active = true;
    this.dead = false;
    this.deathTimer = 0;

    // 적 타입에 따른 초기화
    switch (type) {
      case "boss":
        this.initBoss();
        break;
      case "miniBoss":
        this.initMiniBoss();
        break;
      case "assassin":
        this.initAssassin();
        break;
      case "bomber":
        this.initBomber();
        break;
      default:
        this.initNormal();
        break;
    }

    // 공통 속성
    this.originalX = this.x;
    this.originalY = this.y;
    this.movePattern = this.selectMovePattern();
    this.patternTimer = 0;
    this.attackPattern = this.selectAttackPattern();
    this.lastShootTime = 0;
  }

  selectMovePattern() {
    const patterns = ["linear", "sine", "circle", "zigzag"];
    const weights = {
      boss: { linear: 0.2, sine: 0.3, circle: 0.3, zigzag: 0.2 },
      miniBoss: { linear: 0.3, sine: 0.3, circle: 0.2, zigzag: 0.2 },
      assassin: { linear: 0.1, sine: 0.2, circle: 0.4, zigzag: 0.3 },
      bomber: { linear: 0.4, sine: 0.3, circle: 0.1, zigzag: 0.2 },
      normal: { linear: 0.4, sine: 0.3, circle: 0.1, zigzag: 0.2 },
    };

    const typeWeights = weights[this.type] || weights.normal;
    let random = Math.random();
    let sum = 0;

    for (let pattern of patterns) {
      sum += typeWeights[pattern];
      if (random <= sum) return pattern;
    }
    return "linear";
  }

  selectAttackPattern() {
    const patterns = {
      boss: ["spread", "spiral", "targeted", "burst"],
      miniBoss: ["spread", "targeted", "burst"],
      assassin: ["targeted", "burst"],
      bomber: ["spread", "burst"],
      normal: ["single"],
    };

    const availablePatterns = patterns[this.type] || patterns.normal;
    return availablePatterns[
      Math.floor(Math.random() * availablePatterns.length)
    ];
  }

  initNormal() {
    this.x = Math.random() * (this.game.canvas.width - 40) + 20;
    this.y = -20;
    this.vx = 0;
    this.vy = 100;
    this.size = 20;
    this.hp = 20;
    this.maxHp = 20;
    this.bulletTimer = 0;
    this.bulletInterval = 2;
    this.score = 100;
    this.damage = 10;
  }

  initBoss() {
    const wave = this.game.wave;
    const healthScale = Math.pow(1.2, wave - 1);
    const damageScale = Math.pow(1.1, wave - 1);

    this.x = this.game.canvas.width / 2;
    this.y = -50;
    this.vx = 0;
    this.vy = 50;
    this.size = 50;
    this.hp = 500 * healthScale;
    this.maxHp = this.hp;
    this.bulletTimer = 0;
    this.bulletInterval = 0.8;
    this.score = 1000;
    this.damage = 20 * damageScale;
    this.phaseCount = 3;
    this.currentPhase = 1;
    this.phaseHpThresholds = [0.7, 0.3];
  }

  initMiniBoss() {
    const wave = this.game.wave;
    const scale = Math.pow(1.1, wave - 1);

    this.x = Math.random() * (this.game.canvas.width - 60) + 30;
    this.y = -30;
    this.vx = 0;
    this.vy = 75;
    this.size = 35;
    this.hp = 200 * scale;
    this.maxHp = this.hp;
    this.bulletTimer = 0;
    this.bulletInterval = 1.2;
    this.score = 500;
    this.damage = 15 * scale;
  }

  initAssassin() {
    this.x = Math.random() * (this.game.canvas.width - 40) + 20;
    this.y = -20;
    this.vx = 0;
    this.vy = 150;
    this.size = 18;
    this.hp = 30;
    this.maxHp = 30;
    this.bulletTimer = 0;
    this.bulletInterval = 1.5;
    this.score = 200;
    this.damage = 15;
    this.stealthTimer = 0;
    this.stealthInterval = 3;
    this.isStealthed = false;
  }

  initBomber() {
    this.x = Math.random() * (this.game.canvas.width - 40) + 20;
    this.y = -20;
    this.vx = 0;
    this.vy = 80;
    this.size = 25;
    this.hp = 40;
    this.maxHp = 40;
    this.bulletTimer = 0;
    this.bulletInterval = 2;
    this.score = 300;
    this.damage = 25;
    this.explosionRadius = 100;
  }

  update(dt) {
    if (this.dead) {
      this.updateDeath(dt);
      return;
    }

    this.updateMovement(dt);
    this.updateAttack(dt);
    this.updateSpecialAbilities(dt);
  }

  updateMovement(dt) {
    switch (this.movePattern) {
      case "sine":
        this.updateSineMovement(dt);
        break;
      case "circle":
        this.updateCircleMovement(dt);
        break;
      case "zigzag":
        this.updateZigzagMovement(dt);
        break;
      default:
        this.updateLinearMovement(dt);
    }

    // 화면 경계 처리
    this.x = Math.max(
      this.size,
      Math.min(this.game.canvas.width - this.size, this.x)
    );

    // 화면 아래로 나가면 제거
    if (this.y > this.game.canvas.height + this.size) {
      this.dead = true;
    }
  }

  updateLinearMovement(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  updateSineMovement(dt) {
    this.patternTimer += dt;
    this.x = this.originalX + Math.sin(this.patternTimer * 2) * 100;
    this.y += this.vy * dt;
  }

  updateCircleMovement(dt) {
    this.patternTimer += dt;
    const radius = 50;
    const speed = 2;
    this.x = this.originalX + Math.cos(this.patternTimer * speed) * radius;
    this.y =
      this.originalY +
      Math.sin(this.patternTimer * speed) * radius +
      this.vy * dt;
  }

  updateZigzagMovement(dt) {
    this.patternTimer += dt;
    this.x = this.originalX + Math.sin(this.patternTimer * 4) * 50;
    this.y += this.vy * dt;
  }

  updateAttack(dt) {
    this.bulletTimer += dt;
    if (this.bulletTimer >= this.bulletInterval) {
      this.bulletTimer = 0;
      this.shoot();
    }
  }

  updateSpecialAbilities(dt) {
    switch (this.type) {
      case "boss":
        this.updateBossPhase();
        break;
      case "assassin":
        this.updateStealth(dt);
        break;
      case "bomber":
        // 폭발 로직
        break;
    }
  }

  updateBossPhase() {
    const hpRatio = this.hp / this.maxHp;
    if (this.currentPhase < this.phaseCount) {
      const nextPhaseThreshold = this.phaseHpThresholds[this.currentPhase - 1];
      if (hpRatio <= nextPhaseThreshold) {
        this.currentPhase++;
        this.onPhaseChange();
      }
    }
  }

  onPhaseChange() {
    // 페이즈 변경 시 패턴 변경
    this.attackPattern = this.selectAttackPattern();
    this.movePattern = this.selectMovePattern();

    // 페이즈 변경 이펙트
    this.game.effectManager.createEffect("bossPhase", this.x, this.y, {
      phase: this.currentPhase,
    });

    // 페이즈 변경 사운드
    this.game.soundManager.play("bossPhase");
  }

  updateStealth(dt) {
    this.stealthTimer += dt;
    if (this.stealthTimer >= this.stealthInterval) {
      this.stealthTimer = 0;
      this.isStealthed = !this.isStealthed;

      if (this.isStealthed) {
        this.game.effectManager.createEffect("stealth", this.x, this.y);
      }
    }
  }

  updateDeath(dt) {
    this.deathTimer += dt;
    if (this.deathTimer >= 1) {
      this.active = false;
    }
  }

  shoot() {
    if (this.dead) return;

    switch (this.attackPattern) {
      case "spread":
        this.shootSpread();
        break;
      case "spiral":
        this.shootSpiral();
        break;
      case "targeted":
        this.shootTargeted();
        break;
      case "burst":
        this.shootBurst();
        break;
      default:
        this.shootSingle();
    }
  }

  shootSingle() {
    const angle = Math.atan2(
      this.game.player.y - this.y,
      this.game.player.x - this.x
    );
    this.game.bulletManager.spawnEnemyBullet(
      this.x,
      this.y,
      Math.cos(angle),
      Math.sin(angle),
      {
        damage: this.damage,
        color: this.getBulletColor(),
      }
    );
  }

  shootSpread() {
    const bulletCount = 5;
    const spreadAngle = Math.PI / 3;
    const baseAngle = Math.atan2(
      this.game.player.y - this.y,
      this.game.player.x - this.x
    );

    for (let i = 0; i < bulletCount; i++) {
      const angle = baseAngle + spreadAngle * (i / (bulletCount - 1) - 0.5);
      this.game.bulletManager.spawnEnemyBullet(
        this.x,
        this.y,
        Math.cos(angle),
        Math.sin(angle),
        {
          damage: this.damage,
          color: this.getBulletColor(),
        }
      );
    }
  }

  shootSpiral() {
    const bulletCount = 8;
    for (let i = 0; i < bulletCount; i++) {
      const angle = (Math.PI * 2 * i) / bulletCount + this.patternTimer;
      this.game.bulletManager.spawnEnemyBullet(
        this.x,
        this.y,
        Math.cos(angle),
        Math.sin(angle),
        {
          damage: this.damage,
          color: this.getBulletColor(),
          pattern: "spiral",
        }
      );
    }
  }

  shootTargeted() {
    const angle = Math.atan2(
      this.game.player.y - this.y,
      this.game.player.x - this.x
    );
    this.game.bulletManager.spawnEnemyBullet(
      this.x,
      this.y,
      Math.cos(angle),
      Math.sin(angle),
      {
        damage: this.damage * 1.5,
        speed: 300,
        color: this.getBulletColor(),
        homing: true,
      }
    );
  }

  shootBurst() {
    const burstCount = 3;
    const burstDelay = 0.1;

    for (let i = 0; i < burstCount; i++) {
      setTimeout(() => {
        if (!this.dead) {
          const angle = Math.atan2(
            this.game.player.y - this.y,
            this.game.player.x - this.x
          );
          this.game.bulletManager.spawnEnemyBullet(
            this.x,
            this.y,
            Math.cos(angle),
            Math.sin(angle),
            {
              damage: this.damage,
              color: this.getBulletColor(),
              speed: 250 + i * 50,
            }
          );
        }
      }, i * burstDelay * 1000);
    }
  }

  getBulletColor() {
    switch (this.type) {
      case "boss":
        return "#ff0000";
      case "miniBoss":
        return "#ff6600";
      case "assassin":
        return "#9900ff";
      case "bomber":
        return "#ffcc00";
      default:
        return "#ff3333";
    }
  }

  takeDamage(amount) {
    if (this.dead) return;

    this.hp -= amount;

    // 피격 이펙트
    this.game.effectManager.createEffect("hit", this.x, this.y, {
      damage: amount,
    });

    if (this.hp <= 0) {
      this.die();
    } else {
      // 보스 페이즈 체크
      if (this.type === "boss") {
        this.updateBossPhase();
      }
    }
  }

  die() {
    this.dead = true;
    this.hp = 0;

    // 폭발 이펙트
    this.game.effectManager.createEffect("explosion", this.x, this.y, {
      size: this.size * 2,
      color: this.getBulletColor(),
    });

    // 폭발 파티클
    this.game.particleSystem.createExplosion(
      this.x,
      this.y,
      this.getBulletColor(),
      20
    );

    // 폭발 사운드
    this.game.soundManager.play(
      this.type === "boss"
        ? "bossDeath"
        : this.type === "bomber"
        ? "explosion"
        : "enemyDeath"
    );

    // 폭발형 적의 경우 추가 데미지
    if (this.type === "bomber") {
      this.explode();
    }
  }

  explode() {
    const targets = [...this.game.enemies, this.game.player];
    targets.forEach((target) => {
      if (target === this || target.dead) return;

      const distance = Math.hypot(target.x - this.x, target.y - this.y);
      if (distance <= this.explosionRadius) {
        const damage = Math.floor(
          this.damage * (1 - distance / this.explosionRadius)
        );
        target.takeDamage(damage);
      }
    });
  }

  draw(ctx) {
    if (!this.active) return;

    ctx.save();

    // 스텔스 상태 처리
    if (this.type === "assassin" && this.isStealthed) {
      ctx.globalAlpha = 0.3;
    }

    // 적 본체 그리기
    this.drawBody(ctx);

    // HP 바 그리기
    if (!this.dead) {
      this.drawHealthBar(ctx);
    }

    // 죽음 애니메이션
    if (this.dead) {
      ctx.globalAlpha = 1 - this.deathTimer;
    }

    ctx.restore();
  }

  drawBody(ctx) {
    // 그라디언트 생성
    const gradient = ctx.createRadialGradient(
      this.x,
      this.y,
      0,
      this.x,
      this.y,
      this.size
    );

    // 적 타입별 색상 설정
    switch (this.type) {
      case "boss":
        gradient.addColorStop(0, "#ff4444");
        gradient.addColorStop(1, "#800000");
        ctx.shadowColor = "#ff0000";
        ctx.shadowBlur = 20;
        break;
      case "miniBoss":
        gradient.addColorStop(0, "#44ff44");
        gradient.addColorStop(1, "#008000");
        ctx.shadowColor = "#00ff00";
        ctx.shadowBlur = 15;
        break;
      case "assassin":
        gradient.addColorStop(0, "#9900ff");
        gradient.addColorStop(1, "#4b0082");
        ctx.shadowColor = "#9900ff";
        ctx.shadowBlur = 10;
        break;
      case "bomber":
        gradient.addColorStop(0, "#ffcc00");
        gradient.addColorStop(1, "#ff6600");
        ctx.shadowColor = "#ffcc00";
        ctx.shadowBlur = 15;
        break;
      default:
        gradient.addColorStop(0, "#ff8888");
        gradient.addColorStop(1, "#aa0000");
        ctx.shadowColor = "#ff0000";
        ctx.shadowBlur = 5;
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }

  drawHealthBar(ctx) {
    const barWidth = this.size * 2;
    const barHeight = 4;
    const x = this.x - barWidth / 2;
    const y = this.y - this.size - 10;

    // HP 배경
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, y, barWidth, barHeight);

    // HP 게이지
    const hpRatio = this.hp / this.maxHp;
    const hpColor = hpRatio > 0.5 ? "#2f2" : hpRatio > 0.2 ? "#ff2" : "#f22";
    ctx.fillStyle = hpColor;
    ctx.fillRect(x, y, barWidth * hpRatio, barHeight);
  }
}

// --- Game.js ---
import {
  GameState,
  WaveSystem,
  StoryText,
  BOSS_QUOTES,
  DEBUG_MODE,
} from "./constants.js";
import { Player } from "./Player.js";
import { Enemy } from "./Enemy.js";
import { BulletManager } from "./BulletManager.js";
import { ItemManager } from "./ItemManager.js";
import { EffectManager } from "./EffectManager.js";
import { ParticleSystem } from "./ParticleSystem.js";
import { Shop } from "./Shop.js";
import { Modal } from "./Modal.js";

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.setupCanvas();
    this.initializeGameState();
    this.initializeManagers();
    this.player = new Player(this);
    this.setupEventListeners();

    // 바인딩된 이벤트 핸들러 저장
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    this.boundHandleKeyUp = this.handleKeyUp.bind(this);
    this.boundHandleBlur = () => {
      if (this.state === GameState.PLAY) {
        this.togglePause();
      }
    };
    this.boundResizeCanvas = this.resizeCanvas.bind(this);
  }

  setupCanvas() {
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = "high";
    this.resizeCanvas();
    window.addEventListener("resize", this.boundResizeCanvas);
  }

  resizeCanvas() {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    const dpr = window.devicePixelRatio || 1;

    const width = Math.min(800, window.innerWidth - 20);
    const height = Math.min(600, window.innerHeight - 20);
    const scale = Math.min(width / 800, height / 600);

    this.canvas.style.width = `${800 * scale}px`;
    this.canvas.style.height = `${600 * scale}px`;

    this.canvas.width = 800 * dpr;
    this.canvas.height = 600 * dpr;

    this.ctx.scale(dpr, dpr);
  }

  initializeGameState() {
    this.state = GameState.TITLE;
    this.score = 0;
    this.gold = 0;
    this.wave = 0;
    this.waveTimer = 0;
    this.levelUpTimer = 0;
    this.storyIndex = 0;
    this.gameTime = 0;
    this.isPaused = false;

    // 성능 모니터링
    this.lastFrameTime = 0;
    this.frameCount = 0;
    this.fps = 0;
    this.fpsUpdateInterval = 0.5;
    this.fpsTimer = 0;

    // 게임 난이도 설정
    this.difficulty = 1.0;
    this.difficultyScaling = 0.1;
  }

  initializeManagers() {
    this.particleSystem = new ParticleSystem(this);
    this.bulletManager = new BulletManager(this);
    this.effectManager = new EffectManager(this);
    this.itemManager = new ItemManager(this);
    this.shop = new Shop(this);
    this.modal = new Modal(this);

    // 오브젝트 풀 초기화
    this.objectPools = {
      enemies: Array(WaveSystem.MAX_ENEMIES)
        .fill(null)
        .map(() => new Enemy(this)),
      particles: Array(WaveSystem.MAX_PARTICLES)
        .fill(null)
        .map(() => ({
          active: false,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          lifetime: 0,
          maxLifetime: 1,
          color: "#ffffff",
          size: 2,
          alpha: 1,
        })),
      bullets: Array(WaveSystem.MAX_BULLETS)
        .fill(null)
        .map(() => ({
          active: false,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          speed: 0,
          damage: 0,
        })),
    };
  }

  setupEventListeners() {
    window.addEventListener("keydown", this.boundHandleKeyDown);
    window.addEventListener("keyup", this.boundHandleKeyUp);
    window.addEventListener("blur", this.boundHandleBlur);
  }

  handleKeyDown(event) {
    if (this.state === GameState.PLAY) {
      this.player.updateKeyState(event.code, true);

      switch (event.code) {
        case "KeyP":
          this.togglePause();
          break;
        case "KeyB":
          if (!this.isPaused) {
            this.state = GameState.SHOP;
          }
          break;
        case "Escape":
          this.togglePause();
          break;
      }
    } else if (this.state === GameState.SHOP) {
      this.handleShopInput(event);
    } else if (
      this.state === GameState.TITLE ||
      this.state === GameState.STORY
    ) {
      if (event.code === "Space") {
        this.progressGameState();
      }
    }
  }

  handleKeyUp(event) {
    if (this.state === GameState.PLAY) {
      this.player.updateKeyState(event.code, false);
    }
  }

  handleShopInput(event) {
    switch (event.code) {
      case "ArrowUp":
        this.shop.selectPrevItem();
        break;
      case "ArrowDown":
        this.shop.selectNextItem();
        break;
      case "Space":
        this.shop.purchaseSelectedItem();
        break;
      case "Escape":
        this.state = GameState.PLAY;
        break;
    }
  }

  togglePause() {
    if (this.state === GameState.PLAY) {
      this.state = GameState.PAUSE;
      this.isPaused = true;
    } else if (this.state === GameState.PAUSE) {
      this.state = GameState.PLAY;
      this.isPaused = false;
    }
  }

  progressGameState() {
    if (this.state === GameState.TITLE) {
      this.showStory();
    } else if (this.state === GameState.STORY) {
      this.storyIndex++;
      if (this.storyIndex >= StoryText.length) {
        this.startGame();
      }
    }
  }

  startGame() {
    this.state = GameState.PLAY;
    this.init();
    this.startNextWave();
  }

  update(dt) {
    if (this.isPaused) return;

    this.gameTime += dt;
    this.updateFPS(dt);

    switch (this.state) {
      case GameState.PLAY:
        this.updatePlay(dt);
        break;
      case GameState.LEVELUP:
        this.updateLevelUp(dt);
        break;
      case GameState.SHOP:
        this.updateShop(dt);
        break;
    }

    this.modal.update(dt);
  }

  updateFPS(dt) {
    this.fpsTimer += dt;
    this.frameCount++;
    if (this.fpsTimer >= this.fpsUpdateInterval) {
      this.fps = Math.round(this.frameCount / this.fpsTimer);
      this.frameCount = 0;
      this.fpsTimer = 0;
    }
  }

  updatePlay(dt) {
    // 웨이브 타이머 업데이트
    this.waveTimer += dt;
    if (this.waveTimer >= WaveSystem.WAVE_DURATION) {
      this.startNextWave();
    }

    // 미니보스 스폰 체크
    if (
      !this.miniBossSpawned &&
      this.waveTimer >= WaveSystem.WAVE_DURATION / 2
    ) {
      this.spawnMiniBoss();
      this.miniBossSpawned = true;
    }

    // 게임 오브젝트 업데이트
    this.updateGameObjects(dt);

    // 난이도 조정
    this.difficulty += this.difficultyScaling * dt;
  }

  updateGameObjects(dt) {
    // 화면 내 적만 업데이트
    const visibleEnemies = this.enemies.filter(
      (enemy) =>
        enemy.x >= -50 &&
        enemy.x <= this.canvas.width + 50 &&
        enemy.y >= -50 &&
        enemy.y <= this.canvas.height + 50
    );

    visibleEnemies.forEach((enemy) => enemy.update(dt));

    this.player.update(dt);
    this.bulletManager.update(dt);
    this.particleSystem.update(dt);
    this.effectManager.update(dt);
    this.itemManager.update(dt);

    // 죽은 적 처리
    this.enemies = this.enemies.filter((enemy) => {
      if (enemy.dead) {
        this.handleEnemyDeath(enemy);
        return false;
      }
      return true;
    });
  }

  handleEnemyDeath(enemy) {
    const baseScore = this.calculateScore(enemy);
    this.addScore(baseScore);
    this.player.addXp(baseScore / 10);

    if (this.shouldDropItem(enemy)) {
      this.itemManager.spawnRandomItem(enemy.x, enemy.y);
    }

    this.createDeathEffects(enemy);
  }

  calculateScore(enemy) {
    const scoreMultiplier =
      {
        boss: 10,
        miniBoss: 5,
        normal: 1,
      }[enemy.type] || 1;

    return 100 * scoreMultiplier * this.difficulty;
  }

  shouldDropItem(enemy) {
    const baseDropRate =
      {
        boss: 1,
        miniBoss: 0.8,
        normal: 0.3,
      }[enemy.type] || 0.3;

    return Math.random() < baseDropRate;
  }

  createDeathEffects(enemy) {
    const effectColor = enemy.type === "boss" ? "#ff0000" : "#ffaa00";
    const effectSize = enemy.size * 2;

    this.effectManager.createEffect("explosion", enemy.x, enemy.y, {
      color: effectColor,
      size: effectSize,
    });
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    switch (this.state) {
      case GameState.TITLE:
        this.drawTitle();
        break;
      case GameState.STORY:
        this.drawStory();
        break;
      case GameState.PLAY:
      case GameState.PAUSE:
        this.drawPlay();
        break;
      case GameState.SHOP:
        this.drawPlay();
        this.shop.draw(this.ctx);
        break;
      case GameState.OVER:
        this.drawGameOver();
        break;
    }

    this.modal.draw(this.ctx);

    if (DEBUG_MODE) {
      this.drawDebugInfo();
    }
  }

  drawDebugInfo() {
    this.ctx.save();
    this.ctx.font = "12px Arial";
    this.ctx.fillStyle = "#fff";
    this.ctx.textAlign = "left";
    this.ctx.fillText(`FPS: ${this.fps}`, 10, this.canvas.height - 20);
    this.ctx.fillText(
      `Entities: ${this.enemies.length}`,
      10,
      this.canvas.height - 40
    );
    this.ctx.fillText(
      `Particles: ${this.particleSystem.particles.length}`,
      10,
      this.canvas.height - 60
    );
    this.ctx.restore();
  }

  drawTitle() {
    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.font = "bold 48px Arial";
    this.ctx.fillStyle = "#ffffff";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      "우주 생존자",
      this.canvas.width / 2,
      this.canvas.height / 2 - 50
    );

    this.ctx.font = "24px Arial";
    this.ctx.fillText(
      "SPACE를 눌러 시작",
      this.canvas.width / 2,
      this.canvas.height / 2 + 50
    );
  }

  drawStory() {
    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.font = "20px Arial";
    this.ctx.fillStyle = "#ffffff";
    this.ctx.textAlign = "center";
    const text = StoryText[this.storyIndex];
    const lines = text.split("\n");
    lines.forEach((line, i) => {
      this.ctx.fillText(
        line,
        this.canvas.width / 2,
        this.canvas.height / 2 - 50 + i * 30
      );
    });

    this.ctx.font = "16px Arial";
    this.ctx.fillText(
      "SPACE를 눌러 계속",
      this.canvas.width / 2,
      this.canvas.height - 50
    );
  }

  drawPlay() {
    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.particleSystem.draw(this.ctx);
    this.bulletManager.draw(this.ctx);
    this.enemies.forEach((enemy) => enemy.draw(this.ctx));
    this.itemManager.draw(this.ctx);
    this.player.draw(this.ctx);
    this.effectManager.draw(this.ctx);

    this.drawUI();

    if (this.state === GameState.PAUSE) {
      this.drawPauseOverlay();
    }
  }

  drawUI() {
    this.ctx.save();
    this.ctx.font = "20px Arial";
    this.ctx.fillStyle = "#ffffff";
    this.ctx.textAlign = "left";

    this.ctx.fillText(`점수: ${this.score}`, 20, 30);
    this.ctx.fillText(`골드: ${this.gold}`, 20, 60);

    this.ctx.textAlign = "center";
    this.ctx.fillText(`웨이브 ${this.wave}`, this.canvas.width / 2, 30);
    const timeLeft = Math.ceil(WaveSystem.WAVE_DURATION - this.waveTimer);
    this.ctx.fillText(
      `다음 웨이브까지: ${timeLeft}초`,
      this.canvas.width / 2,
      60
    );

    this.ctx.textAlign = "right";
    this.ctx.fillText(
      `HP: ${Math.ceil(this.player.hp)}/${this.player.maxHp}`,
      this.canvas.width - 20,
      30
    );
    this.ctx.fillText(
      `레벨: ${this.player.level} (${this.player.xp}/${this.player.nextXp})`,
      this.canvas.width - 20,
      60
    );

    this.ctx.restore();
  }

  drawPauseOverlay() {
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.font = "bold 48px Arial";
    this.ctx.fillStyle = "#ffffff";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      "일시 정지",
      this.canvas.width / 2,
      this.canvas.height / 2
    );

    this.ctx.font = "24px Arial";
    this.ctx.fillText(
      "P 또는 ESC를 눌러 계속",
      this.canvas.width / 2,
      this.canvas.height / 2 + 50
    );
  }

  drawGameOver() {
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.font = "bold 48px Arial";
    this.ctx.fillStyle = "#ff0000";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      "게임 오버",
      this.canvas.width / 2,
      this.canvas.height / 2 - 50
    );

    this.ctx.font = "24px Arial";
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillText(
      `최종 점수: ${this.score}`,
      this.canvas.width / 2,
      this.canvas.height / 2 + 10
    );
    this.ctx.fillText(
      `도달 웨이브: ${this.wave}`,
      this.canvas.width / 2,
      this.canvas.height / 2 + 50
    );

    this.ctx.font = "20px Arial";
    this.ctx.fillText(
      "SPACE를 눌러 다시 시작",
      this.canvas.width / 2,
      this.canvas.height / 2 + 100
    );
  }

  showStory() {
    this.state = GameState.STORY;
    this.storyIndex = 0;
  }

  addScore(amount) {
    this.score += amount;
    this.gold += Math.floor(amount * 0.1);
  }

  gameOver() {
    this.state = GameState.OVER;
  }

  init() {
    this.enemies = [];
    this.wave = 0;
    this.score = 0;
    this.gold = 0;
    this.waveTimer = 0;
    this.miniBossSpawned = false;
    this.difficulty = 1.0;

    // 플레이어 리셋
    this.player.x = this.canvas.width / 2;
    this.player.y = this.canvas.height - 50;
    this.player.hp = this.player.maxHp;
    this.player.level = 1;
    this.player.xp = 0;
    this.player.nextXp = 100;

    // 매니저 초기화
    this.bulletManager.clear();
    this.particleSystem.clear();
    this.effectManager.clear();
    this.itemManager.clear();

    this.initObjectPools();
  }

  initObjectPools() {
    this.objectPools = {
      enemies: Array(WaveSystem.MAX_ENEMIES)
        .fill(null)
        .map(() => new Enemy(this)),
      particles: Array(WaveSystem.MAX_PARTICLES)
        .fill(null)
        .map(() => ({
          active: false,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          lifetime: 0,
          maxLifetime: 1,
          color: "#ffffff",
          size: 2,
          alpha: 1,
        })),
      bullets: Array(WaveSystem.MAX_BULLETS)
        .fill(null)
        .map(() => ({
          active: false,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          speed: 0,
          damage: 0,
        })),
    };
  }

  getObjectFromPool(type) {
    const pool = this.objectPools[type];
    if (!pool) return null;

    const obj = pool.find((obj) => !obj.active);
    if (obj) {
      obj.active = true;
      return obj;
    }

    const oldestObj = pool.reduce((oldest, current) => {
      return (current.lifetime || 0) > (oldest.lifetime || 0)
        ? current
        : oldest;
    });
    return oldestObj;
  }

  startNextWave() {
    if (this.enemySpawnInterval) {
      clearInterval(this.enemySpawnInterval);
    }

    this.wave++;
    this.waveTimer = 0;
    this.miniBossSpawned = false;

    const spawnInterval = Math.max(1500 - this.wave * 100, 500);
    const maxEnemiesPerWave = Math.min(
      WaveSystem.BASE_ENEMY_COUNT *
        Math.pow(WaveSystem.DIFFICULTY_SCALE, this.wave - 1),
      WaveSystem.MAX_ENEMIES * 0.7
    );

    // Initial wave spawn
    this.spawnWaveEnemies(maxEnemiesPerWave);

    // Continuous spawning
    this.enemySpawnInterval = setInterval(() => {
      if (
        this.state === GameState.PLAY &&
        this.enemies.length < WaveSystem.MAX_ENEMIES
      ) {
        this.spawnEnemy();
      }
    }, spawnInterval);

    if (this.wave % WaveSystem.BOSS_WAVE_INTERVAL === 0) {
      this.spawnBoss();
    }
  }

  spawnWaveEnemies(count) {
    for (let i = 0; i < count; i++) {
      this.spawnEnemy();
    }
  }

  spawnEnemy() {
    const rand = Math.random();
    let type = "normal";

    if (rand < 0.2) {
      type = "assassin";
    } else if (rand < 0.3) {
      type = "bomber";
    }

    const enemy = this.getObjectFromPool("enemies");
    if (enemy) {
      enemy.init(type);
      this.enemies.push(enemy);
    }
  }

  spawnBoss() {
    const boss = new Enemy(this, "boss");
    const bossWave = this.wave;
    const quote = BOSS_QUOTES[bossWave] || BOSS_QUOTES[5];
    this.modal.show(quote, 3);
    this.enemies.push(boss);
  }

  spawnMiniBoss() {
    this.enemies.push(new Enemy(this, "miniBoss"));
  }

  updateLevelUp(dt) {
    this.levelUpTimer -= dt;
    if (this.levelUpTimer <= 0) {
      this.state = GameState.PLAY;
    }
  }

  updateShop(dt) {
    this.effectManager.update(dt);
    this.particleSystem.update(dt);
  }

  dispose() {
    if (this.enemySpawnInterval) {
      clearInterval(this.enemySpawnInterval);
    }

    window.removeEventListener("keydown", this.boundHandleKeyDown);
    window.removeEventListener("keyup", this.boundHandleKeyUp);
    window.removeEventListener("resize", this.boundResizeCanvas);
    window.removeEventListener("blur", this.boundHandleBlur);

    this.bulletManager.clear();
    this.particleSystem.clear();
    this.effectManager.clear();
    this.itemManager.clear();

    Object.values(this.objectPools).forEach((pool) => {
      pool.length = 0;
    });
  }
}

// --- Item.js ---
import { ItemType } from "./constants.js";

export class Item {
  constructor(game, type, x, y) {
    this.game = game;
    this.type = type;
    this.x = x;
    this.y = y;
    this.collected = false;
    this.init();
  }

  init() {
    this.size = 20;
    this.vy = 1;
    this.magnetSpeed = 0;
    this.magnetRange = 100;
    this.alpha = 1;
    this.fadeSpeed = 0;

    switch (this.type) {
      case ItemType.COIN:
        this.color = "#ffd700";
        break;
      case ItemType.HEALTH:
        this.color = "#ff4444";
        break;
      case ItemType.POWER:
        this.color = "#44ff44";
        break;
      case ItemType.SPEED:
        this.color = "#4444ff";
        break;
      case ItemType.SHIELD:
        this.color = "#44ffff";
        break;
      case ItemType.GEM:
        this.color = "#ff44ff";
        this.size = 30;
        break;
    }
  }

  update(dt) {
    if (this.collected) {
      this.alpha -= this.fadeSpeed * dt;
      if (this.alpha <= 0) {
        this.alpha = 0;
        return true;
      }
    } else {
      const dx = this.game.player.x - this.x;
      const dy = this.game.player.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < this.magnetRange) {
        this.magnetSpeed += dt * 10;
        const angle = Math.atan2(dy, dx);
        this.x += Math.cos(angle) * this.magnetSpeed;
        this.y += Math.sin(angle) * this.magnetSpeed;
      } else {
        this.y += this.vy;
      }

      if (
        Math.abs(dx) < this.game.player.size + this.size &&
        Math.abs(dy) < this.game.player.size + this.size
      ) {
        this.collected = true;
        this.fadeSpeed = 5;
        this.applyEffect();
        this.game.particleSystem.createCollectEffect(
          this.x,
          this.y,
          this.color
        );
      }
    }

    if (this.y > this.game.canvas.height + this.size) {
      return true;
    }

    return false;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;

    if (this.type === ItemType.GEM) {
      // 보석은 다이아몬드 모양으로 그립니다
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - this.size / 2);
      ctx.lineTo(this.x + this.size / 2, this.y);
      ctx.lineTo(this.x, this.y + this.size / 2);
      ctx.lineTo(this.x - this.size / 2, this.y);
      ctx.closePath();
      ctx.fill();
    } else {
      // 다른 아이템들은 원형으로 그립니다
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  applyEffect() {
    switch (this.type) {
      case ItemType.COIN:
        this.game.addScore(100);
        break;
      case ItemType.HEALTH:
        this.game.player.heal(5);
        break;
      case ItemType.POWER:
        this.game.player.addBuff("power", 10);
        break;
      case ItemType.SPEED:
        this.game.player.addBuff("speed", 10);
        break;
      case ItemType.SHIELD:
        this.game.player.addBuff("shield", 10);
        break;
      case ItemType.GEM:
        this.game.addScore(1000);
        this.game.player.addXp(20);
        break;
    }
  }
}

// --- ItemManager.js ---
import { Item } from "./Item.js";

export class ItemManager {
  constructor(game) {
    this.game = game;
    this.items = [];
  }

  update(dt) {
    this.items = this.items.filter((item) => !item.update(dt));
  }

  draw(ctx) {
    this.items.forEach((item) => item.draw(ctx));
  }

  spawnItem(type, x, y) {
    this.items.push(new Item(this.game, type, x, y));
  }

  clear() {
    this.items = [];
  }
}

// --- Modal.js ---
export class Modal {
  constructor(game) {
    this.game = game;
    this.message = "";
    this.duration = 0;
    this.timer = 0;
    this.visible = false;
  }

  show(message, duration = 3) {
    this.message = message;
    this.duration = duration;
    this.timer = duration;
    this.visible = true;
  }

  update(dt) {
    if (this.visible) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.visible = false;
      }
    }
  }

  draw(ctx) {
    if (!this.visible) return;

    const width = this.game.canvas.width;
    const height = this.game.canvas.height;

    // 반투명 배경
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, height * 0.4, width, height * 0.2);

    // 메시지 표시
    ctx.font = "bold 24px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (typeof this.message === "string") {
      ctx.fillText(this.message, width / 2, height / 2);
    } else if (this.message.name && this.message.quote) {
      ctx.fillText(this.message.name, width / 2, height * 0.45);
      ctx.font = "20px Arial";
      ctx.fillText(this.message.quote, width / 2, height * 0.55);
    }
  }
}

// --- ParticleSystem.js ---
export class ParticleSystem {
  constructor(game) {
    this.game = game;
    this.particles = [];
    this.particlePool = [];
    this.maxParticles = 1000;

    // 파티클 풀 초기화
    this.initParticlePool();
  }

  initParticlePool() {
    for (let i = 0; i < this.maxParticles; i++) {
      this.particlePool.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 0,
        color: "",
        alpha: 1,
        lifetime: 0,
        maxLifetime: 1,
        gravity: 0,
        friction: 1,
        type: "",
        rotation: 0,
        rotationSpeed: 0,
      });
    }
  }

  getParticle() {
    return this.particlePool.find((p) => !p.active) || null;
  }

  clear() {
    this.particles = [];
    this.particlePool.forEach((p) => (p.active = false));
  }

  update(dt) {
    for (let particle of this.particles) {
      if (!particle.active) continue;

      particle.lifetime += dt;
      if (particle.lifetime >= particle.maxLifetime) {
        particle.active = false;
        continue;
      }

      // 알파값 업데이트
      particle.alpha = Math.max(
        0,
        1 - particle.lifetime / particle.maxLifetime
      );

      // 물리 업데이트
      particle.vy += particle.gravity * dt;
      particle.vx *= particle.friction;
      particle.vy *= particle.friction;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;

      // 회전 업데이트
      if (particle.rotationSpeed) {
        particle.rotation += particle.rotationSpeed * dt;
      }
    }

    // 비활성화된 파티클 제거
    this.particles = this.particles.filter((p) => p.active);
  }

  createParticle(x, y, options = {}) {
    const particle = this.getParticle();
    if (!particle) return null;

    const defaults = {
      vx: (Math.random() - 0.5) * 200,
      vy: (Math.random() - 0.5) * 200,
      size: 4,
      color: "#ffffff",
      maxLifetime: 1,
      gravity: 0,
      friction: 0.98,
      type: "circle",
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 5,
    };

    // 파티클 초기화
    Object.assign(particle, {
      active: true,
      x,
      y,
      lifetime: 0,
      alpha: 1,
      ...defaults,
      ...options,
    });

    this.particles.push(particle);
    return particle;
  }

  createExplosion(x, y, color, count = 20) {
    const baseSpeed = 200;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = baseSpeed * (0.8 + Math.random() * 0.4);
      this.createParticle(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: color,
        size: 3 + Math.random() * 3,
        maxLifetime: 0.5 + Math.random() * 0.5,
        gravity: 200,
        type: "spark",
      });
    }
  }

  createHitEffect(x, y) {
    const count = 8;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 100 + Math.random() * 50;
      this.createParticle(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: "#ffffff",
        size: 2,
        maxLifetime: 0.3,
        type: "line",
      });
    }
  }

  createTrail(x, y, color = "#fc6") {
    this.createParticle(x, y, {
      vx: (Math.random() - 0.5) * 20,
      vy: (Math.random() - 0.5) * 20,
      color: color,
      size: 3,
      maxLifetime: 0.3,
      type: "circle",
    });
  }

  createLevelUpEffect(x, y) {
    // 상승 파티클
    for (let i = 0; i < 20; i++) {
      this.createParticle(x, y, {
        vx: (Math.random() - 0.5) * 100,
        vy: -200 - Math.random() * 200,
        color: "#ffff00",
        size: 4,
        maxLifetime: 1,
        gravity: 100,
        type: "star",
      });
    }

    // 폭발 파티클
    this.createExplosion(x, y, "#ffff00", 30);
  }

  createPowerUpEffect(x, y, color) {
    const count = 12;
    const radius = 30;

    // 회전하는 파티클
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      this.createParticle(
        x + Math.cos(angle) * radius,
        y + Math.sin(angle) * radius,
        {
          vx: Math.cos(angle) * 100,
          vy: Math.sin(angle) * 100,
          color: color,
          size: 5,
          maxLifetime: 0.5,
          type: "diamond",
        }
      );
    }
  }

  draw(ctx) {
    ctx.save();

    for (let particle of this.particles) {
      if (!particle.active) continue;

      ctx.globalAlpha = particle.alpha;
      ctx.fillStyle = particle.color;
      ctx.strokeStyle = particle.color;

      switch (particle.type) {
        case "circle":
          this.drawCircleParticle(ctx, particle);
          break;
        case "spark":
          this.drawSparkParticle(ctx, particle);
          break;
        case "line":
          this.drawLineParticle(ctx, particle);
          break;
        case "star":
          this.drawStarParticle(ctx, particle);
          break;
        case "diamond":
          this.drawDiamondParticle(ctx, particle);
          break;
      }
    }

    ctx.restore();
  }

  drawCircleParticle(ctx, particle) {
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  }

  drawSparkParticle(ctx, particle) {
    const progress = particle.lifetime / particle.maxLifetime;
    const length = particle.size * (1 - progress);

    ctx.beginPath();
    ctx.moveTo(
      particle.x - Math.cos(particle.rotation) * length,
      particle.y - Math.sin(particle.rotation) * length
    );
    ctx.lineTo(
      particle.x + Math.cos(particle.rotation) * length,
      particle.y + Math.sin(particle.rotation) * length
    );
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  drawLineParticle(ctx, particle) {
    const length = particle.size * 3;
    const angle = Math.atan2(particle.vy, particle.vx);

    ctx.beginPath();
    ctx.moveTo(
      particle.x - Math.cos(angle) * length,
      particle.y - Math.sin(angle) * length
    );
    ctx.lineTo(
      particle.x + Math.cos(angle) * length,
      particle.y + Math.sin(angle) * length
    );
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  drawStarParticle(ctx, particle) {
    const spikes = 5;
    const outerRadius = particle.size;
    const innerRadius = particle.size / 2;

    ctx.beginPath();
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.rotation);

    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (Math.PI * i) / spikes;
      if (i === 0) {
        ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      } else {
        ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      }
    }

    ctx.closePath();
    ctx.fill();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  drawDiamondParticle(ctx, particle) {
    ctx.beginPath();
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.rotation);

    const size = particle.size;
    ctx.moveTo(0, -size);
    ctx.lineTo(size, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size, 0);

    ctx.closePath();
    ctx.fill();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}

// --- Player.js ---
import { Skill } from "./Skill.js";
import { SkillType, GameState } from "./constants.js";

export class Player {
  constructor(game) {
    this.game = game;
    this.x = game.canvas.width / 2;
    this.y = game.canvas.height - 50;
    this.radius = 20;
    this.speed = 300;
    this.hp = 100;
    this.maxHp = 100;
    this.level = 1;
    this.xp = 0;
    this.nextXp = 100;

    // 전투 관련 스탯
    this.bulletDamage = 10;
    this.bulletSize = 8;
    this.attackSpeed = 0.25;
    this.attackTimer = 0;
    this.criticalChance = 0.05;
    this.criticalDamage = 2.0;

    // 버프 및 상태 효과
    this.buffs = [];
    this.shieldActive = false;
    this.invincible = false;
    this.invincibleTimer = 0;

    // 이동 관련
    this.moveDirection = { x: 0, y: 0 };
    this.dashSpeed = 800;
    this.dashDuration = 0.2;
    this.dashCooldown = 2;
    this.dashTimer = 0;
    this.isDashing = false;

    // 스킬 시스템
    this.skills = new Map();
    this.skillPoints = 0;

    // 키 입력 상태
    this.keys = {
      up: false,
      down: false,
      left: false,
      right: false,
      dash: false,
      attack: false,
    };
  }

  update(dt) {
    this.updateMovement(dt);
    this.updateCombat(dt);
    this.updateBuffs(dt);
    this.updateDash(dt);

    // 무적 시간 업데이트
    if (this.invincible) {
      this.invincibleTimer -= dt;
      if (this.invincibleTimer <= 0) {
        this.invincible = false;
      }
    }
  }

  updateMovement(dt) {
    // 이동 방향 계산
    this.moveDirection.x = 0;
    this.moveDirection.y = 0;

    if (this.keys.left) this.moveDirection.x -= 1;
    if (this.keys.right) this.moveDirection.x += 1;
    if (this.keys.up) this.moveDirection.y -= 1;
    if (this.keys.down) this.moveDirection.y += 1;

    // 대각선 이동 보정
    if (this.moveDirection.x !== 0 && this.moveDirection.y !== 0) {
      const normalizer = Math.sqrt(2);
      this.moveDirection.x /= normalizer;
      this.moveDirection.y /= normalizer;
    }

    // 현재 속도 계산 (대시 상태 반영)
    const currentSpeed = this.isDashing ? this.dashSpeed : this.speed;

    // 이동 적용
    this.x += this.moveDirection.x * currentSpeed * dt;
    this.y += this.moveDirection.y * currentSpeed * dt;

    // 화면 경계 처리
    this.x = Math.max(
      this.radius,
      Math.min(this.game.canvas.width - this.radius, this.x)
    );
    this.y = Math.max(
      this.radius,
      Math.min(this.game.canvas.height - this.radius, this.y)
    );
  }

  updateCombat(dt) {
    // 공격 타이머 업데이트
    if (this.keys.attack) {
      this.attackTimer += dt;
      if (this.attackTimer >= this.attackSpeed) {
        this.shoot();
        this.attackTimer = 0;
      }
    }
  }

  shoot() {
    // 기본 총알 속성 설정
    const bulletOptions = {
      size: this.bulletSize,
      speed: 400,
      damage: this.calculateDamage(),
      color: "#fc6",
      trail: true,
      trailColor: "#fc6",
    };

    // 레벨에 따른 총알 패턴
    if (this.level >= 10) {
      // 3-way 스프레드 샷
      this.game.bulletManager.spawnPlayerBullet(this.x, this.y, 0, -1, {
        ...bulletOptions,
        pattern: "spread",
        bulletCount: 3,
        spreadAngle: 30,
      });
    } else if (this.level >= 5) {
      // 듀얼 샷
      this.game.bulletManager.spawnPlayerBullet(
        this.x - 15,
        this.y,
        0,
        -1,
        bulletOptions
      );
      this.game.bulletManager.spawnPlayerBullet(
        this.x + 15,
        this.y,
        0,
        -1,
        bulletOptions
      );
    } else {
      // 기본 단일 샷
      this.game.bulletManager.spawnPlayerBullet(
        this.x,
        this.y,
        0,
        -1,
        bulletOptions
      );
    }

    // 발사 이펙트
    this.game.effectManager.createEffect("muzzleFlash", this.x, this.y, {
      color: "#fc6",
    });

    // 사운드 효과
    this.game.soundManager.play("shoot");
  }

  calculateDamage() {
    // 크리티컬 히트 계산
    const isCritical = Math.random() < this.criticalChance;
    const damage = this.bulletDamage * (isCritical ? this.criticalDamage : 1);

    // 파워 버프 효과 적용
    const powerBuff = this.buffs.find((buff) => buff.type === "power");
    return powerBuff ? damage * 1.5 : damage;
  }

  updateDash(dt) {
    // 대시 쿨다운 업데이트
    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
    }

    // 대시 상태 업데이트
    if (this.isDashing) {
      this.dashDuration -= dt;
      if (this.dashDuration <= 0) {
        this.isDashing = false;
      }
    }

    // 대시 키 입력 처리
    if (this.keys.dash && this.dashTimer <= 0 && !this.isDashing) {
      this.startDash();
    }
  }

  startDash() {
    this.isDashing = true;
    this.dashDuration = 0.2;
    this.dashTimer = this.dashCooldown;
    this.invincible = true;
    this.invincibleTimer = this.dashDuration;

    // 대시 이펙트
    this.game.effectManager.createEffect("dash", this.x, this.y, {
      direction: this.moveDirection,
    });

    // 대시 사운드
    this.game.soundManager.play("dash");
  }

  takeDamage(amount) {
    if (this.invincible || this.shieldActive) return;

    this.hp -= amount;
    this.invincible = true;
    this.invincibleTimer = 0.5;

    // 피격 이펙트
    this.game.effectManager.createEffect("damage", this.x, this.y, { amount });
    this.game.particleSystem.createExplosion(this.x, this.y, "#f66", 10);

    if (this.hp <= 0) {
      this.hp = 0;
      this.game.state = GameState.OVER;
      this.game.soundManager.play("gameOver");
    } else {
      this.game.soundManager.play("hit");
    }
  }

  heal(amount) {
    const healAmount = Math.min(amount, this.maxHp - this.hp);
    this.hp += healAmount;

    if (healAmount > 0) {
      this.game.effectManager.createEffect("heal", this.x, this.y, {
        amount: healAmount,
      });
      this.game.soundManager.play("heal");
    }
  }

  addXp(amount) {
    this.xp += amount;
    while (this.xp >= this.nextXp) {
      this.levelUp();
    }
  }

  levelUp() {
    this.level++;
    this.xp -= this.nextXp;
    this.nextXp = Math.floor(this.nextXp * 1.3 + 10);
    this.skillPoints++;

    // 레벨업 보상
    this.maxHp += 5;
    this.hp = this.maxHp;
    this.bulletDamage += 2;

    // 레벨업 이펙트
    this.game.effectManager.createEffect("levelUp", this.x, this.y);
    this.game.particleSystem.createLevelUpEffect(this.x, this.y);
    this.game.soundManager.play("levelUp");

    // 게임 상태 변경
    this.game.state = GameState.LEVELUP;
    this.game.levelUpTimer = 1.5;
  }

  updateKeyState(code, pressed) {
    const keyMap = {
      KeyW: "up",
      ArrowUp: "up",
      KeyS: "down",
      ArrowDown: "down",
      KeyA: "left",
      ArrowLeft: "left",
      KeyD: "right",
      ArrowRight: "right",
      Space: "attack",
      ShiftLeft: "dash",
    };
    if (keyMap.hasOwnProperty(code)) {
      this.keys[keyMap[code]] = pressed;
    }
  }

  draw(ctx) {
    ctx.save();

    // 무적 상태 표시
    if (this.invincible) {
      ctx.globalAlpha = 0.5;
    }

    // 방어막 효과
    if (this.shieldActive) {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(0, 255, 255, 0.5)";
      ctx.lineWidth = 2;
      ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 플레이어 본체
    const gradient = ctx.createRadialGradient(
      this.x,
      this.y,
      0,
      this.x,
      this.y,
      this.radius
    );
    gradient.addColorStop(0, "#4af");
    gradient.addColorStop(1, "#24f");

    ctx.fillStyle = gradient;
    ctx.shadowColor = "#4af";
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // HP 바
    this.drawHealthBar(ctx);

    ctx.restore();
  }

  drawHealthBar(ctx) {
    const barWidth = this.radius * 2;
    const barHeight = 4;
    const x = this.x - barWidth / 2;
    const y = this.y - this.radius - 10;

    // HP 배경
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, y, barWidth, barHeight);

    // HP 게이지
    const hpRatio = this.hp / this.maxHp;
    const hpColor = hpRatio > 0.5 ? "#2f2" : hpRatio > 0.2 ? "#ff2" : "#f22";
    ctx.fillStyle = hpColor;
    ctx.fillRect(x, y, barWidth * hpRatio, barHeight);
  }

  addBuff(type, duration) {
    const existingBuff = this.buffs.find((buff) => buff.type === type);
    if (existingBuff) {
      existingBuff.duration = Math.max(existingBuff.duration, duration);
    } else {
      this.buffs.push({ type, duration });
      switch (type) {
        case "power":
          this.bulletDamage *= 1.5;
          break;
        case "speed":
          this.speed *= 1.3;
          break;
      }
    }
    this.game.effectManager.createEffect("buff", this.x, this.y, { type });
  }

  updateBuffs(dt) {
    this.buffs = this.buffs.filter((buff) => {
      buff.duration -= dt;
      return buff.duration > 0;
    });
  }

  activateSkill(skillKey) {
    try {
      const skill = this.skills[skillKey];
      if (!skill) {
        console.warn(`스킬 ${skillKey}가 존재하지 않습니다.`);
        return false;
      }

      if (skill.cooldownTimer <= 0) {
        skill.active = true;
        skill.cooldownTimer = skill.cooldown;
        skill.durationTimer = skill.duration;
        console.log(`${skillKey} 스킬 활성화`);
        return true;
      } else {
        console.warn(
          `${skillKey} 스킬을 활성화할 수 없습니다. (쿨타임: ${Math.max(
            0,
            skill.cooldownTimer
          ).toFixed(1)}초)`
        );
        return false;
      }
    } catch (error) {
      console.error(`스킬 활성화 중 오류 발생: ${error.message}`);
      return false;
    }
  }

  addShield(duration) {
    this.buffs.push({ type: "shield", duration: duration });
    console.log("방어막 버프 추가:", duration);
  }
}

// --- Shop.js ---
import { ShopItems } from "./constants.js";

export class Shop {
  constructor(game) {
    this.game = game;
    this.selectedIndex = 0;
    this.items = Object.values(ShopItems);
  }

  update() {
    // 아이템 가격 업데이트 등의 로직이 필요한 경우 여기에 구현
  }

  draw(ctx) {
    const width = this.game.canvas.width;
    const height = this.game.canvas.height;

    // 반투명 배경
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(0, 0, width, height);

    // 제목
    ctx.font = "bold 32px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText("상점", width / 2, 50);

    // 플레이어 골드 표시
    ctx.font = "20px Arial";
    ctx.fillStyle = "#ffd700";
    ctx.fillText(`보유 골드: ${this.game.gold}`, width / 2, 90);

    // 아이템 목록
    const itemHeight = 80;
    const startY = 150;
    this.items.forEach((item, index) => {
      const y = startY + index * itemHeight;
      const isSelected = index === this.selectedIndex;
      const canAfford = this.game.gold >= item.cost;

      // 선택된 아이템 배경
      if (isSelected) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
        ctx.fillRect(width * 0.1, y - 10, width * 0.8, itemHeight - 10);
      }

      // 아이템 이름
      ctx.font = "bold 24px Arial";
      ctx.fillStyle = canAfford ? "#ffffff" : "#666666";
      ctx.textAlign = "left";
      ctx.fillText(item.name, width * 0.15, y + 20);

      // 아이템 설명
      ctx.font = "16px Arial";
      ctx.fillStyle = canAfford ? "#cccccc" : "#666666";
      ctx.fillText(item.description, width * 0.15, y + 45);

      // 아이템 가격
      ctx.font = "20px Arial";
      ctx.fillStyle = canAfford ? "#ffd700" : "#666666";
      ctx.textAlign = "right";
      ctx.fillText(`${item.cost} G`, width * 0.85, y + 30);
    });

    // 조작 안내
    ctx.font = "16px Arial";
    ctx.fillStyle = "#cccccc";
    ctx.textAlign = "center";
    ctx.fillText(
      "↑/↓: 아이템 선택   SPACE: 구매   ESC: 나가기",
      width / 2,
      height - 30
    );
  }

  selectPrevItem() {
    this.selectedIndex =
      (this.selectedIndex - 1 + this.items.length) % this.items.length;
  }

  selectNextItem() {
    this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
  }

  purchaseSelectedItem() {
    const selectedItem = this.items[this.selectedIndex];
    if (this.game.gold >= selectedItem.cost) {
      this.game.gold -= selectedItem.cost;
      selectedItem.effect(this.game.player);
      this.game.effectManager.createEffect(
        "buff",
        this.game.player.x,
        this.game.player.y,
        { type: selectedItem.id }
      );
      return true;
    }
    return false;
  }
}

// --- Skill.js ---
import { SkillType } from "./constants.js";

export class Skill {
  constructor(game, type) {
    this.game = game;
    this.type = type;
    this.level = 0;
    this.maxLevel = 5;
    this.cooldown = 0;
    this.cooldownTimer = 0;
    this.active = false;
    this.duration = 0;
    this.durationTimer = 0;
    this.init();
  }

  init() {
    switch (this.type) {
      case SkillType.REGEN_AURA:
        this.cooldown = 8;
        this.duration = 5;
        this.range = 200;
        this.healAmount = 2;
        break;
      case SkillType.HOMING_LASER:
        this.cooldown = 2;
        this.damage = 25;
        this.projectileSpeed = 400;
        this.trackingStrength = 0.15;
        break;
      case SkillType.CHAIN_LIGHTNING:
        this.cooldown = 4;
        this.damage = 20;
        this.chainCount = 4;
        this.chainRange = 150;
        break;
      case SkillType.METEOR_SHOWER:
        this.cooldown = 6;
        this.duration = 3;
        this.meteorCount = 8;
        this.damage = 35;
        break;
    }
  }

  update(dt) {
    if (this.cooldownTimer > 0) this.cooldownTimer -= dt;
    if (this.active) {
      this.durationTimer -= dt;
      if (this.durationTimer <= 0) this.deactivate();
      else this.updateEffect(dt);
    }
  }

  updateEffect(dt) {
    switch (this.type) {
      case SkillType.REGEN_AURA:
        this.updateRegenAura(dt);
        break;
      case SkillType.HOMING_LASER:
        this.updateHomingLaser(dt);
        break;
      case SkillType.CHAIN_LIGHTNING:
        this.updateChainLightning(dt);
        break;
      case SkillType.METEOR_SHOWER:
        this.updateMeteorShower(dt);
        break;
    }
  }

  updateRegenAura(dt) {
    if (this.game.player.hp < this.game.player.maxHp)
      this.game.player.hp = Math.min(
        this.game.player.hp + this.healAmount * dt,
        this.game.player.maxHp
      );
    if (Math.random() < dt * 3) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * this.range;
      this.game.effectManager.createHealEffect(
        this.game.player.x + Math.cos(angle) * distance,
        this.game.player.y + Math.sin(angle) * distance
      );
    }
  }

  updateHomingLaser(dt) {
    const colors = ["#ff0", "#f0f", "#0ff", "#f80"];
    const angle = Math.PI * 1.5;
    const speed = this.projectileSpeed;
    const color = colors[Math.floor(Math.random() * colors.length)];
    this.game.bulletManager.spawnPlayerBullet(
      this.game.player.x,
      this.game.player.y,
      Math.cos(angle),
      Math.sin(angle),
      {
        size: 15,
        speed: speed,
        damage: this.damage,
        color: color,
        isLaser: true,
        penetrate: true,
      }
    );
  }

  updateChainLightning(dt) {
    const angle = Math.PI * 1.5;
    const zigzagAmplitude = 30;
    const zigzagFrequency = 0.1;
    this.game.bulletManager.spawnPlayerBullet(
      this.game.player.x,
      this.game.player.y,
      Math.cos(angle),
      Math.sin(angle),
      {
        size: 12,
        speed: 300,
        damage: this.damage,
        color: "#7df",
        isZigzag: true,
        zigzagAmplitude,
        zigzagFrequency,
        time: 0,
        chainRange: this.chainRange,
        chainCount: this.chainCount,
        originalX: this.game.player.x,
      }
    );
  }

  updateMeteorShower(dt) {
    if (Math.random() < dt * this.meteorCount) {
      const x = Math.random() * this.game.canvas.width;
      const y = -50;
      const targetX = x + (Math.random() - 0.5) * 200;
      const targetY = this.game.canvas.height + 50;
      const angle = Math.atan2(targetY - y, targetX - x);
      const speed = 300;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      this.game.bulletManager.spawnPlayerBullet(x, y, vx / speed, vy / speed, {
        size: 20,
        speed: speed,
        damage: this.damage,
        color: "#f66",
        isMeteor: true,
      });
      this.game.particleSystem.createTrail(x, y, "#f66");
    }
  }

  activate() {
    if (this.cooldownTimer <= 0) {
      this.active = true;
      this.cooldownTimer = this.cooldown;
      this.durationTimer = this.duration;
      return true;
    }
    return false;
  }

  deactivate() {
    this.active = false;
    this.durationTimer = 0;
  }

  levelUp() {
    if (this.level >= this.maxLevel) return false;
    this.level++;
    this.upgradeEffects();
    return true;
  }

  upgradeEffects() {
    switch (this.type) {
      case SkillType.REGEN_AURA:
        this.healAmount *= 1.2;
        this.range *= 1.1;
        break;
      case SkillType.HOMING_LASER:
        this.damage *= 1.3;
        this.cooldown *= 0.9;
        break;
      case SkillType.CHAIN_LIGHTNING:
        this.damage *= 1.2;
        this.chainCount++;
        this.chainRange *= 1.1;
        break;
      case SkillType.METEOR_SHOWER:
        this.damage *= 1.25;
        this.meteorCount++;
        break;
    }
  }
}

// --- constants.js ---
export const GameState = {
  TITLE: 0,
  PLAY: 1,
  PAUSE: 2,
  OVER: 3,
  LEVELUP: 4,
  SPIN: 5,
  SHOP: 6,
  SETTING: 7,
  SKILL_SELECT: 8,
  LOBBY: 9,
};

export const DEBUG_MODE = false;

export const MAX_PARTICLES = 100;
export const MAX_EFFECTS = 50;
export const MAX_BULLETS = 200;
export const MAX_ENEMIES = 50;

export const StoryText = [
  "2157년, 인류는 마침내 새로운 행성 '네오 테라'를 발견했다.",
  "그러나 이 행성에는 이미 고대 문명의 수호자들이 존재했고,",
  "그들은 인류의 침공에 맞서 저항하기 시작했다.",
  "당신은 인류의 마지막 희망, 특수 전투기 'WaveAttack'의 파일럿이다.",
  "수호자들을 물리치고 인류의 새로운 보금자리를 지켜내라!",
  "하지만 조심하라... 강력한 보스들이 당신을 기다리고 있다...",
];

export const BOSS_QUOTES = {
  5: {
    name: "크림슨 가디언",
    quote: "인간이여... 너희의 욕망이 이 행성을 파괴할 것이다!",
  },
  10: { name: "스톰 로드", quote: "이 폭풍의 심판을 받아라!" },
  15: { name: "섀도우 리퍼", quote: "너희의 미래는 어둠 속에 묻힐 것이다..." },
  20: {
    name: "네오 테라의 황제",
    quote: "여기까지 오다니... 하지만 이제 끝이다!",
  },
};

export const ItemType = {
  COIN: "coin",
  GEM: "gem",
  HEALTH: "health",
  POWER: "power",
  SPEED: "speed",
  SHIELD: "shield",
};

export const SkillType = {
  REGEN_AURA: "regenAura",
  HOMING_LASER: "homingLaser",
  CHAIN_LIGHTNING: "chainLightning",
  METEOR_SHOWER: "meteorShower",
};

export const ShopItems = {
  HEALTH_UP: {
    id: "healthUp",
    name: "최대 체력 증가",
    description: "최대 체력을 5 증가시킵니다",
    cost: 3,
    effect: (player) => {
      player.maxHp += 5;
      player.hp += 5;
    },
  },
  DAMAGE_UP: {
    id: "damageUp",
    name: "공격력 증가",
    description: "총알 데미지를 2 증가시킵니다",
    cost: 4,
    effect: (player) => {
      player.bulletDamage += 2;
    },
  },
  ATTACK_SPEED: {
    id: "attackSpeed",
    name: "공격 속도 증가",
    description: "공격 속도를 15% 증가시킵니다",
    cost: 5,
    effect: (player) => {
      player.attackSpeed *= 0.85;
    },
  },
  BULLET_SIZE: {
    id: "bulletSize",
    name: "총알 크기 증가",
    description: "총알의 크기를 증가시킵니다",
    cost: 3,
    effect: (player) => {
      player.bulletSize *= 1.2;
    },
  },
};

export const WaveSystem = {
  WAVE_DURATION: 45,
  BOSS_WAVE_INTERVAL: 5,
  DIFFICULTY_SCALE: 1.08,
  BASE_ENEMY_COUNT: 5,
};

export const SkillUpgrades = {
  ATTACK_DAMAGE: {
    id: "attackDamage",
    name: "공격력 강화",
    description: "기본 공격력이 30% 증가합니다",
    effect: (player) => {
      player.bulletDamage *= 1.3;
    },
  },
  ATTACK_SPEED: {
    id: "attackSpeed",
    name: "공격 속도 강화",
    description: "공격 속도가 20% 증가합니다",
    effect: (player) => {
      player.attackSpeed *= 0.8;
    },
  },
  HP_UP: {
    id: "hpUp",
    name: "체력 강화",
    description: "최대 체력이 30% 증가합니다",
    effect: (player) => {
      const inc = Math.floor(player.maxHp * 0.3);
      player.maxHp += inc;
      player.hp += inc;
    },
  },
  BULLET_SIZE: {
    id: "bulletSize",
    name: "총알 크기 강화",
    description: "총알의 크기가 20% 증가합니다",
    effect: (player) => {
      player.bulletSize *= 1.2;
    },
  },
};

// --- main.js ---
import { Game } from "./Game.js";

// 캔버스 설정
const canvas = document.createElement("canvas");
canvas.width = 800;
canvas.height = 600;
document.body.appendChild(canvas);

// 게임 인스턴스 생성
const game = new Game(canvas);

// 게임 루프
let lastTime = 0;
function gameLoop(timestamp) {
  const deltaTime = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  game.update(deltaTime);
  game.draw();

  requestAnimationFrame(gameLoop);
}

// 게임 시작
requestAnimationFrame(gameLoop);

// 창 크기 변경 시 캔버스 크기 조정
window.addEventListener("resize", () => {
  const width = Math.min(800, window.innerWidth - 20);
  const height = Math.min(600, window.innerHeight - 20);
  const scale = Math.min(width / 800, height / 600);

  canvas.style.width = `${800 * scale}px`;
  canvas.style.height = `${600 * scale}px`;
});
