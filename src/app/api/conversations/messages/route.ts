import { NextResponse } from 'next/server';
import { requireAdminRequest } from '@/lib/apiAuth';
import { getSupabaseService } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/conversations/messages?conversationId=xxx
 * Returns all messages for a conversation
 */
export async function GET(request: Request) {
  const authError = requireAdminRequest(request);
  if (authError) return authError;

  const supabase = getSupabaseService();
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get('conversationId');

  if (!conversationId) {
    return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ messages: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
