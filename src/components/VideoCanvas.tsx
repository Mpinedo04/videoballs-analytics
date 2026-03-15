'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Heart, MessageCircle } from 'lucide-react';

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
}

export default function VideoCanvas({ videos, days, sizeMode }: VideoCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredVideo, setHoveredVideo] = useState<Video | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const DAY_HEIGHT = 450; // Vertical space per day
  const totalHeight = days * DAY_HEIGHT;

  useEffect(() => {
    if (!svgRef.current || videos.length === 0) return;

    const width = svgRef.current.clientWidth;
    const height = totalHeight;
    
    const maxViews = d3.max(videos, v => v.views) || 1;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Simulation nodes
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

      // Radius Mode
      let r = 12 + 8 * Math.log10(v.views + 1); // Default log
      if (sizeMode === 'linear') {
        r = 10 + 70 * (v.views / maxViews);
      }

      return {
        ...v,
        dayIndex,
        x: getPlatformX(v.platform, width),
        y: dayTop + yOffset,
        r
      };
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
        linkGroup.selectAll('line')
          .data(getConnections(nodes as any))
          .join('line')
          .attr('x1', (d: any) => d.source.x)
          .attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x)
          .attr('y2', (d: any) => d.target.y)
          .attr('stroke', 'rgba(255,255,255,0.15)')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '5,5');

        nodeGroup.selectAll('circle')
          .data(nodes)
          .join('circle')
          .each(function(d: any) {
            const dayTop = d.dayIndex * DAY_HEIGHT;
            const dayBottom = (d.dayIndex + 1) * DAY_HEIGHT;
            d.x = Math.max(d.r + 20, Math.min(width - d.r - 20, d.x));
            d.y = Math.max(dayTop + d.r + 40, Math.min(dayBottom - d.r - 20, d.y));
          })
          .attr('cx', (d: any) => d.x)
          .attr('cy', (d: any) => d.y)
          .attr('r', (d: any) => d.r)
          .attr('fill', (d: any) => getPlatformColor(d.platform))
          .attr('stroke', 'rgba(255,255,255,0.9)')
          .attr('stroke-width', 2)
          .attr('class', 'cursor-pointer hover:brightness-125 transition-all drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]')
          .on('mouseover', (event, d: any) => {
            setHoveredVideo(d);
            setTooltipPos({ x: event.clientX, y: event.clientY });
          })
          .on('mouseout', () => setHoveredVideo(null))
          .on('click', (event, d: any) => window.open(d.video_url, '_blank'));
      });

    const dayGroup = svg.append('g').attr('class', 'day-boxes');
    const linkGroup = svg.append('g').attr('class', 'links');
    const nodeGroup = svg.append('g').attr('class', 'nodes');

    // Draw Day Boxes - STOP AT MARCH 8
    const startOfProject = new Date('2026-03-08T00:00:00Z');
    startOfProject.setHours(0, 0, 0, 0);

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      if (date < startOfProject) break;

      const dayTop = i * DAY_HEIGHT;
      
      dayGroup.append('rect')
        .attr('x', 10)
        .attr('y', dayTop + 10)
        .attr('width', width - 20)
        .attr('height', DAY_HEIGHT - 20)
        .attr('rx', 32)
        .attr('fill', 'rgba(255,255,255,0.015)')
        .attr('stroke', 'rgba(255,255,255,0.05)')
        .attr('stroke-width', 1);

      dayGroup.append('text')
        .attr('x', 30)
        .attr('y', dayTop + 45)
        .attr('fill', 'rgba(255,255,255,0.3)')
        .attr('font-size', '16px')
        .attr('font-weight', '800')
        .attr('class', 'uppercase tracking-widest')
        .text(date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }));
    }

    return () => {
      simulation.stop();
    };
  }, [videos, days, totalHeight, sizeMode]);

  function getPlatformX(platform: string, width: number) {
    if (platform === 'youtube') return width * 0.16;
    if (platform === 'tiktok') return width * 0.5;
    return width * 0.83;
  }

  function getPlatformColor(platform: string) {
    if (platform === 'youtube') return '#ff0000';
    if (platform === 'tiktok') return '#00f2ea';
    return '#e1306c';
  }

  function getConnections(nodes: any[]) {
    const connections = [];
    const grouped = d3.group(nodes.filter(n => n.group_id), d => d.group_id);
    for (const [gid, group] of grouped) {
      if (group.length > 1) {
        for (let i = 0; i < group.length - 1; i++) {
          connections.push({ source: group[i], target: group[i+1] });
        }
      }
    }
    return connections;
  }

  return (
    <div className="relative w-full">
      <div 
        ref={containerRef}
        className="relative w-full h-[calc(100vh-160px)] overflow-y-auto overflow-x-hidden bg-slate-950/20 backdrop-blur-sm rounded-[2.5rem] border border-white/5 shadow-2xl custom-scrollbar"
      >
        <svg 
          ref={svgRef} 
          className="w-full" 
          style={{ height: `${totalHeight}px` }} 
        />
        
        {/* Sticky Header */}
        <div className="sticky top-0 left-0 w-full flex justify-around py-6 bg-slate-950/90 backdrop-blur-xl z-20 border-b border-white/5 pointer-events-none font-black tracking-[0.2em] text-[10px] uppercase">
          <span className="text-red-500/80">YouTube Shorts</span>
          <span className="text-cyan-400/80">TikTok</span>
          <span className="text-pink-500/80">Instagram Reels</span>
        </div>
      </div>

      {/* Tooltip - Outside scroll area to prevent clipping */}
      <AnimatePresence mode="wait">
        {hoveredVideo && (
          <motion.div
            key={hoveredVideo.id}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{ 
              position: 'fixed', 
              top: tooltipPos.y > 450 ? tooltipPos.y - 320 : tooltipPos.y + 20, 
              left: (typeof window !== 'undefined' && tooltipPos.x + 350 > window.innerWidth)
                ? tooltipPos.x - 310 
                : tooltipPos.x + 20,
              zIndex: 99999 
            }}
            className="w-72 bg-slate-900/98 backdrop-blur-3xl border border-white/20 rounded-3xl p-5 shadow-[0_30px_60px_rgba(0,0,0,0.8)] pointer-events-none"
          >
            <div className="relative aspect-video mb-4 rounded-xl overflow-hidden border border-white/10">
              <img src={hoveredVideo.thumbnail_url} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-xs font-bold bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 shadow-lg">
                <Play size={10} fill="currentColor" /> {hoveredVideo.views.toLocaleString()}
              </div>
            </div>
            <h3 className="text-base font-bold line-clamp-2 mb-3 leading-tight tracking-tight text-white/90">
              {hoveredVideo.title}
            </h3>
            <div className="flex justify-between items-center text-xs text-slate-400 font-medium pt-3 border-t border-white/10">
              <span className="flex items-center gap-1.5"><Heart size={14} className="text-pink-500" /> {hoveredVideo.engagement.likes || 0}</span>
              <span className="flex items-center gap-1.5"><MessageCircle size={14} className="text-cyan-400" /> {hoveredVideo.engagement.comments || 0}</span>
              <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[9px] font-black tracking-widest uppercase" style={{ color: getPlatformColor(hoveredVideo.platform) }}>
                {hoveredVideo.platform}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
