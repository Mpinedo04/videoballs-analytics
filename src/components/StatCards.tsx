'use client';

import { useMemo } from 'react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Video {
  id: string;
  title: string;
  views: number;
  platform: 'youtube' | 'tiktok' | 'instagram';
  published_at: string;
  engagement: { likes?: number; comments?: number };
}

interface StatCardsProps {
  videos: Video[];
  days?: number; // cuántos días está mostrando el dashboard (por defecto 10)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBig(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toLocaleString();
}

function toDateKey(dateStr: string): string {
  return dateStr.slice(0, 10); // 'YYYY-MM-DD'
}

// Genera los últimos N días como keys 'YYYY-MM-DD'
function lastNDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return d.toISOString().slice(0, 10);
  });
}

// Construye un array de valores numéricos (uno por día) para los últimos `windowDays` días
function buildDailyValues(
  videos: Video[],
  windowDays: number,
  getValue: (v: Video) => number
): number[] {
  const days = lastNDays(windowDays);
  const map: Record<string, number> = {};
  days.forEach(d => { map[d] = 0; });
  videos.forEach(v => {
    const key = toDateKey(v.published_at);
    if (key in map) map[key] = (map[key] || 0) + getValue(v);
  });
  return days.map(d => map[d]);
}

// Delta: compara la primera mitad vs la segunda mitad de la ventana
function calcDelta(values: number[]): { pct: number; isUp: boolean } {
  const mid = Math.floor(values.length / 2);
  const recent = values.slice(mid).reduce((a, b) => a + b, 0);
  const older  = values.slice(0, mid).reduce((a, b) => a + b, 0);
  if (older === 0) return { pct: 0, isUp: true };
  const pct = ((recent - older) / older) * 100;
  return { pct: Math.abs(pct), isUp: pct >= 0 };
}

// Normaliza valores para el sparkline (0..1)
function normalize(values: number[]): number[] {
  const max = Math.max(...values, 1);
  return values.map(v => v / max);
}

// ─── Sparkline SVG ────────────────────────────────────────────────────────────

interface SparkProps {
  values: number[];         // valores crudos
  color: string;
  type?: 'line' | 'bar';
}

function Sparkline({ values, color, type = 'line' }: SparkProps) {
  const norm = normalize(values);
  const W = 160, H = 40, PAD = 2; // Made it slightly larger for better visibility in the premium UI

  if (type === 'bar') {
    const barW = (W - PAD * (norm.length - 1)) / norm.length;
    return (
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
        {norm.map((v, i) => {
          const barH = Math.max(2, v * (H - 2));
          const x = i * (barW + PAD);
          const y = H - barH;
          const isLast = i === norm.length - 1;
          return (
            <rect
              key={i}
              x={x} y={y}
              width={barW} height={barH}
              rx={1.5}
              fill={color}
              opacity={isLast ? 0.9 : 0.35 + v * 0.3}
              className="transition-all duration-500"
            />
          );
        })}
      </svg>
    );
  }

  // line sparkline con área rellena
  const step = W / (norm.length - 1);
  const points = norm.map((v, i) => ({
    x: i * step,
    y: PAD + (1 - v) * (H - PAD * 2),
  }));
  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');
  const areaPoints = [
    `0,${H}`,
    ...points.map(p => `${p.x},${p.y}`),
    `${W},${H}`,
  ].join(' ');
  const lastPt = points[points.length - 1];

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#','')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Área bajo la curva */}
      <polygon points={areaPoints} fill={`url(#grad-${color.replace('#','')})`} />
      {/* Línea */}
      <polyline
        points={polylinePoints}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-all duration-500"
      />
      {/* Punto final (valor más reciente) */}
      <circle cx={lastPt.x} cy={lastPt.y} r={3} fill={color} />
      <circle cx={lastPt.x} cy={lastPt.y} r={6} fill={color} opacity={0.2} className="animate-pulse" />
    </svg>
  );
}

// ─── Card individual ──────────────────────────────────────────────────────────

