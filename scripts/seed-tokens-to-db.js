const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedTokens() {
  const tiktokAccess = process.env.TIKTOK_ACCESS_TOKEN;
  const tiktokRefresh = process.env.TIKTOK_REFRESH_TOKEN;

  if (!tiktokAccess || !tiktokRefresh) {
    console.error('Missing TikTok tokens in .env.local');
    return;
  }

  console.log('Upserting TikTok tokens into platform_settings...');

  const { error } = await supabase
    .from('platform_settings')
    .upsert({
      platform: 'tiktok',
      access_token: tiktokAccess,
      refresh_token: tiktokRefresh,
      updated_at: new Date().toISOString()
    }, { onConflict: 'platform' });

  if (error) {
    console.error('Error seeding tokens:', error);
  } else {
    console.log('✅ TikTok tokens successfully migrated to Supabase.');
    console.log('Now you can safely stop updating Vercel env variables for TikTok.');
  }
}

seedTokens();
