
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TIKTOK_TOKEN = process.env.TIKTOK_ACCESS_TOKEN;

if (!supabaseUrl || !supabaseKey || !TIKTOK_TOKEN) {
  console.error('Missing credentials or TikTok Token in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncTikTok() {
  console.log('--- Sincronizando TikTok (Siguiendo Esquema de Supabase) ---');
  
  try {
    const response = await fetch('https://open.tiktokapis.com/v2/video/list/?fields=id,title,cover_image_url,embed_link,like_count,comment_count,share_count,view_count,create_time', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TIKTOK_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        max_count: 20
      }),
    });

    const data = await response.json();
    
    if (!data.data || !data.data.videos) {
      console.log('Error o sin vídeos:', data);
      return;
    }

    const ttVideos = data.data.videos;
    console.log(`Encontrados ${ttVideos.length} vídeos.`);

    const videosToUpsert = ttVideos.map(v => ({
      platform: 'tiktok',
      platform_id: v.id,
      title: v.title || 'TikTok Video',
      thumbnail_url: v.cover_image_url,
      video_url: v.embed_link,
      views: v.view_count || 0,
      engagement: {
        likes: v.like_count || 0,
        comments: v.comment_count || 0,
        shares: v.share_count || 0
      },
      published_at: v.create_time ? new Date(v.create_time * 1000).toISOString() : new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { error: upsertError } = await supabase
      .from('videos')
      .upsert(videosToUpsert, { onConflict: 'platform,platform_id' });

    if (upsertError) {
      console.error('Error al guardar:', upsertError);
    } else {
      console.log('✅ ¡Bolas de TikTok sincronizadas!');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

syncTikTok();