interface CardData {
  label: string;
  value: string;
  delta: { pct: number; isUp: boolean };
  sparkValues: number[];
  sparkColor: string;
  sparkType: 'line' | 'bar';
  icon: string; // SVG path string
  accentColor: string;
}

function StatCard({ data }: { data: CardData }) {
  const { label, value, delta, sparkValues, sparkColor, sparkType, icon, accentColor } = data;
  const deltaText = delta.pct === 0
    ? '— sin cambio'
    : `${delta.isUp ? '↑' : '↓'} ${delta.pct.toFixed(1)}% vs ayer`;

  return (
    <div className="glass-card p-5 group transition-all duration-300 hover:border-white/20 select-none">
      {/* Cabecera: icono + label */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white/80 group-hover:bg-white/10 transition-colors" style={{ color: accentColor }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {label === 'Total vistas' && (
              <>
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4l3 3"/>
              </>
            )}
            {label === 'Likes totales' && <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>}
            {label === 'Comentarios' && <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.8A8.38 8.38 0 0 1 2 11.5a8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>}
            {label === 'Engagement' && <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>}
          </svg>
        </div>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
          {label}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <div className="text-3xl font-black text-white tracking-tighter" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {value}
        </div>

        <div className={`text-[10px] font-bold mb-4 ${
          delta.pct === 0 ? 'text-slate-500' : delta.isUp ? 'text-emerald-400' : 'text-rose-400'
        }`}>
          {deltaText}
        </div>
      </div>

      {/* Sparkline */}
      <div className="mt-auto pt-2">
        <Sparkline values={sparkValues} color={sparkColor} type={sparkType} />
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function StatCards({ videos, days = 10 }: StatCardsProps) {
  const WINDOW = Math.min(days, 14); // máximo 14 días en el sparkline

  const cards: CardData[] = useMemo(() => {
    // Arrays de valores por día para cada métrica
    const viewsByDay    = buildDailyValues(videos, WINDOW, v => v.views);
    const likesByDay    = buildDailyValues(videos, WINDOW, v => v.engagement?.likes || 0);
    const commentsByDay = buildDailyValues(videos, WINDOW, v => v.engagement?.comments || 0);

    // Totales globales
    const totalViews    = videos.reduce((a, v) => a + (v.views || 0), 0);
    const totalLikes    = videos.reduce((a, v) => a + (v.engagement?.likes || 0), 0);
    const totalComments = videos.reduce((a, v) => a + (v.engagement?.comments || 0), 0);
    const engRate       = totalViews > 0
      ? ((totalLikes + totalComments) / totalViews) * 100
      : 0;

    // Engagement por día (para sparkline): (likes+comments)/views ese día
    const engByDay = viewsByDay.map((views, i) => {
      const interactions = (likesByDay[i] || 0) + (commentsByDay[i] || 0);
      return views > 0 ? (interactions / views) * 100 : 0;
    });

    return [
      {
        label: 'Total vistas',
        value: formatBig(totalViews),
        delta: calcDelta(viewsByDay),
        sparkValues: viewsByDay,
        sparkColor: '#3b82f6',
        sparkType: 'line',
        icon: '', // Handled inside StatCard
        accentColor: '#3b82f6',
      },
      {
        label: 'Likes totales',
        value: formatBig(totalLikes),
        delta: calcDelta(likesByDay),
        sparkValues: likesByDay,
        sparkColor: '#ec4899',
        sparkType: 'line',
        icon: '',
        accentColor: '#ec4899',
      },
      {
        label: 'Comentarios',
        value: formatBig(totalComments),
        delta: calcDelta(commentsByDay),
        sparkValues: commentsByDay,
        sparkColor: '#10b981',
        sparkType: 'bar',
        icon: '',
        accentColor: '#10b981',
      },
      {
        label: 'Engagement',
        value: `${engRate.toFixed(1)}%`,
        delta: calcDelta(engByDay),
        sparkValues: engByDay,
        sparkColor: '#f59e0b',
        sparkType: 'line',
        icon: '',
        accentColor: '#f59e0b',
      },
    ];
  }, [videos, WINDOW]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map(card => (
        <StatCard key={card.label} data={card} />
      ))}
    </div>
  );
}
