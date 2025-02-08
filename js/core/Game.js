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
    this.updateMobileControlsVisibility();
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
      this.updateMobileControlsVisibility();
      this.skillChoices = null;
      this.skillSelectUI.selectedIndex = 0;
      this.skillSelectUI.boxes = [];
    }
  }
  setSkillSelectState() {
    this.state = GameState.SKILL_SELECT;
    this.updateMobileControlsVisibility();
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
    this.updateMobileControlsVisibility();
    requestAnimationFrame(this.gameLoop.bind(this));
  }
  updateMobileControlsVisibility() {
    if (!this.skillSelectUI.isMobile) return;

    const joystickArea = document.getElementById("joystickArea");
    const qSkillBtn = document.getElementById("qSkillBtn");
    const wSkillBtn = document.getElementById("wSkillBtn");

    if (!joystickArea || !qSkillBtn || !wSkillBtn) return;

    const shouldShow = this.state === GameState.PLAY;
    const displayValue = shouldShow ? "block" : "none";

    joystickArea.style.display = displayValue;
    qSkillBtn.style.display = displayValue;
    wSkillBtn.style.display = displayValue;
  }
}
