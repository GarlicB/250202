import { SkillType } from "../core/constants.js";

// 스킬 클래스
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
        this.pulseInterval = 0.5;
        this.pulseTimer = 0;
        this.shieldAmount = 1;
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
    if (this.game.player.hp < this.game.player.maxHp)
      this.game.player.hp = Math.min(
        this.game.player.hp + this.healAmount * dt,
        this.game.player.maxHp
      );
    this.pulseTimer += dt;
    if (this.pulseTimer >= this.pulseInterval) {
      this.pulseTimer = 0;
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const distance = this.range;
        const x = this.game.player.x + Math.cos(angle) * distance;
        const y = this.game.player.y + Math.sin(angle) * distance;
        this.game.effectManager.createHealEffect(x, y);
      }
      this.game.player.addShield(this.shieldAmount);
    }
    if (Math.random() < dt * 5) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * this.range;
      this.game.effectManager.createHealEffect(
        this.game.player.x + Math.cos(angle) * distance,
        this.game.player.y + Math.sin(angle) * distance
      );
    }
  }
  updateHomingLaser(dt) {
    // 색상 변경 로직
    this.colorTimer += dt;
    if (this.colorTimer >= this.colorInterval) {
      this.colorTimer = 0;
      this.currentColorIndex =
        (this.currentColorIndex + 1) % this.colors.length;
    }

    // 레이저 빔 발사
    const angle = -Math.PI / 2; // 위쪽 방향
    const beamLength = 2000; // 더 긴 빔 길이

    // 레이저 빔 충돌 체크 및 데미지 처리
    for (let enemy of this.game.enemies) {
      if (enemy.dead) continue;

      // x축 거리가 빔 너비의 절반 이내인지 확인
      const xDiff = Math.abs(enemy.x - this.game.player.x);
      if (xDiff <= this.beamWidth / 2 && enemy.y < this.game.player.y) {
        enemy.takeDamage(this.damage * dt); // 지속 데미지

        // 피격 이펙트 강화
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

    // 글로우 효과가 있는 레이저 빔
    // 1. 글로우 레이어
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

    // 2. 메인 레이저 빔
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

    // 발사 지점 글로우 효과
    for (let i = 0; i < 5; i++) {
      this.game.particleSystem.createExplosion(
        this.game.player.x + (Math.random() - 0.5) * this.beamWidth * 2,
        this.game.player.y,
        this.colors[this.currentColorIndex],
        8
      );
    }

    // 빔 경로를 따라 파티클 생성
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
    // 쿨타임 제거 체크
    const noCooldown = document.getElementById("removeSkillCooldown")?.checked;
    if (noCooldown || this.cooldownTimer <= 0) {
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
