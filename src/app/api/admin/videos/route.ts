import { NextResponse } from 'next/server';
import { requireAdminRequest } from '@/lib/apiAuth';
import { getSupabaseService } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authError = requireAdminRequest(request);
  if (authError) return authError;

  const supabase = getSupabaseService();
  const { data, error } = await supabase
    .from('videos')
    .select('id, platform, title, published_at, group_id, views')
    .order('published_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ videos: data || [] });
}

export async function PATCH(request: Request) {
  const authError = requireAdminRequest(request);
  if (authError) return authError;

  const body = await request.json().catch(() => null) as { id?: string; group_id?: string | null } | null;
  if (!body?.id) {
    return NextResponse.json({ error: 'Missing video id' }, { status: 400 });
  }

  const supabase = getSupabaseService();
  const { data, error } = await supabase
    .from('videos')
    .update({ group_id: body.group_id || null })
    .eq('id', body.id)
    .select('id, group_id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ video: data });
}

