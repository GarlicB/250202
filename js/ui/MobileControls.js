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
        border: none;
        border-radius: 50%;
        background: linear-gradient(135deg, #0f9, #0c6);
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
        color: #fff;
        font-weight: bold;
        cursor: pointer;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
        position: relative;
        overflow: hidden;
      }
      .skill-button::before {
        content: "";
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: radial-gradient(circle, rgba(255,255,255,0.15) 10%, transparent 10%);
        background-size: 20px 20px;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      .skill-button:hover::before {
        opacity: 1;
      }
      .skill-button:active {
        transform: scale(0.95);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
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
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.4);
        border-radius: 50%;
        pointer-events: none;
        transition: opacity 0.3s ease;
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
    [this.qSkillBtn, this.wSkillBtn].forEach((btn) => {
      btn.classList.add("skill-button");
      if (!btn.querySelector(".cooldown-overlay")) {
        const overlay = document.createElement("div");
        overlay.classList.add("cooldown-overlay");
        btn.appendChild(overlay);
      }
    });
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
    document.addEventListener(
      "touchstart",
      (e) => {
        if (this.game.state === GameState.OVER) {
          e.preventDefault();
          this.game.restartGame();
          return;
        }
      },
      { passive: false }
    );
    this.qSkillBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      if (
        this.game.state === GameState.SKILL_SELECT ||
        this.game.state === GameState.OVER
      )
        return;
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
      if (
        this.game.state === GameState.SKILL_SELECT ||
        this.game.state === GameState.OVER
      )
        return;
      if (!this.isCharging) {
        this.startCharging();
        if (navigator.vibrate) navigator.vibrate(20);
      }
    });
    this.wSkillBtn.addEventListener("touchend", (e) => {
      e.preventDefault();
      if (
        this.game.state === GameState.SKILL_SELECT ||
        this.game.state === GameState.OVER
      )
        return;
      if (this.isCharging) {
        this.releaseCharge();
        if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
      }
      const chargeBar = this.wSkillBtn.querySelector(".charge-bar");
      if (chargeBar) chargeBar.style.width = "0%";
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
      if (chargeBar) {
        chargeBar.style.width = `${chargeRatio * 100}%`;
        chargeBar.style.background = `linear-gradient(to right, #ffd700 ${
          chargeRatio * 50
        }%, #ff6b6b ${chargeRatio * 100}%)`;
      }
      if (chargeRatio < 1) {
        requestAnimationFrame(() => this.updateChargeBar());
      }
    }
  }
  resetChargeBar() {
    const chargeBar = this.wSkillBtn.querySelector(".charge-bar");
    if (chargeBar) chargeBar.style.width = "0%";
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
