const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
const token = process.env.TIKTOK_ACCESS_TOKEN;

async function testTikTok() {
  if (!token) {
    console.error('No TIKTOK_ACCESS_TOKEN found');
    return;
  }
  try {
    const tiktokUrl = 'https://open.tiktokapis.com/v2/video/list/?fields=id,title,cover_image_url,embed_link,like_count,comment_count,share_count,view_count,create_time,duration';
    const res = await fetch(tiktokUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ max_count: 20 })
    });
    
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch(e) {
    console.error(e);
  }
}
testTikTok();
