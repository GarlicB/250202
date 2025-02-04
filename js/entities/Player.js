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
      left: false,
      right: false,
      up: false,
      down: false,
      laser: false,
    };
    // 레이저 차지 시스템 추가
    this.laserCharge = 0;
    this.maxLaserCharge = 1.0; // 1초 최대 차지
    this.isCharging = false;

    // 조이스틱 관련 속성 추가
    this.joystick = {
      active: false,
      baseX: 0,
      baseY: 0,
      handleX: 0,
      handleY: 0,
      maxDistance: 50, // 조이스틱 최대 이동 반경
    };

    this.skills = {
      regenAura: new Skill(game, SkillType.REGEN_AURA),
      homingLaser: new Skill(game, SkillType.HOMING_LASER),
      chainLightning: new Skill(game, SkillType.CHAIN_LIGHTNING),
      meteorShower: new Skill(game, SkillType.METEOR_SHOWER),
    };

    // 모바일 체크
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
    if (
      this.keyState.left ||
      this.keyState.right ||
      this.keyState.up ||
      this.keyState.down
    )
      this.game.particleSystem.createTrail(this.x, this.y);
  }

  move(dt) {
    let dx = 0,
      dy = 0;

    if (this.isMobile && this.joystick.active) {
      // 조이스틱 이동 벡터 계산
      const deltaX = this.joystick.handleX - this.joystick.baseX;
      const deltaY = this.joystick.handleY - this.joystick.baseY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance > 0) {
        // 정규화된 방향 벡터 계산
        dx = deltaX / distance;
        dy = deltaY / distance;

        // 조이스틱 거리에 따른 속도 조절
        const speedMultiplier = Math.min(
          distance / this.joystick.maxDistance,
          1
        );
        dx *= speedMultiplier;
        dy *= speedMultiplier;
      }
    } else {
      // 기존 키보드 컨트롤
      if (this.keyState.left) dx = -1;
      if (this.keyState.right) dx = 1;
      if (this.keyState.up) dy = -1;
      if (this.keyState.down) dy = 1;

      if (dx || dy) {
        const mag = Math.sqrt(dx * dx + dy * dy);
        dx /= mag;
        dy /= mag;
      }
    }

    // 이동 적용
    if (dx || dy) {
      this.x = Math.max(
        this.radius,
        Math.min(this.game.canvas.width - this.radius, this.x + dx * this.speed)
      );
      this.y = Math.max(
        this.radius,
        Math.min(
          this.game.canvas.height - this.radius,
          this.y + dy * this.speed
        )
      );
    }
  }

  shoot(dt) {
    this.attackTimer += dt;
    if (this.attackTimer >= this.attackSpeed) {
      this.attackTimer = 0;

      // 기본 총알 발사
      const removeBasicBullet =
        document.getElementById("removeBasicBullet")?.checked;
      if (!removeBasicBullet) {
        this.game.bulletManager.spawnPlayerBullet(this.x, this.y, 0, -1);
      }
    }
  }

  draw(ctx) {
    ctx.save();

    // 레이저 차지 중일 때 플레이어 색상 변경 및 효과
    if (this.isCharging) {
      const chargeRatio = this.laserCharge / this.maxLaserCharge;
      // 파란색에서 금색으로 변하는 그라데이션 효과
      ctx.fillStyle = `rgb(${43 + 212 * chargeRatio}, ${
        191 - 66 * chargeRatio
      }, ${255 - 55 * chargeRatio})`;

      // 차지 링 효과
      const ringRadius = this.radius + 5 + chargeRatio * 10;
      ctx.strokeStyle = `rgba(255, 215, 0, ${chargeRatio * 0.8})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, ringRadius, 0, Math.PI * 2);
      ctx.stroke();

      // 회전하는 파티클 효과
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

    // 플레이어 본체
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // HP 바
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
    this.game.state = GameState.SKILL_SELECT;
    this.game.particleSystem.createLevelUpEffect(this.x, this.y);

    // 스킬 선택지 3개를 랜덤하게 생성
    const allSkills = [...Object.values(SkillUpgrades)]; // 배열 복사
    this.game.skillChoices = [];

    for (let i = 0; i < 3 && allSkills.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * allSkills.length);
      this.game.skillChoices.push(allSkills[randomIndex]);
      allSkills.splice(randomIndex, 1);
    }
  }

  updateBuffs(dt) {
    this.buffs = this.buffs.filter((buff) => {
      buff.duration -= dt;
      return buff.duration > 0;
    });
  }

  // 추가: 활성화 메서드
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

  // 추가: 방어막 버프 메서드
  addShield(duration) {
    // 예시로 버프 배열에 방어막 효과를 추가
    this.buffs.push({ type: "shield", duration: duration });
    console.log("방어막 버프 추가:", duration);
  }

  // 레이저 차지 업데이트
  updateLaserCharge(dt) {
    if (this.keyState.laser) {
      this.isCharging = true;
      this.laserCharge = Math.min(this.laserCharge + dt, this.maxLaserCharge);

      // 차지 중일 때 파티클 효과 (기존 효과는 유지하고 추가 효과)
      if (Math.random() < 0.3) {
        const chargeRatio = this.laserCharge / this.maxLaserCharge;
        const angle = Math.random() * Math.PI * 2;
        const distance = this.radius * (1.2 + chargeRatio);

        // 기존 파티클
        this.game.particleSystem.createExplosion(
          this.x + Math.cos(angle) * distance,
          this.y + Math.sin(angle) * distance,
          "#FFD700",
          1
        );

        // 완전 차지에 가까워질수록 추가 파티클
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

  // W키를 뗐을 때 레이저 발사
  fireLaser() {
    if (!this.isCharging) return;

    const chargeRatio = this.laserCharge / this.maxLaserCharge;

    if (this.isMobile) {
      // 모바일에서는 항상 완전 차지 레이저 발사
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
      // PC에서는 기존 차지 시스템 유지
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

    // 차지 리셋
    this.laserCharge = 0;
    this.isCharging = false;
  }

  setupMobileControls() {
    const joystickBase = document.getElementById("joystickBase");
    const joystickHandle = document.getElementById("joystickHandle");
    const joystickArea = document.getElementById("joystickArea");

    if (!joystickBase || !joystickHandle || !joystickArea) return;

    // 터치 시작
    joystickArea.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const touch = e.touches[0];

      // 조이스틱 베이스와 핸들 표시
      joystickBase.style.display = "block";
      joystickHandle.style.display = "block";

      // 터치 위치에 조이스틱 배치
      this.joystick.baseX = touch.clientX;
      this.joystick.baseY = touch.clientY;
      this.joystick.handleX = touch.clientX;
      this.joystick.handleY = touch.clientY;
      this.joystick.active = true;

      // 시각적 업데이트
      joystickBase.style.left = `${touch.clientX}px`;
      joystickBase.style.top = `${touch.clientY}px`;
      joystickHandle.style.left = `${touch.clientX}px`;
      joystickHandle.style.top = `${touch.clientY}px`;
    });

    // 터치 이동
    joystickArea.addEventListener("touchmove", (e) => {
      e.preventDefault();
      if (!this.joystick.active) return;

      const touch = e.touches[0];

      // 조이스틱 핸들 위치 계산
      const deltaX = touch.clientX - this.joystick.baseX;
      const deltaY = touch.clientY - this.joystick.baseY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance > this.joystick.maxDistance) {
        // 최대 거리 제한
        const angle = Math.atan2(deltaY, deltaX);
        this.joystick.handleX =
          this.joystick.baseX + Math.cos(angle) * this.joystick.maxDistance;
        this.joystick.handleY =
          this.joystick.baseY + Math.sin(angle) * this.joystick.maxDistance;
      } else {
        this.joystick.handleX = touch.clientX;
        this.joystick.handleY = touch.clientY;
      }

      // 핸들 위치 업데이트
      joystickHandle.style.left = `${this.joystick.handleX}px`;
      joystickHandle.style.top = `${this.joystick.handleY}px`;
    });

    // 터치 종료
    joystickArea.addEventListener("touchend", () => {
      this.joystick.active = false;
      joystickBase.style.display = "none";
      joystickHandle.style.display = "none";
      this.joystick.handleX = this.joystick.baseX;
      this.joystick.handleY = this.joystick.baseY;
    });

    // 터치가 취소되거나 영역을 벗어날 때도 조이스틱 숨김
    joystickArea.addEventListener("touchcancel", () => {
      this.joystick.active = false;
      joystickBase.style.display = "none";
      joystickHandle.style.display = "none";
    });

    // 레이저 버튼 설정 (기존 코드 유지)
    const laserBtn = document.getElementById("laserSkillBtn");
    const chargeBar = laserBtn?.querySelector(".charge-bar");

    if (!laserBtn) return;

    laserBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.keyState.laser = true;
      laserBtn.classList.add("charging");
    });

    laserBtn.addEventListener("touchend", (e) => {
      e.preventDefault();
      this.keyState.laser = false;
      this.fireLaser();
      laserBtn.classList.remove("charging");
      if (chargeBar) chargeBar.style.width = "0%";
    });
  }
}
