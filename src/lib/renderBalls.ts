// ─────────────────────────────────────────────────────────────────────────────
// renderBalls.ts  —  VideoBalls platform-specific D3 node renderers
// ─────────────────────────────────────────────────────────────────────────────

import * as d3 from 'd3';

// ── Tipos ──────────────────────────────────────────────────────────────────

export interface VideoNode {
  id: string;
  platform: 'youtube' | 'tiktok' | 'instagram';
  views: number;
  title: string;
  x?: number;
  y?: number;
  r?: number; // radio asignado por D3
}

// ── Constantes de color (centralizadas para cambiar fácil) ─────────────────

const COLORS = {
  youtube: {
    body0: '#FF6B6B',   // centro del gradiente radial
    body1: '#FF0000',   // medio
    body2: '#8B0000',   // borde oscuro (profundidad)
    edge:  '#5a0000',   // anillo interior oscuro
    shadow: '#FF0000',
  },
  tiktok: {
    body0: '#2a2a2a',
    body1: '#111111',
    body2: '#000000',
    rimCyan: '#69C9D0',
    rimRed:  '#EE1D52',
    shadow:  '#69C9D0',
  },
  instagram: {
    stop0: '#FCAF45',   // amarillo
    stop1: '#F77737',   // naranja
    stop2: '#E1306C',   // rosa
    stop3: '#C13584',   // morado claro
    stop4: '#833AB4',   // morado
    shadow: '#C13584',
  },
} as const;

// ── Defs SVG (llama esto UNA VEZ al crear el SVG) ─────────────────────────

export function appendPlatformDefs(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) {
  // Clear existing defs if any to avoid duplicates on re-renders
  svg.select('defs').remove();
  const defs = svg.append('defs');

  // ── YouTube: gradiente radial esfera ──
  const ytGrad = defs.append('radialGradient')
    .attr('id', 'vb-yt-body')
    .attr('cx', '38%').attr('cy', '32%').attr('r', '65%');
  ytGrad.append('stop').attr('offset', '0%')  .attr('stop-color', COLORS.youtube.body0);
  ytGrad.append('stop').attr('offset', '45%') .attr('stop-color', COLORS.youtube.body1);
  ytGrad.append('stop').attr('offset', '100%').attr('stop-color', COLORS.youtube.body2);

  // ── TikTok: gradiente radial esfera ──
  const ttGrad = defs.append('radialGradient')
    .attr('id', 'vb-tt-body')
    .attr('cx', '38%').attr('cy', '32%').attr('r', '65%');
  ttGrad.append('stop').attr('offset', '0%')  .attr('stop-color', COLORS.tiktok.body0);
  ttGrad.append('stop').attr('offset', '55%') .attr('stop-color', COLORS.tiktok.body1);
  ttGrad.append('stop').attr('offset', '100%').attr('stop-color', COLORS.tiktok.body2);

  // ── Instagram: gradiente radial esfera ──
  const igGrad = defs.append('radialGradient')
    .attr('id', 'vb-ig-body')
    .attr('cx', '75%').attr('cy', '75%').attr('r', '80%');
  igGrad.append('stop').attr('offset', '0%')  .attr('stop-color', COLORS.instagram.stop0);
  igGrad.append('stop').attr('offset', '25%') .attr('stop-color', COLORS.instagram.stop1);
  igGrad.append('stop').attr('offset', '50%') .attr('stop-color', COLORS.instagram.stop2);
  igGrad.append('stop').attr('offset', '75%') .attr('stop-color', COLORS.instagram.stop3);
  igGrad.append('stop').attr('offset', '100%').attr('stop-color', COLORS.instagram.stop4);

  // ── Highlight cúpula (compartido) ──
  const hiGrad = defs.append('radialGradient')
    .attr('id', 'vb-highlight')
    .attr('cx', '30%').attr('cy', '22%').attr('r', '52%');
  hiGrad.append('stop').attr('offset', '0%')  .attr('stop-color', 'white').attr('stop-opacity', '.65');
  hiGrad.append('stop').attr('offset', '60%') .attr('stop-color', 'white').attr('stop-opacity', '.07');
  hiGrad.append('stop').attr('offset', '100%').attr('stop-color', 'white').attr('stop-opacity', '0');

  // ── Reflejo inferior (compartido) ──
  const reflGrad = defs.append('radialGradient')
    .attr('id', 'vb-refl')
    .attr('cx', '50%').attr('cy', '88%').attr('r', '38%');
  reflGrad.append('stop').attr('offset', '0%')  .attr('stop-color', 'white').attr('stop-opacity', '.13');
  reflGrad.append('stop').attr('offset', '100%').attr('stop-color', 'white').attr('stop-opacity', '0');

  // ── Drop shadows por plataforma ──
  ([
    ['vb-shadow-yt', COLORS.youtube.shadow,   0.4, 8],
    ['vb-shadow-tt', COLORS.tiktok.rimCyan,   0.3, 8],
    ['vb-shadow-ig', COLORS.instagram.stop3,  0.45, 8],
  ] as [string, string, number, number][]).forEach(([id, color, opacity, blur]) => {
    const f = defs.append('filter')
      .attr('id', id)
      .attr('x', '-35%').attr('y', '-35%')
      .attr('width', '170%').attr('height', '170%');
    f.append('feDropShadow')
      .attr('dx', 0).attr('dy', 5)
      .attr('stdDeviation', blur)
      .attr('flood-color', color)
      .attr('flood-opacity', opacity);
  });
}

