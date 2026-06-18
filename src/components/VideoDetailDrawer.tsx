'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { ExternalLink, Heart, MessageCircle, Play, TrendingUp, X, Zap } from 'lucide-react';
import type { StoredVideo as Video } from '@/lib/videoTypes';

interface VideoDetailDrawerProps {
  video: Video | null;
  videos: Video[];
  prevSnapshot: Record<string, number>;
  onClose: () => void;
}

const PLATFORM_COLORS = {
  youtube: '#ef4444',
  instagram: '#ec4899',
  tiktok: '#06b6d4',
};

export default function VideoDetailDrawer({ video, videos, prevSnapshot, onClose }: VideoDetailDrawerProps) {
  const related = video?.group_id
    ? videos.filter(item => item.group_id === video.group_id).sort((a, b) => b.views - a.views)
    : [];

  const previousViews = video ? prevSnapshot[video.id] : undefined;
  const delta = video && previousViews !== undefined ? video.views - previousViews : null;
  const deltaPct = video && previousViews ? ((video.views - previousViews) / previousViews) * 100 : null;
  const interactions = video ? (video.engagement?.likes || 0) + (video.engagement?.comments || 0) : 0;
  const engagementRate = video?.views ? ((interactions / video.views) * 100).toFixed(2) : '0.00';

  return (
    <AnimatePresence>
      {video && (
        <>
          <motion.button
            aria-label="Cerrar detalle"
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.aside
            className="fixed right-0 top-0 z-50 h-screen w-full max-w-md overflow-y-auto border-l border-white/10 bg-slate-950/95 p-5 text-white shadow-2xl backdrop-blur-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: PLATFORM_COLORS[video.platform] }}>
                  {video.platform}
                </p>
                <h2 className="mt-1 text-xl font-black leading-tight">Detalle del video</h2>
              </div>
              <button onClick={onClose} className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
              <div className="relative aspect-video bg-slate-800">
                <img src={video.thumbnail_url} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <a
                  href={video.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-950 hover:bg-slate-200"
                >
                  Abrir <ExternalLink size={13} />
                </a>
              </div>

              <div className="p-4">
                <h3 className="text-base font-bold leading-snug">{video.title}</h3>
                <p className="mt-2 text-xs text-slate-500">
                  Publicado el {new Date(video.published_at).toLocaleString('es-ES')}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Metric label="Views" value={video.views.toLocaleString()} icon={<Play size={14} />} />
              <Metric label="Engagement" value={`${engagementRate}%`} icon={<Zap size={14} />} />
              <Metric label="Likes" value={(video.engagement?.likes || 0).toLocaleString()} icon={<Heart size={14} />} />
              <Metric label="Comentarios" value={(video.engagement?.comments || 0).toLocaleString()} icon={<MessageCircle size={14} />} />
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                <TrendingUp size={14} /> Velocidad
              </div>
              {delta === null ? (
                <p className="mt-3 text-sm text-slate-500">No hay snapshot previo suficiente para calcular crecimiento.</p>
              ) : (
                <p className={`mt-3 text-2xl font-black ${delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {delta >= 0 ? '+' : ''}{delta.toLocaleString()} views
                  <span className="ml-2 text-sm text-slate-500">({deltaPct?.toFixed(1)}%)</span>
                </p>
              )}
            </div>

            {video.hashtags?.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {video.hashtags.slice(0, 12).map(tag => (
                  <span key={tag} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-bold text-slate-300">
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}

            {related.length > 1 && (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <h3 className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Comparativa del mismo contenido
                </h3>
                <div className="space-y-2">
                  {related.map(item => {
                    const pct = video.views > 0 ? (item.views / Math.max(...related.map(r => r.views), 1)) * 100 : 0;
                    return (
                      <a
                        key={item.id}
                        href={item.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-xl border border-white/5 bg-slate-900/80 p-3 hover:border-white/15"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                          <span className="font-black uppercase" style={{ color: PLATFORM_COLORS[item.platform] }}>{item.platform}</span>
                          <span className="font-bold text-slate-300">{item.views.toLocaleString()} views</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: PLATFORM_COLORS[item.platform] }} />
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-2 flex items-center gap-2 text-slate-500">{icon}<span className="text-[10px] font-bold uppercase tracking-widest">{label}</span></div>
      <p className="text-lg font-black text-white">{value}</p>
    </div>
  );
}
