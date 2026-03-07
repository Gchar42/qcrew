"use client";

import { useEffect, useRef } from "react";

const WRAP_SIZE = 66;

export function ChampionFirePortrait({ children }: { children: React.ReactNode }) {
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
    let particles: Particle[] = [];
    let animId: number;

    class Particle {
      angle: number;
      x: number;
      y: number;
      speed: number;
      life: number;
      decay: number;
      size: number;
      vx: number;
      vy: number;
      hue: number;

      constructor() {
        this.angle = Math.random() * Math.PI * 2;
        const r = 26 + Math.random() * 4;
        this.x = cx + Math.cos(this.angle) * r;
        this.y = cy + Math.sin(this.angle) * r;
        this.speed = 0.3 + Math.random() * 0.8;
        this.life = 1;
        this.decay = 0.012 + Math.random() * 0.018;
        this.size = 1.5 + Math.random() * 2.5;
        this.vx = Math.cos(this.angle) * this.speed * (0.2 + Math.random() * 0.4);
        this.vy = -Math.abs(Math.sin(this.angle) * this.speed) - 0.3 - Math.random() * 0.7;
        this.hue = 15 + Math.random() * 30;
      }

      reset() {
        this.angle = Math.random() * Math.PI * 2;
        const r = 26 + Math.random() * 4;
        this.x = cx + Math.cos(this.angle) * r;
        this.y = cy + Math.sin(this.angle) * r;
        this.speed = 0.3 + Math.random() * 0.8;
        this.life = 1;
        this.decay = 0.012 + Math.random() * 0.018;
        this.size = 1.5 + Math.random() * 2.5;
        this.vx = Math.cos(this.angle) * this.speed * (0.2 + Math.random() * 0.4);
        this.vy = -Math.abs(Math.sin(this.angle) * this.speed) - 0.3 - Math.random() * 0.7;
        this.hue = 15 + Math.random() * 30;
      }

      update() {
        this.x += this.vx;
        this.vy -= 0.02;
        this.y += this.vy;
        this.life -= this.decay;
        this.size *= 0.995;
        if (this.life <= 0) this.reset();
      }

      draw(ctx: CanvasRenderingContext2D) {
        const alpha = this.life * 0.9;
        const gradient = ctx.createRadialGradient(
          this.x,
          this.y,
          0,
          this.x,
          this.y,
          this.size * 2
        );
        gradient.addColorStop(0, `hsla(${this.hue}, 100%, 70%, ${alpha})`);
        gradient.addColorStop(0.4, `hsla(${this.hue - 5}, 100%, 55%, ${alpha * 0.7})`);
        gradient.addColorStop(1, `hsla(${this.hue - 10}, 100%, 40%, 0)`);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 2, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }
    }

    for (let i = 0; i < 80; i++) {
      particles.push(new Particle());
    }

    function animate() {
      context.clearRect(0, 0, W, H);
      context.globalCompositeOperation = "lighter";
      particles.forEach((p) => {
        p.update();
        p.draw(context);
      });
      context.globalCompositeOperation = "source-over";
      animId = requestAnimationFrame(animate);
    }
    animate();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="profile-match-portrait-fire-wrap">
      <canvas
        ref={canvasRef}
        width={WRAP_SIZE}
        height={WRAP_SIZE}
        className="profile-match-portrait-fire-canvas"
        aria-hidden
      />
      {/* Flicker rings */}
      {[58, 62, 66].map((size, i) => (
        <div
          key={i}
          className="profile-match-portrait-fire-ring"
          style={{
            width: size,
            height: size,
            marginLeft: -size / 2,
            marginTop: -size / 2,
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
      {/* Portrait circle with fire border/glow */}
      <div className="profile-match-portrait-fire-circle">
        {children}
      </div>
    </div>
  );
}
