import * as d3 from 'd3';

// ── Tipos ──────────────────────────────────────────────────────────────────

interface VideoNode {
  id: string;
  views: number;
  platform: 'youtube' | 'tiktok' | 'instagram';
}

// ── Helper de fecha ────────────────────────────────────────────────────────

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// ── Calcula la velocidad de un vídeo ─────────────────────────────────────
//
// Devuelve un valor entre -1 y 1:
//   +1  = crecimiento máximo (>30%)
//   0   = sin cambio
//   -1  = caída máxima (>30%)
//
// Así el arco escala proporcionalmente en lugar de saturarse.

function calcVelocity(currentViews: number, prevViews: number | undefined): number {
  if (prevViews === undefined || prevViews === 0) return 0;
  const delta = (currentViews - prevViews) / prevViews;
  // Clampea en ±0.30 y normaliza a [-1, 1]
  return Math.max(-1, Math.min(1, delta / 0.30));
}

// ── Colores del anillo según velocidad ────────────────────────────────────

function ringColor(velocity: number): { stroke: string; glow: string } {
  if (velocity >  0.15) return { stroke: '#34d399', glow: 'rgba(52,211,153,0.4)'   }; // verde  — viral
  if (velocity >  0)    return { stroke: '#fbbf24', glow: 'rgba(251,191,36,0.3)'   }; // ámbar  — creciendo
  if (velocity < -0.15) return { stroke: '#f87171', glow: 'rgba(248,113,113,0.35)' }; // rojo   — cayendo
  return { stroke: '#475569', glow: 'transparent' };                                   // gris   — estable
}

// ── Arco SVG (stroke-dasharray + dashoffset) ──────────────────────────────
//
// Técnica: circunferencia del anillo = 2πr
// El arco visible = circunferencia * |velocity|
// Siempre empieza desde las 12h (rotate -90deg)

function arcParams(r: number, velocity: number): { dasharray: number; dashoffset: number } {
  const circumference = 2 * Math.PI * r;
  const arcLength     = Math.max(0.1, circumference * Math.abs(velocity)); // Asegura un mínimo visible
  // dashoffset = circumference - arcLength → solo pinta el arco deseado
  return {
    dasharray:  circumference,
    dashoffset: circumference - arcLength,
  };
}

// ── addVelocityRing ────────────────────────────────────────────────────────
//
// Añade (o actualiza si ya existe) el anillo de velocidad en el <g> del nodo.
// ringRadius = r + GAP (el anillo va por fuera de la bola)

const GAP        = 4;   // px entre la bola y el anillo
const RING_WIDTH = 2.5; // stroke-width del arco
const RING_CLASS = 'velocity-ring';

export function addVelocityRing(
  g: d3.Selection<SVGGElement, any, null, undefined>,
  d: VideoNode,
  r: number,
  prevSnapshot: Record<string, number>
): void {
  const velocity  = calcVelocity(d.views, prevSnapshot[d.id]);
  const ringR     = r + GAP;
  const { stroke, glow } = ringColor(velocity);
  const { dasharray, dashoffset } = arcParams(ringR, velocity);

  // Elimina anillo anterior si existe (para re-renders)
  g.selectAll(`.${RING_CLASS}`).remove();

  // No pinta nada si la velocidad es prácticamente 0 (margen muy pequeño)
  if (Math.abs(velocity) < 0.01) return;

  const group = g.append('g')
    .attr('class', RING_CLASS)
    .attr('transform', `rotate(-90)`); // el arco empieza desde arriba

  // Pista de fondo (siempre visible, muy sutil)
  group.append('circle')
    .attr('r', ringR)
    .attr('fill', 'none')
    .attr('stroke', stroke)
    .attr('stroke-width', RING_WIDTH)
    .attr('opacity', 0.12);

  // Arco de velocidad
  group.append('circle')
    .attr('r', ringR)
    .attr('fill', 'none')
    .attr('stroke', stroke)
    .attr('stroke-width', Math.max(2, Math.min(RING_WIDTH, r * 0.1))) // Ajuste fino del grosor
    .attr('stroke-linecap', 'round')
    .attr('stroke-dasharray', dasharray)
    .attr('stroke-dashoffset', dasharray) // Animación: empieza oculto
    .attr('opacity', 0.9)
    .transition()
    .duration(800)
    .ease(d3.easeCubicOut)
    .attr('stroke-dashoffset', dashoffset); // llega a su valor real

  // Punto en el extremo del arco (solo si el arco es visible y r es grande)
  if (r > 20 && Math.abs(velocity) > 0.05) {
    // Ángulo final del arco en radianes (ajustado al dashoffset)
    const endAngle = (Math.abs(velocity)) * 2 * Math.PI;
    const dotX = ringR * Math.cos(endAngle - Math.PI / 2); // restamos PI/2 porque hay un rotate(-90) en el grupo, eh, el grupo ya está rotado. Pero coseno y seno van desde el eje X (que ahora es -Y real).
    
    // Como el parent ya está transformado con rotate(-90), el (ringR, 0) es visualmente arriba.
    const cx = ringR * Math.cos(endAngle);
    const cy = ringR * Math.sin(endAngle);

    group.append('circle')
      .attr('cx', cx)
      .attr('cy', cy)
      .attr('r', RING_WIDTH * 1.2)
      .attr('fill', stroke)
      .attr('opacity', 0)
      .transition()
      .delay(600)
      .duration(300)
      .attr('opacity', 1);
  }

  // Glow exterior (solo para bolas grandes con alta velocidad)
  if (r > 30 && Math.abs(velocity) > 0.5) {
    group.insert('circle', ':first-child')
      .attr('r', ringR)
      .attr('fill', 'none')
      .attr('stroke', glow)
      .attr('stroke-width', RING_WIDTH * 3)
      .attr('stroke-dasharray', dasharray)
      .attr('stroke-dashoffset', dashoffset)
      .attr('opacity', 0.35)
      .attr('filter', 'url(#glow-filter-v2)'); // Requiere un filtro blur en el defs principal
  }
}

