// File: js/combat/Skill.js
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

// File: js/core/Game.js
import {
  GameState,
  STORY_TEXT,
  BOSS_QUOTES,
  WaveSystem,
  MAX_ENEMIES,
} from "../core/constants.js";
import { Modal } from "../ui/Modal.js";
import { BulletManager } from "../managers/BulletManager.js";
import { Player } from "../entities/Player.js";
import { Enemy } from "../entities/Enemy.js";
import { ItemManager } from "../managers/ItemManager.js";
import { EffectManager } from "../managers/EffectManager.js";
import { ParticleSystem } from "../managers/ParticleSystem.js";
import { Shop } from "../ui/Shop.js";
import { MobileControls } from "../ui/MobileControls.js";
import { SkillUpgrades } from "../core/constants.js";

export class Game {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.state = GameState.TITLE;
    this.lastTime = 0;
    this.storyIndex = 0;
    this.storyTimer = 0;
    this.storyFadeIn = 0;
    this.waveTitleTimer = 0;
    this.wave = 1;
    this.waveTimer = 0;
    this.enemySpawnTimer = 0;
    this.waveStarted = false;
    this.waveClear = false;
    this.introControls = document.getElementById("introControls");
    this.startGameBtn = document.getElementById("startGame");
    this.mouseX = 0;
    this.mouseY = 0;
    this.resizeCanvas();
    this.drawGame();
    this.player = new Player(this);
    this.bulletManager = new BulletManager(this);
    this.enemies = [];
    this.itemManager = new ItemManager(this);
    this.effectManager = new EffectManager(this);
    this.particleSystem = new ParticleSystem(this);
    this.shop = new Shop(this);
    this.score = 0;
    this.gems = 0;
    this.customBgColor = null;
    this.optionsModal = new Modal("optionsModal");
    this.mobileControls = new MobileControls(this);
    this.skillSelectUI = {
      selectedIndex: 0,
      boxes: [],
      isMobile: true,
    };
    this.setupTouchEvents();
    this.setupOptionsModal();
    window.addEventListener("resize", this.resizeCanvas.bind(this));
    this.startGameBtn.ontouchstart = () => {
      this.startGame();
    };
  }
  setupTouchEvents() {
    this.canvas.addEventListener(
      "touchstart",
      (e) => {
        if (!e.touches[0]) return;
        const rect = this.canvas.getBoundingClientRect();
        const scale = this.canvas.width / rect.width;
        const x = (e.touches[0].clientX - rect.left) * scale;
        const y = (e.touches[0].clientY - rect.top) * scale;
        if (this.state === GameState.SKILL_SELECT) {
          this.handleSkillSelectTouch(x, y);
        }
      },
      { passive: false }
    );
    this.canvas.addEventListener(
      "touchmove",
      (e) => {
        if (!e.touches[0]) return;
        const rect = this.canvas.getBoundingClientRect();
        const scale = this.canvas.width / rect.width;
        const x = (e.touches[0].clientX - rect.left) * scale;
        const y = (e.touches[0].clientY - rect.top) * scale;
        if (this.state === GameState.SKILL_SELECT) {
          this.handleSkillSelectTouch(x, y);
        }
      },
      { passive: false }
    );
    this.canvas.addEventListener(
      "touchend",
      () => {
        if (this.state === GameState.SKILL_SELECT) {
          const selectedBox =
            this.skillSelectUI.boxes[this.skillSelectUI.selectedIndex];
          if (selectedBox) {
            this.selectSkill(this.skillSelectUI.selectedIndex);
            if (navigator.vibrate) navigator.vibrate(50);
          }
        }
      },
      { passive: false }
    );
  }
  handleSkillSelectTouch(x, y) {
    let touched = false;
    this.skillSelectUI.boxes.forEach((box, index) => {
      if (
        x >= box.x &&
        x <= box.x + box.width &&
        y >= box.y &&
        y <= box.y + box.height
      ) {
        this.skillSelectUI.selectedIndex = index;
        touched = true;
      }
    });
    return touched;
  }
  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.drawGame();
  }
  startGame() {
    this.state = GameState.PLAY;
    this.waveTitleTimer = 2;
    this.lastTime = performance.now();
    this.introControls.style.display = "none";
    requestAnimationFrame(this.gameLoop.bind(this));
  }
  gameLoop(timestamp) {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;
    this.update(dt);
    this.drawGame();
    requestAnimationFrame(this.gameLoop.bind(this));
  }
  update(dt) {
    if (this.state === GameState.TITLE) this.updateStory(dt);
    else if (this.state === GameState.PLAY) this.updateGame(dt);
  }
  updateStory(dt) {
    if (this.storyIndex < STORY_TEXT.length) {
      this.storyTimer += dt;
      if (this.storyTimer < 1) this.storyFadeIn = this.storyTimer;
      else if (this.storyTimer > 3) {
        this.storyTimer = 0;
        this.storyFadeIn = 0;
        this.storyIndex++;
      }
    }
  }
  updateGame(dt) {
    this.player.update(dt);
    this.bulletManager.update(dt);
    this.updateEnemies(dt);
    this.checkCollisions();
    this.itemManager.update(dt);
    this.effectManager.update(dt);
    this.updateWave(dt);
    this.particleSystem.update(dt);
  }
  updateWave(dt) {
    if (this.state !== GameState.PLAY) return;
    this.waveTimer += dt;
    this.enemySpawnTimer += dt;
    if (!this.waveStarted) {
      this.startWave();
      return;
    }
    if (
      this.enemies.length === 0 &&
      this.waveTimer >= WaveSystem.WAVE_DURATION
    ) {
      this.clearWave();
      return;
    }
    this.spawnEnemies();
  }
  startWave() {
    this.waveStarted = true;
    this.waveClear = false;
    this.waveTimer = 0;
    this.enemySpawnTimer = 0;
    this.waveTitleTimer = 2;
    if (this.wave % WaveSystem.BOSS_WAVE_INTERVAL === 0) this.spawnBoss();
  }
  clearWave() {
    this.wave++;
    this.waveStarted = false;
    this.waveClear = true;
    this.player.hp = Math.min(this.player.hp + 5, this.player.maxHp);
    const baseReward = 2,
      bonus = Math.floor(this.wave / 5);
    this.addGems(baseReward + bonus);
  }
  spawnEnemies() {
    const spawnInterval = Math.max(1 - (this.wave - 1) * 0.1, 0.3);
    if (this.enemySpawnTimer >= spawnInterval) {
      this.enemySpawnTimer = 0;
      if (Math.random() < this.wave * 0.02) this.spawnMiniBoss();
      else this.spawnNormalEnemy();
    }
  }
  spawnNormalEnemy() {
    if (this.enemies.length >= MAX_ENEMIES) return;
    const enemy = new Enemy(this, "normal");
    enemy.hp *= Math.pow(WaveSystem.DIFFICULTY_SCALE, this.wave - 1);
    enemy.maxHp = enemy.hp;
    this.enemies.push(enemy);
  }
  spawnMiniBoss() {
    if (this.enemies.length >= MAX_ENEMIES) return;
    const enemy = new Enemy(this, "miniBoss");
    enemy.hp *= Math.pow(WaveSystem.DIFFICULTY_SCALE, this.wave - 1);
    enemy.maxHp = enemy.hp;
    this.enemies.push(enemy);
  }
  spawnBoss() {
    const boss = new Enemy(this, "boss");
    boss.hp *= Math.pow(WaveSystem.DIFFICULTY_SCALE, this.wave - 1);
    boss.maxHp = boss.hp;
    this.enemies.push(boss);
    if (BOSS_QUOTES[this.wave]) {
      this.showBossQuote(BOSS_QUOTES[this.wave]);
    }
  }
  updateEnemies(dt) {
    this.enemies = this.enemies.filter((enemy) => !enemy.dead);
    for (let enemy of this.enemies) enemy.update(dt);
  }
  drawGame() {
    this.drawBackground();
    if (this.state === GameState.TITLE) {
      this.drawTitleScreen();
    } else if (
      this.state === GameState.PLAY ||
      this.state === GameState.LEVELUP
    ) {
      this.drawPlayScreen();
      if (this.state === GameState.LEVELUP) {
        this.drawLevelUpScreen();
      }
    } else if (this.state === GameState.OVER) {
      this.drawGameOverScreen();
    } else if (this.state === GameState.SHOP) {
      this.shop.draw(this.ctx);
    } else if (this.state === GameState.SKILL_SELECT) {
      this.drawPlayScreen();
      this.drawSkillSelectScreen();
    }
  }
  drawBackground() {
    if (this.customBgColor) {
      this.ctx.fillStyle = this.customBgColor;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    } else if (
      this.wave % WaveSystem.BOSS_WAVE_INTERVAL === 0 &&
      this.waveStarted
    ) {
      const grd = this.ctx.createRadialGradient(
        this.canvas.width / 2,
        this.canvas.height / 2,
        50,
        this.canvas.width / 2,
        this.canvas.height / 2,
        this.canvas.width
      );
      grd.addColorStop(0, "#330000");
      grd.addColorStop(1, "#000000");
      this.ctx.fillStyle = grd;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      if (Math.random() < 0.1) {
        this.particleSystem.createExplosion(
          Math.random() * this.canvas.width,
          Math.random() * this.canvas.height,
          "#ff0000",
          5
        );
      }
    } else {
      this.ctx.fillStyle = "#111";
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      if (!this.starField) {
        this.starField = [];
        for (let i = 0; i < 50; i++) {
          this.starField.push({
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            size: Math.random() * 2 + 1,
            alpha: Math.random(),
          });
        }
      }
      this.ctx.fillStyle = "#fff";
      for (let star of this.starField) {
        this.ctx.globalAlpha = star.alpha;
        this.ctx.beginPath();
        this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.globalAlpha = 1;
    }
  }
  drawTitleScreen() {
    this.ctx.save();
    this.ctx.fillStyle = "#fff";
    this.ctx.font = "bold 60px Arial";
    this.ctx.textAlign = "center";
    this.ctx.shadowColor = "#4af";
    this.ctx.shadowBlur = 20;
    this.ctx.fillText("WaveAttack MAX", this.canvas.width / 2, 150);
    if (this.storyIndex < STORY_TEXT.length) {
      this.ctx.globalAlpha = this.storyFadeIn;
      this.ctx.font = "20px Arial";
      this.ctx.fillStyle = "#aaf";
      this.ctx.fillText(
        STORY_TEXT[this.storyIndex],
        this.canvas.width / 2,
        300
      );
    }
    this.ctx.restore();
  }
  drawPlayScreen() {
    this.player.draw(this.ctx);
    this.bulletManager.draw(this.ctx);
    for (let enemy of this.enemies) enemy.draw(this.ctx);
    this.itemManager.draw(this.ctx);
    this.effectManager.draw(this.ctx);
    this.particleSystem.draw(this.ctx);
    this.drawHUD();
    if (this.bossQuote && this.bossQuoteTimer > 0) {
      this.ctx.save();
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      this.ctx.fillRect(
        0,
        this.canvas.height / 2 - 100,
        this.canvas.width,
        200
      );
      this.ctx.fillStyle = "#ff4444";
      this.ctx.font = "bold 36px Arial";
      this.ctx.textAlign = "center";
      this.ctx.fillText(
        this.bossQuote.name,
        this.canvas.width / 2,
        this.canvas.height / 2 - 20
      );
      this.ctx.fillStyle = "#ffffff";
      this.ctx.font = "24px Arial";
      this.ctx.fillText(
        this.bossQuote.quote,
        this.canvas.width / 2,
        this.canvas.height / 2 + 20
      );
      this.ctx.restore();
      this.bossQuoteTimer -= 1 / 60;
    }
  }
  drawLevelUpScreen() {
    this.ctx.save();
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = "#fff";
    this.ctx.font = "bold 48px Arial";
    this.ctx.textAlign = "center";
    this.ctx.shadowColor = "#4af";
    this.ctx.shadowBlur = 20;
    this.ctx.fillText(
      `Level Up! ${this.player.level}`,
      this.canvas.width / 2,
      this.canvas.height / 2
    );
    this.ctx.restore();
  }
  drawGameOverScreen() {
    this.ctx.save();
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = "#fff";
    this.ctx.font = "bold 60px Arial";
    this.ctx.textAlign = "center";
    this.ctx.shadowColor = "#f00";
    this.ctx.shadowBlur = 20;
    this.ctx.fillText(
      "게임 오버",
      this.canvas.width / 2,
      this.canvas.height / 2 - 50
    );
    this.ctx.font = "30px Arial";
    this.ctx.shadowBlur = 10;
    this.ctx.fillText(
      `최종 점수: ${this.score}`,
      this.canvas.width / 2,
      this.canvas.height / 2 + 20
    );
    this.ctx.fillText(
      `도달한 웨이브: ${this.wave}`,
      this.canvas.width / 2,
      this.canvas.height / 2 + 70
    );
    this.ctx.restore();
  }
  drawHUD() {
    this.ctx.save();
    this.ctx.fillStyle = "#fff";
    this.ctx.font = "16px Arial";
    let x = 20,
      y = 30;
    this.ctx.fillText(`HP: ${this.player.hp}/${this.player.maxHp}`, x, y);
    this.ctx.fillText(`Level: ${this.player.level}`, x, y + 25);
    this.ctx.fillText(`XP: ${this.player.xp}/${this.player.nextXp}`, x, y + 50);
    this.ctx.fillText(`Wave: ${this.wave}`, x, y + 75);
    this.ctx.fillText(
      `Time: ${Math.max(
        0,
        Math.ceil(WaveSystem.WAVE_DURATION - this.waveTimer)
      )}s`,
      x,
      y + 100
    );
    this.ctx.fillStyle = "#7DF";
    this.ctx.fillText(`Gems: ${this.gems || 0}`, x, y + 125);
    if (this.waveTitleTimer > 0) {
      this.ctx.save();
      this.ctx.fillStyle = "#fff";
      this.ctx.font = "bold 40px Arial";
      this.ctx.textAlign = "center";
      this.ctx.globalAlpha = Math.min(1, this.waveTitleTimer);
      this.ctx.fillText(
        this.waveClear ? `Wave ${this.wave - 1} Clear!` : `Wave ${this.wave}`,
        this.canvas.width / 2,
        this.canvas.height / 2
      );
      this.ctx.restore();
      this.waveTitleTimer -= 1 / 60;
    }
    this.ctx.restore();
  }
  drawSkillSelectScreen() {
    this.ctx.save();
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = "#fff";
    this.ctx.font = "bold 40px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText("스킬 선택", this.canvas.width / 2, 150);
    const startY = 250;
    const spacing = 120;
    this.skillSelectUI.boxes = [];
    if (this.skillChoices && this.skillChoices.length > 0) {
      this.skillChoices.forEach((skill, index) => {
        const y = startY + spacing * index;
        const isSelected = this.skillSelectUI.selectedIndex === index;
        const boxWidth = this.canvas.width * 0.7;
        const boxHeight = 100;
        const boxX = (this.canvas.width - boxWidth) / 2;
        const boxY = y - 40;
        this.skillSelectUI.boxes.push({
          x: boxX,
          y: boxY,
          width: boxWidth,
          height: boxHeight,
        });
        const gradient = this.ctx.createLinearGradient(
          boxX,
          boxY,
          boxX + boxWidth,
          boxY
        );
        if (isSelected) {
          gradient.addColorStop(0, "rgba(100, 200, 255, 0.6)");
          gradient.addColorStop(1, "rgba(100, 200, 255, 0.4)");
        } else {
          gradient.addColorStop(0, "rgba(50, 50, 50, 0.8)");
          gradient.addColorStop(1, "rgba(50, 50, 50, 0.6)");
        }
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
        if (isSelected) {
          this.ctx.shadowColor = "#4af";
          this.ctx.shadowBlur = 15;
          this.ctx.strokeStyle = "#4af";
          this.ctx.lineWidth = 3;
          this.ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
          this.ctx.shadowBlur = 0;
        }
        this.ctx.fillStyle = isSelected ? "#fff" : "#aaa";
        this.ctx.font = `bold 24px Arial`;
        this.ctx.fillText(skill.name, this.canvas.width / 2, y);
        this.ctx.fillStyle = isSelected ? "#fff" : "#888";
        this.ctx.font = `18px Arial`;
        this.ctx.fillText(skill.description, this.canvas.width / 2, y + 35);
      });
      this.ctx.fillStyle = "#aaa";
      this.ctx.font = `20px Arial`;
      this.ctx.fillText(
        "화면을 터치하여 스킬을 선택하세요",
        this.canvas.width / 2,
        this.canvas.height - 50
      );
    }
    this.ctx.restore();
  }
  selectSkill(index) {
    if (this.skillChoices && this.skillChoices[index]) {
      const selectedSkill = this.skillChoices[index];
      selectedSkill.effect(this.player);
      this.state = GameState.PLAY;
      if (this.skillSelectUI.isMobile) {
        document.getElementById("joystickArea").style.display = "block";
        document.getElementById("qSkillBtn").style.display = "block";
        document.getElementById("wSkillBtn").style.display = "block";
      }
      this.skillChoices = null;
      this.skillSelectUI.selectedIndex = 0;
      this.skillSelectUI.boxes = [];
    }
  }
  setSkillSelectState() {
    this.state = GameState.SKILL_SELECT;
    if (this.skillSelectUI.isMobile) {
      document.getElementById("joystickArea").style.display = "none";
      document.getElementById("qSkillBtn").style.display = "none";
      document.getElementById("wSkillBtn").style.display = "none";
    }
  }
  handleLevelUp() {
    this.setSkillSelectState();
    this.particleSystem.createLevelUpEffect(this.player.x, this.player.y);
    const allSkills = [...Object.values(SkillUpgrades)];
    this.skillChoices = [];
    for (let i = 0; i < 3 && allSkills.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * allSkills.length);
      this.skillChoices.push(allSkills[randomIndex]);
      allSkills.splice(randomIndex, 1);
    }
  }
  checkCollisions() {
    for (let bullet of this.bulletManager.playerBullets) {
      for (let enemy of this.enemies) {
        if (enemy.dead) continue;
        const dist = this.distance(bullet.x, bullet.y, enemy.x, enemy.y);
        if (dist < enemy.size + bullet.size / 2) {
          enemy.takeDamage(bullet.damage);
          bullet.remove = true;
        }
      }
    }
    for (let laser of this.bulletManager.lasers) {
      for (let enemy of this.enemies) {
        if (enemy.dead) continue;
        if (
          Math.abs(enemy.x - laser.startX) < enemy.size + laser.width / 2 &&
          enemy.y < laser.startY &&
          enemy.y > laser.endY
        ) {
          enemy.takeDamage(laser.damage);
          enemy.hitByLaser();
        }
      }
    }
    for (let bullet of this.bulletManager.enemyBullets) {
      const dist = this.distance(
        bullet.x,
        bullet.y,
        this.player.x,
        this.player.y
      );
      if (dist < this.player.radius + bullet.size / 2) {
        this.player.takeDamage(bullet.damage);
        bullet.remove = true;
      }
    }
    for (let enemy of this.enemies) {
      if (enemy.dead) continue;
      const dist = this.distance(
        enemy.x,
        enemy.y,
        this.player.x,
        this.player.y
      );
      if (dist < enemy.size + this.player.radius) {
        this.player.takeDamage(1);
      }
    }
  }
  distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }
  addScore(value) {
    this.score = (this.score || 0) + value;
  }
  addGems(value) {
    this.gems = (this.gems || 0) + value;
  }
  setupOptionsModal() {
    document
      .getElementById("applyBgColor")
      .addEventListener("touchstart", () => {
        const color = document.getElementById("bgColorPicker").value;
        this.customBgColor = color;
      });
    document
      .getElementById("spawnTestBullet")
      .addEventListener("touchstart", () => {
        this.bulletManager.spawnPlayerBullet(
          this.player.x,
          this.player.y,
          0,
          -1
        );
      });
    document
      .getElementById("simulateLevelUp")
      .addEventListener("touchstart", () => {
        this.player.levelUp();
      });
    document
      .getElementById("spawnTestEnemy")
      .addEventListener("touchstart", () => {
        const enemy = new Enemy(this, "normal");
        enemy.x = this.player.x + 100 * (Math.random() - 0.5);
        enemy.y = this.player.y - 100;
        enemy.hp *= Math.pow(WaveSystem.DIFFICULTY_SCALE, this.wave - 1);
        enemy.maxHp = enemy.hp;
        this.enemies.push(enemy);
      });
    document
      .getElementById("closeOptions")
      .addEventListener("touchstart", () => {
        this.optionsModal.close();
      });
    document
      .getElementById("debugButton")
      .addEventListener("touchstart", () => {
        this.optionsModal.open();
      });
  }
  showBossQuote(bossData) {
    this.bossQuote = bossData;
    this.bossQuoteTimer = 3;
  }
  restartGame() {
    this.state = GameState.PLAY;
    this.wave = 1;
    this.waveTimer = 0;
    this.enemySpawnTimer = 0;
    this.waveStarted = false;
    this.waveClear = false;
    this.score = 0;
    this.gems = 0;
    this.player = new Player(this);
    this.enemies = [];
    this.bulletManager.clear();
    this.lastTime = performance.now();
    requestAnimationFrame(this.gameLoop.bind(this));
  }
}

