import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchInstagramReels, fetchTikTokVideos, fetchYouTubeShorts } from '@/lib/fetchers';
import { getSupabaseService } from '@/lib/supabase';
import { isVideoMatch } from '@/lib/utils';
import type { Platform, StoredVideo, VideoData } from '@/lib/videoTypes';

const PLATFORMS: Platform[] = ['youtube', 'instagram', 'tiktok'];

interface PlatformSyncResult {
  platform: Platform;
  ok: boolean;
  count: number;
  error?: string;
}

interface SyncOptions {
  fullSync?: boolean;
  useMock?: boolean;
}

export interface SyncResult {
  success: boolean;
  total: number;
  platforms: PlatformSyncResult[];
  groupedUpdates: number;
  dailySnapshots: number;
  hourlySnapshots: number;
}

export async function syncVideos(options: SyncOptions = {}): Promise<SyncResult> {
  const supabase = getSupabaseService();
  const useMock = options.useMock ?? process.env.USE_MOCK_DATA === 'true';
  const fullSync = options.fullSync ?? false;

  const platformResults: PlatformSyncResult[] = [];
  const allVideos: VideoData[] = [];

  for (const platform of PLATFORMS) {
    try {
      const videos = useMock
        ? generateMockVideos(platform)
        : await fetchPlatformVideos(platform, fullSync);

      allVideos.push(...videos);
      platformResults.push({ platform, ok: true, count: videos.length });
    } catch (error) {
      platformResults.push({
        platform,
        ok: false,
        count: 0,
        error: error instanceof Error ? error.message : 'Unknown platform sync error',
      });
    }
  }

  if (allVideos.length > 0) {
    await upsertVideos(supabase, allVideos);
  }

  const groupedUpdates = await assignVideoGroups(supabase);
  const snapshots = await saveSnapshots(supabase);
  await pruneOldHourlySnapshots(supabase);

  return {
    success: platformResults.some(result => result.ok),
    total: allVideos.length,
    platforms: platformResults,
    groupedUpdates,
    dailySnapshots: snapshots.daily,
    hourlySnapshots: snapshots.hourly,
  };
}

async function fetchPlatformVideos(platform: Platform, fullSync: boolean) {
  if (platform === 'youtube') {
    return fetchYouTubeShorts(process.env.YOUTUBE_API_KEY!, process.env.YOUTUBE_CHANNEL_ID, fullSync);
  }

  if (platform === 'instagram') {
    return fetchInstagramReels(process.env.INSTAGRAM_ACCESS_TOKEN!, fullSync);
  }

  return fetchTikTokVideos(process.env.TIKTOK_ACCESS_TOKEN!, fullSync);
}

async function upsertVideos(supabase: SupabaseClient, videos: VideoData[]) {
  const now = new Date().toISOString();
  const rows = videos.map(video => ({
    platform_id: video.platform_id,
    platform: video.platform,
    title: video.title,
    thumbnail_url: video.thumbnail_url,
    video_url: video.video_url,
    views: video.views,
    engagement: video.engagement,
    published_at: video.published_at,
    duration: video.duration,
    hashtags: video.hashtags,
    updated_at: now,
  }));

  const { error } = await supabase
    .from('videos')
    .upsert(rows, { onConflict: 'platform_id, platform' });

  if (error) {
    throw new Error(`Supabase upsert failed: ${error.message}`);
  }
}

