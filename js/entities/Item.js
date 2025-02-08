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