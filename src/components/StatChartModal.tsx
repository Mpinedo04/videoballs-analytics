'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Video {
  id: string;
  title: string;
  views: number;
  platform: 'youtube' | 'tiktok' | 'instagram';
  thumbnail_url: string;
  video_url: string;
  published_at: string;
  engagement: { likes?: number; comments?: number };
}

interface DayData {
  date: string;       // 'YYYY-MM-DD'
  dateLabel: string;   // 'Mar 10'
  value: number;
  videos: Video[];     // videos published that day
}

interface StatChartModalProps {
  metric: 'views' | 'likes' | 'comments' | 'engagement';
  label: string;
  color: string;
  dayData: DayData[];
  totalValue: string;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBig(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toLocaleString();
}

function getPlatformEmoji(platform: string) {
  if (platform === 'youtube') return '🔴';
  if (platform === 'instagram') return '📸';
  return '🎵';
}

function getPlatformLabel(platform: string) {
  if (platform === 'youtube') return 'YouTube';
  if (platform === 'instagram') return 'Instagram';
  return 'TikTok';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StatChartModal({ metric, label, color, dayData, totalValue, onClose }: StatChartModalProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Chart dimensions
  const CHART_W = 900;
  const CHART_H = 300;
  const PAD_TOP = 30;
  const PAD_BOTTOM = 50;
  const PAD_LEFT = 60;
  const PAD_RIGHT = 20;
  const plotW = CHART_W - PAD_LEFT - PAD_RIGHT;
  const plotH = CHART_H - PAD_TOP - PAD_BOTTOM;

  const values = dayData.map(d => d.value);
  const maxVal = Math.max(...values, 1);

  // Y-axis ticks (5 levels)
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const val = (maxVal / 4) * i;
    const y = PAD_TOP + plotH - (val / maxVal) * plotH;
    return { val, y };
  });

  // Use bars for comments, line for everything else
  const useBarChart = metric === 'comments';

  // ─── Mouse tracking ───────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = CHART_W / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;
    
    if (mouseX < PAD_LEFT || mouseX > CHART_W - PAD_RIGHT) {
      setHoveredIndex(null);
      return;
    }
    
