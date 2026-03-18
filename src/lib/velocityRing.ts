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
  g: d3.Selection<any, any, any, any>,
  d: VideoNode,
  r: number,
  prevSnapshot: Record<string, number>
): void {
  const prevViews = prevSnapshot[d.id];
  const velocity  = calcVelocity(d.views, prevViews);
  const ringR     = r + GAP;
  const { stroke, glow } = ringColor(velocity);
  const { dasharray, dashoffset } = arcParams(ringR, velocity);

  // Elimina anillo anterior y labels si existen (para re-renders)
  g.selectAll(`.${RING_CLASS}`).remove();
  g.selectAll('.velocity-label').remove();

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
    .attr('stroke-width', Math.max(2, Math.min(RING_WIDTH, r * 0.1)))
    .attr('stroke-linecap', 'round')
    .attr('stroke-dasharray', dasharray)
    .attr('stroke-dashoffset', dasharray)
    .attr('opacity', 0.9)
    .transition()
    .duration(800)
    .ease(d3.easeCubicOut)
    .attr('stroke-dashoffset', dashoffset);

  // Punto en el extremo del arco (solo si el arco es visible y r es grande)
  if (r > 20 && Math.abs(velocity) > 0.05) {
    const endAngle = (Math.abs(velocity)) * 2 * Math.PI;
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
      .attr('filter', 'url(#glow-filter-v2)');
  }

  // ── Labels de visitas ganadas y porcentaje ──────────────────────────────
  // Fuera del grupo rotado para que el texto se lea correctamente
  if (prevViews !== undefined && prevViews > 0) {
    const delta = d.views - prevViews;
    const pct = ((delta) / prevViews) * 100;
    if (Math.abs(delta) < 1) return; // no mostrar si no hay cambio real

    const sign = delta >= 0 ? '+' : '';
    const deltaStr = formatCompact(delta);
    const pctStr = `${sign}${pct.toFixed(1)}%`;
    const labelText = `${sign}${deltaStr} (${pctStr})`;

    // Posicionar arriba-derecha de la bola
    const labelX = r * 0.5;
    const labelY = -(ringR + 6);

    // Fondo pill para legibilidad
    const labelGroup = g.append('g')
      .attr('class', 'velocity-label')
      .attr('opacity', 0);

    // Texto principal
    const textEl = labelGroup.append('text')
      .attr('x', labelX)
      .attr('y', labelY)
      .attr('text-anchor', 'start')
      .attr('dominant-baseline', 'auto')
      .attr('fill', stroke)
      .attr('font-size', Math.max(8, Math.min(11, r * 0.22)))
      .attr('font-weight', '800')
      .attr('font-family', "'Space Grotesk', sans-serif")
      .attr('letter-spacing', '0.02em')
      .text(labelText);

    // Fondo oscuro detrás del texto para legibilidad
    const bbox = (textEl.node() as SVGTextElement)?.getBBox();
    if (bbox) {
      labelGroup.insert('rect', 'text')
        .attr('x', bbox.x - 4)
        .attr('y', bbox.y - 2)
        .attr('width', bbox.width + 8)
        .attr('height', bbox.height + 4)
        .attr('rx', 4)
        .attr('fill', 'rgba(2, 6, 23, 0.85)')
        .attr('stroke', stroke)
        .attr('stroke-width', 0.5)
        .attr('stroke-opacity', 0.3);
    }

    // Animación de entrada
    labelGroup.transition()
      .delay(400)
      .duration(500)
      .ease(d3.easeCubicOut)
      .attr('opacity', 1);
  }
}

// ── Formateador compacto para los labels ──────────────────────────────────

function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
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
    const node = svg.selectAll<SVGGElement, VideoNode>('g.video-node')
      .filter(nd => nd.id === d.id);

    if (!node.empty()) {
      addVelocityRing(node, d, r, prevSnapshot);
    }
  });
}