async function assignVideoGroups(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('videos')
    .select('id, title, platform, platform_id, views, thumbnail_url, video_url, published_at, engagement, duration, hashtags, group_id')
    .order('published_at', { ascending: false });

  if (error) throw new Error(`Group query failed: ${error.message}`);
  if (!data || data.length < 2) return 0;

  const videos = data as StoredVideo[];
  const parent = new Map<string, string>();

  videos.forEach(video => parent.set(video.id, video.id));

  const find = (id: string): string => {
    const current = parent.get(id) || id;
    if (current === id) return id;
    const root = find(current);
    parent.set(id, root);
    return root;
  };

  const union = (a: string, b: string) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent.set(rootB, rootA);
  };

  for (let i = 0; i < videos.length; i++) {
    const a = videos[i];
    const aDate = new Date(a.published_at);

    for (let j = i + 1; j < videos.length; j++) {
      const b = videos[j];
      const bDate = new Date(b.published_at);

      if (Math.abs(aDate.getTime() - bDate.getTime()) > 24 * 60 * 60 * 1000) {
        break;
      }

      if (a.platform !== b.platform && isVideoMatch(a.title, b.title, aDate, bDate)) {
        union(a.id, b.id);
      }
    }
  }

  const sets = new Map<string, StoredVideo[]>();
  videos.forEach(video => {
    const root = find(video.id);
    const group = sets.get(root) || [];
    group.push(video);
    sets.set(root, group);
  });

  const updates: Array<{ id: string; group_id: string }> = [];

  for (const group of sets.values()) {
    if (group.length < 2) continue;

    const groupId = group.find(video => video.group_id)?.group_id || crypto.randomUUID();
    group.forEach(video => {
      if (video.group_id !== groupId) updates.push({ id: video.id, group_id: groupId });
    });
  }

  for (const update of updates) {
    const { error: updateError } = await supabase
      .from('videos')
      .update({ group_id: update.group_id })
      .eq('id', update.id);

    if (updateError) throw new Error(`Group update failed: ${updateError.message}`);
  }

  return updates.length;
}

async function saveSnapshots(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('videos')
    .select('id, views');

  if (error) throw new Error(`Snapshot source query failed: ${error.message}`);
  if (!data || data.length === 0) return { daily: 0, hourly: 0 };

  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const videos = data as Array<{ id: string; views: number }>;

  const dailyRows = videos.map(video => ({
    video_id: video.id,
    views: video.views,
    snapshot_date: today,
  }));

  const { error: dailyError } = await supabase
    .from('views_snapshots')
    .upsert(dailyRows, { onConflict: 'video_id, snapshot_date' });

  if (dailyError) throw new Error(`Daily snapshot failed: ${dailyError.message}`);

  const hourlyRows = videos.map(video => ({
    video_id: video.id,
    views: video.views,
    created_at: now,
  }));

  const { error: hourlyError } = await supabase
    .from('hourly_snapshots')
    .insert(hourlyRows);

  if (hourlyError) throw new Error(`Hourly snapshot failed: ${hourlyError.message}`);

  return { daily: dailyRows.length, hourly: hourlyRows.length };
}

async function pruneOldHourlySnapshots(supabase: SupabaseClient) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  await supabase
    .from('hourly_snapshots')
    .delete()
    .lt('created_at', cutoff.toISOString());
}

function generateMockVideos(platform: Platform): VideoData[] {
  const count = Math.floor(Math.random() * 3) + 1;
  const titles = [
    'Truco de cocina viral',
    'Rutina de manana',
    'Reaccionando a memes',
    'Viaje a Japon',
    'Setup de grabacion',
    'Review unboxing',
  ];

  return Array.from({ length: count }, () => {
    const title = titles[Math.floor(Math.random() * titles.length)];
    const date = new Date();
    date.setHours(date.getHours() - Math.floor(Math.random() * 48));

    return {
      platform_id: `mock_${platform}_${Math.random().toString(36).slice(2, 11)}`,
      title,
      platform,
      views: Math.floor(Math.random() * 50000) + 1000,
      thumbnail_url: `https://picsum.photos/seed/${platform}${Math.random()}/320/180`,
      video_url: '#',
      published_at: date.toISOString(),
      duration: Math.floor(Math.random() * 60) + 15,
      hashtags: ['viral', platform, 'videoballs'],
      engagement: {
        likes: Math.floor(Math.random() * 500),
        comments: Math.floor(Math.random() * 50),
      },
    };
  });
}
