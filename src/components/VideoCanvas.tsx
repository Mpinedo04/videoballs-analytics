'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Heart, MessageCircle } from 'lucide-react';
import { renderBall, appendPlatformDefs, VideoNode as RenderNode } from '@/lib/renderBalls';
import { addVelocityRing } from '@/lib/velocityRing';
import type { StoredVideo as Video } from '@/lib/videoTypes';

interface VideoCanvasProps {
  videos: Video[];
  days: number;
  sizeMode: 'log' | 'linear';
  gravityEnabled?: boolean;
  viewportClassName?: string;
  highlightedGroupId?: string | null;
  prevSnapshot?: Record<string, number>;
  onVideoSelect?: (video: Video) => void;
}

export default function VideoCanvas({ videos, days, sizeMode, gravityEnabled = false, viewportClassName, highlightedGroupId, prevSnapshot = {}, onVideoSelect }: VideoCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPositionsRef = useRef<Record<string, { x: number; y: number; vx?: number; vy?: number }>>({});
  const simulationRef = useRef<d3.Simulation<any, undefined> | null>(null);
  const scrollImpulseRef = useRef(0);
  const scrollWakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hoveredVideo, setHoveredVideo] = useState<Video | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [layoutVersion, setLayoutVersion] = useState(0);

  const DAY_HEIGHT = 450; // Vertical space per day
  const visibleDayCount = useMemo(() => {
    if (videos.length === 0) return 1;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const indexes = videos
      .map(video => {
        const videoDate = new Date(video.published_at);
        videoDate.setHours(0, 0, 0, 0);
        return Math.round((today.getTime() - videoDate.getTime()) / (1000 * 60 * 60 * 24));
      })
      .filter(index => index >= 0 && index < days);

    return Math.max(1, (Math.max(...indexes, 0) + 1));
  }, [videos, days]);
  const totalHeight = visibleDayCount * DAY_HEIGHT;

  useEffect(() => {
    const target = containerRef.current;
    if (!target || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      setLayoutVersion(version => version + 1);
    });

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const target = containerRef.current;
    if (!target) return;

    let lastScrollTop = target.scrollTop;

    const onScroll = () => {
      const delta = target.scrollTop - lastScrollTop;
      lastScrollTop = target.scrollTop;

      scrollImpulseRef.current = Math.max(-26, Math.min(26, delta * 0.22));
      simulationRef.current?.alphaTarget(0.28).restart();

      if (scrollWakeTimerRef.current) clearTimeout(scrollWakeTimerRef.current);
      scrollWakeTimerRef.current = setTimeout(() => {
        scrollImpulseRef.current = 0;
        simulationRef.current?.alphaTarget(0);
      }, 180);
    };

    target.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      target.removeEventListener('scroll', onScroll);
      if (scrollWakeTimerRef.current) clearTimeout(scrollWakeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!svgRef.current || videos.length === 0) return;

    const width = svgRef.current.clientWidth;
    
    const maxViews = d3.max(videos, v => v.views) || 1;
    
    // Anillos de Velocidad — snapshot previo viene de props (Supabase)
    const svg = d3.select(svgRef.current);
    appendPlatformDefs(svg as any);
    svg.selectAll('.links, .nodes, .day-boxes').remove();

    // Calcular el crecimiento máximo absoluto para normalizar en modo Impacto
    let maxGlobalDelta = 1;
    if (sizeMode === 'linear') {
      const deltas = videos.map(v => {
        const prev = prevSnapshot[v.id];
        return prev !== undefined ? Math.abs(v.views - prev) : 0;
      });
      maxGlobalDelta = d3.max(deltas) || 1;
    }

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

      const homeX = getPlatformX(v.platform, width);
      const homeY = dayTop + yOffset;
      const previous = lastPositionsRef.current[v.id];
      const laneSpread = Math.max(72, Math.min(165, width * 0.18));
      const gravityX = homeX + stableOffset(v.id, laneSpread);

      return {
        ...v,
        dayIndex,
        homeX,
        homeY,
        gravityX,
        x: previous?.x ?? homeX,
        y: previous?.y ?? homeY,
        vx: previous?.vx ?? (gravityEnabled ? (Math.random() - 0.5) * 3 : 0),
        vy: previous?.vy ?? (gravityEnabled ? -Math.random() * 4 : 0),
        r,
        floatPhase: Math.random() * Math.PI * 2,
      };
    }).filter(node => node.dayIndex >= 0 && node.dayIndex < visibleDayCount);

    const connections = getConnections(nodes as any);

    const simulation = d3.forceSimulation(nodes as any)
      .alpha(gravityEnabled ? 1 : 0.74)
      .alphaMin(0.001)
      .alphaDecay(gravityEnabled ? 0.005 : 0.012)
      .velocityDecay(gravityEnabled ? 0.25 : 0.14)
      .force('x', d3.forceX((d: any) => gravityEnabled ? d.gravityX : d.homeX).strength(gravityEnabled ? 0.08 : 0.1))
      .force('collide', d3.forceCollide((d: any) => d.r + 11).strength(1).iterations(gravityEnabled ? 13 : 4));

    if (gravityEnabled) {
      simulation.force('gravity', () => {
        const impulse = scrollImpulseRef.current;
        nodes.forEach((d: any) => {
          d.vy = (d.vy || 0) + 0.38 + impulse * 0.04;
          d.vx = (d.vx || 0) + Math.sin(d.dayIndex * 1.7 + d.x * 0.01) * Math.abs(impulse) * 0.016;
        });
        scrollImpulseRef.current *= 0.88;
      });
    } else {
      simulation
        .force('y', d3.forceY((d: any) => d.homeY).strength(0.12))
        .force('levitation', (alpha: number) => {
          nodes.forEach((d: any) => {
            d.vx = (d.vx || 0) * 0.985;
            d.vy = (d.vy || 0) + Math.sin(alpha * 18 + d.floatPhase) * 0.035;
          });
        });
    }

    simulationRef.current = simulation;

    const dayGroup = svg.append('g').attr('class', 'day-boxes');
    const linkGroup = svg.append('g').attr('class', 'links');
    const nodeGroup = svg.append('g').attr('class', 'nodes');

    // Create selection once
    const nodeSelection = nodeGroup.selectAll('g.video-node')
      .data(nodes)
      .join('g')
      .attr('class', 'video-node')
      .each(function(d: any) {
        const g = d3.select(this);
        renderBall(g as any, d as RenderNode, d.r);
        addVelocityRing(g as any, d as any, d.r, prevSnapshot, sizeMode, maxGlobalDelta);
        g.attr('id', d.group_id ? `group-${d.group_id}` : `video-${d.id}`);
        g.attr('style', 'cursor: pointer');
        
        // Events
        g.on('mouseover', (event) => {
          setHoveredVideo(d);
          setTooltipPos({ x: event.clientX, y: event.clientY });
        })
        .on('mouseout', () => setHoveredVideo(null))
        .on('click', () => {
          if (onVideoSelect) onVideoSelect(d);
          else window.open(d.video_url, '_blank', 'noopener,noreferrer');
        });
      });

    simulation.on('tick', () => {
      linkGroup.selectAll('line')
        .data(connections)
        .join('line')
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y)
        .attr('stroke', 'rgba(255,255,255,0.15)')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5');

      nodes.forEach((d: any) => {
        const dayTop = d.dayIndex * DAY_HEIGHT;
        const dayBottom = (d.dayIndex + 1) * DAY_HEIGHT;
        const left = d.r + 20;
        const right = width - d.r - 20;
        const ceiling = dayTop + d.r + 58;
        const floor = dayBottom - d.r - 26;

        if (gravityEnabled) {
          const impulse = scrollImpulseRef.current;

          if (Math.abs(impulse) > 0.05) {
            d.vy = (d.vy || 0) + impulse * 0.018;
          }

          if (d.x < left) {
            d.x = left;
            d.vx = Math.abs(d.vx || 0) * 0.34;
          } else if (d.x > right) {
            d.x = right;
            d.vx = -Math.abs(d.vx || 0) * 0.34;
          }

          if (d.y < ceiling) {
            d.y = ceiling;
            d.vy = Math.abs(d.vy || 0) * 0.12;
          } else if (d.y > floor) {
            d.y = floor;
            const bounce = Math.abs(d.vy || 0);
            d.vy = bounce > 0.8 ? -bounce * 0.18 : 0;
            d.vx = (d.vx || 0) * 0.7;
          }
        } else {
          const dx = d.homeX - d.x;
          const dy = d.homeY - d.y;
          d.vx = (d.vx || 0) + dx * 0.012;
          d.vy = (d.vy || 0) + dy * 0.012;
          d.x = Math.max(left, Math.min(right, d.x));
          d.y = Math.max(ceiling, Math.min(floor, d.y));
        }
      });

      if (gravityEnabled) {
        resolveDayCollisions(nodes as any[], width);
      }

      nodeSelection
        .each(function(d: any) {
          const dayTop = d.dayIndex * DAY_HEIGHT;
          const dayBottom = (d.dayIndex + 1) * DAY_HEIGHT;
          d.x = Math.max(d.r + 20, Math.min(width - d.r - 20, d.x));
          d.y = Math.max(dayTop + d.r + 58, Math.min(dayBottom - d.r - 26, d.y));

          lastPositionsRef.current[d.id] = {
            x: d.x,
            y: d.y,
            vx: d.vx,
            vy: d.vy,
          };
        })
        .attr('transform', (d: any) => `translate(${d.x}, ${d.y})`);
    });

    // Draw Day Boxes - STOP AT MARCH 8
    const startOfProject = new Date('2026-03-08T00:00:00Z');
    startOfProject.setHours(0, 0, 0, 0);

    for (let i = 0; i < visibleDayCount; i++) {
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
      if (simulationRef.current === simulation) simulationRef.current = null;
    };
  }, [videos, days, totalHeight, sizeMode, gravityEnabled, prevSnapshot, visibleDayCount, layoutVersion, onVideoSelect]);

  // Handle Highlighting and Scrolling
  useEffect(() => {
    if (!highlightedGroupId || !svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    
    // Select the circles that match the group or the specific video
    // Note: We use an attribute selector because groups can have multiple balls
    const targetGroups = svg.selectAll('g.video-node').filter((d: any) => 
      d.group_id === highlightedGroupId || d.id === highlightedGroupId
    );

    if (targetGroups.empty()) return;

    // Calculate center Y position for scrolling
    let sumY = 0;
    let count = 0;
    targetGroups.each((d: any) => {
      sumY += d.y;
      count++;
    });
    
    const centerY = sumY / count;

    // Smooth scroll to the position
    containerRef.current.scrollTo({
      top: centerY - (containerRef.current.clientHeight / 2),
      behavior: 'smooth'
    });

    // Add highlight class
    targetGroups.classed('video-ball-highlight', true);

    // Vibration if mobile
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(80);
    }

    // Cleanup highlight after animation duration
    const timer = setTimeout(() => {
      targetGroups.classed('video-ball-highlight', false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [highlightedGroupId]);

  function getPlatformX(platform: string, width: number) {
    if (platform === 'youtube') return width * 0.16;
    if (platform === 'tiktok') return width * 0.5;
    return width * 0.83;
  }

  function stableOffset(id: string, spread: number) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
    }

    const normalized = (Math.abs(hash) % 1000) / 1000;
    return (normalized - 0.5) * spread;
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

  function resolveDayCollisions(nodes: any[], width: number) {
    const byDay = d3.group(nodes, node => node.dayIndex);

    for (const group of byDay.values()) {
      for (let pass = 0; pass < 3; pass++) {
        for (let i = 0; i < group.length; i++) {
          const a = group[i] as any;

          for (let j = i + 1; j < group.length; j++) {
            const b = group[j] as any;
            const minDistance = a.r + b.r + 12;
            let dx = b.x - a.x;
            let dy = b.y - a.y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (!distance) {
              dx = 0.01;
              dy = -1;
              distance = 1;
            }

            if (distance < minDistance) {
              const overlap = (minDistance - distance) / 2;
              const nx = dx / distance;
              const ny = dy / distance;
              const pushX = nx * overlap;
              const pushY = ny * overlap;

              a.x -= pushX;
              a.y -= pushY;
              b.x += pushX;
              b.y += pushY;

              a.vx = (a.vx || 0) - pushX * 0.06;
              a.vy = (a.vy || 0) - pushY * 0.06;
              b.vx = (b.vx || 0) + pushX * 0.06;
              b.vy = (b.vy || 0) + pushY * 0.06;
            }
          }

          const dayTop = a.dayIndex * DAY_HEIGHT;
          const dayBottom = (a.dayIndex + 1) * DAY_HEIGHT;
          a.x = Math.max(a.r + 20, Math.min(width - a.r - 20, a.x));
          a.y = Math.max(dayTop + a.r + 58, Math.min(dayBottom - a.r - 26, a.y));
        }
      }
    }
  }

  return (
    <div className="relative w-full">
      <div 
        ref={containerRef}
        className={`relative w-full overflow-y-auto overflow-x-hidden bg-slate-950/20 backdrop-blur-sm rounded-[2rem] border border-white/5 shadow-2xl custom-scrollbar ${viewportClassName || 'h-[clamp(440px,calc(100vh-230px),720px)] lg:h-[clamp(560px,calc(100vh-220px),760px)]'}`}
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
