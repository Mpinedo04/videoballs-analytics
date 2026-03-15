const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function wipeAndSync() {
  console.log('Cleaning database...');
  const { error: deleteError } = await supabase.from('videos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (deleteError) {
    console.error('Error wiping DB:', deleteError);
    return;
  }
  
  console.log('Database cleaned. Please refresh the browser and click "Refresh Data" to get REAL YouTube data.');
  console.log('Note: Instagram/TikTok will remain empty as you have not provided tokens for them.');
}

wipeAndSync();
