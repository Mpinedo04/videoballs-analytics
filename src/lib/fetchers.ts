
import type { VideoData } from '@/lib/videoTypes';

/**
 * Extrae hashtags de un texto.
 */
function extractHashtags(text: string): string[] {
  const matches = text.match(/#[a-zA-Z0-9_]+/g);
  return matches ? matches.map(h => h.slice(1).toLowerCase()) : [];
}

function parseDurationSeconds(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');

  return (hours * 3600) + (minutes * 60) + seconds;
}

export async function fetchYouTubeShorts(apiKey: string, channelId?: string, fullSync: boolean = false): Promise<VideoData[]> {
  if (!apiKey || !channelId) throw new Error('Missing YouTube credentials');
  
  try {
    // 1. Get the "uploads" playlist ID for the channel
    const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`;
    const channelRes = await fetch(channelUrl, { cache: 'no-store' });
    const channelData = await channelRes.json();
    
    if (!channelData.items?.[0]) return [];
    const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

    // 2. Fetch recent items from that playlist with pagination
    let allPlaylistItems: any[] = [];
    let pageToken = '';
    const MAX_YT_PAGES = fullSync ? 10 : 1;
    let pagesFetched = 0;

    do {
      const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${uploadsPlaylistId}&key=${apiKey}${pageToken ? `&pageToken=${pageToken}` : ''}`;
      const playlistRes = await fetch(playlistUrl, { cache: 'no-store' });
      const playlistData = await playlistRes.json();

      if (playlistData.items) {
        allPlaylistItems = allPlaylistItems.concat(playlistData.items);
      }

      pageToken = playlistData.nextPageToken;
      pagesFetched++;
    } while (pageToken && pagesFetched < MAX_YT_PAGES);

    if (allPlaylistItems.length === 0) return [];

    // 3. Get detailed stats and final verification in batches of 50
    const batchSize = 50;
    let allVideoDetails: any[] = [];

    for (let i = 0; i < allPlaylistItems.length; i += batchSize) {
      const batchItems = allPlaylistItems.slice(i, i + batchSize);
      const videoIds = batchItems.map((item: any) => item.contentDetails.videoId).join(',');

      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${apiKey}`;
      const detailsRes = await fetch(detailsUrl, { cache: 'no-store' });
      const detailsData = await detailsRes.json();

      if (detailsData.items) {
        allVideoDetails = allVideoDetails.concat(detailsData.items);
      }
    }

    return allVideoDetails
      .filter((item: any) => {
        const totalSeconds = parseDurationSeconds(item.contentDetails.duration || '');
        return totalSeconds > 0 && totalSeconds <= 185;
      })
      .map((item: any) => ({
        platform_id: item.id,
        title: item.snippet.title,
        platform: 'youtube',
        views: parseInt(item.statistics.viewCount) || 0,
        thumbnail_url: item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
        video_url: `https://youtube.com/shorts/${item.id}`,
        published_at: item.snippet.publishedAt,
        duration: parseDurationSeconds(item.contentDetails.duration || ''),
        hashtags: extractHashtags(item.snippet.title + " " + (item.snippet.description || "")),
        engagement: {
          likes: parseInt(item.statistics.likeCount) || 0,
          comments: parseInt(item.statistics.commentCount) || 0
        }
      }));
  } catch (error) {
    console.error('YouTube Fetch Error:', error);
    throw error instanceof Error ? error : new Error('YouTube fetch failed');
  }
}

