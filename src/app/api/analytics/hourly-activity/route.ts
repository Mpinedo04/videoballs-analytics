import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = getSupabaseService();

  try {
    // 1. Get the 50 most recent videos
    const { data: recentVideos } = await supabase
      .from('videos')
      .select('id')
      .order('published_at', { ascending: false })
      .limit(50);

    if (!recentVideos || recentVideos.length === 0) {
      return NextResponse.json({ hourlyData: [] });
    }

    const videoIds = recentVideos.map(v => v.id);

    // 2. Fetch hourly snapshots for these videos (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: snapshots, error } = await supabase
      .from('hourly_snapshots')
      .select('video_id, views, created_at')
      .in('video_id', videoIds)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!snapshots || snapshots.length === 0) {
      return NextResponse.json({ hourlyData: Array(24).fill(0).map((_, i) => ({ hour: i, growth: 0, count: 0 })) });
    }

    // 3. Calculate growth per hour
    // Group snapshots by video
    const videoSnaps: Record<string, any[]> = {};
    snapshots.forEach(s => {
      if (!videoSnaps[s.video_id]) videoSnaps[s.video_id] = [];
      videoSnaps[s.video_id].push(s);
    });

    const hourlyGrowth: Record<number, { total: number; count: number }> = {};
    for (let i = 0; i < 24; i++) hourlyGrowth[i] = { total: 0, count: 0 };

    Object.values(videoSnaps).forEach(snaps => {
      for (let i = 1; i < snaps.length; i++) {
        const prev = snaps[i - 1];
        const curr = snaps[i];
        
        const diff = curr.views - prev.views;
        
        // Only count positive growth (views don't go down) 
        // and ignore huge jumps (could be due to huge time gaps between refreshes)
        if (diff >= 0 && diff < 1000000) {
          const date = new Date(curr.created_at);
          const hour = date.getHours(); // Local hour of the viewing activity
          
          hourlyGrowth[hour].total += diff;
          hourlyGrowth[hour].count += 1;
        }
      }
    });

    // 4. Format for chart
    const result = Object.entries(hourlyGrowth).map(([h, stats]) => ({
      hour: parseInt(h),
      growth: stats.total,
      avgGrowth: stats.count > 0 ? Math.round(stats.total / stats.count) : 0,
      count: stats.count
    }));

    return NextResponse.json({ hourlyData: result });
  } catch (err: any) {
    console.error('Hourly Analytics Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
