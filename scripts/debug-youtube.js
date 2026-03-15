const fetch = require('node-fetch');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const apiKey = process.env.YOUTUBE_API_KEY;
const channelId = process.env.YOUTUBE_CHANNEL_ID;

async function debugVideos() {
  if (!apiKey || !channelId) {
    console.error('Missing API key or Channel ID');
    return;
  }

  console.log(`Checking channel: ${channelId}`);
  
  try {
    // 1. Get uploads playlist
    const channelRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`);
    const channelData = await channelRes.json();
    const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

    // 2. Fetch all items (up to 50)
    const playlistRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${uploadsPlaylistId}&key=${apiKey}`);
    const playlistData = await playlistRes.json();

    const videoIds = playlistData.items.map(item => item.contentDetails.videoId).join(',');

    // 3. Get details including duration
    const detailsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoIds}&key=${apiKey}`);
    const detailsData = await detailsRes.json();

    console.log('\n--- ALL VIDEOS IN CHANNEL ---');
    detailsData.items.forEach(item => {
      const duration = item.contentDetails.duration;
      const title = item.snippet.title;
      const isShortsFiltered = (duration.includes('S') && !duration.includes('M') && !duration.includes('H')) || (duration === 'PT1M');
      
      console.log(`[${isShortsFiltered ? 'KEEP' : 'SKIP'}] Title: ${title} | Duration: ${duration} | ID: ${item.id}`);
    });
    console.log('-----------------------------\n');

  } catch (error) {
    console.error('Error debugging videos:', error);
  }
}

debugVideos();
