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
    this.keyState = { left: false, right: false, up: false, down: false };
    this.skills = {
      regenAura: new Skill(game, SkillType.REGEN_AURA),
      homingLaser: new Skill(game, SkillType.HOMING_LASER),
      chainLightning: new Skill(game, SkillType.CHAIN_LIGHTNING),
      meteorShower: new Skill(game, SkillType.METEOR_SHOWER),
    };
  }

  update(dt) {
    this.move(dt);
    this.shoot(dt);
    this.updateBuffs(dt);
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
    if (this.keyState.left) dx = -1;
    if (this.keyState.right) dx = 1;
    if (this.keyState.up) dy = -1;
    if (this.keyState.down) dy = 1;
    if (dx || dy) {
      let mag = Math.sqrt(dx * dx + dy * dy);
      dx /= mag;
      dy /= mag;
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
    // 기본 총알 제거 체크
    const removeBasicBullet =
      document.getElementById("removeBasicBullet")?.checked;
    if (removeBasicBullet) return;

    this.attackTimer += dt;
    if (this.attackTimer >= this.attackSpeed) {
      this.attackTimer = 0;
      this.game.bulletManager.spawnPlayerBullet(this.x, this.y, 0, -1);
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = "#2bf";
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
}