// File: js/core/constants.js
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

export const MAX_PARTICLES = 100;
export const MAX_EFFECTS = 50;
export const MAX_BULLETS = 200;
export const MAX_ENEMIES = 50;

export const STORY_TEXT = [
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
  10: {
    name: "스톰 로드",
    quote: "이 폭풍의 심판을 받아라!",
  },
  15: {
    name: "섀도우 리퍼",
    quote: "너희의 미래는 어둠 속에 묻힐 것이다...",
  },
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
  WAVE_DURATION: 60,
  BOSS_WAVE_INTERVAL: 5,
  DIFFICULTY_SCALE: 1.1,
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
      const increase = Math.floor(player.maxHp * 0.3);
      player.maxHp += increase;
      player.hp += increase;
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

// File: js/entities/Enemy.js
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
    this.hitEffect = 0;
    this.laserHitEffect = 0;
    this.isPoweredUp = false;
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
    this.x = Math.max(
      this.size,
      Math.min(this.game.canvas.width - this.size, this.x)
    );
    if (this.y > this.game.canvas.height + 50) {
      this.powerUp();
      this.y = -20;
      this.x =
        Math.random() * (this.game.canvas.width - this.size * 2) + this.size;
    }
    this.bulletTimer += dt;
    if (this.bulletTimer >= this.bulletInterval) {
      this.bulletTimer = 0;
      this.shoot();
    }
    if (this.hitEffect > 0) {
      this.hitEffect -= dt * 5;
    }
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
    if (this.laserHitEffect > 0) {
      ctx.shadowColor = "#FFD700";
      ctx.shadowBlur = 20;
      ctx.fillStyle = `rgba(255, 215, 0, ${this.laserHitEffect * 0.3})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size + 5, 0, Math.PI * 2);
      ctx.fill();
    }
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
      const xpValue =
        this.type === "boss" ? 50 : this.type === "miniBoss" ? 30 : 10;
      this.game.player.addXp(xpValue);
      this.dropItems();
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
  hitByLaser() {
    this.laserHitEffect = 1;
  }
  blendColors(color1, color2, ratio) {
    const r = Math.round(color1.r + (color2.r - color1.r) * ratio);
    const g = Math.round(color1.g + (color2.g - color1.g) * ratio);
    const b = Math.round(color1.b + (color2.b - color1.b) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  }
  powerUp() {
    this.maxHp = Math.floor(this.maxHp * 1.5);
    this.hp = this.maxHp;
    this.size = Math.min(
      this.size * 1.2,
      this.type === "boss" ? 60 : this.type === "miniBoss" ? 45 : 30
    );
    this.vy *= 1.2;
    this.bulletInterval = Math.max(this.bulletInterval * 0.8, 0.5);
    this.game.particleSystem.createExplosion(this.x, this.y, "#ff0000", 15);
    this.isPoweredUp = true;
  }
}

// File: js/entities/Item.js
import { ItemType } from "../core/constants.js";

export class Item {
  constructor(game, type, x, y) {
    this.game = game;
    this.type = type;
    this.x = x;
    this.y = y;
    this.vy = 1;
    this.collected = false;
    switch (type) {
      case ItemType.COIN:
        this.size = 16;
        this.color = "#FD7";
        this.value = 1;
        break;
      case ItemType.GEM:
        this.size = 20;
        this.color = "#7DF";
        this.value = 5;
        break;
      case ItemType.HEALTH:
        this.size = 16;
        this.color = "#F77";
        this.value = 3;
        break;
      case ItemType.POWER:
        this.size = 16;
        this.color = "#77F";
        this.duration = 5;
        this.value = 1.5;
        break;
      case ItemType.SPEED:
        this.size = 16;
        this.color = "#7F7";
        this.duration = 5;
        this.value = 1.5;
        break;
      case ItemType.SHIELD:
        this.size = 20;
        this.color = "#FF7";
        this.duration = 3;
        break;
    }
  }
  update(dt) {
    if (this.collected) return;
    this.y += this.vy;
    const dist = this.game.distance(
      this.x,
      this.y,
      this.game.player.x,
      this.game.player.y
    );
    if (dist < 100) {
      const dx = this.game.player.x - this.x,
        dy = this.game.player.y - this.y,
        mag = Math.sqrt(dx * dx + dy * dy);
      if (mag > 0) {
        this.x += (dx / mag) * 5;
        this.y += (dy / mag) * 5;
      }
    }
    if (dist < this.game.player.radius + this.size) {
      this.collected = true;
      this.applyEffect();
    }
  }
  draw(ctx) {
    if (this.collected) return;
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  applyEffect() {
    switch (this.type) {
      case ItemType.COIN:
        this.game.addScore(this.value);
        break;
      case ItemType.GEM:
        this.game.addGems(this.value);
        break;
      case ItemType.HEALTH:
        this.game.player.hp = Math.min(
          this.game.player.hp + this.value,
          this.game.player.maxHp
        );
        break;
      case ItemType.POWER:
        this.game.player.buffs.push({
          type: "power",
          value: this.value,
          duration: this.duration,
        });
        break;
      case ItemType.SPEED:
        this.game.player.buffs.push({
          type: "speed",
          value: this.value,
          duration: this.duration,
        });
        break;
      case ItemType.SHIELD:
        this.game.player.addShield(this.duration);
        break;
    }
  }
}

// File: js/entities/Player.js
import { SkillType, GameState, SkillUpgrades } from "../core/constants.js";
import { Skill } from "../combat/Skill.js";

export class Player {
  constructor(game) {
    this.game = game;
    this.x = game.canvas.width / 2;
    this.y = game.canvas.height - 80;
    this.radius = 16;
    this.speed = 5;
    this.hp = 20;
    this.maxHp = 20;
    this.level = 1;
    this.xp = 0;
    this.nextXp = 8;
    this.bulletDamage = 4;
    this.bulletSize = 10;
    this.attackSpeed = 0.2;
    this.attackTimer = 0;
    this.buffs = [];
    this.keyState = {
      laser: false,
    };
    this.laserCharge = 0;
    this.maxLaserCharge = 1.0;
    this.isCharging = false;
    this.joystick = {
      active: false,
      baseX: 0,
      baseY: 0,
      handleX: 0,
      handleY: 0,
      maxDistance: 50,
    };
    this.skills = {
      regenAura: new Skill(game, SkillType.REGEN_AURA),
      homingLaser: new Skill(game, SkillType.HOMING_LASER),
      chainLightning: new Skill(game, SkillType.CHAIN_LIGHTNING),
      meteorShower: new Skill(game, SkillType.METEOR_SHOWER),
    };
    this.isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
    if (this.isMobile) {
      this.setupMobileControls();
    }
  }
  update(dt) {
    this.move(dt);
    this.shoot(dt);
    this.updateBuffs(dt);
    this.updateLaserCharge(dt);
    for (let key in this.skills) this.skills[key].update(dt);
    if (this.joystick.active)
      this.game.particleSystem.createTrail(this.x, this.y);
  }
  move(dt) {
    let dx = 0,
      dy = 0;
    if (this.isMobile && this.joystick.active) {
      const deltaX = this.joystick.handleX - this.joystick.baseX;
      const deltaY = this.joystick.handleY - this.joystick.baseY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      if (distance > 0) {
        dx = deltaX / distance;
        dy = deltaY / distance;
        const speedMultiplier = Math.min(
          distance / this.joystick.maxDistance,
          1
        );
        dx *= speedMultiplier;
        dy *= speedMultiplier;
      }
    }
    this.x = Math.max(
      this.radius,
      Math.min(this.game.canvas.width - this.radius, this.x + dx * this.speed)
    );
    this.y = Math.max(
      this.radius,
      Math.min(this.game.canvas.height - this.radius, this.y + dy * this.speed)
    );
  }
  shoot(dt) {
    this.attackTimer += dt;
    if (this.attackTimer >= this.attackSpeed) {
      this.attackTimer = 0;
      this.game.bulletManager.spawnPlayerBullet(this.x, this.y, 0, -1);
    }
  }
  draw(ctx) {
    ctx.save();
    if (this.isCharging) {
      const chargeRatio = this.laserCharge / this.maxLaserCharge;
      ctx.fillStyle = `rgb(${43 + 212 * chargeRatio}, ${
        191 - 66 * chargeRatio
      }, ${255 - 55 * chargeRatio})`;
      const ringRadius = this.radius + 5 + chargeRatio * 10;
      ctx.strokeStyle = `rgba(255, 215, 0, ${chargeRatio * 0.8})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
      const particleCount = Math.floor(8 + chargeRatio * 8);
      const currentTime = performance.now() / 1000;
      for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2 + currentTime * 2;
        const particleX = this.x + Math.cos(angle) * ringRadius;
        const particleY = this.y + Math.sin(angle) * ringRadius;
        ctx.fillStyle = `rgba(255, 215, 0, ${chargeRatio})`;
        ctx.beginPath();
        ctx.arc(particleX, particleY, 2 + chargeRatio * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = "#2bf";
    }
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    let barWidth = this.radius * 1.2 * (this.hp / this.maxHp);
    ctx.fillStyle = "#fff";
    ctx.fillRect(
      this.x - this.radius * 0.6,
      this.y - this.radius - 10,
      barWidth,
      3
    );
    ctx.restore();
  }
  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.game.state = GameState.OVER;
    }
  }
  addXp(amount) {
    this.xp += amount;
    if (this.xp >= this.nextXp) this.levelUp();
  }
  levelUp() {
    this.level++;
    this.xp -= this.nextXp;
    this.nextXp = Math.floor(this.nextXp * 1.3 + 10);
    this.game.handleLevelUp();
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
      if (!skill) return false;
      if (skill.cooldownTimer <= 0) {
        skill.active = true;
        skill.cooldownTimer = skill.cooldown;
        skill.durationTimer = skill.duration;
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }
  addShield(duration) {
    this.buffs.push({ type: "shield", duration: duration });
  }
  updateLaserCharge(dt) {
    if (this.keyState.laser) {
      this.isCharging = true;
      this.laserCharge = Math.min(this.laserCharge + dt, this.maxLaserCharge);
      if (Math.random() < 0.3) {
        const chargeRatio = this.laserCharge / this.maxLaserCharge;
        const angle = Math.random() * Math.PI * 2;
        const distance = this.radius * (1.2 + chargeRatio);
        this.game.particleSystem.createExplosion(
          this.x + Math.cos(angle) * distance,
          this.y + Math.sin(angle) * distance,
          "#FFD700",
          1
        );
        if (chargeRatio > 0.7 && Math.random() < chargeRatio - 0.7) {
          const sparkAngle = Math.random() * Math.PI * 2;
          const sparkDist = this.radius * (2 + chargeRatio);
          this.game.particleSystem.createExplosion(
            this.x + Math.cos(sparkAngle) * sparkDist,
            this.y + Math.sin(sparkAngle) * sparkDist,
            "#FFFFFF",
            2
          );
        }
      }
    }
  }
  fireLaser() {
    if (!this.isCharging) return;
    const chargeRatio = this.laserCharge / this.maxLaserCharge;
    if (this.isMobile) {
      const spread = 0.1;
      this.game.bulletManager.spawnLaser(
        this.x,
        this.y,
        -Math.PI / 2,
        this.bulletDamage * 5,
        {
          width: 16,
          life: 0.4,
        }
      );
      this.game.bulletManager.spawnLaser(
        this.x,
        this.y,
        -Math.PI / 2 - spread,
        this.bulletDamage * 5,
        {
          width: 16,
          life: 0.4,
        }
      );
      this.game.bulletManager.spawnLaser(
        this.x,
        this.y,
        -Math.PI / 2 + spread,
        this.bulletDamage * 5,
        {
          width: 16,
          life: 0.4,
        }
      );
      this.game.particleSystem.createExplosion(this.x, this.y, "#FFD700", 30);
    } else {
      if (chargeRatio < 0.2) {
        this.game.bulletManager.spawnLaser(
          this.x,
          this.y,
          -Math.PI / 2,
          this.bulletDamage * 2,
          {
            width: 4,
            life: 0.15,
          }
        );
      } else if (chargeRatio >= 0.9) {
        const spread = 0.1;
        this.game.bulletManager.spawnLaser(
          this.x,
          this.y,
          -Math.PI / 2,
          this.bulletDamage * 5,
          {
            width: 16,
            life: 0.4,
          }
        );
        this.game.bulletManager.spawnLaser(
          this.x,
          this.y,
          -Math.PI / 2 - spread,
          this.bulletDamage * 5,
          {
            width: 16,
            life: 0.4,
          }
        );
        this.game.bulletManager.spawnLaser(
          this.x,
          this.y,
          -Math.PI / 2 + spread,
          this.bulletDamage * 5,
          {
            width: 16,
            life: 0.4,
          }
        );
        this.game.particleSystem.createExplosion(this.x, this.y, "#FFD700", 30);
      } else {
        const width = 4 + chargeRatio * 12;
        const damage = this.bulletDamage * (2 + chargeRatio * 3);
        this.game.bulletManager.spawnLaser(
          this.x,
          this.y,
          -Math.PI / 2,
          damage,
          {
            width: width,
            life: 0.2 + chargeRatio * 0.2,
          }
        );
      }
    }
    this.laserCharge = 0;
    this.isCharging = false;
  }
  setupMobileControls() {
    const joystickBase = document.getElementById("joystickBase");
    const joystickHandle = document.getElementById("joystickHandle");
    const joystickArea = document.getElementById("joystickArea");
    if (!joystickBase || !joystickHandle || !joystickArea) return;
    joystickArea.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      joystickBase.style.display = "block";
      joystickHandle.style.display = "block";
      this.joystick.baseX = touch.clientX;
      this.joystick.baseY = touch.clientY;
      this.joystick.handleX = touch.clientX;
      this.joystick.handleY = touch.clientY;
      this.joystick.active = true;
      joystickBase.style.left = `${touch.clientX}px`;
      joystickBase.style.top = `${touch.clientY}px`;
      joystickHandle.style.left = `${touch.clientX}px`;
      joystickHandle.style.top = `${touch.clientY}px`;
    });
    joystickArea.addEventListener("touchmove", (e) => {
      e.preventDefault();
      if (!this.joystick.active) return;
      const touch = e.touches[0];
      const rect = joystickArea.getBoundingClientRect();
      const deltaX = touch.clientX - this.joystick.baseX;
      const deltaY = touch.clientY - this.joystick.baseY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      if (distance > this.joystick.maxDistance) {
        const angle = Math.atan2(deltaY, deltaX);
        this.joystick.handleX =
          this.joystick.baseX + Math.cos(angle) * this.joystick.maxDistance;
        this.joystick.handleY =
          this.joystick.baseY + Math.sin(angle) * this.joystick.maxDistance;
      } else {
        this.joystick.handleX = touch.clientX;
        this.joystick.handleY = touch.clientY;
      }
      joystickHandle.style.left = `${this.joystick.handleX}px`;
      joystickHandle.style.top = `${this.joystick.handleY}px`;
    });
    joystickArea.addEventListener("touchend", () => {
      this.joystick.active = false;
      joystickBase.style.display = "none";
      joystickHandle.style.display = "none";
      this.joystick.handleX = this.joystick.baseX;
      this.joystick.handleY = this.joystick.baseY;
    });
    joystickArea.addEventListener("touchcancel", () => {
      this.joystick.active = false;
      joystickBase.style.display = "none";
      joystickHandle.style.display = "none";
    });
    const laserBtn = document.getElementById("laserSkillBtn");
    const chargeBar = laserBtn?.querySelector(".charge-bar");
    if (!laserBtn) return;
    laserBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      if (this.game.state === GameState.SKILL_SELECT) return;
      if (!this.isCharging) {
        this.keyState.laser = true;
        laserBtn.classList.add("charging");
      }
      if (navigator.vibrate) navigator.vibrate(20);
    });
    laserBtn.addEventListener("touchend", (e) => {
      e.preventDefault();
      if (this.game.state === GameState.SKILL_SELECT) return;
      if (this.isCharging) {
        this.keyState.laser = false;
        this.fireLaser();
        laserBtn.classList.remove("charging");
        if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
      }
      if (chargeBar) chargeBar.style.width = "0%";
    });
    laserBtn.addEventListener("touchcancel", () => {
      if (this.isCharging) {
        this.isCharging = false;
        this.keyState.laser = false;
        laserBtn.classList.remove("charging");
        if (chargeBar) chargeBar.style.width = "0%";
      }
    });
  }
}

