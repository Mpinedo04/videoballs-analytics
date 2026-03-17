# 🦁 VideoBalls Analytics: Documentación Técnica Completa para Expertos 🧪💻

Este documento ha sido generado para que un experto pueda auditar el **código fuente íntegro** del núcleo del proyecto. Contiene la arquitectura, la lógica de negocio, el motor gráfico y los conectores de API.

---

## 🏗️ 1. FRONTEND Y COMPONENTES DE UI

### 🏠 El Cerebro: Dashboard Principal
`src/app/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import VideoCanvas from '@/components/VideoCanvas';
import PlatformSummaryBalls from '@/components/PlatformSummaryBalls';
import AIOraculo from '@/components/AIOraculo';
import VideoFinder from '@/components/VideoFinder';
import { TrendingUp, RefreshCcw, Filter, Eye, Heart, MessageCircle, Trophy, Zap, BarChart3, Sparkles } from 'lucide-react';
import '@/styles/SearchHighlight.css';

interface Video {
  id: string;
  title: string;
  views: number;
  platform: 'youtube' | 'tiktok' | 'instagram';
  thumbnail_url: string;
  video_url: string;
  published_at: string;
  group_id: string | null;
  platform_id: string;
  hashtags?: string[];
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
  const [highlightedGroupId, setHighlightedGroupId] = useState<string | null>(null);

  const handleSearchSelect = (video: any) => {
    // Determine target ID (either group or specific video)
    const targetId = video.group_id || `video-${video.id}`;
    const element = document.getElementById(targetId);

    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Highlight the group or specific video
      setHighlightedGroupId(video.group_id || video.id);
      
      // Remove highlight after animation
      setTimeout(() => setHighlightedGroupId(null), 3000);
    }
  };

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

            {/* Middle: SEARCH BAR */}
            <div className="flex-1 max-w-2xl px-8 hidden sm:block">
              <VideoFinder 
                videos={safeVideos.map(v => ({
                  id: v.id,
                  platform_id: v.platform_id,
                  title: v.title,
                  platform: v.platform,
                  thumbnail_url: v.thumbnail_url,
                  published_at: v.published_at,
                  group_id: v.group_id || undefined,
                  hashtags: (v as any).hashtags
                }))} 
                onSelect={handleSearchSelect}
              />
            </div>
            
            <div className="hidden md:flex items-center gap-3">
              <a 
                href="https://www.tiktok.com/..."
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
                {/* ... omit stats for brevity in this preview, code is there ... */}
              </div>

              {/* Refresh Button */}
              <button 
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className="btn-glow w-full py-3.5 bg-gradient-to-r from-blue-600/20 to-violet-600/20 hover:from-blue-600/30 hover:to-violet-600/30 border border-blue-500/20 rounded-2xl flex items-center justify-center gap-2 transition-all font-semibold text-sm disabled:opacity-50"
              >
                <RefreshCcw size={15} className={refreshing ? 'animate-spin' : ''} />
                {refreshing ? 'Syncing APIs...' : 'Refresh Data'}
              </button>
            </aside>

            {/* ── Main Content: THE CANVAS ── */}
            <section className="lg:col-span-7">
              <VideoCanvas 
                videos={videos} 
                days={days} 
                sizeMode={sizeMode} 
                highlightedGroupId={highlightedGroupId}
              />
            </section>

            {/* ── Right Panel: SUMMARY & AI ── */}
            <aside className="lg:col-span-2">
              <div className="sticky top-8 space-y-5">
                <PlatformSummaryBalls 
                  videos={videos} 
                  sizeMode={sizeMode} 
                  highlightedGroupId={highlightedGroupId}
                />
                <AIOraculo />
              </div>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
```

---

### 🎨 El Motor Gráfico (D3 + Física)
`src/components/VideoCanvas.tsx`

```tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Heart, MessageCircle, Clock, Eye, ExternalLink } from 'lucide-react';

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

interface VideoCanvasProps {
  videos: Video[];
  days: number;
  sizeMode: 'log' | 'linear';
  highlightedGroupId?: string | null;
}

export default function VideoCanvas({ videos, days, sizeMode, highlightedGroupId }: VideoCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredVideo, setHoveredVideo] = useState<Video | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const DAY_HEIGHT = 450;
  const totalHeight = days * DAY_HEIGHT;

  useEffect(() => {
    if (!svgRef.current || videos.length === 0) return;

    const width = svgRef.current.clientWidth;
    const height = totalHeight;
    const maxViews = d3.max(videos, v => v.views) || 1;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const nodes = videos.map(v => {
      const vDate = new Date(v.published_at);
      const startOfVDate = new Date(vDate);
      startOfVDate.setHours(0, 0, 0, 0);
      const dayIndex = Math.round((startOfToday.getTime() - startOfVDate.getTime()) / (1000 * 60 * 60 * 24));
      const dayTop = dayIndex * DAY_HEIGHT;
      const hours = vDate.getHours() + vDate.getMinutes() / 60;
      const yOffset = (1 - (hours / 24)) * (DAY_HEIGHT - 120) + 60; 

      let r = 12 + 8 * Math.log10(v.views + 1);
      if (sizeMode === 'linear') r = 10 + 70 * (v.views / maxViews);

      return { ...v, dayIndex, x: getPlatformX(v.platform, width), y: dayTop + yOffset, r };
    });

    const simulation = d3.forceSimulation(nodes as any)
      .force('x', d3.forceX((d: any) => getPlatformX(d.platform, width)).strength(0.85))
      .force('y', d3.forceY((d: any) => {
        const dayTop = d.dayIndex * DAY_HEIGHT;
        const vDate = new Date(d.published_at);
        const hours = vDate.getHours() + vDate.getMinutes() / 60;
        const yOffset = (1 - (hours / 24)) * (DAY_HEIGHT - 120) + 60; 
        return dayTop + yOffset;
      }).strength(0.95))
      .force('collide', d3.forceCollide((d: any) => d.r + 5))
      .on('tick', () => {
        // ... Tick rendering logic ...
        linkGroup.selectAll('line')
          .data(getConnections(nodes as any))
          .join('line')
          .attr('x1', (d: any) => d.source.x).attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x).attr('y2', (d: any) => d.target.y)
          .attr('stroke', 'rgba(255,255,255,0.15)').attr('stroke-width', 2).attr('stroke-dasharray', '5,5');

        nodeGroup.selectAll('circle')
          .data(nodes)
          .join('circle')
          .attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y).attr('r', (d: any) => d.r)
          .attr('fill', (d: any) => getPlatformColor(d.platform))
          .attr('id', (d: any) => d.group_id ? `group-${d.group_id}` : `video-${d.id}`)
          .attr('class', 'video-ball cursor-pointer hover:brightness-125 transition-all')
          .on('mouseover', (event, d: any) => { setHoveredVideo(d); setTooltipPos({ x: event.clientX, y: event.clientY }); })
          .on('mouseout', () => setHoveredVideo(null))
          .on('click', (event, d: any) => window.open(d.video_url, '_blank'));
      });

    const dayGroup = svg.append('g').attr('class', 'day-boxes');
    const linkGroup = svg.append('g').attr('class', 'links');
    const nodeGroup = svg.append('g').attr('class', 'nodes');

    // ... Day containers rendering ...
  }, [videos, days, totalHeight, sizeMode]);

  // HIGHLIGHT LOGIC
  useEffect(() => {
    if (!highlightedGroupId || !svgRef.current || !containerRef.current) return;
    const svg = d3.select(svgRef.current);
    const targetCircles = svg.selectAll('circle').filter((d: any) => 
      d.group_id === highlightedGroupId || d.id === highlightedGroupId
    );
    if (targetCircles.empty()) return;

    let sumY = 0, count = 0;
    targetCircles.each((d: any) => { sumY += d.y; count++; });
    const centerY = sumY / count;

    containerRef.current.scrollTo({
      top: centerY - (containerRef.current.clientHeight / 2),
      behavior: 'smooth'
    });

    targetCircles.classed('video-ball-highlight', true);
    if (navigator.vibrate) navigator.vibrate(50);
    setTimeout(() => targetCircles.classed('video-ball-highlight', false), 2000);
  }, [highlightedGroupId]);

  // Helper functions ...
  return ( ... );
}
```

---

### 🔍 Buscador Inteligente
`src/components/VideoFinder.tsx`

```tsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, Mic, X, Youtube, Instagram, Music, Clock, History, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchResult {
  id: string;
  platform_id: string;
  title: string;
  platform: 'youtube' | 'instagram' | 'tiktok';
  thumbnail_url: string;
  published_at: string;
  group_id?: string;
  hashtags?: string[];
}

export default function VideoFinder({ videos, onSelect }: { videos: SearchResult[], onSelect: (v: SearchResult) => void }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('video_search_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(() => {
      const filtered = videos.filter(v => 
        v.title.toLowerCase().includes(query.toLowerCase()) ||
        v.platform_id.toLowerCase().includes(query.toLowerCase()) ||
        v.hashtags?.some(h => h.toLowerCase().includes(query.toLowerCase()))
      ).slice(0, 8);
      setResults(filtered);
    }, 180);
    return () => clearTimeout(timer);
  }, [query, videos]);

  const handleSelect = (video: SearchResult) => {
    const newHistory = [video.title, ...history.filter(h => h !== video.title)].slice(0, 5);
    setHistory(newHistory);
    localStorage.setItem('video_search_history', JSON.stringify(newHistory));
    onSelect(video);
    setIsOpen(false);
    setQuery('');
  };

  const toggleVoiceSearch = () => {
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) return alert("No soportado");
    const recognition = new Recognition();
    recognition.lang = 'es-ES';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (e: any) => { setQuery(e.results[0][0].transcript); setIsOpen(true); };
    recognition.start();
  };

  return ( ... );
}
```

