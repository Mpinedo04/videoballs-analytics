'use client';

import { useState, useEffect } from 'react';
import VideoCanvas from '@/components/VideoCanvas';
import PlatformSummaryBalls from '@/components/PlatformSummaryBalls';
import AIOraculo from '@/components/AIOraculo';
import { TrendingUp, RefreshCcw, Filter, Eye, Heart, MessageCircle, Trophy, Zap, BarChart3, Sparkles } from 'lucide-react';

interface Video {
  id: string;
  title: string;
  views: number;
  platform: 'youtube' | 'tiktok' | 'instagram';
  thumbnail_url: string;
  video_url: string;
  published_at: string;
  group_id: string | null;
  engagement: { likes?: number; comments?: number };
}

const START_DATE = new Date('2026-03-08T00:00:00Z');

function getDaysSinceStart() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(START_DATE.getFullYear(), START_DATE.getMonth(), START_DATE.getDate());
  const diffTime = Math.abs(today.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

function AnimatedCounter({ value, duration = 1500 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let start = 0;
    const end = value;
    if (end === 0) { setCount(0); return; }
    
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    
    return () => clearInterval(timer);
  }, [value, duration]);
  
  return <>{count.toLocaleString()}</>;
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

export default function Home() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(getDaysSinceStart());
  const [sizeMode, setSizeMode] = useState<'log' | 'linear'>('log');
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (triggerRefresh = false) => {
    try {
      if (triggerRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      if (triggerRefresh) {
        await fetch('/api/refresh', { method: 'POST' });
      }
      const res = await fetch(`/api/videos?days=${days}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setVideos(data);
      } else {
        setError(data.error || 'Unexpected data format');
        setVideos([]);
      }
    } catch (err) {
      setError('Failed to connect to API');
      setVideos([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [days]);

  // ── Stats Calculations ──
  const safeVideos = Array.isArray(videos) ? videos : [];
  
  const platformTotals = {
    youtube: safeVideos.filter(v => v.platform === 'youtube').reduce((acc, v) => acc + (v.views || 0), 0),
    instagram: safeVideos.filter(v => v.platform === 'instagram').reduce((acc, v) => acc + (v.views || 0), 0),
    tiktok: safeVideos.filter(v => v.platform === 'tiktok').reduce((acc, v) => acc + (v.views || 0), 0),
  };

  const topPlatformEntry = Object.entries(platformTotals).sort((a, b) => b[1] - a[1])[0];
  const topPlatformName = topPlatformEntry[0] === 'youtube' ? 'YouTube' : topPlatformEntry[0] === 'instagram' ? 'Instagram' : 'TikTok';

  const totalViews = safeVideos.reduce((acc, v) => acc + (v.views || 0), 0);
  const totalLikes = safeVideos.reduce((acc, v) => acc + (v.engagement?.likes || 0), 0);
  const totalComments = safeVideos.reduce((acc, v) => acc + (v.engagement?.comments || 0), 0);
  const engagementRate = totalViews > 0 ? ((totalLikes + totalComments) / totalViews * 100) : 0;

  const top3Videos = [...safeVideos].sort((a, b) => b.views - a.views).slice(0, 3);
  const avgViews = safeVideos.length > 0 ? Math.round(totalViews / safeVideos.length) : 0;

  return (
    <>
      {/* Animated Background */}
      <div className="animated-bg" />
      <div className="grid-overlay" />

      <main className="relative z-10 min-h-screen text-slate-100 p-4 md:p-6 lg:p-8 font-sans selection:bg-blue-500/30">
        <div className="max-w-[1600px] mx-auto">
          
          {/* ═══ TOP HEADER ═══ */}
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
                <p className="text-[10px] text-slate-500 font-medium tracking-[0.3em] uppercase -mt-0.5">Proyecto Raúl y Miguel</p>
              </div>
            </div>
            
            <div className="hidden md:flex items-center gap-3">
              <a 
                href="https://www.tiktok.com/v2/auth/authorize/?client_key=sbaw8oawxu1kbnrnel&scope=user.info.basic,user.info.profile,user.info.stats,video.list&response_type=code&redirect_uri=https%3A%2F%2Fvideoballs-analytics-raul-miguel-2.vercel.app%2Fapi%2Fauth%2Fcallback%2Ftiktok&state=vballs"
                className="group flex items-center gap-2 px-4 py-1.5 bg-[#fe2c55]/10 hover:bg-[#fe2c55]/20 border border-[#fe2c55]/20 rounded-full transition-all duration-300"
              >
                <div className="w-2 h-2 rounded-full bg-[#fe2c55] animate-pulse" />
                <span className="text-[10px] font-bold tracking-widest uppercase text-[#fe2c55]">
                  Connect TikTok
                </span>
              </a>
              <div className="floating-badge px-4 py-1.5 bg-gradient-to-r from-violet-500/10 to-pink-500/10 border border-violet-500/20 rounded-full">
                <span className="text-[10px] font-bold tracking-widest uppercase bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
                  {safeVideos.length} Videos Tracked
                </span>
              </div>
              <div className="px-4 py-1.5 bg-slate-900/50 border border-white/5 rounded-full">
                <span className="text-[10px] font-bold tracking-widest uppercase text-slate-500">
                  Day {getDaysSinceStart()} of Project
                </span>
              </div>
            </div>
          </header>

          {/* ═══ MAIN GRID ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* ── Sidebar ── */}
            <aside className="lg:col-span-3 space-y-5">

              {/* Global Stats Card */}
              <div className="glass-card p-6">
                <h2 className="text-[10px] font-bold text-slate-400 mb-5 flex items-center gap-2 uppercase tracking-[0.2em]">
                  <TrendingUp size={12} /> Global Analytics
                </h2>
                
                <div className="space-y-5">
                  {/* Total Views - Hero Stat */}
                  <div>
                    <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider font-medium">Total Views</p>
                    <p className="text-4xl font-black tracking-tighter stat-number">
                      <AnimatedCounter value={totalViews} />
                    </p>
                  </div>

                  {/* Mini Stats Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-white/[0.02] rounded-xl text-center">
                      <Eye size={14} className="mx-auto mb-1 text-blue-400" />
                      <p className="text-sm font-bold">{avgViews.toLocaleString()}</p>
                      <p className="text-[8px] text-slate-500 uppercase tracking-wider">Avg</p>
                    </div>
                    <div className="p-3 bg-white/[0.02] rounded-xl text-center">
                      <Heart size={14} className="mx-auto mb-1 text-pink-400" />
                      <p className="text-sm font-bold">{totalLikes.toLocaleString()}</p>
                      <p className="text-[8px] text-slate-500 uppercase tracking-wider">Likes</p>
                    </div>
                    <div className="p-3 bg-white/[0.02] rounded-xl text-center">
                      <MessageCircle size={14} className="mx-auto mb-1 text-cyan-400" />
                      <p className="text-sm font-bold">{totalComments.toLocaleString()}</p>
                      <p className="text-[8px] text-slate-500 uppercase tracking-wider">Cmts</p>
                    </div>
                  </div>

                  {/* Engagement Rate */}
                  <div className="pt-4 border-t border-white/5">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium flex items-center gap-1.5">
                        <Zap size={10} className="text-yellow-400" /> Engagement Rate
                      </p>
                      <p className="text-sm font-bold stat-number-accent">{engagementRate.toFixed(2)}%</p>
                    </div>
                    <div className="engagement-bar">
                      <div 
                        className="engagement-bar-fill" 
                        style={{ 
                          width: `${Math.min(engagementRate * 10, 100)}%`,
                          background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)'
                        }} 
                      />
                    </div>
                  </div>

                  {/* Top Platform */}
                  <div className="pt-4 border-t border-white/5">
                    <p className="text-[10px] text-slate-500 mb-1.5 uppercase tracking-wider font-medium">Top Platform</p>
                    <p className="text-lg font-bold stat-number-accent">{topPlatformName}</p>
                  </div>
                </div>
              </div>

              {/* Top 3 Leaderboard */}
              <div className="glass-card p-6">
                <h2 className="text-[10px] font-bold text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-[0.2em]">
                  <Trophy size={12} className="text-yellow-400" /> Top 3 Videos
                </h2>
                <div className="space-y-2">
                  {top3Videos.map((video, i) => (
                    <a 
                      key={video.id} 
                      href={video.video_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="leaderboard-row flex items-center gap-3 p-2.5 rounded-xl cursor-pointer"
                    >
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0 ${
                        i === 0 ? 'rank-badge-1' : i === 1 ? 'rank-badge-2' : 'rank-badge-3'
                      }`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium line-clamp-1 text-slate-300">{video.title}</p>
                        <p className="text-[10px] text-slate-500">{getPlatformEmoji(video.platform)} {video.views.toLocaleString()} views</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              {/* Time Range */}
              <div className="glass-card p-5">
                <h2 className="text-[10px] font-bold text-slate-400 mb-3 flex items-center gap-2 uppercase tracking-[0.2em]">
                  <Filter size={12} /> Time Range
                </h2>
                <select 
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500/50 transition-all cursor-pointer"
                >
                  <option value={getDaysSinceStart()}>Desde el Inicio (8 Marzo)</option>
                  <option value={7}>Últimos 7 días</option>
                  <option value={30}>Últimos 30 días</option>
                </select>
              </div>

              {/* Refresh Button */}
              <button 
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className="btn-glow w-full py-3.5 bg-gradient-to-r from-blue-600/20 to-violet-600/20 hover:from-blue-600/30 hover:to-violet-600/30 border border-blue-500/20 rounded-2xl flex items-center justify-center gap-2 transition-all font-semibold text-sm disabled:opacity-50"
              >
                <RefreshCcw size={15} className={refreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
                {refreshing ? 'Syncing APIs...' : 'Refresh Data'}
              </button>

              {/* Mode Toggle */}
              <div className="p-1.5 bg-slate-950/60 rounded-2xl border border-white/5 flex gap-1">
                <button 
                  onClick={() => setSizeMode('log')}
                  className={`mode-pill flex-1 py-2.5 text-[10px] uppercase font-bold tracking-widest rounded-xl transition-all ${sizeMode === 'log' ? 'mode-pill-active text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  ⚖️ Balanced
                </button>
                <button 
                  onClick={() => setSizeMode('linear')}
                  className={`mode-pill flex-1 py-2.5 text-[10px] uppercase font-bold tracking-widest rounded-xl transition-all ${sizeMode === 'linear' ? 'mode-pill-active text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  💥 Impact
                </button>
              </div>
            </aside>

            {/* ── Main Content ── */}
            <section className="lg:col-span-7">
              <div className="mb-5 flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    <Sparkles size={20} className="text-violet-400" />
                    Channel Performance
                  </h2>
                  <p className="text-slate-500 text-xs mt-1">Visualizing cross-platform engagement and reach</p>
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
                      <p className="text-sm font-medium">Calculating physics...</p>
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
                      <h2 className="text-xl font-bold">Data Fetch Error</h2>
                      <p className="text-sm text-red-300/60 max-w-md">{error}</p>
                      <button 
                        onClick={() => fetchData()}
                        className="mt-4 px-6 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl text-sm transition-all"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                ) : (
                  <VideoCanvas videos={videos} days={days} sizeMode={sizeMode} />
                )}
              </div>
            </section>

            {/* ── Right Panel ── */}
            <aside className="lg:col-span-2">
              <div className="sticky top-8 space-y-5">
                <PlatformSummaryBalls videos={videos} sizeMode={sizeMode} />
                
                {/* Platform Breakdown Bars */}
                <div className="glass-card p-5">
                  <h3 className="text-[10px] font-bold text-slate-400 mb-4 uppercase tracking-[0.2em] flex items-center gap-1.5">
                    <BarChart3 size={10} /> Platform Breakdown
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
                {/* AI Insights Card (Oculto de momento) */}
                {/* <AIOraculo /> */}
              </div>
            </aside>
          </div>


        </div>
      </main>
    </>
  );
}
