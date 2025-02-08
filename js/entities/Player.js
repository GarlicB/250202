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