// File: js/managers/BulletManager.js
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

// File: js/managers/EffectManager.js
import { MAX_EFFECTS } from "../core/constants.js";

export class EffectManager {
  constructor(game) {
    this.game = game;
    this.effects = [];
  }
  update(dt) {
    this.effects = this.effects.filter((effect) => {
      effect.update(dt);
      return !effect.finished;
    });
    if (this.effects.length > MAX_EFFECTS) this.effects.length = MAX_EFFECTS;
  }
  draw(ctx) {
    for (let effect of this.effects) effect.draw(ctx);
  }
  createHealEffect(x, y) {
    this.effects.push({
      x,
      y,
      size: 10,
      alpha: 1,
      color: "#7f7",
      duration: 0.5,
      timer: 0,
      finished: false,
      update(dt) {
        this.timer += dt;
        this.alpha = 1 - this.timer / this.duration;
        this.size += dt * 20;
        if (this.timer >= this.duration) this.finished = true;
      },
      draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      },
    });
  }
  createLightningEffect(x1, y1, x2, y2) {
    const segments = 5,
      points = [{ x: x1, y: y1 }];
    for (let i = 1; i < segments; i++) {
      const t = i / segments,
        xx = x1 + (x2 - x1) * t,
        yy = y1 + (y2 - y1) * t,
        offset = (Math.random() - 0.5) * 30;
      points.push({ x: xx + offset, y: yy + offset });
    }
    points.push({ x: x2, y: y2 });
    this.effects.push({
      points,
      alpha: 1,
      color: "#ff0",
      duration: 0.2,
      timer: 0,
      finished: false,
      update(dt) {
        this.timer += dt;
        this.alpha = 1 - this.timer / this.duration;
        if (this.timer >= this.duration) this.finished = true;
      },
      draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length; i++)
          ctx.lineTo(this.points[i].x, this.points[i].y);
        ctx.stroke();
        ctx.restore();
      },
    });
  }
  createMeteor(x, y, damage) {
    const targetX = x + (Math.random() - 0.5) * 100,
      targetY = this.game.canvas.height + 50;
    this.effects.push({
      x,
      y,
      targetX,
      targetY,
      size: 20,
      speed: 500,
      damage,
      color: "#f66",
      finished: false,
      update(dt) {
        const dx = this.targetX - this.x,
          dy = this.targetY - this.y,
          dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < this.speed * dt) {
          this.finished = true;
          return;
        }
        const vx = (dx / dist) * this.speed,
          vy = (dy / dist) * this.speed;
        this.x += vx * dt;
        this.y += vy * dt;
        for (let enemy of this.game.enemies) {
          if (
            !enemy.dead &&
            this.game.distance(this.x, this.y, enemy.x, enemy.y) <
              enemy.size + this.size
          )
            enemy.takeDamage(this.damage);
        }
      },
      draw(ctx) {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        const gradient = ctx.createLinearGradient(
          this.x,
          this.y,
          this.x,
          this.y - 40
        );
        gradient.addColorStop(0, "#f66");
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(this.x - this.size, this.y);
        ctx.lineTo(this.x + this.size, this.y);
        ctx.lineTo(this.x, this.y - 40);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      },
    });
  }
}