    const stepW = plotW / dayData.length;
    const idx = Math.floor((mouseX - PAD_LEFT) / stepW);
    setHoveredIndex(Math.min(idx, dayData.length - 1));
  }, [dayData.length, plotW]);

  const handleMouseLeave = () => setHoveredIndex(null);

  // ─── Render points/bars ─────────────────────────────────────────────────
  const stepW = plotW / dayData.length;

  const getX = (i: number) => PAD_LEFT + i * stepW + stepW / 2;
  const getY = (val: number) => PAD_TOP + plotH - (val / maxVal) * plotH;

  // Line path
  const linePath = values
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(v)}`)
    .join(' ');
  
  // Area path
  const areaPath = `M ${getX(0)} ${PAD_TOP + plotH} ` +
    values.map((v, i) => `L ${getX(i)} ${getY(v)}`).join(' ') +
    ` L ${getX(values.length - 1)} ${PAD_TOP + plotH} Z`;

  // Hovered day data
  const hoveredDay = hoveredIndex !== null ? dayData[hoveredIndex] : null;

  // Selected day for comments drill-down
  const selectedDay = selectedBarIndex !== null ? dayData[selectedBarIndex] : null;

  return (
    // Backdrop
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Blur overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal container */}
      <div 
        className="relative w-full max-w-[1000px] rounded-3xl border border-white/10 overflow-hidden"
        style={{ 
          background: 'rgba(15, 23, 42, 0.95)',
          animation: 'modalSlideIn 0.3s ease-out'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-2">
          <div className="flex items-center gap-4">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `${color}20` }}
            >
              <div className="w-3 h-3 rounded-full" style={{ background: color }} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {label}
              </h2>
              <p className="text-sm text-slate-400">
                Total: <span className="font-bold text-white">{totalValue}</span>
                <span className="mx-2 text-slate-600">•</span>
                Últimos {dayData.length} días
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            ✕
          </button>
        </div>

        {/* Chart area */}
        <div className="px-6 py-4">
          <div className="relative">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${CHART_W} ${CHART_H}`}
              className="w-full"
              style={{ height: 'auto', maxHeight: '350px' }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              {/* Grid lines */}
              {yTicks.map(({ val, y }, i) => (
                <g key={i}>
                  <line
                    x1={PAD_LEFT} y1={y}
                    x2={CHART_W - PAD_RIGHT} y2={y}
                    stroke="rgba(255,255,255,0.05)"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={PAD_LEFT - 10} y={y + 4}
                    textAnchor="end"
                    fill="rgba(255,255,255,0.3)"
                    fontSize="11"
                    fontFamily="'Space Grotesk', sans-serif"
                  >
                    {metric === 'engagement' ? `${val.toFixed(1)}%` : formatBig(val)}
                  </text>
                </g>
              ))}

              {/* X-axis labels */}
              {dayData.map((d, i) => {
                // Show every label, or every other if too many
                const showLabel = dayData.length <= 14 || i % 2 === 0;
                if (!showLabel) return null;
                return (
                  <text
                    key={i}
                    x={getX(i)}
                    y={CHART_H - 8}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.3)"
                    fontSize="10"
                    fontFamily="'Space Grotesk', sans-serif"
                  >
                    {d.dateLabel}
                  </text>
                );
              })}

              {useBarChart ? (
                /* ─── Bar Chart ─────────────────────────────────────── */
                <>
                  {values.map((v, i) => {
                    const barW = stepW * 0.6;
                    const barH = Math.max(2, (v / maxVal) * plotH);
                    const x = getX(i) - barW / 2;
                    const y = PAD_TOP + plotH - barH;
                    const isHovered = hoveredIndex === i;
                    const isSelected = selectedBarIndex === i;

                    return (
                      <rect
                        key={i}
                        x={x} y={y}
                        width={barW} height={barH}
                        rx={3}
                        fill={color}
                        opacity={isSelected ? 1 : isHovered ? 0.85 : 0.5}
                        stroke={isSelected ? 'white' : 'none'}
                        strokeWidth={isSelected ? 2 : 0}
                        className="transition-all duration-200 cursor-pointer"
                        onClick={() => setSelectedBarIndex(selectedBarIndex === i ? null : i)}
                      />
                    );
                  })}
                </>
              ) : (
                /* ─── Line Chart ────────────────────────────────────── */
                <>
                  {/* Area fill */}
                  <defs>
                    <linearGradient id="chartAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={color} stopOpacity="0.15" />
                      <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={areaPath} fill="url(#chartAreaGrad)" />
                  <path
                    d={linePath}
                    fill="none"
                    stroke={color}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Data dots */}
                  {values.map((v, i) => (
                    <circle
                      key={i}
                      cx={getX(i)}
                      cy={getY(v)}
                      r={hoveredIndex === i ? 5 : 3}
                      fill={hoveredIndex === i ? 'white' : color}
                      stroke={hoveredIndex === i ? color : 'none'}
                      strokeWidth={2}
                      className="transition-all duration-150"
                    />
                  ))}
                </>
              )}

              {/* Hover crosshair */}
              {hoveredIndex !== null && (
                <>
                  <line
                    x1={getX(hoveredIndex)} y1={PAD_TOP}
                    x2={getX(hoveredIndex)} y2={PAD_TOP + plotH}
                    stroke="rgba(255,255,255,0.2)"
                    strokeDasharray="3 3"
                  />
                  <line
                    x1={PAD_LEFT} y1={getY(values[hoveredIndex])}
                    x2={CHART_W - PAD_RIGHT} y2={getY(values[hoveredIndex])}
                    stroke="rgba(255,255,255,0.1)"
                    strokeDasharray="3 3"
                  />
                </>
              )}
            </svg>

            {/* Hover tooltip */}
            {hoveredDay && hoveredIndex !== null && (
              <div
                className="absolute pointer-events-none z-10 px-4 py-3 rounded-xl border border-white/10 shadow-2xl"
                style={{
                  background: 'rgba(15, 23, 42, 0.95)',
                  backdropFilter: 'blur(10px)',
                  left: `${(getX(hoveredIndex) / CHART_W) * 100}%`,
                  top: `${(getY(values[hoveredIndex]) / CHART_H) * 100 - 15}%`,
                  transform: hoveredIndex > dayData.length / 2 ? 'translate(-110%, -100%)' : 'translate(10%, -100%)',
                }}
              >
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  {hoveredDay.dateLabel}
                </div>
                <div className="text-lg font-black text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {metric === 'engagement'
                    ? `${hoveredDay.value.toFixed(2)}%`
                    : formatBig(hoveredDay.value)}
                </div>
                {/* Platform breakdown */}
                {hoveredDay.videos.length > 0 && metric !== 'engagement' && (
                  <div className="mt-2 pt-2 border-t border-white/5 space-y-0.5">
                    {['youtube', 'instagram', 'tiktok'].map(plat => {
                      const platVideos = hoveredDay.videos.filter(v => v.platform === plat);
                      if (platVideos.length === 0) return null;
                      const platVal = platVideos.reduce((acc, v) => {
                        if (metric === 'views') return acc + v.views;
                        if (metric === 'likes') return acc + (v.engagement?.likes || 0);
                        return acc + (v.engagement?.comments || 0);
                      }, 0);
                      return (
                        <div key={plat} className="flex items-center gap-2 text-[10px]">
                          <span>{getPlatformEmoji(plat)}</span>
                          <span className="text-slate-400">{getPlatformLabel(plat)}</span>
                          <span className="text-white font-bold ml-auto">{formatBig(platVal)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {hoveredDay.videos.length > 0 && (
                  <div className="text-[9px] text-slate-500 mt-1">
                    {hoveredDay.videos.length} vídeo{hoveredDay.videos.length !== 1 ? 's' : ''} publicado{hoveredDay.videos.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Comments drill-down panel */}
        {metric === 'comments' && (
          <div className="px-6 pb-6">
            {selectedDay ? (
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white">
                    📅 Vídeos del {selectedDay.dateLabel}
                  </h3>
                  <button
                    onClick={() => setSelectedBarIndex(null)}
                    className="text-[10px] text-slate-400 hover:text-white transition-colors"
                  >
                    Cerrar ✕
                  </button>
                </div>
                {selectedDay.videos.length === 0 ? (
                  <p className="text-xs text-slate-500">No se publicaron vídeos este día.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                    {selectedDay.videos.map(v => (
                      <a
                        key={v.id}
                        href={v.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors group"
                      >
                        <img
                          src={v.thumbnail_url}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white font-medium truncate group-hover:text-blue-400 transition-colors">
                            {v.title}
                          </p>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-0.5">
                            <span>{getPlatformEmoji(v.platform)} {getPlatformLabel(v.platform)}</span>
                            <span>💬 {v.engagement?.comments || 0}</span>
                            <span>👁️ {formatBig(v.views)}</span>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 text-center py-3">
                💡 Haz click en una barra del gráfico para ver los vídeos de ese día
              </p>
            )}
          </div>
        )}

        {/* Bottom hint */}
        {metric !== 'comments' && (
          <div className="px-6 pb-4">
            <p className="text-[10px] text-slate-500 text-center">
              Mueve el ratón sobre el gráfico para ver los datos de cada día
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
