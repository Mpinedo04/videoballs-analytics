'use client';

import { useEffect, useRef } from 'react';

interface Particle {
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

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    let particles: Particle[] = [];
    const particleCount = Math.floor((width * height) / 8000); // Antes 15000, ahora mucho más denso
    const connectionDistance = 200; // Antes 150, conecta de más lejos

    // Inicializar partículas
    const initParticles = () => {
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 1.5, // Más velocidad inicial
          vy: (Math.random() - 0.5) * 1.5, // Más velocidad inicial
          radius: Math.random() * 1.5 + 0.5,
          baseRadius: 0
        });
        particles[particles.length - 1].baseRadius = particles[particles.length - 1].radius;
      }
    };

    initParticles();

    // Resize handler
    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initParticles();
    };
    window.addEventListener('resize', handleResize);

    // Mouse Interaction
    let mouse = { x: -1000, y: -1000 };
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseLeave);

    // Bucle de animación
    let animationFrameId: number;

    const draw = () => {
      // Usar variable CSS si existe, si no fallback
      const isLightMode = document.documentElement.getAttribute('data-theme') === 'light';
      const particleColor = isLightMode ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.35)'; // Más opacos
      const lineColorBase = isLightMode ? '15, 23, 42' : '255, 255, 255';

      ctx.clearRect(0, 0, width, height);

      const syncing = isSyncingRef.current;
      const time = Date.now() / 200; // Velocidad de la ola

      // Actualizar posiciones e interactuar con el ratón
      const mouseRadius = 180; // Radio de repulsión

      particles.forEach(p => {
        let syncGlow = 0;
        if (syncing) {
          // Fase que crea una ola en diagonal
          const phase = (p.x / width) * Math.PI * 4 + (p.y / height) * Math.PI * 2;
          syncGlow = Math.max(0, Math.sin(time - phase));
          
          // Micro-vibración nerviosa
          p.x += (Math.random() - 0.5) * 1.5;
          p.y += (Math.random() - 0.5) * 1.5;
        }

        // --- Lógica del ratón ---
        const dxMouse = p.x - mouse.x;
        const dyMouse = p.y - mouse.y;
        const distanceMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
        
        if (distanceMouse < mouseRadius) {
          const forceDirectionX = dxMouse / distanceMouse;
          const forceDirectionY = dyMouse / distanceMouse;
          // Fuerza inversamente proporcional a la distancia (más cerca = más fuerte)
          const force = (mouseRadius - distanceMouse) / mouseRadius;
          const maxRepelVelocity = 4; // Intensidad del empuje
          
          p.vx += forceDirectionX * force * maxRepelVelocity * 0.15;
          p.vy += forceDirectionY * force * maxRepelVelocity * 0.15;
        }

        // Fricción constante para estabilizar después del empuje del ratón
        p.vx *= 0.98;
        p.vy *= 0.98;

        // Limitar velocidad máxima general
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        const maxSpeed = 3.5; // Permitimos que vayan un poco más rápido temporalmente
        if (speed > maxSpeed) {
           p.vx = (p.vx / speed) * maxSpeed;
           p.vy = (p.vy / speed) * maxSpeed;
        }
        
        // Mantener una velocidad mínima de inercia natural (Drift constante)
        const minSpeed = 0.4; // Velocidad mínima a la que NUNCA van a bajar
        if (speed < minSpeed) {
            // Si van muy lentas, empujarlas muy suavemente en su dirección actual o al azar
            p.vx += (Math.random() - 0.5) * 0.2;
            p.vy += (Math.random() - 0.5) * 0.2;
        }

        // Aplicar posición
        p.x += p.vx;
        p.y += p.vy;

        // Rebote en bordes suaves
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Dibujar partícula
        ctx.beginPath();
        const currentRadius = syncing ? p.baseRadius + (syncGlow * 3) : p.baseRadius;
        ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
        
        if (syncing && syncGlow > 0.1) {
          // Ola bioluminiscente violeta/cian
          ctx.fillStyle = `rgba(139, 92, 246, ${0.4 + syncGlow * 0.6})`;
          ctx.shadowBlur = 10 * syncGlow;
          ctx.shadowColor = 'rgba(139, 92, 246, 0.8)';
        } else {
          ctx.fillStyle = particleColor;
          ctx.shadowBlur = 0;
        }
        ctx.fill();
        ctx.shadowBlur = 0; // reset para el resto
      });

      // Dibujar conexiones
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        let lineGlow = 0;
        if (syncing) {
          const phase = (p1.x / width) * Math.PI * 4 + (p1.y / height) * Math.PI * 2;
          lineGlow = Math.max(0, Math.sin(time - phase));
        }
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < connectionDistance) {
            // Opacidad relativa a la distancia
            let opacity = 1 - (distance / connectionDistance);
            if (syncing) opacity = Math.min(1, opacity + lineGlow * 0.5);

            ctx.beginPath();
            if (syncing && lineGlow > 0.2) {
              ctx.strokeStyle = `rgba(139, 92, 246, ${opacity * 0.8})`; 
            } else {
              ctx.strokeStyle = `rgba(${lineColorBase}, ${opacity * 0.4})`; // Antes 0.2, ahora más brillantes
            }
            ctx.lineWidth = 0.8; // Antes 0.5, líneas más gorditas
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
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