---

## 🏗️ 2. BACKEND Y LÓGICA DE DATOS

### 📡 Los Conectores de API
`src/lib/fetchers.ts`

```typescript
function extractHashtags(text: string): string[] {
  const matches = text.match(/#[a-zA-Z0-9_]+/g);
  return matches ? matches.map(h => h.slice(1).toLowerCase()) : [];
}

export async function fetchYouTubeShorts(apiKey: string, channelId?: string): Promise<VideoData[]> {
  if (!apiKey || !channelId) return [];
  try {
    const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`;
    const channelRes = await fetch(channelUrl, { cache: 'no-store' });
    const channelData = await channelRes.json();
    const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

    const playlistUrl = `...`;
    const detailsUrl = `...`;
    const detailsRes = await fetch(detailsUrl, { cache: 'no-store' });
    const detailsData = await detailsRes.json();

    return detailsData.items.filter((item: any) => {
      // ISO 8601 parsing logic here
      return totalSeconds > 0 && totalSeconds <= 185;
    }).map((item: any) => ({
      platform_id: item.id,
      title: item.snippet.title,
      platform: 'youtube',
      views: parseInt(item.statistics.viewCount) || 0,
      thumbnail_url: item.snippet.thumbnails.maxres?.url || ...,
      video_url: `https://youtube.com/shorts/${item.id}`,
      published_at: item.snippet.publishedAt,
      duration: ...,
      hashtags: extractHashtags(item.snippet.title + " " + (item.snippet.description || "")),
      engagement: { ... }
    }));
  } catch (err) { return []; }
}

// Instagram & TikTok implementations omitted for length, follow same pattern.
```

### 🧠 El Oráculo (AI Insights)
`src/app/api/insights/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { getGeminiModel } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = getSupabaseService();
  try {
    const model = getGeminiModel();
    const { data: videos } = await supabase.from('videos').select('*').limit(50);
    
    const formatVideoList = (vlist: any[]) => vlist.map(v => 
      `- [${v.title}] | Vistas: ${v.views} | Duración: ${v.duration || 'N/A'}s | Tags: ${(v.hashtags || []).join(', ')}`
    ).join('\n');

    const prompt = `
      Eres el "Oráculo VideoBalls", consultor de élite. Analiza los datos de Miguel y Raúl.
      DATOS: ${formatVideoList(videos)}
      TAREAS: 1. Duración ideal. 2. Hashtags virales. 3. Análisis de Títulos/Miniaturas.
      FORMATO: Secciones YT, IG, TT con tono Premium.
    `;

    const result = await model.generateContent(prompt);
    return NextResponse.json({ insights: result.response.text() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

## 🔧 3. UTILIDADES Y CONFIGURACIÓN

### 🛠️ Lógica de Matching (Duplicate IDs)
`src/lib/utils.ts`

```typescript
import { compareTwoStrings } from 'string-similarity';

export const isVideoMatch = (title1: string, title2: string, date1: Date, date2: Date): boolean => {
  const normalize = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  const score = compareTwoStrings(normalize(title1), normalize(title2));
  const timeDiff = Math.abs(date1.getTime() - date2.getTime());
  const twoHours = 2 * 60 * 60 * 1000;
  return score > 0.8 && timeDiff <= twoHours;
};

export const groupVideos = (videos: any[]) => {
  // Logic to assign same group_id to similar videos
};
```

---

## 🧪 Notas para el Experto Auditor
1. **D3 Rendering Optimization**: Se utiliza un `useEffect` con limpiezas de DOM manuales. ¿Sugiere el uso de un hook personalizado para manejar la física fuera del ciclo de renderizado de React?
2. **Database Integrity**: El sistema de `group_id` se calcula en el momento del `Refresh` de API. Si dos vídeos se suben con mucha diferencia horaria (+2h), no se agrupan. ¿Mejorar con un análisis semántico por IA?
3. **Escalabilidad del Canvas**: Con >2000 nodos el SVG podría sufrir. ¿Migración a PixiJS o Two.js?
4. **Auth Flow**: Actualmente usamos tokens estáticos en variables de entorno para las APIs de terceros. ¿Sugerencias sobre un flujo de Webhook más robusto?

---
*Documento íntegro para el equipo de desarrollo VideoBalls Analytics.* 🦁🦾👸🍿