// File: js/managers/ItemManager.js
import { Item } from "../entities/Item.js";

export class ItemManager {
  constructor(game) {
    this.game = game;
    this.items = [];
  }
  update(dt) {
    this.items = this.items.filter((item) => !item.collected);
    for (let item of this.items) item.update(dt);
  }
  draw(ctx) {
    for (let item of this.items) item.draw(ctx);
  }
  spawnItem(type, x, y) {
    this.items.push(new Item(this.game, type, x, y));
  }
}

// File: js/managers/ParticleSystem.js
import { MAX_PARTICLES } from "../core/constants.js";

export class ParticleSystem {
  constructor(game) {
    this.game = game;
    this.particles = [];
  }
  update(dt) {
    this.particles = this.particles.filter((particle) => {
      particle.update(dt);
      return !particle.finished;
    });
    if (this.particles.length > MAX_PARTICLES)
      this.particles.length = MAX_PARTICLES;
  }
  draw(ctx) {
    for (let particle of this.particles) particle.draw(ctx);
  }
  createExplosion(x, y, color = "#f66", count = 20, opts = {}) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count,
        speed = 100 + Math.random() * 100;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed * (opts.speed || 1),
        vy: Math.sin(angle) * speed * (opts.speed || 1),
        size: (opts.scale || 1) * (3 + Math.random() * 3),
        color,
        alpha: 1,
        life: 0.5 + Math.random() * 0.5,
        finished: false,
        direction: opts.direction || null,
        update(dt) {
          this.x += this.vx * dt;
          this.y += this.vy * dt;
          this.size *= 0.95;
          this.life -= dt;
          this.alpha = this.life;
          if (this.life <= 0) this.finished = true;
        },
        draw(ctx) {
          ctx.save();
          ctx.globalAlpha = this.alpha;
          ctx.fillStyle = this.color;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        },
      });
    }
  }
  createHitEffect(x, y) {
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2,
        speed = 50 + Math.random() * 50;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 2,
        color: "#fff",
        alpha: 1,
        life: 0.2 + Math.random() * 0.2,
        finished: false,
        update(dt) {
          this.x += this.vx * dt;
          this.y += this.vy * dt;
          this.life -= dt;
          this.alpha = this.life * 5;
          if (this.life <= 0) this.finished = true;
        },
        draw(ctx) {
          ctx.save();
          ctx.globalAlpha = this.alpha;
          ctx.fillStyle = this.color;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        },
      });
    }
  }
  createTrail(x, y, color = "#4af") {
    this.particles.push({
      x,
      y,
      size: 3,
      color,
      alpha: 0.5,
      life: 0.3,
      finished: false,
      update(dt) {
        this.life -= dt;
        this.alpha = this.life * 2;
        this.size *= 0.95;
        if (this.life <= 0) this.finished = true;
      },
      draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      },
    });
  }
  createLevelUpEffect(x, y) {
    const colors = ["#4af", "#ff4", "#f4f", "#4f4"];
    for (let i = 0; i < 40; i++) {
      const angle = (Math.PI * 2 * i) / 40,
        speed = 200 + Math.random() * 100,
        color = colors[Math.floor(Math.random() * colors.length)];
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4 + Math.random() * 4,
        color,
        alpha: 1,
        life: 1 + Math.random() * 0.5,
        finished: false,
        update(dt) {
          this.x += this.vx * dt;
          this.y += this.vy * dt;
          this.vy += 200 * dt;
          this.size *= 0.98;
          this.life -= dt;
          this.alpha = this.life;
          if (this.life <= 0) this.finished = true;
        },
        draw(ctx) {
          ctx.save();
          ctx.globalAlpha = this.alpha;
          ctx.fillStyle = this.color;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        },
      });
    }
  }
}

