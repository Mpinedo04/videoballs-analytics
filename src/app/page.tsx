'use client';

// v0.1.2 - Force Redeploy

import { useCallback, useState, useEffect, useRef } from 'react';
import VideoCanvas from '@/components/VideoCanvas';
import PlatformSummaryBalls from '@/components/PlatformSummaryBalls';
import AIOraculo from '@/components/AIOraculo';
import VideoFinder from '@/components/VideoFinder';
import StatCards from '@/components/StatCards';
import { lastNDays, toDateKey } from '@/components/StatCards';
import StatChartModal from '@/components/StatChartModal';
import ActivityHeatmap from '@/components/ActivityHeatmap';
import ContentDNA from '@/components/ContentDNA';
import PerformanceRadar from '@/components/PerformanceRadar';
import VideoDetailDrawer from '@/components/VideoDetailDrawer';
import { RefreshCcw, Filter, Eye, Zap, BarChart3, Sparkles, Youtube, Instagram, Music, Sun, Moon } from 'lucide-react';
import ParticleBackground from '@/components/ParticleBackground';
import { adminHeaders, clearStoredAdminSecret, getStoredAdminSecret, requestAdminSecret } from '@/lib/clientAdminSecret';
import type { StoredVideo as Video } from '@/lib/videoTypes';
import '@/styles/SearchHighlight.css';

const START_DATE = new Date('2026-03-08T00:00:00Z');

function getDaysSinceStart() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(START_DATE.getFullYear(), START_DATE.getMonth(), START_DATE.getDate());
  const diffTime = Math.abs(today.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}


function getPlatformLabel(platform: string) {
  if (platform === 'youtube') return 'YouTube';
  if (platform === 'instagram') return 'Instagram';
  return 'TikTok';
}

