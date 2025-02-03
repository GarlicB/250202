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

  createExplosion(x, y, color = "#f66", count = 20) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count,
        speed = 100 + Math.random() * 100;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 3,
        color,
        alpha: 1,
        life: 0.5 + Math.random() * 0.5,
        finished: false,
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
