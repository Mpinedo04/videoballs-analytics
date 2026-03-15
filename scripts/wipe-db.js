
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function wipeDatabase() {
  console.log('Wiping videos table...');
  const { error } = await supabase.from('videos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) {
    console.error('Wipe error:', error);
  } else {
    console.log('Database wiped successfully.');
  }
}

wipeDatabase();