// ── Helper: añade la cúpula de luz + punto especular ──────────────────────

function addGlassHighlight(g: d3.Selection<SVGGElement, unknown, null, undefined>, r: number) {
  g.append('ellipse')
    .attr('cx', -r * 0.28)
    .attr('cy', -r * 0.44)
    .attr('rx',  r * 0.42)
    .attr('ry',  r * 0.24)
    .attr('fill', 'url(#vb-highlight)');

  if (r > 20) {
    g.append('circle')
      .attr('cx', -r * 0.38)
      .attr('cy', -r * 0.52)
      .attr('r',   r * 0.06)
      .attr('fill', 'white')
      .attr('opacity', r > 40 ? 0.55 : 0.4);
  }

  g.append('circle')
    .attr('r', r)
    .attr('fill', 'url(#vb-refl)');
}

// ── Renderizador principal ─────────────────────────────────────────────────

export function renderBall(
  g: d3.Selection<SVGGElement, any, null, undefined>,
  d: VideoNode,
  r: number
) {
  g.selectAll('*').remove(); 

  switch (d.platform) {
    case 'youtube':  renderYouTube(g, r); break;
    case 'tiktok':   renderTikTok(g, r);  break;
    case 'instagram':renderInstagram(g, r); break;
  }

  g.append('circle')
    .attr('r', r)
    .attr('fill', 'transparent')
    .attr('class', 'hit-area');
}

// ─────────────────────────────────────────────────────────────────────────────
// YOUTUBE
// ─────────────────────────────────────────────────────────────────────────────

function renderYouTube(g: d3.Selection<SVGGElement, any, null, undefined>, r: number) {
  g.attr('filter', 'url(#vb-shadow-yt)');
  g.append('circle').attr('r', r).attr('fill', 'url(#vb-yt-body)');
  g.append('circle')
    .attr('r', r)
    .attr('fill', 'none')
    .attr('stroke', COLORS.youtube.edge)
    .attr('stroke-width', r * 0.035)
    .attr('opacity', 0.55);

  if (r > 14) {
    const btnW = r * 0.88;
    const btnH = r * 0.54;
    const btnRx = r * 0.12;

    g.append('rect')
      .attr('x', -btnW / 2)
      .attr('y', -btnH / 2)
      .attr('width',  btnW)
      .attr('height', btnH)
      .attr('rx', btnRx)
      .attr('fill', 'white')
      .attr('opacity', 0.95);

    const triH = btnH * 0.62;
    const triW = triH * 0.86;
    const ox = r * 0.04;

    g.append('polygon')
      .attr('points', [
        `${-triW / 2 + ox},${-triH / 2}`,
        `${ triW / 2 + ox + triW * 0.1},0`,
        `${-triW / 2 + ox},${triH / 2}`,
      ].join(' '))
      .attr('fill', COLORS.youtube.body1);
  }
  addGlassHighlight(g, r);
}