// File: js/ui/MobileControls.js
import { SkillType } from "../core/constants.js";
import { GameState } from "../core/constants.js";

export class MobileControls {
  constructor(game) {
    this.game = game;
    this.qSkillBtn = document.getElementById("qSkillBtn");
    this.wSkillBtn = document.getElementById("wSkillBtn");
    this.isCharging = false;
    this.chargeStartTime = 0;
    this.maxChargeTime = 2;
    this.setupUI();
    this.setupEventListeners();
    this.updateUIPositions();
    window.addEventListener("resize", () => {
      this.updateUIPositions();
    });
    window.addEventListener("orientationchange", () => {
      setTimeout(() => this.updateUIPositions(), 100);
    });
  }
  setupUI() {
    const style = document.createElement("style");
    style.textContent = `
      .skill-button {
        transition: transform 0.1s, background-color 0.2s;
      }
      .skill-button:active {
        transform: scale(0.95);
        background-color: rgba(255, 215, 0, 0.3) !important;
      }
      .skill-button.charging {
        animation: pulse 1s infinite;
      }
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(0.95); }
        100% { transform: scale(1); }
      }
      .cooldown-overlay {
        transition: opacity 0.2s;
        backdrop-filter: blur(2px);
      }
      #joystickArea {
        touch-action: none;
        z-index: 1000;
      }
      #joystickBase, #joystickHandle {
        transition: opacity 0.2s;
        backdrop-filter: blur(3px);
      }
    `;
    document.head.appendChild(style);
  }
  updateUIPositions() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isLandscape = width > height;
    if (isLandscape) {
      this.qSkillBtn.style.left = "65%";
      this.qSkillBtn.style.bottom = "15%";
      this.wSkillBtn.style.left = "80%";
      this.wSkillBtn.style.bottom = "15%";
    } else {
      this.qSkillBtn.style.left = "65%";
      this.qSkillBtn.style.bottom = "20%";
      this.wSkillBtn.style.left = "80%";
      this.wSkillBtn.style.bottom = "20%";
    }
    const buttonSize = Math.min(width, height) * 0.15;
    [this.qSkillBtn, this.wSkillBtn].forEach((btn) => {
      btn.style.width = `${buttonSize}px`;
      btn.style.height = `${buttonSize}px`;
      btn.style.fontSize = `${buttonSize * 0.4}px`;
    });
  }
  setupEventListeners() {
    this.qSkillBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      if (this.game.state === GameState.SKILL_SELECT) return;
      const skill = this.game.player.skills.regenAura;
      if (skill && skill.cooldownTimer <= 0) {
        skill.activate();
        this.showCooldown(this.qSkillBtn, skill.cooldown);
        if (navigator.vibrate) navigator.vibrate(50);
      } else {
        this.showCooldownFeedback(this.qSkillBtn);
      }
    });
    this.wSkillBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      if (this.game.state === GameState.SKILL_SELECT) return;
      if (!this.isCharging) {
        this.startCharging();
        if (navigator.vibrate) navigator.vibrate(20);
      }
    });
    this.wSkillBtn.addEventListener("touchend", (e) => {
      e.preventDefault();
      if (this.game.state === GameState.SKILL_SELECT) return;
      if (this.isCharging) {
        this.releaseCharge();
        if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
      }
    });
    this.wSkillBtn.addEventListener("touchcancel", () => {
      if (this.isCharging) {
        this.isCharging = false;
        this.wSkillBtn.classList.remove("charging");
        this.resetChargeBar();
      }
    });
  }
  activateSkill(skill, button) {
    skill.active = true;
    skill.durationTimer = skill.duration;
    skill.cooldownTimer = skill.cooldown;
    this.showCooldown(button, skill.cooldown);
    button.style.transform = "scale(0.9)";
    setTimeout(() => (button.style.transform = ""), 100);
  }
  startCharging() {
    this.isCharging = true;
    this.chargeStartTime = Date.now();
    this.wSkillBtn.classList.add("charging");
    this.updateChargeBar();
  }
  releaseCharge() {
    const chargeTime = (Date.now() - this.chargeStartTime) / 1000;
    const chargeRatio = Math.min(chargeTime / this.maxChargeTime, 1);
    const bulletSpeed = 800 + chargeRatio * 400;
    const bulletDamage = 30 + chargeRatio * 70;
    this.game.bulletManager.spawnPlayerBullet(
      this.game.player.x,
      this.game.player.y,
      0,
      -1,
      {
        speed: bulletSpeed,
        damage: bulletDamage,
        size: 10 + chargeRatio * 10,
        color: `rgba(255, ${255 - chargeRatio * 255}, 0, 1)`,
        penetration: Math.floor(1 + chargeRatio * 2),
      }
    );
    this.isCharging = false;
    this.wSkillBtn.classList.remove("charging");
    this.resetChargeBar();
  }
  updateChargeBar() {
    if (this.isCharging) {
      const chargeTime = (Date.now() - this.chargeStartTime) / 1000;
      const chargeRatio = Math.min(chargeTime / this.maxChargeTime, 1);
      const chargeBar = this.wSkillBtn.querySelector(".charge-bar");
      chargeBar.style.width = `${chargeRatio * 100}%`;
      chargeBar.style.background = `linear-gradient(to right, 
        #ffd700 ${chargeRatio * 50}%, 
        #ff6b6b ${chargeRatio * 100}%)`;
      if (chargeRatio < 1) {
        requestAnimationFrame(() => this.updateChargeBar());
      }
    }
  }
  resetChargeBar() {
    const chargeBar = this.wSkillBtn.querySelector(".charge-bar");
    chargeBar.style.width = "0%";
  }
  showCooldown(button, cooldown) {
    const overlay = button.querySelector(".cooldown-overlay");
    overlay.style.display = "block";
    overlay.style.opacity = "0.7";
    const startTime = Date.now();
    const updateCooldown = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = cooldown - elapsed;
      if (remaining > 0) {
        const ratio = remaining / cooldown;
        overlay.style.opacity = ratio * 0.7;
        requestAnimationFrame(updateCooldown);
      } else {
        overlay.style.display = "none";
        button.style.transform = "scale(1.1)";
        setTimeout(() => (button.style.transform = ""), 200);
      }
    };
    updateCooldown();
  }
  showCooldownFeedback(button) {
    button.style.transform = "scale(0.95)";
    button.style.backgroundColor = "rgba(255, 0, 0, 0.3)";
    setTimeout(() => {
      button.style.transform = "";
      button.style.backgroundColor = "";
    }, 200);
  }
}

