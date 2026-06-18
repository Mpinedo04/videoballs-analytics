'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import {
  BarChart3,
  Clock,
  ExternalLink,
  Gauge,
  Hash,
  Heart,
  MessageCircle,
  Play,
  Share2,
  Sparkles,
  Trophy,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
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

const PLATFORM_LABELS = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  tiktok: 'TikTok',
};

function buildDiagnosis(delta: number | null, engagementRate: number, related: Video[], video: Video) {
  const isGroupLeader = related.length > 1 && related[0]?.id === video.id;

  if (delta === null) {
    return 'Aun falta historico reciente para leer tendencia. Usalo como punto base para la siguiente sincronizacion.';
  }

  if (delta > 0 && engagementRate >= 2.5 && isGroupLeader) {
    return 'Contenido fuerte: esta creciendo, retiene interaccion y lidera su grupo. Buen candidato para repetir formato.';
  }

  if (delta > 0 && engagementRate >= 2.5) {
    return 'Tiene traccion real. Revisa gancho, titulo y hashtags porque puede escalar si se redistribuye bien.';
  }

  if (delta > 0) {
    return 'Sigue ganando visitas, pero la interaccion va por debajo del empuje. Conviene probar mejor CTA o copy.';
  }

  if (engagementRate >= 2.5) {
    return 'Interesa a quien lo ve, pero necesita mas distribucion. Puede funcionar como referencia para clips nuevos.';
  }

  return 'Bajo empuje actual. Compara duracion, gancho inicial y plataforma antes de repetir este formato.';
}

function formatDuration(seconds?: number) {
  if (!seconds) return 'n/d';
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

export default function VideoDetailDrawer({ video, videos, prevSnapshot, onClose }: VideoDetailDrawerProps) {
  const related = video?.group_id
    ? videos.filter(item => item.group_id === video.group_id).sort((a, b) => b.views - a.views)
    : [];

  const platformVideos = video
    ? videos.filter(item => item.platform === video.platform).sort((a, b) => b.views - a.views)
    : [];

  const previousViews = video ? prevSnapshot[video.id] : undefined;
  const delta = video && previousViews !== undefined ? video.views - previousViews : null;
  const deltaPct = video && previousViews ? ((video.views - previousViews) / previousViews) * 100 : null;
  const likes = video?.engagement?.likes || 0;
  const comments = video?.engagement?.comments || 0;
  const shares = video?.engagement?.shares || 0;
  const interactions = likes + comments + shares;
  const engagementRateNumber = video?.views ? (interactions / video.views) * 100 : 0;
  const engagementRate = engagementRateNumber.toFixed(2);
  const platformRank = video ? platformVideos.findIndex(item => item.id === video.id) + 1 : 0;
  const maxRelatedViews = Math.max(...related.map(item => item.views), 1);
  const groupLeader = related[0];
  const groupStatus = !video?.group_id
    ? 'Pieza unica'
    : groupLeader?.id === video.id
      ? 'Lider del grupo'
      : `${PLATFORM_LABELS[groupLeader?.platform || video.platform]} lidera`;
  const momentum = delta === null ? 'Sin snapshot' : delta > 0 ? 'Acelerando' : delta < 0 ? 'Frenando' : 'Plano';
  const diagnosis = video ? buildDiagnosis(delta, engagementRateNumber, related, video) : '';

  return (
    <AnimatePresence>
      {video && (
        <>
          <motion.button
            aria-label="Cerrar detalle"
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm"
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
            transition={{ type: 'spring', damping: 28, stiffness: 230 }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: PLATFORM_COLORS[video.platform] }}>
                  {PLATFORM_LABELS[video.platform]}
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/5 to-transparent" />
                <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                  <Badge icon={<Trophy size={12} />} label={platformRank ? `#${platformRank} plataforma` : 'Sin ranking'} />
                  <Badge icon={<Gauge size={12} />} label={momentum} />
                </div>
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
                <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] font-bold text-slate-400">
                  <MiniFact icon={<Clock size={12} />} label={new Date(video.published_at).toLocaleDateString('es-ES')} />
                  <MiniFact icon={<Play size={12} />} label={formatDuration(video.duration)} />
                  <MiniFact icon={<Hash size={12} />} label={groupStatus} />
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Metric label="Vistas" value={video.views.toLocaleString()} icon={<Play size={14} />} />
              <Metric label="ER" value={`${engagementRate}%`} icon={<Zap size={14} />} />
              <Metric label="Likes" value={likes.toLocaleString()} icon={<Heart size={14} />} />
              <Metric label="Comentarios" value={comments.toLocaleString()} icon={<MessageCircle size={14} />} />
              <Metric label="Shares" value={shares.toLocaleString()} icon={<Share2 size={14} />} />
              <Metric label="Interacciones" value={interactions.toLocaleString()} icon={<BarChart3 size={14} />} />
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                <TrendingUp size={14} /> Velocidad
              </div>
              {delta === null ? (
                <p className="mt-3 text-sm text-slate-500">Sin snapshot previo suficiente.</p>
              ) : (
                <p className={`mt-3 text-2xl font-black ${delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {delta >= 0 ? '+' : ''}{delta.toLocaleString()}
                  <span className="ml-2 text-sm text-slate-500">vistas ({deltaPct?.toFixed(1)}%)</span>
                </p>
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-violet-400/20 bg-violet-500/[0.06] p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-violet-200">
                <Sparkles size={14} /> Lectura rapida
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">{diagnosis}</p>
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
                  Mismo contenido
                </h3>
                <div className="space-y-2">
                  {related.map(item => {
                    const pct = (item.views / maxRelatedViews) * 100;
                    const isCurrent = item.id === video.id;

                    return (
                      <a
                        key={item.id}
                        href={item.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`block rounded-xl border p-3 transition-all ${isCurrent ? 'border-white/20 bg-white/[0.08]' : 'border-white/5 bg-slate-900/80 hover:border-white/15'}`}
                      >
                        <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                          <span className="font-black uppercase" style={{ color: PLATFORM_COLORS[item.platform] }}>{PLATFORM_LABELS[item.platform]}</span>
                          <span className="font-bold text-slate-300">{item.views.toLocaleString()} vistas</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: PLATFORM_COLORS[item.platform] }} />
                        </div>
                        {isCurrent && <p className="mt-2 text-[9px] font-black uppercase tracking-widest text-slate-500">Seleccionado</p>}
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

function Badge({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-slate-100 backdrop-blur">
      {icon}
      {label}
    </span>
  );
}

function MiniFact({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 rounded-xl border border-white/5 bg-white/[0.03] px-2 py-1.5">
      <span className="shrink-0 text-slate-500">{icon}</span>
      <span className="truncate">{label}</span>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-2 flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-lg font-black text-white">{value}</p>
    </div>
  );
}
