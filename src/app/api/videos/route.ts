// v0.1.3 - Final Master Trigger
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = searchParams.get('days') || '90';
  
  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - parseInt(days));

  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .gte('published_at', dateLimit.toISOString())
    .order('published_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
