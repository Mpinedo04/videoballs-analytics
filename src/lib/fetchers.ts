
/**
 * Platform specific fetcher functions for YouTube, Instagram, and TikTok.
 */

interface VideoData {
  platform_id: string;
  title: string;
  platform: 'youtube' | 'tiktok' | 'instagram';
  views: number;
  thumbnail_url: string;
  video_url: string;
  published_at: string;
  engagement: { likes: number; comments: number };
}

export async function fetchYouTubeShorts(apiKey: string, channelId?: string): Promise<VideoData[]> {
  if (!apiKey || !channelId) return [];
  
  try {
    // 1. Get the "uploads" playlist ID for the channel
    const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`;
    const channelRes = await fetch(channelUrl, { cache: 'no-store' });
    const channelData = await channelRes.json();
    
    if (!channelData.items?.[0]) return [];
    const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

    // 2. Fetch recent items from that playlist
    const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${uploadsPlaylistId}&key=${apiKey}`;
    const playlistRes = await fetch(playlistUrl, { cache: 'no-store' });
    const playlistData = await playlistRes.json();

    if (!playlistData.items) return [];

    const videoIds = playlistData.items.map((item: any) => item.contentDetails.videoId).join(',');

    // 3. Get detailed stats and final verification
    const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${apiKey}`;
    const detailsRes = await fetch(detailsUrl, { cache: 'no-store' });
    const detailsData = await detailsRes.json();

    return detailsData.items
      .filter((item: any) => {
        const duration = item.contentDetails.duration; // ISO 8601: PT##H##M##S
        
        // Parse ISO 8601 duration to total seconds
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        const hours = parseInt(match[1] || '0');
        const minutes = parseInt(match[2] || '0');
        const seconds = parseInt(match[3] || '0');
        
        const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
        
        // YouTube Shorts now allow up to 3 minutes (180s)
        // We'll allow a slight margin similarly (up to 185s)
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
        engagement: {
          likes: parseInt(item.statistics.likeCount) || 0,
          comments: parseInt(item.statistics.commentCount) || 0
        }
      }));
  } catch (error) {
    console.error('YouTube Fetch Error:', error);
    return [];
  }
}

export async function fetchInstagramReels(accessToken: string): Promise<VideoData[]> {
  if (!accessToken) return [];
  
  try {
    // 1. Get the Instagram Business Account ID from the Page Token
    const pageUrl = `https://graph.facebook.com/v19.0/me?fields=instagram_business_account&access_token=${accessToken}`;
    const pageRes = await fetch(pageUrl, { cache: 'no-store' });
    const pageData = await pageRes.json();
    
    const igUserId = pageData.instagram_business_account?.id;
    if (!igUserId) {
      console.error('Instagram: No Business Account found linked to this Page Token.');
      return [];
    }

    // 2. Fetch media from the Instagram Business Account
    const mediaUrl = `https://graph.facebook.com/v19.0/${igUserId}/media?fields=id,caption,media_type,media_url,permalink,timestamp,thumbnail_url,media_product_type&access_token=${accessToken}`;
    const res = await fetch(mediaUrl, { cache: 'no-store' });
    const data = await res.json();
    
    if (!data.data) return [];

    const reels = data.data.filter((item: any) => item.media_product_type === 'REELS');

    const videoData: VideoData[] = [];

    for (const reel of reels) {
      // 3. Fetch insights for each reel (views, likes, comments)
      // Fetch views, likes, comments metrics
      const insightsUrl = `https://graph.facebook.com/v19.0/${reel.id}/insights?metric=views,likes,comments&access_token=${accessToken}`;
      const insightRes = await fetch(insightsUrl, { cache: 'no-store' });
      const insightData = await insightRes.json();
      
      const metrics: any = {};
      insightData.data?.forEach((m: any) => metrics[m.name] = m.values[0].value);

      videoData.push({
        platform_id: reel.id,
        title: reel.caption || 'Instagram Reel',
        platform: 'instagram',
        views: metrics.views || 0,
        thumbnail_url: reel.thumbnail_url || reel.media_url,
        video_url: reel.permalink,
        published_at: reel.timestamp,
        engagement: {
          likes: metrics.likes || 0,
          comments: metrics.comments || 0
        }
      });
    }

    return videoData;
  } catch (error) {
    console.error('Instagram Fetch Error:', error);
    return [];
  }
}

export async function fetchTikTokVideos(accessToken: string): Promise<VideoData[]> {
  if (!accessToken) return [];
  
  try {
    const tiktokUrl = 'https://open.tiktokapis.com/v2/video/list/?fields=id,title,cover_image_url,embed_link,like_count,comment_count,share_count,view_count,create_time';
    
    const res = await fetch(tiktokUrl, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        max_count: 20
      })
    });
    
    const data = await res.json();

    if (!data.data || !data.data.videos) {
      console.error('TikTok API Error or empty:', data);
      return [];
    }

    return data.data.videos.map((video: any) => ({
      platform_id: video.id,
      title: video.title || 'TikTok Video',
      platform: 'tiktok',
      views: video.view_count || 0,
      thumbnail_url: video.cover_image_url,
      video_url: video.embed_link,
      published_at: video.create_time ? new Date(video.create_time * 1000).toISOString() : new Date().toISOString(),
      engagement: {
        likes: video.like_count || 0,
        comments: video.comment_count || 0,
        shares: video.share_count || 0
      }
    }));
  } catch (error) {
    console.error('TikTok Fetch Error:', error);
    return [];
  }
}
