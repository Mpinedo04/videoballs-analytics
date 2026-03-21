import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Service role client for backend operations
export const getSupabaseService = () => {
  return createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};

// ── Platform Settings Helpers ──────────────────────────────────────────────

export async function getPlatformSettings(platform: string) {
  const supabase = getSupabaseService();
  const { data, error } = await supabase
    .from('platform_settings')
    .select('*')
    .eq('platform', platform)
    .maybeSingle(); // Usamos maybeSingle para evitar error si no existe la fila
  
  if (error) {
    console.error(`Error fetching ${platform} settings:`, error);
  }
  return data;
}

export async function updatePlatformSettings(platform: string, settings: { access_token: string; refresh_token?: string }) {
  const supabase = getSupabaseService();
  const { error } = await supabase
    .from('platform_settings')
    .upsert({
      platform,
      ...settings,
      updated_at: new Date().toISOString()
    }, { onConflict: 'platform' });
  
  if (error) {
    console.error(`Error updating ${platform} settings:`, error);
    throw error;
  }
}