// File: js/ui/Modal.js
export class Modal {
  constructor(modalId) {
    this.modal = document.getElementById(modalId);
  }
  open() {
    this.modal.style.display = "block";
  }
  close() {
    this.modal.style.display = "none";
  }
  addEventListener(selector, event, callback) {
    this.modal.querySelector(selector).addEventListener(event, callback);
  }
}

// File: js/ui/Shop.js
import { GameState, ShopItems } from "../core/constants.js";

export class Shop {
  constructor(game) {
    this.game = game;
    this.items = Object.values(ShopItems);
    this.selectedIndex = 0;
  }
  draw(ctx) {
    const width = this.game.canvas.width,
      height = this.game.canvas.height;
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 40px Arial";
    ctx.textAlign = "center";
    ctx.fillText("상점", width / 2, 100);
    ctx.font = "24px Arial";
    ctx.fillText(`보유 젬: ${this.game.gems || 0}`, width / 2, 150);
    const startY = 200,
      itemHeight = 80;
    for (let index = 0; index < this.items.length; index++) {
      const item = this.items[index],
        y = startY + index * itemHeight;
      ctx.fillStyle = "#fff";
      ctx.font = "bold 24px Arial";
      ctx.fillText(item.name, width / 2, y + 20);
      ctx.font = "18px Arial";
      ctx.fillText(item.description, width / 2, y + 45);
      ctx.fillStyle = "#ff0";
      ctx.fillText(`${item.cost} 젬`, width / 2, y + 70);
    }
    ctx.restore();
  }
  purchaseSelected() {
    const item = this.items[this.selectedIndex];
    if (this.game.gems >= item.cost) {
      this.game.gems -= item.cost;
      item.effect(this.game.player);
    }
  }
}
