import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { isVideoMatch } from '@/lib/utils';
import { fetchYouTubeShorts, fetchInstagramReels, fetchTikTokVideos } from '@/lib/fetchers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const queryKey = searchParams.get('key');
  const authHeader = request.headers.get('authorization');

  const isValidCron = authHeader === `Bearer ${process.env.VERCEL_CRON_SECRET}`;
  const isValidExternal = queryKey === process.env.CRON_SECRET;

  if (!isValidCron && !isValidExternal) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = getSupabaseService();
  const useMock = process.env.USE_MOCK_DATA === 'true';

  try {
    const platforms = ['youtube', 'instagram', 'tiktok'];
    let allNewVideos: any[] = [];

    for (const platform of platforms) {
      let videos: any[] = [];
      
      if (useMock) {
        videos = generateMockVideos(platform);
      } else {
        if (platform === 'youtube') {
          videos = await fetchYouTubeShorts(process.env.YOUTUBE_API_KEY!, process.env.YOUTUBE_CHANNEL_ID);
        } else if (platform === 'instagram') {
          videos = await fetchInstagramReels(process.env.INSTAGRAM_ACCESS_TOKEN!);
        } else if (platform === 'tiktok') {
          videos = await fetchTikTokVideos(process.env.TIKTOK_ACCESS_TOKEN!);
        }
      }
      
      allNewVideos = [...allNewVideos, ...videos];
    }

    // Upsert videos
    for (const video of allNewVideos) {
      await supabase.from('videos').upsert(video, { onConflict: 'platform_id, platform' });
    }

    // Matching logic
    const { data: recentVideos } = await supabase
      .from('videos')
      .select('*')
      .is('group_id', null)
      .order('published_at', { ascending: false });

    const { data: groupedVideos } = await supabase
      .from('videos')
      .select('*')
      .not('group_id', 'is', null);

    if (recentVideos) {
      for (const video of recentVideos) {
        let matchedGroupId = null;
        if (groupedVideos) {
          const match = groupedVideos.find(v => 
            isVideoMatch(v.title, video.title, new Date(v.published_at), new Date(video.published_at))
          );
          if (match) matchedGroupId = match.group_id;
        }

        if (!matchedGroupId) {
          const match = recentVideos.find(v => 
            v.id !== video.id && 
            isVideoMatch(v.title, video.title, new Date(v.published_at), new Date(video.published_at))
          );
          if (match) matchedGroupId = match.group_id || crypto.randomUUID();
        }

        if (matchedGroupId) {
          await supabase.from('videos').update({ group_id: matchedGroupId }).eq('id', video.id);
        }
      }
    }

    // ── Save views snapshots ───────────────────────────────────────────────
    const { data: allVideos } = await supabase
      .from('videos')
      .select('id, views');

    if (allVideos && allVideos.length > 0) {
      // 1. Daily snapshot (Upsert by video_id + date)
      const today = new Date().toISOString().slice(0, 10);
      const dailyRows = allVideos.map((v: { id: string; views: number }) => ({
        video_id: v.id,
        views: v.views,
        snapshot_date: today,
      }));

      await supabase
        .from('views_snapshots')
        .upsert(dailyRows, { onConflict: 'video_id, snapshot_date' });

      // 2. Hourly snapshot (Insert new record every time)
      const hourlyRows = allVideos.map((v: { id: string; views: number }) => ({
        video_id: v.id,
        views: v.views,
        created_at: new Date().toISOString(),
      }));

      await supabase
        .from('hourly_snapshots')
        .insert(hourlyRows);
    }

    return NextResponse.json({ success: true, count: allNewVideos.length });
  } catch (error: any) {
    console.error('Cron Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function generateMockVideos(platform: string) {
  const count = Math.floor(Math.random() * 3) + 1;
  const videos = [];
  const titles = ["Increíble truco de cocina", "Mi rutina de mañana", "Reacting a memes", "Viaje a Japón 2024", "Setup Gamer 2025", "Review unboxing"];
  
  for (let i = 0; i < count; i++) {
    const title = titles[Math.floor(Math.random() * titles.length)];
    const date = new Date();
    date.setHours(date.getHours() - Math.floor(Math.random() * 48));
    
    videos.push({
      platform_id: `mock_${platform}_${Math.random().toString(36).substr(2, 9)}`,
      title: title,
      platform: platform,
      views: Math.floor(Math.random() * 50000) + 1000,
      thumbnail_url: `https://picsum.photos/seed/${platform}${Math.random()}/200/300`,
      video_url: "#",
      published_at: date.toISOString(),
      engagement: { likes: Math.floor(Math.random() * 500), comments: Math.floor(Math.random() * 50) }
    });
  }
  return videos;
}
