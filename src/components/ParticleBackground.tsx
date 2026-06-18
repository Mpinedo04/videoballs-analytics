'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
}

interface ParticleBackgroundProps {
  isSyncing?: boolean;
}

export default function ParticleBackground({ isSyncing = false }: ParticleBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isSyncingRef = useRef(isSyncing);

  useEffect(() => {
    isSyncingRef.current = isSyncing;
  }, [isSyncing]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let animationFrameId = 0;
    let mouse = { x: -1000, y: -1000 };

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const connectionDistance = reduceMotion ? 120 : 170;
    const lightModeRef = { current: document.documentElement.getAttribute('data-theme') === 'light' };

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const particleCount = () => {
      const target = Math.floor((width * height) / 12000);
      return reduceMotion ? Math.min(70, target) : Math.min(200, Math.max(70, target));
    };

    const initParticles = () => {
      particles = Array.from({ length: particleCount() }, (_, id) => {
        const radius = Math.random() * 1.4 + 0.5;
        return {
          id,
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * (reduceMotion ? 0.25 : 0.9),
          vy: (Math.random() - 0.5) * (reduceMotion ? 0.25 : 0.9),
          radius,
          baseRadius: radius,
        };
      });
    };

    const handleResize = () => {
      resizeCanvas();
      initParticles();
    };

    const handleMouseMove = (event: MouseEvent) => {
      mouse = { x: event.clientX, y: event.clientY };
    };

    const handleMouseLeave = () => {
      mouse = { x: -1000, y: -1000 };
    };

    const updateParticle = (particle: Particle, syncing: boolean, time: number) => {
      let syncGlow = 0;

      if (syncing && !reduceMotion) {
        const phase = (particle.x / width) * Math.PI * 4 + (particle.y / height) * Math.PI * 2;
        syncGlow = Math.max(0, Math.sin(time - phase));
        particle.x += (Math.random() - 0.5) * 0.7;
        particle.y += (Math.random() - 0.5) * 0.7;
      }

      const mouseRadius = reduceMotion ? 0 : 160;
      const dxMouse = particle.x - mouse.x;
      const dyMouse = particle.y - mouse.y;
      const distanceMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

      if (distanceMouse > 0 && distanceMouse < mouseRadius) {
        const force = (mouseRadius - distanceMouse) / mouseRadius;
        particle.vx += (dxMouse / distanceMouse) * force * 0.45;
        particle.vy += (dyMouse / distanceMouse) * force * 0.45;
      }

      particle.vx *= 0.985;
      particle.vy *= 0.985;

      const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
      const maxSpeed = reduceMotion ? 0.8 : 2.4;
      if (speed > maxSpeed) {
        particle.vx = (particle.vx / speed) * maxSpeed;
        particle.vy = (particle.vy / speed) * maxSpeed;
      }

      if (speed < (reduceMotion ? 0.03 : 0.16)) {
        particle.vx += (Math.random() - 0.5) * 0.08;
        particle.vy += (Math.random() - 0.5) * 0.08;
      }

      particle.x += particle.vx;
      particle.y += particle.vy;

      if (particle.x < 0 || particle.x > width) particle.vx *= -1;
      if (particle.y < 0 || particle.y > height) particle.vy *= -1;

      return syncGlow;
    };

    const drawConnections = (syncing: boolean, time: number, lineColorBase: string) => {
      const cellSize = connectionDistance;
      const grid = new Map<string, Particle[]>();

      particles.forEach(particle => {
        const gx = Math.floor(particle.x / cellSize);
        const gy = Math.floor(particle.y / cellSize);
        const key = `${gx}:${gy}`;
        const bucket = grid.get(key) || [];
        bucket.push(particle);
        grid.set(key, bucket);
      });

      for (const p1 of particles) {
        const gx = Math.floor(p1.x / cellSize);
        const gy = Math.floor(p1.y / cellSize);
        const phase = (p1.x / width) * Math.PI * 4 + (p1.y / height) * Math.PI * 2;
        const lineGlow = syncing && !reduceMotion ? Math.max(0, Math.sin(time - phase)) : 0;

        for (let ox = -1; ox <= 1; ox++) {
          for (let oy = -1; oy <= 1; oy++) {
            const neighbors = grid.get(`${gx + ox}:${gy + oy}`) || [];

            for (const p2 of neighbors) {
              if (p2.id <= p1.id) continue;

              const dx = p1.x - p2.x;
              const dy = p1.y - p2.y;
              const distance = Math.sqrt(dx * dx + dy * dy);

              if (distance >= connectionDistance) continue;

              let opacity = 1 - (distance / connectionDistance);
              if (lineGlow > 0.2) opacity = Math.min(1, opacity + lineGlow * 0.45);

              ctx.beginPath();
              ctx.strokeStyle = lineGlow > 0.2
                ? `rgba(139, 92, 246, ${opacity * 0.7})`
                : `rgba(${lineColorBase}, ${opacity * 0.28})`;
              ctx.lineWidth = 0.65;
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          }
        }
      }
    };

    const draw = () => {
      const syncing = isSyncingRef.current;
      const isLightMode = lightModeRef.current;
      const particleColor = isLightMode ? 'rgba(15, 23, 42, 0.35)' : 'rgba(255, 255, 255, 0.28)';
      const lineColorBase = isLightMode ? '15, 23, 42' : '255, 255, 255';
      const time = Date.now() / 240;

      ctx.clearRect(0, 0, width, height);

      particles.forEach(particle => {
        const syncGlow = updateParticle(particle, syncing, time);
        const currentRadius = syncing && !reduceMotion ? particle.baseRadius + (syncGlow * 2.2) : particle.baseRadius;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, currentRadius, 0, Math.PI * 2);

        if (syncing && syncGlow > 0.1 && !reduceMotion) {
          ctx.fillStyle = `rgba(139, 92, 246, ${0.35 + syncGlow * 0.5})`;
          ctx.shadowBlur = 8 * syncGlow;
          ctx.shadowColor = 'rgba(139, 92, 246, 0.7)';
        } else {
          ctx.fillStyle = particleColor;
          ctx.shadowBlur = 0;
        }

        ctx.fill();
        ctx.shadowBlur = 0;
      });

      drawConnections(syncing, time, lineColorBase);
      animationFrameId = requestAnimationFrame(draw);
    };

    resizeCanvas();
    initParticles();
    draw();

    const themeObserver = new MutationObserver(() => {
      lightModeRef.current = document.documentElement.getAttribute('data-theme') === 'light';
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    const handleVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationFrameId);
      } else {
        animationFrameId = requestAnimationFrame(draw);
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseLeave);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      themeObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 1 }}
    />
  );
}