// ── updateVelocityRings ────────────────────────────────────────────────────

export function updateVelocityRings(
  svgEl: SVGSVGElement | null,
  updatedVideos: VideoNode[],
  prevSnapshot: Record<string, number>,
  radiusScale: (views: number) => number
): void {
  if (!svgEl) return;

  const svg = d3.select(svgEl);

  updatedVideos.forEach(d => {
    const r = radiusScale(d.views);
    // Busca el <g> del nodo por id
    const node = svg.selectAll<SVGGElement, VideoNode>('g.video-node')
      .filter(nd => nd.id === d.id);

    if (!node.empty()) {
      addVelocityRing(node, d, r, prevSnapshot);
    }
  });
}

// ── Snapshot Helpers ───────────────────────────────────────────────────────

export function saveViewsSnapshot(videos: { id: string; views: number }[]): void {
  if (typeof window === 'undefined') return;
  const key = `vb_snap_${toDateKey(new Date())}`;
  
  const snap: Record<string, number> = {};
  videos.forEach(v => { snap[v.id] = v.views; });
  
  // Guardamos siempre el latest total por si queremos una diff inmediata entre recargas
  localStorage.setItem('vb_views_latest_snap_data', JSON.stringify(snap));

  if (localStorage.getItem(key)) return; // ya guardado hoy a nivel persistente
  
  localStorage.setItem(key, JSON.stringify(snap));
  localStorage.setItem('vb_views_latest_snap', key); // referencia al último día
}

export function loadPrevSnapshot(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  
  const todayKey = `vb_snap_${toDateKey(new Date())}`;
  
  // Primero busca si hay un snapshot de ayer, anteayer...
  for (let i = 1; i <= 3; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `vb_snap_${toDateKey(d)}`;
    const snap = localStorage.getItem(key);
    if (snap) return JSON.parse(snap);
  }
  
  // Si no hay snapshot histórico, cargamos el latest por defecto (esto sirve para la demo si no hay días anteriores)
  const fallback = localStorage.getItem('vb_views_latest_snap_data');
  if (fallback) {
      // Retornamos el fallback pero reducimos artificialmente las views para simular crecimiento
      // SOLO PARA DEMO ENTORNO DE DESARROLLO / CUANDO NO HAY DATA REAL
      const data = JSON.parse(fallback);
      const simulatedData: Record<string, number> = {};
      Object.keys(data).forEach(k => {
          // Simulamos que ayer tenían un 5-25% menos de visitas y algunos perdieron.
          // Solo si es un video grande para ver el efecto.
          if (data[k] > 500000) {
              simulatedData[k] = data[k] * (1 - (Math.random() * 0.4 - 0.1)); // Crecimientos y caídas al azar
          } else {
             simulatedData[k] = data[k];
          }
      });
      return simulatedData;
  }

  return {}; // sin datos previos
}
