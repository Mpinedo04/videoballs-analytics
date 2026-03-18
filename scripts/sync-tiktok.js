
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const tiktokToken = process.env.TIKTOK_ACCESS_TOKEN;

if (!supabaseUrl || !supabaseKey || !tiktokToken) {
  console.error('Missing credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncTikTok() {
  console.log('Fetching TikTok videos...');
  
  try {
    const res = await fetch('https://open.tiktokapis.com/v2/video/list/?fields=id,title,cover_image_url,embed_link,like_count,comment_count,share_count,view_count,create_time,duration', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tiktokToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ max_count: 20 })
    });
    
    const data = await res.json();
    
    if (!data.data || !data.data.videos) {
      console.error('TikTok API Error:', JSON.stringify(data, null, 2));
      return;
    }

    const videos = data.data.videos.map(v => ({
      platform_id: v.id,
      title: v.title || 'TikTok Video',
      platform: 'tiktok',
      views: v.view_count || 0,
      thumbnail_url: v.cover_image_url,
      video_url: v.embed_link,
      published_at: v.create_time ? new Date(v.create_time * 1000).toISOString() : new Date().toISOString(),
      engagement: {
        likes: v.like_count || 0,
        comments: v.comment_count || 0,
        shares: v.share_count || 0
      }
    }));

    console.log(`Found ${videos.length} videos. Saving to Supabase...`);

    for (const video of videos) {
      const { error } = await supabase
        .from('videos')
        .upsert(video, { onConflict: 'platform_id,platform' });
      
      if (error) console.error(`Error saving video ${video.platform_id}:`, error);
    }

    console.log('Sync complete!');
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

syncTikTok();
