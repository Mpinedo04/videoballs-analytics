const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

async function fetchInstagramBusinessData() {
  console.log('🔄 Step 1: Finding connected Instagram Business Account...\n');
  
  try {
    // 1. We must query the PAGE to find its connected Instagram Account ID
    const pageUrl = `https://graph.facebook.com/v19.0/me?fields=instagram_business_account&access_token=${accessToken}`;
    const pageRes = await fetch(pageUrl);
    const pageData = await pageRes.json();
    
    if (pageData.error) {
        console.error('❌ Error getting Page data:', JSON.stringify(pageData.error, null, 2));
        return;
    }

    if (!pageData.instagram_business_account) {
        console.error('❌ Data returned, but NO Instagram Business Account found attached to this token!');
        console.error('Raw Page Data:', pageData);
        return;
    }

    const igUserId = pageData.instagram_business_account.id;
    console.log(`✅ Success! Found Instagram Business Account ID: ${igUserId}`);
    console.log(`\n🔄 Step 2: Fetching Reels for IG User: ${igUserId}...\n`);

    // 2. NOW we fetch the media using the actual Instagram ID, not 'me'
    const mediaUrl = `https://graph.facebook.com/v19.0/${igUserId}/media?fields=id,caption,media_type,media_url,permalink,timestamp,thumbnail_url,media_product_type&access_token=${accessToken}`;
    const mediaRes = await fetch(mediaUrl);
    const mediaData = await mediaRes.json();

    if (mediaData.error) {
       console.error('❌ API ERROR on Media Fetch:');
       console.error(JSON.stringify(mediaData.error, null, 2));
       return;
    }

    if (!mediaData.data || mediaData.data.length === 0) {
      console.log('✅ API Connected, but no media found on this account.');
      return;
    }

    console.log(`✅ Found ${mediaData.data.length} total media items.`);
    
    const reels = mediaData.data.filter(item => item.media_product_type === 'REELS');
    console.log(`Found ${reels.length} Reels.\n`);

    if (reels.length > 0) {
        console.log('--- REELS DATA ---');
        reels.slice(0, 3).forEach(reel => {
            console.log(`- [${reel.id}] ${reel.caption?.substring(0, 30)}...`);
        });

        // Test insights
        const firstReel = reels[0];
        console.log('\nTesting Insights extraction for the first Reel...');
        const insightsUrl = `https://graph.facebook.com/v19.0/${firstReel.id}/insights?metric=plays,likes,comments&access_token=${accessToken}`;
        const insightRes = await fetch(insightsUrl);
        const insightData = await insightRes.json();
        
        if (insightData.error) {
            console.error('❌ INSIGHTS ERROR:', insightData.error.message);
        } else {
            console.log('✅ Insights extraction successful!');
        }
    }

  } catch (error) {
    console.error('Network error:', error);
  }
}

fetchInstagramBusinessData();
