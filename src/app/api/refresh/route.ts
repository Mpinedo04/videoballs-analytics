import { NextResponse } from 'next/server';
import { requireAdminRequest } from '@/lib/apiAuth';
import { syncVideos } from '@/lib/syncVideos';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const authError = requireAdminRequest(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const fullSync = searchParams.get('full') === 'true';

  try {
    const result = await syncVideos({ fullSync });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Refresh Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown refresh error' },
      { status: 500 }
    );
  }
}
