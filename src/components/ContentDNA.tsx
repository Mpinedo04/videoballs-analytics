'use client';

import { useMemo } from 'react';
import { Dna, Clock, Hash, Smartphone, Timer, TrendingUp, Crown } from 'lucide-react';

interface Video {
  id: string;
  title: string;
  views: number;
  platform: 'youtube' | 'tiktok' | 'instagram';
  published_at: string;
  duration?: number;
  hashtags?: string[];
  engagement: { likes?: number; comments?: number };
}

interface ContentDNAProps {
  videos: Video[];
}

function getPlatformEmoji(p: string) {
  if (p === 'youtube') return '🔴';
  if (p === 'tiktok') return '🎵';
  return '📸';
}

export default function ContentDNA({ videos }: ContentDNAProps) {
  const analysis = useMemo(() => {
    if (videos.length === 0) return null;

    // ─── Best Platform ───
    const platformStats: Record<string, { views: number; count: number; likes: number }> = {};
    videos.forEach(v => {
      if (!platformStats[v.platform]) platformStats[v.platform] = { views: 0, count: 0, likes: 0 };
      platformStats[v.platform].views += v.views || 0;
      platformStats[v.platform].count += 1;
      platformStats[v.platform].likes += v.engagement?.likes || 0;
    });
    
    const bestPlatform = Object.entries(platformStats)
      .map(([name, stats]) => ({ name, avgViews: Math.round(stats.views / stats.count), ...stats }))
      .sort((a, b) => b.avgViews - a.avgViews)[0];

    // ─── Best Posting Hour ───
    const hourStats: Record<number, { views: number; count: number }> = {};
    videos.forEach(v => {
      if (!v.published_at) return;
      const hour = new Date(v.published_at).getHours();
      if (!hourStats[hour]) hourStats[hour] = { views: 0, count: 0 };
      hourStats[hour].views += v.views || 0;
      hourStats[hour].count += 1;
    });
    
    const bestHour = Object.entries(hourStats)
      .map(([h, stats]) => ({ hour: parseInt(h), avgViews: Math.round(stats.views / stats.count), ...stats }))
      .sort((a, b) => b.avgViews - a.avgViews)[0];

    // ─── Best Day of Week ───
    const DOW_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dowStats: Record<number, { views: number; count: number }> = {};
    videos.forEach(v => {
      if (!v.published_at) return;
      const dow = new Date(v.published_at).getDay();
      if (!dowStats[dow]) dowStats[dow] = { views: 0, count: 0 };
      dowStats[dow].views += v.views || 0;
      dowStats[dow].count += 1;
    });
    
    const bestDow = Object.entries(dowStats)
      .map(([d, stats]) => ({ day: DOW_NAMES[parseInt(d)], avgViews: Math.round(stats.views / stats.count), ...stats }))
      .sort((a, b) => b.avgViews - a.avgViews)[0];

    // ─── Top Hashtags ───
    const hashtagViews: Record<string, { views: number; count: number }> = {};
    videos.forEach(v => {
      (v.hashtags || []).forEach(tag => {
        const t = tag.toLowerCase();
        if (!hashtagViews[t]) hashtagViews[t] = { views: 0, count: 0 };
        hashtagViews[t].views += v.views || 0;
        hashtagViews[t].count += 1;
      });
    });
    
    const topHashtags = Object.entries(hashtagViews)
      .map(([tag, stats]) => ({ tag, avgViews: Math.round(stats.views / stats.count), ...stats }))
      .filter(h => h.count >= 2) // Only tags used 2+ times
      .sort((a, b) => b.avgViews - a.avgViews)
      .slice(0, 5);

    // ─── Ideal Duration ───
    const durationBuckets: Record<string, { views: number; count: number; label: string }> = {
      short: { views: 0, count: 0, label: '<30s' },
      medium: { views: 0, count: 0, label: '30-60s' },
      long: { views: 0, count: 0, label: '>60s' },
    };
    videos.forEach(v => {
      if (!v.duration) return;
      const bucket = v.duration < 30 ? 'short' : v.duration <= 60 ? 'medium' : 'long';
      durationBuckets[bucket].views += v.views || 0;
      durationBuckets[bucket].count += 1;
    });
    
    const bestDuration = Object.entries(durationBuckets)
      .filter(([, stats]) => stats.count > 0)
      .map(([key, stats]) => ({ key, avgViews: Math.round(stats.views / stats.count), ...stats }))
      .sort((a, b) => b.avgViews - a.avgViews)[0];

    // ─── Best Video Ever ───
    const bestVideo = [...videos].sort((a, b) => b.views - a.views)[0];

    // ─── Engagement Rate by Platform ───
    const engagementByPlatform = Object.entries(platformStats).map(([name, stats]) => {
      const platformVids = videos.filter(v => v.platform === name);
      const totalLikes = platformVids.reduce((a, v) => a + (v.engagement?.likes || 0), 0);
      const totalComments = platformVids.reduce((a, v) => a + (v.engagement?.comments || 0), 0);
      const rate = stats.views > 0 ? ((totalLikes + totalComments) / stats.views * 100) : 0;
      return { name, rate: rate.toFixed(2), totalLikes, totalComments };
    }).sort((a, b) => parseFloat(b.rate) - parseFloat(a.rate));

    // ─── Hour Distribution (24h bar chart data) ───
    const hourDistribution = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      avgViews: hourStats[h] ? Math.round(hourStats[h].views / hourStats[h].count) : 0,
      count: hourStats[h]?.count || 0,
    }));

    return {
      bestPlatform,
      bestHour,
      bestDow,
      topHashtags,
      bestDuration,
      bestVideo,
      engagementByPlatform,
      hourDistribution,
      totalVideos: videos.length,
    };
  }, [videos]);

  if (!analysis) {
    return (
      <div className="glass-card p-5 text-center text-slate-500 text-[10px]">
        No hay datos suficientes para analizar ADN del contenido.
      </div>
    );
  }

  const maxHourViews = Math.max(...analysis.hourDistribution.map(h => h.avgViews), 1);

  return (
    <div className="glass-card p-5 overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[10px] font-bold text-violet-400 uppercase tracking-[0.2em] flex items-center gap-2">
          <Dna size={12} /> Content DNA
        </h3>
        <span className="text-[9px] text-slate-600 font-medium">
          Basado en {analysis.totalVideos} vídeos
        </span>
      </div>

      {/* DNA Strands — Key Insights Grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {/* Best Platform */}
        <div className="bg-slate-800/30 rounded-xl p-3 border border-white/5 hover:border-violet-500/20 transition-all">
          <div className="flex items-center gap-1.5 mb-1">
            <Smartphone size={10} className="text-violet-400" />
            <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Mejor Plataforma</span>
          </div>
          <p className="text-sm font-black text-white">
            {getPlatformEmoji(analysis.bestPlatform.name)} {analysis.bestPlatform.name.charAt(0).toUpperCase() + analysis.bestPlatform.name.slice(1)}
          </p>
          <p className="text-[9px] text-emerald-400 font-bold">{analysis.bestPlatform.avgViews.toLocaleString()} avg views</p>
        </div>

        {/* Best Hour */}
        <div className="bg-slate-800/30 rounded-xl p-3 border border-white/5 hover:border-violet-500/20 transition-all">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock size={10} className="text-violet-400" />
            <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Mejor Hora</span>
          </div>
          <p className="text-sm font-black text-white">
            🕐 {analysis.bestHour?.hour || 0}:00h
          </p>
          <p className="text-[9px] text-emerald-400 font-bold">{analysis.bestHour?.avgViews.toLocaleString() || 0} avg views</p>
        </div>

        {/* Best Day */}
        <div className="bg-slate-800/30 rounded-xl p-3 border border-white/5 hover:border-violet-500/20 transition-all">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={10} className="text-violet-400" />
            <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Mejor Día</span>
          </div>
          <p className="text-sm font-black text-white">
            📅 {analysis.bestDow?.day || 'N/A'}
          </p>
          <p className="text-[9px] text-emerald-400 font-bold">{analysis.bestDow?.avgViews.toLocaleString() || 0} avg views</p>
        </div>

        {/* Best Duration */}
        <div className="bg-slate-800/30 rounded-xl p-3 border border-white/5 hover:border-violet-500/20 transition-all">
          <div className="flex items-center gap-1.5 mb-1">
            <Timer size={10} className="text-violet-400" />
            <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Duración Ideal</span>
          </div>
          <p className="text-sm font-black text-white">
            ⏱️ {analysis.bestDuration?.label || 'N/A'}
          </p>
          <p className="text-[9px] text-emerald-400 font-bold">{analysis.bestDuration?.avgViews.toLocaleString() || 0} avg views</p>
        </div>
      </div>

      {/* Hour Distribution Bar Chart */}
      <div className="mb-4">
        <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Clock size={9} /> Rendimiento por Hora de Publicación
        </h4>
        <div className="flex items-end gap-px h-12">
          {analysis.hourDistribution.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm transition-all hover:brightness-150 cursor-default group relative"
              style={{
                height: `${Math.max(2, (h.avgViews / maxHourViews) * 100)}%`,
                background: h.count > 0 
                  ? h.hour === analysis.bestHour?.hour 
                    ? 'rgba(139, 92, 246, 0.8)' 
                    : 'rgba(139, 92, 246, 0.3)'
                  : 'rgba(255,255,255,0.03)',
              }}
              title={`${h.hour}:00 — ${h.count} vídeos, ${h.avgViews.toLocaleString()} avg views`}
            />
          ))}
        </div>
        <div className="flex justify-between text-[7px] text-slate-600 mt-1">
          <span>0h</span>
          <span>6h</span>
          <span>12h</span>
          <span>18h</span>
          <span>23h</span>
        </div>
      </div>

      {/* Top Hashtags */}
      <div className="mb-4">
        <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Hash size={9} /> Hashtags con Mejor Rendimiento
        </h4>
        {analysis.topHashtags.length === 0 ? (
          <p className="text-[9px] text-slate-600 italic">Necesitas usar el mismo hashtag en 2+ vídeos para ver patrones.</p>
        ) : (
          <div className="space-y-1.5">
            {analysis.topHashtags.map((h, i) => {
              const maxAvg = analysis.topHashtags[0].avgViews || 1;
              return (
                <div key={h.tag} className="flex items-center gap-2">
                  <span className="text-[10px] text-violet-300 font-bold w-20 truncate">#{h.tag}</span>
                  <div className="flex-1 h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(h.avgViews / maxAvg) * 100}%`,
                        background: i === 0 ? 'linear-gradient(90deg, #8b5cf6, #d946ef)' : 'rgba(139, 92, 246, 0.4)',
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono w-14 text-right">
                    {h.avgViews.toLocaleString()}
                  </span>
                  <span className="text-[8px] text-slate-600">({h.count}x)</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Engagement by Platform */}
      <div className="mb-4">
        <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <TrendingUp size={9} /> Engagement por Plataforma
        </h4>
        <div className="space-y-1.5">
          {analysis.engagementByPlatform.map(p => (
            <div key={p.name} className="flex items-center gap-2">
              <span className="text-[10px] font-bold w-16">
                {getPlatformEmoji(p.name)} {p.name.charAt(0).toUpperCase() + p.name.slice(1)}
              </span>
              <div className="flex-1 h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, parseFloat(p.rate) * 10)}%`,
                    background: p.name === 'youtube' ? '#ef4444' : p.name === 'tiktok' ? '#06b6d4' : '#ec4899',
                  }}
                />
              </div>
              <span className="text-[9px] text-emerald-400 font-bold w-10 text-right">{p.rate}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Crown: Best Video Ever */}
      {analysis.bestVideo && (
        <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 rounded-xl p-3 border border-amber-500/20">
          <div className="flex items-center gap-1.5 mb-1">
            <Crown size={10} className="text-amber-400" />
            <span className="text-[8px] text-amber-400 font-bold uppercase tracking-wider">Rey del Canal</span>
          </div>
          <p className="text-[10px] text-white font-bold truncate">{analysis.bestVideo.title?.slice(0, 60)}</p>
          <div className="flex gap-3 mt-1 text-[9px]">
            <span className="text-amber-300 font-bold">{analysis.bestVideo.views.toLocaleString()} views</span>
            <span className="text-slate-400">{getPlatformEmoji(analysis.bestVideo.platform)} {analysis.bestVideo.platform}</span>
          </div>
        </div>
      )}

      {/* Glow */}
      <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-violet-500/5 blur-[40px] rounded-full pointer-events-none" />
    </div>
  );
}