// ─────────────────────────────────────────────────────────────────────────────
// TIKTOK
// ─────────────────────────────────────────────────────────────────────────────

function renderTikTok(g: d3.Selection<SVGGElement, any, null, undefined>, r: number) {
  g.attr('filter', 'url(#vb-shadow-tt)');
  g.append('circle').attr('r', r).attr('fill', 'url(#vb-tt-body)');
  g.append('circle')
    .attr('r', r)
    .attr('fill', 'none')
    .attr('stroke', COLORS.tiktok.rimCyan)
    .attr('stroke-width', r * 0.055)
    .attr('opacity', 0.28);

  g.append('circle')
    .attr('r', r * 0.94)
    .attr('fill', 'none')
    .attr('stroke', COLORS.tiktok.rimRed)
    .attr('stroke-width', r * 0.018)
    .attr('opacity', 0.18);

  if (r > 12) {
    const fs = r * 0.95;
    const ty = r * 0.27;
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'auto')
      .attr('y', ty + r * 0.03)
      .attr('x', r * 0.04)
      .attr('font-size', fs)
      .attr('font-weight', 900)
      .attr('fill', COLORS.tiktok.rimRed)
      .attr('opacity', 0.75)
      .text('♪');
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'auto')
      .attr('y', ty - r * 0.03)
      .attr('x', -r * 0.04)
      .attr('font-size', fs)
      .attr('font-weight', 900)
      .attr('fill', COLORS.tiktok.rimCyan)
      .attr('opacity', 0.75)
      .text('♪');
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'auto')
      .attr('y', ty)
      .attr('font-size', fs)
      .attr('font-weight', 900)
      .attr('fill', 'white')
      .attr('opacity', 0.92)
      .text('♪');
  }
  addGlassHighlight(g, r);
}

// ─────────────────────────────────────────────────────────────────────────────
// INSTAGRAM
// ─────────────────────────────────────────────────────────────────────────────

function renderInstagram(g: d3.Selection<SVGGElement, any, null, undefined>, r: number) {
  g.attr('filter', 'url(#vb-shadow-ig)');
  g.append('circle').attr('r', r).attr('fill', 'url(#vb-ig-body)');
  g.append('circle')
    .attr('r', r * 0.96)
    .attr('fill', 'none')
    .attr('stroke', 'white')
    .attr('stroke-width', r * 0.012)
    .attr('opacity', 0.18);

  if (r > 14) {
    const camW  = r * 0.9;
    const camH  = r * 0.72;
    const camRx = r * 0.16;
    const sw    = r * 0.038;

    g.append('rect')
      .attr('x', -camW / 2)
      .attr('y', -camH / 2)
      .attr('width',  camW)
      .attr('height', camH)
      .attr('rx', camRx)
      .attr('fill', 'none')
      .attr('stroke', 'white')
      .attr('stroke-width', sw * 1.1)
      .attr('opacity', 0.95);

    const lensR = r * 0.26;
    g.append('circle')
      .attr('r', lensR)
      .attr('fill', 'none')
      .attr('stroke', 'white')
      .attr('stroke-width', sw)
      .attr('opacity', 0.95);

    if (r > 24) {
      g.append('circle')
        .attr('r', lensR * 0.48)
        .attr('fill', 'white')
        .attr('opacity', 0.2);
    }

    const flashX =  camW / 2 - r * 0.14;
    const flashY = -camH / 2 + r * 0.14;
    g.append('circle')
      .attr('cx', flashX)
      .attr('cy', flashY)
      .attr('r',  r * 0.07)
      .attr('fill', 'white')
      .attr('opacity', 0.9);
  }
  addGlassHighlight(g, r);
}
