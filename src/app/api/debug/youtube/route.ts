import { NextResponse } from 'next/server';
import { requireAdminRequest } from '@/lib/apiAuth';
import { fetchYouTubeShorts } from '@/lib/fetchers';

export async function GET(request: Request) {
  const authError = requireAdminRequest(request);
  if (authError) return authError;

  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;

  if (!apiKey || !channelId) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
  }

  try {
    // 1. Get the "uploads" playlist ID for the channel
    const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`;
    const channelRes = await fetch(channelUrl);
    const channelData = await channelRes.json();
    
    if (!channelData.items?.[0]) {
      return NextResponse.json({ error: 'Channel not found', details: channelData });
    }
    const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

    // 2. Fetch recent items from that playlist
    const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${uploadsPlaylistId}&key=${apiKey}`;
    const playlistRes = await fetch(playlistUrl);
    const playlistData = await playlistRes.json();

    if (!playlistData.items) {
      return NextResponse.json({ error: 'No items in playlist', details: playlistData });
    }

    const videoIds = playlistData.items.map((item: any) => item.contentDetails.videoId).join(',');

    // 3. Get detailed stats and final verification
    const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${apiKey}`;
    const detailsRes = await fetch(detailsUrl);
    const detailsData = await detailsRes.json();

    const analysis = detailsData.items.map((item: any) => {
      const duration = item.contentDetails.duration;
      const isShortsFiltered = (duration.includes('S') && !duration.includes('M') && !duration.includes('H')) || (duration === 'PT1M');
      return {
        title: item.snippet.title,
        id: item.id,
        duration,
        isShortsFiltered,
        raw: item.contentDetails
      };
    });

    return NextResponse.json({ 
      channelId,
      uploadsPlaylistId,
      totalChecked: analysis.length,
      analysis 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
