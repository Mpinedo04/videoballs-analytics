import { NextResponse } from 'next/server';
import { requireCronRequest } from '@/lib/apiAuth';
import { syncVideos } from '@/lib/syncVideos';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authError = requireCronRequest(request);
  if (authError) return authError;

  try {
    const result = await syncVideos({ fullSync: false });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Cron Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown cron error' },
      { status: 500 }
    );
  }
}
