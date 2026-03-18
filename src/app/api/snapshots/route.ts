import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/snapshots
 * Returns the most recent snapshot BEFORE today.
 * Looks back up to 3 days.
 * Response: { [video_id]: views }
 */
export async function GET() {
  try {
    // Find the most recent snapshot date before today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let daysBack = 1; daysBack <= 3; daysBack++) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() - daysBack);
      const dateStr = targetDate.toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from('views_snapshots')
        .select('video_id, views')
        .eq('snapshot_date', dateStr);

      if (error) {
        console.error(`Snapshot query error for ${dateStr}:`, error);
        continue;
      }

      if (data && data.length > 0) {
        // Build the { video_id: views } map
        const snapshot: Record<string, number> = {};
        data.forEach((row: { video_id: string; views: number }) => {
          snapshot[row.video_id] = row.views;
        });

        return NextResponse.json({
          snapshot,
          date: dateStr,
          count: data.length,
        });
      }
    }

    // No snapshot found in the last 3 days
    return NextResponse.json({ snapshot: {}, date: null, count: 0 });
  } catch (error: any) {
    console.error('Snapshots API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
