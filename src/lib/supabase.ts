import { createClient } from '@supabase/supabase-js';

const getSupabaseConfig = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return { url, anonKey };
};

// Client for public use (browser/edge)
export const getSupabase = () => {
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) {
    console.warn("Supabase public environment variables are missing.");
    return null as any;
  }
  return createClient(url, anonKey);
};

// Service role client for backend operations
export const getSupabaseService = () => {
  const { url } = getSupabaseConfig();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !serviceKey) {
    console.warn("Supabase service environment variables are missing.");
    return null as any;
  }
  
  return createClient(url, serviceKey);
};

// Legacy export if needed, but safer as null during build
export const supabase = typeof window !== 'undefined' ? getSupabase() : null as any;