export async function fetchInstagramReels(accessToken: string, fullSync: boolean = false): Promise<VideoData[]> {
  if (!accessToken) throw new Error('Missing Instagram access token');
  
  try {
    // 1. Get the Instagram Business Account ID from the Page Token
    const pageUrl = `https://graph.facebook.com/v19.0/me?fields=instagram_business_account&access_token=${accessToken}`;
    const pageRes = await fetch(pageUrl, { cache: 'no-store' });
    const pageData = await pageRes.json();
    
    const igUserId = pageData.instagram_business_account?.id;
    if (!igUserId) {
      throw new Error('Instagram Business Account not found for this token');
    }

    // 2. Fetch media from the Instagram Business Account with pagination
    let allReels: any[] = [];
    let nextUrl: string | null = `https://graph.facebook.com/v19.0/${igUserId}/media?fields=id,caption,media_type,media_url,permalink,timestamp,thumbnail_url,media_product_type&limit=50&access_token=${accessToken}`;
    
    // Safety cap para evitar timeout
    const MAX_IG_PAGES = fullSync ? 10 : 1; // 10 * 50 = ~500 posts
    let igPagesFetched = 0;

    while (nextUrl && igPagesFetched < MAX_IG_PAGES) {
      const res: Response = await fetch(nextUrl as string, { cache: 'no-store' });
      const data: any = await res.json();
      
      if (data.data) {
        // Filtrar y guardar solo REELS
        const reels = data.data.filter((item: any) => item.media_product_type === 'REELS');
        allReels = allReels.concat(reels);
      }
      
      nextUrl = data.paging?.next || null;
      igPagesFetched++;
    }

    if (allReels.length === 0) return [];

    const videoData: VideoData[] = [];

    // 3. Fetch insights for each reel (views, likes, comments) in parallel batches (10 a time)
    const batchSize = 10;
    for (let i = 0; i < allReels.length; i += batchSize) {
      const batch = allReels.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (reel: any) => {
        try {
          const insightsUrl = `https://graph.facebook.com/v19.0/${reel.id}/insights?metric=views,likes,comments&access_token=${accessToken}`;
          const insightRes = await fetch(insightsUrl, { cache: 'no-store' });
          const insightData = await insightRes.json();
          
          const metrics: any = {};
          if (insightData.data) {
            insightData.data.forEach((m: any) => metrics[m.name] = m.values[0].value);
          }

          return {
            platform_id: reel.id,
            title: reel.caption || 'Instagram Reel',
            platform: 'instagram' as const,
            views: metrics.views || 0,
            thumbnail_url: reel.thumbnail_url || reel.media_url,
            video_url: reel.permalink,
            published_at: reel.timestamp,
            duration: undefined,
            hashtags: extractHashtags(reel.caption || ""),
            engagement: {
              likes: metrics.likes || 0,
              comments: metrics.comments || 0
            }
          };
        } catch (error) {
          console.error(`IG Insight Error for ${reel.id}:`, error);
          return null; // Silent catch
        }
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(r => {
        if (r) videoData.push(r);
      });
    }

    return videoData;
  } catch (error) {
    console.error('Instagram Fetch Error:', error);
    throw error instanceof Error ? error : new Error('Instagram fetch failed');
  }
}

export async function fetchTikTokVideos(initialAccessToken: string, fullSync: boolean = false): Promise<VideoData[]> {
  const { getPlatformSettings, updatePlatformSettings } = await import('@/lib/supabase');
  
  // 1. Intentar obtener tokens de la DB primero
  const settings = await getPlatformSettings('tiktok');
  const accessToken = settings?.access_token || initialAccessToken;
  const refreshToken = settings?.refresh_token || process.env.TIKTOK_REFRESH_TOKEN;

  if (!accessToken) throw new Error('Missing TikTok access token');
  
  async function performFetch(token: string, cursor: number = 0) {
    const tiktokUrl = 'https://open.tiktokapis.com/v2/video/list/?fields=id,title,cover_image_url,embed_link,like_count,comment_count,share_count,view_count,create_time,duration';
    return fetch(tiktokUrl, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ max_count: 20, cursor })
    });
  }

  try {
    let currentAccessToken = accessToken;
    let res = await performFetch(currentAccessToken, 0);

    // Refresh TikTok token when the API reports an expired credential.
    if (res.status === 401 && refreshToken) {
      console.info('TikTok token expired. Attempting auto-refresh...');
      const refreshUrl = 'https://open.tiktokapis.com/v2/oauth/token/';
      const body = new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY!,
        client_secret: process.env.TIKTOK_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      });

      const refreshRes = await fetch(refreshUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
      });

      const refreshData = await refreshRes.json();

      if (refreshData.access_token) {
        console.info('TikTok token refreshed successfully.');
        // Persist refreshed tokens for future syncs.
        await updatePlatformSettings('tiktok', {
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token || refreshToken
        });
        
        currentAccessToken = refreshData.access_token;
        // Retry the original request with the new token.
        res = await performFetch(currentAccessToken, 0);
      }
    }
    
    const firstData = await res.json();

    if (!firstData.data || !firstData.data.videos) {
      throw new Error(`TikTok API returned no videos: ${JSON.stringify(firstData)}`);
    }

    // Process paginated TikTok results.
    let allVideos: any[] = [...firstData.data.videos];
    let hasMore = firstData.data.has_more;
    let cursor = firstData.data.cursor;
    
    const MAX_TT_PAGES = fullSync ? 25 : 1;
    let ttPagesFetched = 1;

    while (hasMore && cursor && ttPagesFetched < MAX_TT_PAGES) {
      const nextRes = await performFetch(currentAccessToken, cursor);
      if (nextRes.ok) {
        const nextData = await nextRes.json();
        if (nextData.data?.videos) {
          allVideos = allVideos.concat(nextData.data.videos);
        }
        hasMore = nextData.data?.has_more ?? false;
        cursor = nextData.data?.cursor;
      } else {
        console.warn('TikTok pagination loop finished with non-ok response.');
        break;
      }
      ttPagesFetched++;
    }

    return allVideos.map((video: any) => ({
      platform_id: video.id,
      title: video.title || 'TikTok Video',
      platform: 'tiktok',
      views: video.view_count || 0,
      thumbnail_url: video.cover_image_url,
      video_url: video.embed_link,
      published_at: video.create_time ? new Date(video.create_time * 1000).toISOString() : new Date().toISOString(),
      duration: video.duration || 0,
      hashtags: extractHashtags(video.title || ""),
      engagement: {
        likes: video.like_count || 0,
        comments: video.comment_count || 0,
        shares: video.share_count || 0
      }
    }));
  } catch (error) {
    console.error('TikTok Fetch Error:', error);
    throw error instanceof Error ? error : new Error('TikTok fetch failed');
  }
}
