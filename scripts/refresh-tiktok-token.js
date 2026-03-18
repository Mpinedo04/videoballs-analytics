const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function refreshToken() {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const refreshToken = process.env.TIKTOK_REFRESH_TOKEN;

  if (!clientKey || !clientSecret || !refreshToken) {
    console.error('Missing TikTok credentials in .env.local');
    return;
  }

  try {
    const url = 'https://open.tiktokapis.com/v2/oauth/token/';
    
    // TikTok requires application/x-www-form-urlencoded for token exchange
    const body = new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    });

    console.log('Attempting to refresh TikTok token...');

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache'
      },
      body: body.toString()
    });

    const data = await res.json();
    console.log('TikTok Response:', JSON.stringify(data, null, 2));

    if (data.access_token) {
      console.log('✅ New Access Token obtained!');
      // Update .env.local
      let envContent = fs.readFileSync('.env.local', 'utf8');
      
      envContent = envContent.replace(/TIKTOK_ACCESS_TOKEN=.*/, `TIKTOK_ACCESS_TOKEN=${data.access_token}`);
      if (data.refresh_token) {
        envContent = envContent.replace(/TIKTOK_REFRESH_TOKEN=.*/, `TIKTOK_REFRESH_TOKEN=${data.refresh_token}`);
      }
      
      fs.writeFileSync('.env.local', envContent);
      console.log('✅ .env.local updated successfully.');
    } else {
      console.error('❌ Failed to obtain access token. Refresh token might be expired too.');
    }
  } catch (err) {
    console.error('🚨 Error during token refresh:', err);
  }
}

refreshToken();
