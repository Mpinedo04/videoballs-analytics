import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { isVideoMatch } from '@/lib/utils';
import { fetchYouTubeShorts, fetchInstagramReels, fetchTikTokVideos } from '@/lib/fetchers';

export const dynamic = 'force-dynamic';

export async function POST() {
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
      const { platform_id, platform, ...rest } = video;
      const { error: upsertError } = await supabase.from('videos').upsert({
        platform_id,
        platform,
        title: video.title,
        thumbnail_url: video.thumbnail_url,
        video_url: video.video_url,
        views: video.views,
        engagement: video.engagement,
        published_at: video.published_at,
        duration: video.duration,
        hashtags: video.hashtags,
        updated_at: new Date().toISOString()
      }, { onConflict: 'platform_id, platform' });

      if (upsertError) {
        console.error(`Error de guardado en ${platform}:`, upsertError);
        throw new Error(`Fallo al guardar vídeo en Supabase (${platform}): ${upsertError.message}`);
      }
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
          const match = (groupedVideos as any[]).find(v => 
            isVideoMatch(v.title, video.title, new Date(v.published_at), new Date(video.published_at))
          );
          if (match) matchedGroupId = match.group_id;
        }

        if (!matchedGroupId) {
          const match = (recentVideos as any[]).find(v => 
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

    return NextResponse.json({ success: true, count: allNewVideos.length });
  } catch (error: any) {
    console.error('Refresh Error:', error);
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
      duration: Math.floor(Math.random() * 60) + 15,
      hashtags: ["viral", platform, "videoballs"],
      engagement: { likes: Math.floor(Math.random() * 500), comments: Math.floor(Math.random() * 50) }
    });
  }
  return videos;
}
