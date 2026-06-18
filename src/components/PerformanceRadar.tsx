'use client';

import { Activity, AlertTriangle, TrendingUp } from 'lucide-react';
import type { StoredVideo as Video } from '@/lib/videoTypes';

interface PerformanceRadarProps {
  videos: Video[];
  prevSnapshot: Record<string, number>;
  onSelect?: (video: Video) => void;
}

const COLORS = {
  youtube: '#ef4444',
  instagram: '#ec4899',
  tiktok: '#06b6d4',
};

export default function PerformanceRadar({ videos, prevSnapshot, onSelect }: PerformanceRadarProps) {
  const ranked = videos
    .map(video => {
      const previous = prevSnapshot[video.id];
      const delta = previous === undefined ? null : video.views - previous;
      const pct = previous && delta !== null ? (delta / previous) * 100 : null;
      return { video, previous, delta, pct };
    })
    .filter(item => item.delta !== null)
    .sort((a, b) => (b.delta || 0) - (a.delta || 0));

  const accelerating = ranked.filter(item => (item.delta || 0) > 0).slice(0, 4);
  const stalled = ranked.filter(item => (item.delta || 0) <= 0).slice(-3);

  return (
    <div className="glass-card p-5">
      <h3 className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
        <Activity size={12} /> Radar de rendimiento
      </h3>

      {ranked.length === 0 ? (
        <p className="text-[10px] text-slate-500">
          Aun no hay snapshot previo suficiente para calcular aceleracion.
        </p>
      ) : (
        <div className="space-y-4">
          <section>
            <div className="mb-2 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500">
              <TrendingUp size={10} /> Acelerando
            </div>
            <div className="space-y-2">
              {accelerating.map(item => (
                <RadarRow key={item.video.id} item={item} onSelect={onSelect} />
              ))}
            </div>
          </section>

          {stalled.length > 0 && (
            <section>
              <div className="mb-2 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500">
                <AlertTriangle size={10} /> Estancados
              </div>
              <div className="space-y-2">
                {stalled.map(item => (
                  <RadarRow key={item.video.id} item={item} onSelect={onSelect} muted />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function RadarRow({
  item,
  muted = false,
  onSelect,
}: {
  item: { video: Video; delta: number | null; pct: number | null };
  muted?: boolean;
  onSelect?: (video: Video) => void;
}) {
  const color = COLORS[item.video.platform];

  return (
    <button
      onClick={() => onSelect?.(item.video)}
      className="w-full rounded-xl border border-white/5 bg-white/[0.03] p-3 text-left transition hover:border-white/15 hover:bg-white/[0.06]"
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color }}>{item.video.platform}</span>
        <span className={`text-[10px] font-black ${muted ? 'text-slate-500' : 'text-emerald-400'}`}>
          {item.delta && item.delta > 0 ? '+' : ''}{item.delta?.toLocaleString()} views
        </span>
      </div>
      <p className="truncate text-[11px] font-semibold text-slate-300">{item.video.title}</p>
      <p className="mt-1 text-[9px] text-slate-600">
        {item.pct === null ? 'sin porcentaje' : `${item.pct.toFixed(1)}%`} desde el ultimo snapshot
      </p>
    </button>
  );
}
