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
        x = x1 + (x2 - x1) * t,
        y = y1 + (y2 - y1) * t,
        offset = (Math.random() - 0.5) * 30;
      points.push({ x: x + offset, y: y + offset });
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