export default function Home() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [days, setDays] = useState(getDaysSinceStart());
  const [sizeMode, setSizeMode] = useState<'log' | 'linear'>('log');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingFull, setRefreshingFull] = useState(false);
  const [highlightedGroupId, setHighlightedGroupId] = useState<string | null>(null);
  const [activeChartMetric, setActiveChartMetric] = useState<'views' | 'likes' | 'comments' | 'engagement' | null>(null);
  const [prevSnapshot, setPrevSnapshot] = useState<Record<string, number>>({});
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleVideoSelect = useCallback((video: Video) => {
    setSelectedVideo(video);
  }, []);

  const handleSearchSelect = (video: Pick<Video, 'id'>) => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);

    setHighlightedGroupId(null);
    window.requestAnimationFrame(() => {
      setHighlightedGroupId(video.id);
      highlightTimerRef.current = setTimeout(() => setHighlightedGroupId(null), 2600);
    });
  };

  const fetchSnapshots = async () => {
    try {
      const res = await fetch('/api/snapshots');
      const data = await res.json();
      if (data.snapshot) setPrevSnapshot(data.snapshot);
    } catch (e) {
      console.warn('Could not load snapshots:', e);
    }
  };

  const fetchData = async (triggerRefresh = false, fullSync = false) => {
    try {
      if (triggerRefresh) {
        if (fullSync) setRefreshingFull(true);
        else setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      if (triggerRefresh) {
        const secret = getStoredAdminSecret() || requestAdminSecret('Clave de administrador para sincronizar datos');
        if (!secret) {
          setError('Sincronizacion cancelada: falta clave de administrador.');
          return;
        }

        const refreshRes = await fetch(`/api/refresh${fullSync ? '?full=true' : ''}`, {
          method: 'POST',
          headers: adminHeaders(secret),
        });

        if (!refreshRes.ok) {
          const refreshData = await refreshRes.json().catch(() => ({}));
          if (refreshRes.status === 401) clearStoredAdminSecret();
          throw new Error(refreshData.error || 'No se pudo sincronizar datos');
        }
      }
      const res = await fetch(`/api/videos?days=${days}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setVideos(data);
      } else {
        setError(data.error || 'Unexpected data format');
        setVideos([]);
      }
      // Refresh snapshots after data load
      await fetchSnapshots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to API');
      setVideos([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setRefreshingFull(false);
    }
  };

  useEffect(() => {
    // Initialize theme from localStorage if available
    const savedTheme = localStorage.getItem('vb_theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
    fetchData();
  }, [days]);

  // Stats calculations
  const safeVideos = Array.isArray(videos) ? videos : [];
  
  const platformTotals = {
    youtube: safeVideos.filter(v => v.platform === 'youtube').reduce((acc, v) => acc + (v.views || 0), 0),
    instagram: safeVideos.filter(v => v.platform === 'instagram').reduce((acc, v) => acc + (v.views || 0), 0),
    tiktok: safeVideos.filter(v => v.platform === 'tiktok').reduce((acc, v) => acc + (v.views || 0), 0),
  };

  const topPlatformEntry = Object.entries(platformTotals).sort((a, b) => b[1] - a[1])[0];
  const topPlatformName = topPlatformEntry[0] === 'youtube' ? 'YouTube' : topPlatformEntry[0] === 'instagram' ? 'Instagram' : 'TikTok';

  const totalViews = safeVideos.reduce((acc, v) => acc + (v.views || 0), 0);
  const avgViews = safeVideos.length > 0 ? Math.round(totalViews / safeVideos.length) : 0;

  return (
    <>
      {/* Animated Background */}
      <div className="animated-bg" />
      <div className="grid-overlay" />
      <ParticleBackground isSyncing={refreshing || refreshingFull} />

      <main className="relative z-10 min-h-screen text-slate-100 p-4 md:p-6 lg:p-8 font-sans selection:bg-blue-500/30">
        <div className="max-w-[1600px] mx-auto">
          
          {/* TOP HEADER */}
          <header className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="logo-orb w-12 h-12 bg-gradient-to-br from-blue-500 via-violet-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                <BarChart3 size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  <span className="stat-number-accent">Video</span>
                  <span className="text-white">Balls</span>
                </h1>
                <p className="text-[10px] text-slate-500 font-medium tracking-[0.3em] uppercase -mt-0.5">Proyecto Raul y Miguel</p>
              </div>
            </div>

            {/* Middle: SEARCH BAR */}
            <div className="flex-1 max-w-2xl px-8 hidden sm:block">
              <VideoFinder 
                videos={safeVideos.filter(v => v.platform === 'youtube').map(v => ({
                  id: v.id,
                  platform_id: v.platform_id,
                  title: v.title,
                  platform: v.platform,
                  thumbnail_url: v.thumbnail_url,
                  published_at: v.published_at,
                  group_id: v.group_id || undefined,
                  hashtags: v.hashtags
                }))} 
                onSelect={handleSearchSelect}
              />
            </div>
            
            <div className="hidden md:flex items-center gap-3">
              {/* YouTube Link */}
              <a 
                href="https://www.youtube.com/@TecnologIA-2026" 
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 px-3 py-1.5 bg-red-600/10 hover:bg-red-600/20 border border-red-600/20 rounded-full transition-all duration-300"
                title="Perfil de YouTube"
              >
                <Youtube size={14} className="text-red-600" />
                <span className="text-[10px] font-bold tracking-widest uppercase text-red-600">
                  YouTube
                </span>
              </a>

              {/* TikTok Link */}
              <a 
                href="https://www.tiktok.com/@tecnologia_dyc" 
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 px-3 py-1.5 bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/20 rounded-full transition-all duration-300"
                title="Perfil de TikTok"
              >
                <Music size={14} className="text-cyan-400" />
                <span className="text-[10px] font-bold tracking-widest uppercase text-cyan-400">
                  TikTok
                </span>
              </a>

              {/* Instagram Link */}
              <a 
                href="https://www.instagram.com/tecnologia_dyc/" 
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 px-3 py-1.5 bg-pink-600/10 hover:bg-pink-600/20 border border-pink-600/20 rounded-full transition-all duration-300"
                title="Perfil de Instagram"
              >
                <Instagram size={14} className="text-pink-600" />
                <span className="text-[10px] font-bold tracking-widest uppercase text-pink-600">
                  Instagram
                </span>
              </a>
              
              <div className="px-4 py-1.5 bg-slate-900/50 border border-white/5 rounded-full">
                <span className="text-[10px] font-bold tracking-widest uppercase text-slate-500">
                  Day {getDaysSinceStart()}
                </span>
              </div>

              {/* Theme Toggle */}
              <button 
                onClick={() => {
                  const newTheme = theme === 'dark' ? 'light' : 'dark';
                  setTheme(newTheme);
                  document.documentElement.setAttribute('data-theme', newTheme);
                  localStorage.setItem('vb_theme', newTheme);
                }}
                className="w-8 h-8 rounded-full bg-slate-900/50 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-all theme-toggle-btn"
                title="Cambiar tema"
              >
                {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              </button>
            </div>
          </header>

          {/* MAIN GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Sidebar */}
            <aside className="lg:col-span-3 space-y-5">

              {/* Global Stats List (Simplified) */}
              <div className="glass-card p-6">
                <h2 className="text-[10px] font-bold text-slate-400 mb-5 flex items-center gap-2 uppercase tracking-[0.2em]">
                   Resumen del canal
                </h2>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-slate-500">Videos activos</span>
                    <span className="stat-number-accent font-black text-lg">{safeVideos.length}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-slate-500">Mejor plataforma</span>
                    <span className="text-white font-black">{topPlatformName}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-slate-500">Media views/video</span>
                    <span className="text-white font-black">{avgViews.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Rango temporal */}
              <div className="glass-card p-5">
                <h2 className="text-[10px] font-bold text-slate-400 mb-3 flex items-center gap-2 uppercase tracking-[0.2em]">
                  <Filter size={12} /> Rango temporal
                </h2>
                <select
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500/50 transition-all cursor-pointer"
                >
                  <option value={getDaysSinceStart()}>Desde el inicio (8 marzo)</option>
                  <option value={7}>Ultimos 7 dias</option>
                  <option value={30}>Ultimos 30 dias</option>
                </select>
              </div>

              {/* Refresh Buttons */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => fetchData(true, false)}
                  disabled={refreshing || refreshingFull}
                  className="btn-glow w-full py-3.5 bg-gradient-to-r from-blue-600/20 to-violet-600/20 hover:from-blue-600/30 hover:to-violet-600/30 border border-blue-500/20 rounded-2xl flex items-center justify-center gap-2 transition-all font-semibold text-sm disabled:opacity-50"
                  title="Sincroniza solo los videos recientes de manera rapida"
                >
                  <RefreshCcw size={15} className={refreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
                  {refreshing ? 'Sincronizando...' : 'Sincronizacion rapida'}
                </button>

                <button
                  onClick={() => fetchData(true, true)}
                  disabled={refreshing || refreshingFull}
                  className="w-full py-2.5 bg-slate-900/50 border border-white/5 hover:bg-slate-800 rounded-xl flex items-center justify-center gap-2 transition-all text-[11px] font-bold text-slate-400 hover:text-white uppercase tracking-wider disabled:opacity-50"
                  title="Barrido profundo paginando hasta 500 videos historicos"
                >
                  <RefreshCcw size={12} className={refreshingFull ? 'animate-spin' : ''} />
                  {refreshingFull ? 'Sincronizando historico...' : 'Sincronizacion historica'}
                </button>
              </div>

              {/* Mode Toggle */}
              <div className="p-1.5 bg-slate-950/60 rounded-2xl border border-white/5 flex gap-1">
                <button
                  onClick={() => setSizeMode('log')}
                  className={`mode-pill flex-1 py-2.5 text-[10px] uppercase font-bold tracking-widest rounded-xl transition-all ${sizeMode === 'log' ? 'mode-pill-active text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Balanced
                </button>
                <button
                  onClick={() => setSizeMode('linear')}
                  className={`mode-pill flex-1 py-2.5 text-[10px] uppercase font-bold tracking-widest rounded-xl transition-all ${sizeMode === 'linear' ? 'mode-pill-active text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Impact
                </button>
              </div>

              {/* Velocity Rings Legend */}
              <div className="glass-card p-5 mt-4 border-l-2 border-l-violet-500/50">
                <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2 mb-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse" />
                  Guia de anillos de velocidad
                </h3>

                <div className="space-y-4 text-[10px] leading-relaxed">
                  <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                    <p className="text-slate-300 font-bold mb-1.5 uppercase tracking-wider">Modos de visualizacion:</p>
                    <ul className="space-y-2 text-slate-400">
                      <li>- <span className="text-blue-400 font-bold">Balanced:</span> compara crecimiento relativo para detectar videos pequenos que despegan.</li>
                      <li>- <span className="text-violet-400 font-bold">Impact:</span> compara volumen absoluto para ver que video aporta mas visitas reales.</li>
                    </ul>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    <p className="text-slate-300 font-bold uppercase tracking-wider">Significado de colores:</p>

                    <div className="flex items-start gap-2.5">
                      <div className="w-3 h-3 rounded-full border-2 border-emerald-400 border-t-white/10 shadow-[0_0_8px_rgba(52,211,153,0.5)] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-emerald-400 font-extrabold uppercase mb-0.5">Verde (Viral/Top)</p>
                        <p className="text-slate-500">Crecimiento rapido o mayor volumen del dia.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-3 h-3 rounded-full border-2 border-amber-400 border-t-white/10 shadow-[0_0_8px_rgba(251,191,36,0.5)] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-amber-400 font-extrabold uppercase mb-0.5">Ambar (Activo)</p>
                        <p className="text-slate-500">Crecimiento constante pero moderado.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-3 h-3 rounded-full border-2 border-rose-500 border-t-white/10 shadow-[0_0_8px_rgba(244,63,94,0.5)] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-rose-500 font-extrabold uppercase mb-0.5">Rojo (Bajando)</p>
                        <p className="text-slate-500">Perdida de visitas o reajuste de plataforma poco comun.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-3 h-3 rounded-full border-2 border-slate-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-slate-500 font-extrabold uppercase mb-0.5">Gris (Estable)</p>
                        <p className="text-slate-600">Sin cambios significativos en las ultimas 24h.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-[9px] text-slate-600 mt-4 pt-3 border-t border-white/5 italic">
                  * Los datos se comparan contra el snapshot mas reciente.
                </p>
              </div>

              {/* AI Insights Card */}
              <AIOraculo />
            </aside>

            {/* Main Content */}
            <section className="lg:col-span-7">
              <div className="mb-8">
                <StatCards videos={safeVideos} days={days} onCardClick={(metric) => setActiveChartMetric(metric)} />
              </div>

              <div className="mb-5 flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    <Sparkles size={20} className="text-violet-400" />
                    Rendimiento del canal
                  </h2>
                  <p className="text-slate-500 text-xs mt-1">Visualizacion interactiva basada en fisicas</p>
                </div>
                <div className="hidden md:flex gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 py-2 bg-slate-900/40 rounded-full border border-white/5">
                  <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(255,0,0,0.5)]" /> Shorts</span>
                  <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(0,242,234,0.5)]" /> TikTok</span>
                  <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_6px_rgba(225,48,108,0.5)]" /> Reels</span>
                </div>
              </div>

              <div className="relative">
                {loading ? (
                  <div className="glass-card w-full h-[800px] flex items-center justify-center animate-pulse">
                    <div className="text-slate-500 flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center">
                        <RefreshCcw className="animate-spin text-violet-400" size={24} />
                      </div>
                      <p className="text-sm font-medium">Calculando fisicas...</p>
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                          <div key={i} className="w-2 h-2 rounded-full bg-violet-400/50 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : error ? (
                  <div className="glass-card w-full h-[800px] flex items-center justify-center border-red-500/20">
                    <div className="text-red-400 flex flex-col items-center gap-4 text-center p-8">
                      <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-2">
                        <Filter className="rotate-45" size={32} />
                      </div>
                      <h2 className="text-xl font-bold">Error al cargar datos</h2>
                      <p className="text-sm text-red-300/60 max-w-md">{error}</p>
                      <button 
                        onClick={() => fetchData()}
                        className="mt-4 px-6 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl text-sm transition-all"
                      >
                        Reintentar
                      </button>
                    </div>
                  </div>
                ) : (
                  <VideoCanvas 
                    videos={videos} 
                    days={days} 
                    sizeMode={sizeMode} 
                    highlightedGroupId={highlightedGroupId}
                    prevSnapshot={prevSnapshot}
                    onVideoSelect={handleVideoSelect}
                  />
                )}
              </div>
            </section>

            {/* Right Panel */}
            <aside className="lg:col-span-2">
              <div className="sticky top-8 space-y-5">
                <PlatformSummaryBalls 
                  videos={videos} 
                  sizeMode={sizeMode} 
                  highlightedGroupId={highlightedGroupId}
                />

                <PerformanceRadar
                  videos={safeVideos}
                  prevSnapshot={prevSnapshot}
                  onSelect={handleVideoSelect}
                />
                
                {/* Desglose por plataforma Bars */}
                <div className="glass-card p-5">
                  <h3 className="text-[10px] font-bold text-slate-400 mb-4 uppercase tracking-[0.2em] flex items-center gap-1.5">
                    <BarChart3 size={10} /> Desglose por plataforma
                  </h3>
                  {(['youtube', 'instagram', 'tiktok'] as const).map(platform => {
                    const views = platformTotals[platform];
                    const platformVideos = safeVideos.filter(v => v.platform === platform);
                    const avg = platformVideos.length > 0 ? Math.round(views / platformVideos.length) : 0;
                    const pct = totalViews > 0 ? (views / totalViews * 100) : 0;
                    
                    const pLikes = platformVideos.reduce((acc, v) => acc + (v.engagement?.likes || 0), 0);
                    const pComments = platformVideos.reduce((acc, v) => acc + (v.engagement?.comments || 0), 0);
                    const pEngagementRate = views > 0 ? ((pLikes + pComments) / views * 100) : 0;
                    
                    const colors = {
                      youtube: '#ff0000',
                      instagram: '#e1306c',
                      tiktok: '#00f2ea'
                    };
                    
                    return (
                      <div key={platform} className="mb-4 last:mb-0">
                        <div className="flex justify-between text-[10px] mb-1.5">
                          <span className="text-slate-400 font-medium">{getPlatformLabel(platform)}</span>
                          <span className="font-bold" style={{ color: colors[platform] }}>{pct.toFixed(1)}%</span>
                        </div>
                        
                        <div className="engagement-bar mb-2">
                          <div 
                            className="engagement-bar-fill" 
                            style={{ width: `${pct}%`, background: colors[platform] }} 
                          />
                        </div>
                        
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1">
                            <Eye size={8} className="text-slate-500" />
                            <span className="text-[9px] text-slate-500 uppercase font-bold tabular-nums">Avg: {avg.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Zap size={8} className="text-yellow-500" />
                            <span className="text-[9px] font-bold text-slate-300">ER: {pEngagementRate.toFixed(2)}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </aside>
          </div>

          {/* ANALYTICS SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <ActivityHeatmap videos={safeVideos} />
            <ContentDNA videos={safeVideos} />
          </div>


        </div>
      </main>

      {/* STAT CHART MODAL */}
      {activeChartMetric && (() => {
        const WINDOW = Math.min(days, 14);
        const dayKeys = lastNDays(WINDOW);
        
        const metricConfig: Record<string, { label: string; color: string; getValue: (v: Video) => number }> = {
          views: { label: 'Total Vistas', color: '#3b82f6', getValue: (v) => v.views || 0 },
          likes: { label: 'Likes Totales', color: '#ec4899', getValue: (v) => v.engagement?.likes || 0 },
          comments: { label: 'Comentarios', color: '#10b981', getValue: (v) => v.engagement?.comments || 0 },
          engagement: { label: 'Engagement', color: '#f59e0b', getValue: () => 0 },
        };

        const config = metricConfig[activeChartMetric];

        const dayData = dayKeys.map(dateKey => {
          const dayVideos = safeVideos.filter(v => toDateKey(v.published_at) === dateKey);
          const d = new Date(dateKey + 'T00:00:00');
          const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
          const dateLabel = `${months[d.getMonth()]} ${d.getDate()}`;

          let value: number;
          if (activeChartMetric === 'engagement') {
            const dayViews = dayVideos.reduce((a, v) => a + (v.views || 0), 0);
            const dayInteractions = dayVideos.reduce((a, v) => a + (v.engagement?.likes || 0) + (v.engagement?.comments || 0), 0);
            value = dayViews > 0 ? (dayInteractions / dayViews) * 100 : 0;
          } else {
            value = dayVideos.reduce((a, v) => a + config.getValue(v), 0);
          }

          return { date: dateKey, dateLabel, value, videos: dayVideos };
        });

        const totalViews = safeVideos.reduce((a, v) => a + (v.views || 0), 0);
        const totalLikes = safeVideos.reduce((a, v) => a + (v.engagement?.likes || 0), 0);
        const totalComments = safeVideos.reduce((a, v) => a + (v.engagement?.comments || 0), 0);
        const engRate = totalViews > 0 ? ((totalLikes + totalComments) / totalViews * 100).toFixed(1) + '%' : '0%';

        const totalValueMap: Record<string, string> = {
          views: totalViews >= 1000 ? (totalViews / 1000).toFixed(1) + 'K' : totalViews.toLocaleString(),
          likes: totalLikes >= 1000 ? (totalLikes / 1000).toFixed(1) + 'K' : totalLikes.toLocaleString(),
          comments: totalComments.toLocaleString(),
          engagement: engRate,
        };

        return (
          <StatChartModal
            metric={activeChartMetric}
            label={config.label}
            color={config.color}
            dayData={dayData}
            totalValue={totalValueMap[activeChartMetric]}
            onClose={() => setActiveChartMetric(null)}
          />
        );
      })()}

      <VideoDetailDrawer
        video={selectedVideo}
        videos={safeVideos}
        prevSnapshot={prevSnapshot}
        onClose={() => setSelectedVideo(null)}
      />
    </>
  );
}
