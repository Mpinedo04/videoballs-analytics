import { NextResponse } from 'next/server';
import { requireAdminRequest } from '@/lib/apiAuth';
import { getGeminiModel } from '@/lib/gemini';
import { getSupabaseService } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface VideoRow {
  id: string;
  title: string;
  platform: 'youtube' | 'tiktok' | 'instagram';
  views: number;
  published_at: string;
  engagement?: { likes?: number; comments?: number; shares?: number };
  hashtags?: string[];
  duration?: number;
}

export async function POST(request: Request) {
  const authError = requireAdminRequest(request);
  if (authError) return authError;

  const supabase = getSupabaseService();

  try {
    const { messages, conversationId } = await request.json() as {
      messages: ChatMessage[];
      conversationId?: string;
    };

    if (!messages?.length) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    const { data: videos } = await supabase
      .from('videos')
      .select('id, title, platform, views, published_at, engagement, hashtags, duration')
      .order('published_at', { ascending: false })
      .limit(120);

    const { snapshot, snapshotDate } = await loadPreviousSnapshot(supabase);
    const dataContext = buildDataContext((videos || []) as VideoRow[], snapshot, snapshotDate);
    const model = getGeminiModel();

    const systemPrompt = `Eres el Oraculo VideoBalls, analista senior de contenido corto.
Respondes en espanol, con tono claro, directo y practico.
Usa solo los datos del contexto. Si faltan datos, dilo.
Prioriza acciones concretas para mejorar views, retencion, engagement y repeticion de formatos ganadores.
Maximo 4 parrafos salvo que el usuario pida detalle.

CONTEXTO ESTRUCTURADO:
${dataContext}`;

    const chatHistory = messages.slice(0, -1).map(message => ({
      role: message.role === 'user' ? 'user' as const : 'model' as const,
      parts: [{ text: message.content }],
    }));

    const lastMessage = messages[messages.length - 1].content;
    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: `Contexto del sistema:\n${systemPrompt}` }] },
        { role: 'model', parts: [{ text: 'Contexto cargado. Puedo analizar el rendimiento del canal.' }] },
        ...chatHistory,
      ],
    });

    const result = await chat.sendMessage(lastMessage);
    const replyText = result.response.text();

    if (conversationId) {
      await supabase.from('chat_messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: lastMessage,
      });

      await supabase.from('chat_messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: replyText,
      });

      const conversationUpdate: { title?: string; updated_at: string } = {
        updated_at: new Date().toISOString(),
      };

      if (messages.length === 1) {
        conversationUpdate.title = lastMessage.slice(0, 60) + (lastMessage.length > 60 ? '...' : '');
      }

      await supabase
        .from('chat_conversations')
        .update(conversationUpdate)
        .eq('id', conversationId);
    }

    return NextResponse.json({ reply: replyText });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: `Error del Oraculo: ${error instanceof Error ? error.message : 'Error desconocido'}` },
      { status: 500 }
    );
  }
}

async function loadPreviousSnapshot(supabase: ReturnType<typeof getSupabaseService>) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let daysBack = 1; daysBack <= 3; daysBack++) {
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() - daysBack);
    const dateStr = targetDate.toISOString().slice(0, 10);

    const { data } = await supabase
      .from('views_snapshots')
      .select('video_id, views')
      .eq('snapshot_date', dateStr);

    if (data?.length) {
      const snapshot: Record<string, number> = {};
      data.forEach(row => {
        snapshot[row.video_id] = row.views;
      });
      return { snapshot, snapshotDate: dateStr };
    }
  }

  return { snapshot: {}, snapshotDate: null as string | null };
}

