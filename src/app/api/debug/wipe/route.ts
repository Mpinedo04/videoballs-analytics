import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';

export async function POST() {
  const supabase = getSupabaseService();
  try {
    const { error } = await supabase.from('videos').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    if (error) throw error;
    return NextResponse.json({ success: true, message: 'Database wiped' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
