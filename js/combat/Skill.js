import { SkillType } from "../core/constants.js";

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
        this.duration = 1.5;
        this.healAmount = 20;
        this.range = 40;
        this.pulseInterval = 0.5;
        this.pulseTimer = 0;
        this.shieldAmount = 5;
        this.crossFadeTimer = 0;
        this.crossFadeDuration = 0.4;
        this.particleColors = ["#4f4", "#2f2", "#0f0", "#0a0"];
        break;
      case SkillType.HOMING_LASER:
        this.cooldown = 3;
        this.duration = 1;
        this.damage = 40;
        this.beamWidth = 15;
        this.beamSpeed = 2000;
        this.penetration = 999;
        this.colorTimer = 0;
        this.colorInterval = 0.05;
        this.colors = [
          "#ff4444",
          "#44ff44",
          "#4444ff",
          "#ff44ff",
          "#44ffff",
          "#ffff44",
          "#ffffff",
        ];
        this.glowColors = [
          "rgba(255,0,0,0.3)",
          "rgba(0,255,0,0.3)",
          "rgba(0,0,255,0.3)",
          "rgba(255,0,255,0.3)",
          "rgba(0,255,255,0.3)",
          "rgba(255,255,0,0.3)",
          "rgba(255,255,255,0.3)",
        ];
        this.currentColorIndex = 0;
        break;
      case SkillType.CHAIN_LIGHTNING:
        this.cooldown = 4;
        this.damage = 20;
        this.chainCount = 4;
        this.chainRange = 150;
        this.stunDuration = 0.5;
        this.damageAmplification = 1.2;
        this.slowEffect = 0.3;
        this.slowDuration = 2;
        break;
      case SkillType.METEOR_SHOWER:
        this.cooldown = 6;
        this.duration = 3;
        this.meteorCount = 8;
        this.damage = 35;
        this.explosionRadius = 80;
        this.burnDamage = 10;
        this.burnDuration = 3;
        this.groundFireDuration = 2;
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
    if (this.game.player.hp < this.game.player.maxHp) {
      const healingAmount = this.healAmount * dt;
      this.game.player.hp = Math.min(
        this.game.player.hp + healingAmount,
        this.game.player.maxHp
      );
      if (Math.random() < dt * 5) {
        this.crossFadeTimer = this.crossFadeDuration;
        this.drawHealingCross();
      }
      if (this.crossFadeTimer > 0) {
        this.crossFadeTimer = Math.max(0, this.crossFadeTimer - dt);
        this.drawHealingCross();
      }
    }
    this.pulseTimer += dt;
    if (this.pulseTimer >= this.pulseInterval) {
      this.pulseTimer = 0;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const x = this.game.player.x + Math.cos(angle) * this.range;
        const y = this.game.player.y + Math.sin(angle) * this.range;
        this.game.particleSystem.createExplosion(x, y, "#4f4", 2, {
          speed: 0,
          scale: 1.2,
        });
        if (i % 8 === 0) {
          this.game.particleSystem.createExplosion(x, y, "#8f8", 1, {
            speed: 3,
            scale: 0.8,
          });
        }
      }
      for (let i = 0; i < 4; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = this.range * 0.15;
        this.game.particleSystem.createExplosion(
          this.game.player.x + Math.cos(angle) * distance,
          this.game.player.y + Math.sin(angle) * distance,
          "#4f4",
          2,
          {
            speed: 15,
            direction: angle,
            scale: 1,
          }
        );
      }
      this.game.player.addShield(this.shieldAmount);
    }
  }
  drawHealingCross() {
    const ctx = this.game.ctx;
    const x = this.game.player.x;
    const y = this.game.player.y;
    const size = 30;
    const alpha = this.crossFadeTimer / this.crossFadeDuration;
    ctx.save();
    ctx.strokeStyle = `rgba(0, 255, 0, ${alpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y - size / 2);
    ctx.lineTo(x, y + size / 2);
    ctx.moveTo(x - size / 2, y);
    ctx.lineTo(x + size / 2, y);
    ctx.stroke();
    ctx.restore();
  }
  updateHomingLaser(dt) {
    this.colorTimer += dt;
    if (this.colorTimer >= this.colorInterval) {
      this.colorTimer = 0;
      this.currentColorIndex =
        (this.currentColorIndex + 1) % this.colors.length;
    }
    const angle = -Math.PI / 2;
    const beamLength = 2000;
    for (let enemy of this.game.enemies) {
      if (enemy.dead) continue;
      const xDiff = Math.abs(enemy.x - this.game.player.x);
      if (xDiff <= this.beamWidth / 2 && enemy.y < this.game.player.y) {
        enemy.takeDamage(this.damage * dt);
        for (let i = 0; i < 3; i++) {
          this.game.particleSystem.createExplosion(
            enemy.x + (Math.random() - 0.5) * this.beamWidth,
            enemy.y + (Math.random() - 0.5) * this.beamWidth,
            this.colors[this.currentColorIndex],
            5
          );
        }
      }
    }
    this.game.bulletManager.spawnPlayerBullet(
      this.game.player.x,
      this.game.player.y,
      Math.cos(angle),
      Math.sin(angle),
      {
        size: this.beamWidth * 3,
        speed: this.beamSpeed,
        damage: 0,
        color: this.glowColors[this.currentColorIndex],
        isBeam: true,
        beamLength: beamLength,
        trailEffect: true,
      }
    );
    this.game.bulletManager.spawnPlayerBullet(
      this.game.player.x,
      this.game.player.y,
      Math.cos(angle),
      Math.sin(angle),
      {
        size: this.beamWidth,
        speed: this.beamSpeed,
        damage: 0,
        color: this.colors[this.currentColorIndex],
        isBeam: true,
        beamLength: beamLength,
        trailEffect: true,
      }
    );
    for (let i = 0; i < 5; i++) {
      this.game.particleSystem.createExplosion(
        this.game.player.x + (Math.random() - 0.5) * this.beamWidth * 2,
        this.game.player.y,
        this.colors[this.currentColorIndex],
        8
      );
    }
    for (let i = 0; i < 8; i++) {
      const distance = Math.random() * beamLength;
      this.game.particleSystem.createExplosion(
        this.game.player.x + (Math.random() - 0.5) * this.beamWidth,
        this.game.player.y - distance,
        this.colors[this.currentColorIndex],
        3
      );
    }
  }
  updateChainLightning(dt) {
    const startAngle = Math.PI * 1.5;
    const chainData = {
      damage: this.damage,
      chainCount: this.chainCount,
      chainRange: this.chainRange,
      damageAmplification: this.damageAmplification,
      stunDuration: this.stunDuration,
      slowEffect: this.slowEffect,
      slowDuration: this.slowDuration,
    };
    this.game.bulletManager.spawnPlayerBullet(
      this.game.player.x,
      this.game.player.y,
      Math.cos(startAngle),
      Math.sin(startAngle),
      {
        size: 12,
        speed: 400,
        damage: this.damage,
        color: "#7df",
        isChainLightning: true,
        chainData: chainData,
        trailEffect: true,
      }
    );
    for (let i = 0; i < 5; i++) {
      const angle = startAngle + (Math.random() - 0.5) * 0.5;
      this.game.particleSystem.createExplosion(
        this.game.player.x,
        this.game.player.y,
        "#7df",
        3
      );
    }
  }
  updateMeteorShower(dt) {
    if (Math.random() < dt * this.meteorCount) {
      const x = Math.random() * this.game.canvas.width;
      const y = -50;
      const targetX = x + (Math.random() - 0.5) * 200;
      const targetY = this.game.canvas.height + 50;
      const angle = Math.atan2(targetY - y, targetX - x);
      const speed = 300;
      this.game.bulletManager.spawnPlayerBullet(
        x,
        y,
        Math.cos(angle),
        Math.sin(angle),
        {
          size: 25,
          speed: speed,
          damage: this.damage,
          color: "#f66",
          isMeteor: true,
          explosionRadius: this.explosionRadius,
          burnDamage: this.burnDamage,
          burnDuration: this.burnDuration,
          groundFireDuration: this.groundFireDuration,
          trailEffect: true,
        }
      );
      for (let i = 0; i < 3; i++) {
        this.game.particleSystem.createTrail(x, y, {
          color: "#f66",
          size: 10,
          duration: 0.5,
        });
      }
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
  findNearestEnemy() {
    let nearest = null,
      minDistance = Infinity;
    for (let enemy of this.game.enemies) {
      if (enemy.dead) continue;
      const dist = this.game.distance(
        this.game.player.x,
        this.game.player.y,
        enemy.x,
        enemy.y
      );
      if (dist < minDistance) {
        minDistance = dist;
        nearest = enemy;
      }
    }
    return nearest;
  }
  findNearestEnemyExcluding(sourceEnemy, excludeList) {
    let nearest = null,
      minDistance = Infinity;
    for (let enemy of this.game.enemies) {
      if (enemy.dead || excludeList.includes(enemy)) continue;
      const dist = this.game.distance(
        sourceEnemy.x,
        sourceEnemy.y,
        enemy.x,
        enemy.y
      );
      if (dist < this.chainRange && dist < minDistance) {
        minDistance = dist;
        nearest = enemy;
      }
    }
    return nearest;
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
        this.shieldAmount *= 1.2;
        this.pulseInterval *= 0.9;
        break;
      case SkillType.HOMING_LASER:
        this.damage *= 1.3;
        this.cooldown *= 0.9;
        this.beamWidth *= 1.2;
        this.colorInterval *= 0.9;
        break;
      case SkillType.CHAIN_LIGHTNING:
        this.damage *= 1.2;
        this.chainCount += 1;
        this.chainRange *= 1.1;
        this.stunDuration += 0.1;
        this.damageAmplification += 0.1;
        break;
      case SkillType.METEOR_SHOWER:
        this.damage *= 1.25;
        this.meteorCount += 1;
        this.explosionRadius *= 1.1;
        this.burnDamage *= 1.2;
        this.groundFireDuration += 0.5;
        break;
    }
  }
}