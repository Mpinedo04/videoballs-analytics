const fetch = require('node-fetch');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

async function debugInstagram() {
  if (!accessToken || accessToken === 'TU_INSTAGRAM_ACCESS_TOKEN_AQUI') {
    console.error('Missing or invalid Instagram Access Token');
    return;
  }

  console.log('Testing Instagram Access Token...\n');
  
  try {
    // 1. Fetch user media
    const mediaUrl = `https://graph.facebook.com/v19.0/me/media?fields=id,caption,media_type,media_url,permalink,timestamp,thumbnail_url,media_product_type&access_token=${accessToken}`;
    console.log('Fetching media from:', mediaUrl.split('&access_token=')[0] + '&access_token=***');
    
    const res = await fetch(mediaUrl);
    const data = await res.json();
    
    if (data.error) {
       console.error('\n❌ API ERROR:');
       console.error(JSON.stringify(data.error, null, 2));
       return;
    }

    if (!data.data || data.data.length === 0) {
      console.log('✅ API Connected, but no media found on this account.');
      return;
    }

    console.log(`✅ API Connected! Found ${data.data.length} total media items.`);
    
    const reels = data.data.filter(item => item.media_product_type === 'REELS');
    console.log(`Found ${reels.length} Reels.\n`);

    if (reels.length > 0) {
        console.log('--- REELS DATA ---');
        reels.slice(0, 3).forEach(reel => {
            console.log(`- [${reel.id}] ${reel.caption?.substring(0, 30)}...`);
        });
        if (reels.length > 3) console.log(`...and ${reels.length - 3} more.`);

        // Test insights for the first reel
        console.log('\nTesting Insights extraction for the first Reel...');
        const firstReel = reels[0];
        const insightsUrl = `https://graph.facebook.com/v19.0/${firstReel.id}/insights?metric=plays,likes,comments&access_token=${accessToken}`;
        const insightRes = await fetch(insightsUrl);
        const insightData = await insightRes.json();
        
        if (insightData.error) {
            console.error('❌ INSIGHTS ERROR:');
            console.error(JSON.stringify(insightData.error, null, 2));
        } else {
            console.log('✅ Insights extraction successful!');
            console.log(JSON.stringify(insightData, null, 2));
        }
    } else {
        console.log('No Reels available to check insights.');
    }

  } catch (error) {
    console.error('\n❌ Network or Parsing Error:', error);
  }
}

debugInstagram();