function buildDataContext(videos: VideoRow[], snapshot: Record<string, number>, snapshotDate: string | null) {
  const totalViews = videos.reduce((sum, video) => sum + (video.views || 0), 0);
  const totalLikes = videos.reduce((sum, video) => sum + (video.engagement?.likes || 0), 0);
  const totalComments = videos.reduce((sum, video) => sum + (video.engagement?.comments || 0), 0);
  const engagementRate = totalViews > 0 ? ((totalLikes + totalComments) / totalViews * 100).toFixed(2) : '0.00';

  const platformSummary = ['youtube', 'instagram', 'tiktok'].map(platform => {
    const platformVideos = videos.filter(video => video.platform === platform);
    const views = platformVideos.reduce((sum, video) => sum + (video.views || 0), 0);
    const avg = platformVideos.length ? Math.round(views / platformVideos.length) : 0;
    return `${platform}: ${platformVideos.length} videos, ${views} views, ${avg} avg`;
  }).join('\n');

  const growth = videos
    .map(video => {
      const previous = snapshot[video.id];
      const delta = previous === undefined ? null : video.views - previous;
      const pct = previous && delta !== null ? (delta / previous) * 100 : null;
      return { video, previous, delta, pct };
    })
    .filter(item => item.delta !== null)
    .sort((a, b) => (b.delta || 0) - (a.delta || 0));

  const topGrowth = growth.slice(0, 10).map(item =>
    `${item.video.platform} | ${item.video.title.slice(0, 70)} | +${item.delta} views | ${item.pct?.toFixed(1)}%`
  ).join('\n') || 'Sin snapshot previo suficiente.';

  const topVideos = [...videos]
    .sort((a, b) => b.views - a.views)
    .slice(0, 10)
    .map(video => `${video.platform} | ${video.title.slice(0, 70)} | ${video.views} views | ER ${calcVideoEngagement(video)}%`)
    .join('\n');

  const weakVideos = [...videos]
    .filter(video => video.views > 0)
    .sort((a, b) => a.views - b.views)
    .slice(0, 8)
    .map(video => `${video.platform} | ${video.title.slice(0, 70)} | ${video.views} views`)
    .join('\n');

  const hashtags = summarizeHashtags(videos);
  const durations = summarizeDurations(videos);

  return [
    `Fecha: ${new Date().toLocaleDateString('es-ES')}`,
    `Videos analizados: ${videos.length}`,
    `Total views: ${totalViews}`,
    `Likes: ${totalLikes}`,
    `Comentarios: ${totalComments}`,
    `Engagement rate global: ${engagementRate}%`,
    `Snapshot usado: ${snapshotDate || 'no disponible'}`,
    '',
    'Resumen por plataforma:',
    platformSummary,
    '',
    'Top crecimiento reciente:',
    topGrowth,
    '',
    'Top videos por views:',
    topVideos || 'Sin videos.',
    '',
    'Videos mas flojos por views:',
    weakVideos || 'Sin datos suficientes.',
    '',
    'Hashtags destacados:',
    hashtags,
    '',
    'Duracion:',
    durations,
  ].join('\n');
}

function calcVideoEngagement(video: VideoRow) {
  const interactions = (video.engagement?.likes || 0) + (video.engagement?.comments || 0);
  return video.views > 0 ? ((interactions / video.views) * 100).toFixed(2) : '0.00';
}

function summarizeHashtags(videos: VideoRow[]) {
  const map = new Map<string, { views: number; count: number }>();

  videos.forEach(video => {
    (video.hashtags || []).forEach(tag => {
      const key = tag.toLowerCase();
      const current = map.get(key) || { views: 0, count: 0 };
      current.views += video.views || 0;
      current.count += 1;
      map.set(key, current);
    });
  });

  const top = [...map.entries()]
    .filter(([, stats]) => stats.count >= 2)
    .map(([tag, stats]) => ({ tag, avg: Math.round(stats.views / stats.count), count: stats.count }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 8);

  return top.length
    ? top.map(item => `#${item.tag}: ${item.avg} avg views (${item.count} usos)`).join('\n')
    : 'No hay hashtags repetidos suficientes.';
}

function summarizeDurations(videos: VideoRow[]) {
  const buckets = [
    { key: '<30s', min: 0, max: 29 },
    { key: '30-60s', min: 30, max: 60 },
    { key: '>60s', min: 61, max: Number.POSITIVE_INFINITY },
  ];

  return buckets.map(bucket => {
    const rows = videos.filter(video => typeof video.duration === 'number' && video.duration >= bucket.min && video.duration <= bucket.max);
    const avg = rows.length ? Math.round(rows.reduce((sum, video) => sum + video.views, 0) / rows.length) : 0;
    return `${bucket.key}: ${rows.length} videos, ${avg} avg views`;
  }).join('\n');
}
