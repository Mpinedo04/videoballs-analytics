import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/conversations — List all conversations (newest first)
 */
export async function GET() {
  const supabase = getSupabaseService();

  try {
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('id, title, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ conversations: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/conversations — Create a new conversation
 * Body: { title?: string }
 */
export async function POST(request: Request) {
  const supabase = getSupabaseService();

  try {
    const body = await request.json().catch(() => ({}));
    const title = body.title || 'Nueva conversación';

    const { data, error } = await supabase
      .from('chat_conversations')
      .insert({ title })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ conversation: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/conversations?id=xxx — Delete a conversation
 */
export async function DELETE(request: Request) {
  const supabase = getSupabaseService();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing conversation id' }, { status: 400 });
  }

  try {
    const { error } = await supabase
      .from('chat_conversations')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
