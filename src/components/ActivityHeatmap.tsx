'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, X, Play, Heart, MessageCircle } from 'lucide-react';

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

interface ActivityHeatmapProps {
  videos: Video[];
}

// Sunday = 0, Monday = 1, ... Saturday = 6
const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getPlatformColor(platform: string): string {
  if (platform === 'youtube') return '#ef4444';
  if (platform === 'tiktok') return '#06b6d4';
  return '#ec4899';
}

export default function ActivityHeatmap({ videos }: ActivityHeatmapProps) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Build day data
  const { dayMap, weeks, maxScore } = useMemo(() => {
    // Group videos by day
    const map: Record<string, { videos: Video[]; views: number; count: number }> = {};
    videos.forEach(v => {
      const key = v.published_at?.slice(0, 10);
      if (!key) return;
      if (!map[key]) map[key] = { videos: [], views: 0, count: 0 };
      map[key].videos.push(v);
      map[key].views += v.views || 0;
      map[key].count += 1;
    });

    // Generate calendar grid from project start to today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Project started March 8, 2026
    const projectStart = new Date(2026, 2, 8); // month is 0-indexed
    const startDate = new Date(projectStart);
    
    // Align to Monday
    const dayOfWeek = startDate.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startDate.setDate(startDate.getDate() + mondayOffset);

    const weeksArr: { date: Date; key: string; dayOfWeek: number }[][] = [];
    let currentWeek: { date: Date; key: string; dayOfWeek: number }[] = [];
    
    // End at the end of current week
    const endDate = new Date(today);
    const todayDow = endDate.getDay();
    const daysToSunday = todayDow === 0 ? 0 : 7 - todayDow;
    endDate.setDate(endDate.getDate() + daysToSunday);

    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const dow = cursor.getDay() === 0 ? 6 : cursor.getDay() - 1; // Monday=0 ... Sunday=6
      currentWeek.push({
        date: new Date(cursor),
        key: toDateKey(cursor),
        dayOfWeek: dow,
      });
      if (dow === 6) {
        weeksArr.push(currentWeek);
        currentWeek = [];
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    if (currentWeek.length > 0) weeksArr.push(currentWeek);

    // Max score for color scaling
    let max = 0;
    Object.values(map).forEach(d => {
      const score = d.views;
      if (score > max) max = score;
    });

    return { dayMap: map, weeks: weeksArr, maxScore: max || 1 };
  }, [videos]);

  // Color intensity
  const getCellColor = (key: string) => {
    const data = dayMap[key];
    if (!data || data.count === 0) return 'rgba(255,255,255,0.03)';
    
    const intensity = Math.min(1, data.views / maxScore);
    
    if (intensity > 0.7) return 'rgba(52, 211, 153, 0.9)';   // Bright green
    if (intensity > 0.4) return 'rgba(52, 211, 153, 0.55)';   // Medium green
    if (intensity > 0.15) return 'rgba(52, 211, 153, 0.3)';   // Light green
    return 'rgba(52, 211, 153, 0.12)';                         // Very faint green
  };

  const getCellBorder = (key: string) => {
    const data = dayMap[key];
    if (!data || data.count === 0) return 'rgba(255,255,255,0.05)';
    return 'rgba(52, 211, 153, 0.2)';
  };

  // Selected day data
  const selectedData = selectedDay ? dayMap[selectedDay] : null;
  const selectedDate = selectedDay ? new Date(selectedDay + 'T00:00:00') : null;

  return (
    <div className="glass-card p-5 overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-2">
          <Calendar size={12} /> Heatmap de Actividad
        </h3>
        <div className="flex items-center gap-2 text-[9px] text-slate-500">
          <span>Menos</span>
          <div className="flex gap-0.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }} />
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'rgba(52,211,153,0.12)' }} />
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'rgba(52,211,153,0.3)' }} />
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'rgba(52,211,153,0.55)' }} />
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'rgba(52,211,153,0.9)' }} />
          </div>
          <span>Más</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto custom-scrollbar">
        <div className="flex gap-0.5 min-w-fit">
          {/* Day labels */}
          <div className="flex flex-col gap-0.5 mr-1 pt-4">
            {DAY_LABELS.map((label, i) => (
              <div key={i} className="w-3 h-3 flex items-center justify-center text-[7px] text-slate-600 font-medium">
                {i % 2 === 0 ? label : ''}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week, wi) => {
            // Show month label on first week of each month
            const firstDay = week[0]?.date;
            const showMonth = firstDay && (wi === 0 || firstDay.getDate() <= 7);
            
            return (
              <div key={wi} className="flex flex-col gap-0.5">
                {/* Month label */}
                <div className="h-3 flex items-center">
                  {showMonth && firstDay && (
                    <span className="text-[7px] text-slate-500 font-bold">
                      {MONTH_LABELS[firstDay.getMonth()]}
                    </span>
                  )}
                </div>
                
                {/* Day cells */}
                {Array.from({ length: 7 }, (_, di) => {
                  const dayData = week.find(d => d.dayOfWeek === di);
                  if (!dayData) return <div key={di} className="w-3 h-3" />;
                  
                  const isToday = dayData.key === toDateKey(new Date());
                  const isSelected = dayData.key === selectedDay;
                  const isFuture = dayData.date > new Date();
                  const data = dayMap[dayData.key];
                  
                  return (
                    <div
                      key={di}
                      onClick={() => !isFuture && setSelectedDay(isSelected ? null : dayData.key)}
                      className={`w-3 h-3 rounded-sm cursor-pointer transition-all duration-150 ${
                        isSelected ? 'ring-1 ring-white ring-offset-1 ring-offset-slate-950 scale-125' : 
                        isToday ? 'ring-1 ring-blue-400/50' : ''
                      } ${isFuture ? 'opacity-20 cursor-default' : 'hover:scale-125 hover:brightness-125'}`}
                      style={{ 
                        background: isFuture ? 'rgba(255,255,255,0.01)' : getCellColor(dayData.key),
                        border: `1px solid ${getCellBorder(dayData.key)}`,
                      }}
                      title={`${dayData.date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}${data ? ` · ${data.count} vídeo${data.count > 1 ? 's' : ''} · ${data.views.toLocaleString()} visitas` : ' · Sin publicaciones'}`}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Detail Panel */}
      <AnimatePresence>
        {selectedDay && selectedDate && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-white">
                  {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h4>
                <button onClick={() => setSelectedDay(null)} className="text-slate-500 hover:text-white transition-colors">
                  <X size={12} />
                </button>
              </div>

              {!selectedData || selectedData.count === 0 ? (
                <p className="text-[10px] text-slate-500 italic">No se publicó contenido este día.</p>
              ) : (
                <div className="space-y-2">
                  {/* Summary */}
                  <div className="flex gap-3 text-[10px]">
                    <span className="text-slate-400">{selectedData.count} vídeo{selectedData.count > 1 ? 's' : ''}</span>
                    <span className="text-emerald-400 font-bold">{selectedData.views.toLocaleString()} visitas</span>
                    <span className="text-pink-400">
                      {selectedData.videos.reduce((a, v) => a + (v.engagement?.likes || 0), 0)} likes
                    </span>
                  </div>

                  {/* Video list */}
                  {selectedData.videos.map(v => (
                    <a
                      key={v.id}
                      href={v.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/30 hover:bg-slate-800/60 border border-white/5 transition-all group"
                    >
                      <img src={v.thumbnail_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-white font-medium truncate group-hover:text-blue-300 transition-colors">
                          {v.title?.slice(0, 50)}
                        </p>
                        <div className="flex items-center gap-2 text-[9px] text-slate-500 mt-0.5">
                          <span style={{ color: getPlatformColor(v.platform) }} className="font-bold uppercase">{v.platform}</span>
                          <span className="flex items-center gap-0.5"><Play size={7} fill="currentColor" /> {v.views.toLocaleString()}</span>
                          <span className="flex items-center gap-0.5"><Heart size={7} /> {v.engagement?.likes || 0}</span>
                          <span className="flex items-center gap-0.5"><MessageCircle size={7} /> {v.engagement?.comments || 0}</span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Glow */}
      <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/5 blur-[40px] rounded-full pointer-events-none" />
    </div>
  );
}
