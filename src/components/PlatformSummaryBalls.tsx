'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface PlatformBallProps {
  platform: 'youtube' | 'tiktok' | 'instagram';
  totalViews: number;
  maxViews: number;
  sizeMode: 'log' | 'linear';
  index: number;
}

const PLATFORM_CONFIG = {
  youtube: {
    label: 'YouTube',
    sublabel: 'Shorts',
    color: '#ff0000',
    gradient: 'radial-gradient(circle at 35% 35%, #ff4444, #ff0000 40%, #cc0000 70%, #990000)',
    shadow: 'rgba(255, 0, 0, 0.4)',
    icon: (
      <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6 md:w-8 md:h-8 drop-shadow-lg">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
  },
  instagram: {
    label: 'Instagram',
    sublabel: 'Reels',
    color: '#e1306c',
    gradient: 'radial-gradient(circle at 35% 35%, #f77737, #e1306c 40%, #c13584 60%, #833ab4 85%)',
    shadow: 'rgba(225, 48, 108, 0.4)',
    icon: (
      <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6 md:w-8 md:h-8 drop-shadow-lg">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
      </svg>
    ),
  },
  tiktok: {
    label: 'TikTok',
    sublabel: 'Videos',
    color: '#00f2ea',
    gradient: 'radial-gradient(circle at 35% 35%, #69c9d0, #00f2ea 35%, #00d4cd 55%, #25f4ee 75%, #010101 95%)',
    shadow: 'rgba(0, 242, 234, 0.4)',
    icon: (
      <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5 md:w-7 md:h-7 drop-shadow-lg">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.72a8.27 8.27 0 0 0 4.84 1.56V6.84a4.85 4.85 0 0 1-1.08-.15z"/>
      </svg>
    ),
  },
};

function PlatformBall({ platform, totalViews, maxViews, sizeMode, index }: PlatformBallProps) {
  const config = PLATFORM_CONFIG[platform];
  const safeMax = maxViews || 1;
  
  // Calculate ball size based on mode
  let size: number;
  if (sizeMode === 'log') {
    // Balanced: logarithmic scale, more even sizes
    const minSize = 90;
    const maxSize = 160;
    const logVal = totalViews > 0 ? Math.log10(totalViews + 1) : 0;
    const logMax = Math.log10(safeMax + 1);
    size = minSize + (maxSize - minSize) * (logVal / logMax);
  } else {
    // Impact: linear scale, proportional to actual views
    const minSize = 60;
    const maxSize = 180;
    size = minSize + (maxSize - minSize) * (totalViews / safeMax);
  }

  // Format views nicely
  const formatViews = (views: number) => {
    if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
    if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K`;
    return views.toLocaleString();
  };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ 
        type: 'spring', 
        stiffness: 200, 
        damping: 15, 
        delay: index * 0.15 
      }}
      className="flex flex-col items-center gap-3"
    >
      {/* The Ball */}
      <motion.div
        animate={{ 
          width: size, 
          height: size,
        }}
        transition={{ type: 'spring', stiffness: 150, damping: 20 }}
        className="relative rounded-full flex flex-col items-center justify-center cursor-default group"
        style={{
          background: config.gradient,
          boxShadow: `
            0 0 ${size * 0.3}px ${config.shadow},
            0 0 ${size * 0.6}px ${config.shadow.replace('0.4', '0.15')},
            inset 0 -${size * 0.15}px ${size * 0.3}px rgba(0,0,0,0.3),
            inset 0 ${size * 0.05}px ${size * 0.1}px rgba(255,255,255,0.2)
          `,
        }}
      >
        {/* Shine overlay */}
        <div 
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 30% 25%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.1) 30%, transparent 60%)',
          }}
        />
        
        {/* Icon */}
        <div className="relative z-10 mb-1 opacity-90">
          {config.icon}
        </div>
        
        {/* Views Count */}
        <span 
          className="relative z-10 font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] tracking-tight leading-none"
          style={{ fontSize: Math.max(size * 0.16, 14) }}
        >
          {formatViews(totalViews)}
        </span>
      </motion.div>

      {/* Label below */}
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: config.color }}>
          {config.label}
        </p>
        <p className="text-[10px] text-slate-500 font-medium">
          {config.sublabel}
        </p>
      </div>
    </motion.div>
  );
}

interface PlatformSummaryBallsProps {
  videos: Array<{
    platform: 'youtube' | 'tiktok' | 'instagram';
    views: number;
  }>;
  sizeMode: 'log' | 'linear';
  highlightedGroupId?: string | null;
}

export default function PlatformSummaryBalls({ videos, sizeMode }: PlatformSummaryBallsProps) {
  // Calculate total views per platform
  const platforms: Array<'youtube' | 'instagram' | 'tiktok'> = ['youtube', 'instagram', 'tiktok'];
  
  const platformTotals = platforms.map(p => ({
    platform: p,
    totalViews: videos
      .filter(v => v.platform === p)
      .reduce((sum, v) => sum + (v.views || 0), 0),
  }));

  const maxViews = Math.max(...platformTotals.map(p => p.totalViews), 1);

  return (
    <div className="flex flex-col items-center gap-6 p-6 bg-slate-900/50 backdrop-blur-md rounded-3xl border border-white/5 shadow-xl">
      <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] w-full text-center">
        Views por plataforma
      </h2>
      
      <div className="flex flex-col items-center gap-8 py-4">
        {platformTotals.map((pt, i) => (
          <PlatformBall
            key={pt.platform}
            platform={pt.platform}
            totalViews={pt.totalViews}
            maxViews={maxViews}
            sizeMode={sizeMode}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}
