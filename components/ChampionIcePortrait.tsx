"use client";

import { useEffect, useRef } from "react";

const WRAP_SIZE = 66;

export function ChampionIcePortrait({ children }: { children: React.ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const context: CanvasRenderingContext2D = ctx;
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    let time = 0;
    let animId: number;

    // Ice crystals – small bright dots
    const crystals: Crystal[] = [];
    class Crystal {
      x: number;
      y: number;
      size: number;
      life: number;
      decay: number;
      vx: number;
      vy: number;
      phase: number;

      constructor() {
        this.phase = Math.random() * Math.PI * 2;
        this.reset();
      }
      reset() {
        const angle = Math.random() * Math.PI * 2;
        const r = 26 + Math.random() * 6;
        this.x = cx + Math.cos(angle) * r;
        this.y = cy + Math.sin(angle) * r;
        this.size = 1 + Math.random() * 2;
        this.life = 1;
        this.decay = 0.004 + Math.random() * 0.006;
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = -(0.4 + Math.random() * 0.8);
      }
      update() {
        this.x += this.vx + Math.sin(time * 1.5 + this.phase) * 0.2;
        this.y += this.vy;
        this.life -= this.decay;
        if (this.life <= 0) this.reset();
      }
      draw(c: CanvasRenderingContext2D) {
        const a = this.life * 0.85;
        const flicker = 0.5 + 0.5 * Math.sin(time * 3 + this.phase);
        c.beginPath();
        c.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        c.fillStyle = `rgba(240, 250, 255, ${a * flicker})`;
        c.fill();
        const g = c.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 3);
        g.addColorStop(0, `rgba(210, 240, 255, ${a * flicker * 0.35})`);
        g.addColorStop(1, `rgba(210, 240, 255, 0)`);
        c.beginPath();
        c.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2);
        c.fillStyle = g;
        c.fill();
      }
    }

    // Ice shards – small diamonds
    const shards: IceShard[] = [];
    class IceShard {
      x: number;
      y: number;
      w: number;
      h: number;
      rotation: number;
      rotSpeed: number;
      life: number;
      decay: number;
      vx: number;
      vy: number;
      alpha: number;
      type: "diamond" | "shard";

      constructor() {
        this.reset();
      }
      reset() {
        const angle = Math.random() * Math.PI * 2;
        const r = 27 + Math.random() * 5;
        this.x = cx + Math.cos(angle) * r;
        this.y = cy + Math.sin(angle) * r;
        this.w = 1.5 + Math.random() * 3;
        this.h = 4 + Math.random() * 8;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.025;
        this.life = 1;
        this.decay = 0.003 + Math.random() * 0.004;
        this.vx = (Math.random() - 0.5) * 0.25;
        this.vy = -(0.25 + Math.random() * 0.5);
        this.alpha = 0.25 + Math.random() * 0.3;
        this.type = Math.random() > 0.5 ? "diamond" : "shard";
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotSpeed;
        this.life -= this.decay;
        if (this.life <= 0) this.reset();
      }
      draw(c: CanvasRenderingContext2D) {
        const a = this.life * this.alpha;
        c.save();
        c.translate(this.x, this.y);
        c.rotate(this.rotation);
        c.beginPath();
        if (this.type === "diamond") {
          c.moveTo(0, -this.h / 2);
          c.lineTo(this.w / 2, 0);
          c.lineTo(0, this.h / 2);
          c.lineTo(-this.w / 2, 0);
        } else {
          c.moveTo(0, -this.h / 2);
          c.lineTo(this.w / 2, -this.h * 0.1);
          c.lineTo(this.w * 0.3, this.h / 2);
          c.lineTo(-this.w * 0.4, this.h * 0.3);
          c.lineTo(-this.w / 2, -this.h * 0.2);
        }
        c.closePath();
        const grad = c.createLinearGradient(0, -this.h / 2, 0, this.h / 2);
        grad.addColorStop(0, `rgba(220, 245, 255, ${a * 0.95})`);
        grad.addColorStop(0.5, `rgba(190, 230, 252, ${a * 0.5})`);
        grad.addColorStop(1, `rgba(170, 220, 248, ${a * 0.15})`);
        c.fillStyle = grad;
        c.fill();
        c.strokeStyle = `rgba(240, 252, 255, ${a * 0.6})`;
        c.lineWidth = 0.5;
        c.stroke();
        c.restore();
      }
    }

    // Snowflakes – simple 6-arm
    const snowflakes: Snowflake[] = [];
    class Snowflake {
      x: number;
      y: number;
      size: number;
      life: number;
      decay: number;
      vx: number;
      vy: number;
      rotation: number;
      rotSpeed: number;
      alpha: number;
      angle: number;

      constructor() {
        this.angle = Math.random() * Math.PI * 2;
        this.reset();
      }
      reset() {
        const r = 28 + Math.random() * 6;
        this.x = cx + Math.cos(this.angle) * r;
        this.y = cy + Math.sin(this.angle) * r;
        this.size = 2 + Math.random() * 3;
        this.life = 1;
        this.decay = 0.004 + Math.random() * 0.005;
        this.vx = Math.cos(this.angle) * (0.2 + Math.random() * 0.4) + (Math.random() - 0.5) * 0.15;
        this.vy = Math.sin(this.angle) * (0.2 + Math.random() * 0.3) - (0.2 + Math.random() * 0.4);
        this.rotation = Math.random() * Math.PI;
        this.rotSpeed = (Math.random() - 0.5) * 0.015;
        this.alpha = 0.25 + Math.random() * 0.3;
      }
      update() {
        this.x += this.vx + Math.sin(time + this.rotation) * 0.1;
        this.y += this.vy;
        this.rotation += this.rotSpeed;
        this.life -= this.decay;
        if (this.life <= 0) {
          this.angle = Math.random() * Math.PI * 2;
          this.reset();
        }
      }
      draw(c: CanvasRenderingContext2D) {
        const a = this.life * this.alpha;
        c.save();
        c.translate(this.x, this.y);
        c.rotate(this.rotation);
        c.strokeStyle = `rgba(220, 245, 255, ${a})`;
        c.lineWidth = 0.5;
        for (let i = 0; i < 6; i++) {
          const armAngle = (i / 6) * Math.PI * 2;
          const ex = Math.cos(armAngle) * this.size;
          const ey = Math.sin(armAngle) * this.size;
          c.beginPath();
          c.moveTo(0, 0);
          c.lineTo(ex, ey);
          c.stroke();
        }
        const g = c.createRadialGradient(0, 0, 0, 0, 0, this.size * 1.5);
        g.addColorStop(0, `rgba(210, 240, 255, ${a * 0.2})`);
        g.addColorStop(1, `rgba(210, 240, 255, 0)`);
        c.beginPath();
        c.arc(0, 0, this.size * 1.5, 0, Math.PI * 2);
        c.fillStyle = g;
        c.fill();
        c.restore();
      }
    }

    // Soft fog ring near edge
    const ringFog: RingFog[] = [];
    class RingFog {
      x: number;
      y: number;
      size: number;
      life: number;
      decay: number;
      angle: number;
      orbitSpeed: number;
      r: number;
      alpha: number;
      vyUp: number;

      constructor() {
        this.angle = Math.random() * Math.PI * 2;
        this.r = 28 + Math.random() * 4;
        this.x = cx + Math.cos(this.angle) * this.r;
        this.y = cy + Math.sin(this.angle) * this.r;
        this.size = 6 + Math.random() * 8;
        this.life = 1;
        this.decay = 0.008 + Math.random() * 0.01;
        this.orbitSpeed = 0.003 + Math.random() * 0.005;
        this.alpha = 0.08 + Math.random() * 0.08;
        this.vyUp = -(0.08 + Math.random() * 0.15);
      }
      reset() {
        this.angle = Math.random() * Math.PI * 2;
        this.r = 28 + Math.random() * 4;
        this.x = cx + Math.cos(this.angle) * this.r;
        this.y = cy + Math.sin(this.angle) * this.r;
        this.size = 6 + Math.random() * 8;
        this.life = 1;
        this.decay = 0.008 + Math.random() * 0.01;
        this.orbitSpeed = 0.003 + Math.random() * 0.005;
        this.alpha = 0.08 + Math.random() * 0.08;
        this.vyUp = -(0.08 + Math.random() * 0.15);
      }
      update() {
        this.angle += this.orbitSpeed;
        this.r += 0.04;
        this.x = cx + Math.cos(this.angle) * this.r;
        this.y = cy + Math.sin(this.angle) * this.r + this.vyUp * (1 - this.life) * 20;
        this.size += 0.08;
        this.life -= this.decay;
        if (this.life <= 0) this.reset();
      }
      draw(c: CanvasRenderingContext2D) {
        const a = this.life * this.alpha;
        const grad = c.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
        grad.addColorStop(0, `rgba(200, 232, 252, ${a * 1.1})`);
        grad.addColorStop(0.5, `rgba(180, 220, 248, ${a * 0.45})`);
        grad.addColorStop(1, `rgba(160, 208, 240, 0)`);
        c.beginPath();
        c.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        c.fillStyle = grad;
        c.fill();
      }
    }

    for (let i = 0; i < 40; i++) crystals.push(new Crystal());
    for (let i = 0; i < 18; i++) shards.push(new IceShard());
    for (let i = 0; i < 50; i++) snowflakes.push(new Snowflake());
    for (let i = 0; i < 20; i++) ringFog.push(new RingFog());

    function animate() {
      time += 0.016;
      context.clearRect(0, 0, W, H);
      ringFog.forEach((p) => {
        p.update();
        p.draw(context);
      });
      shards.forEach((p) => {
        p.update();
        p.draw(context);
      });
      snowflakes.forEach((p) => {
        p.update();
        p.draw(context);
      });
      crystals.forEach((p) => {
        p.update();
        p.draw(context);
      });
      animId = requestAnimationFrame(animate);
    }
    animate();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="profile-match-portrait-ice-wrap">
      <canvas
        ref={canvasRef}
        width={WRAP_SIZE}
        height={WRAP_SIZE}
        className="profile-match-portrait-ice-canvas"
        aria-hidden
      />
      {/* Subtle ice rings */}
      {[58, 62, 66].map((size, i) => (
        <div
          key={i}
          className="profile-match-portrait-ice-ring"
          style={{
            width: size,
            height: size,
            marginLeft: -size / 2,
            marginTop: -size / 2,
            animationDelay: `${i * 0.25}s`,
          }}
        />
      ))}
      <div className="profile-match-portrait-ice-circle">
        {children}
      </div>
    </div>
  );
}
