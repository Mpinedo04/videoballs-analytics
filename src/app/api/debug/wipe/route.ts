import { NextResponse } from 'next/server';
import { requireAdminRequest } from '@/lib/apiAuth';
import { getSupabaseService } from '@/lib/supabase';

export async function POST(request: Request) {
  if (process.env.ENABLE_DEBUG_ROUTES !== 'true') {
    return NextResponse.json({ error: 'Debug routes are disabled.' }, { status: 404 });
  }

  const authError = requireAdminRequest(request);
  if (authError) return authError;

  const supabase = getSupabaseService();
  try {
    const { error } = await supabase.from('videos').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    if (error) throw error;
    return NextResponse.json({ success: true, message: 'Database wiped' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
