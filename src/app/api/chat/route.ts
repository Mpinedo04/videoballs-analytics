import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { getGeminiModel } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * POST /api/chat
 * Body: { messages: ChatMessage[], conversationId?: string }
 * 
 * Conversational AI — el Oráculo VideoBalls con contexto de datos reales.
 * If conversationId is provided, saves messages to Supabase.
 */
export async function POST(request: Request) {
  const supabase = getSupabaseService();

  try {
    const { messages, conversationId } = await request.json() as { 
      messages: ChatMessage[];
      conversationId?: string;
    };

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    const model = getGeminiModel();

    // 1. Fetch current video data for context
    const { data: videos } = await supabase
      .from('videos')
      .select('title, platform, views, published_at, engagement, hashtags, duration')
      .order('published_at', { ascending: false })
      .limit(50);

    // 2. Fetch yesterday's snapshot for velocity data
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let snapshotInfo = '';
    
    for (let daysBack = 1; daysBack <= 3; daysBack++) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() - daysBack);
      const dateStr = targetDate.toISOString().slice(0, 10);

      const { data: snapData } = await supabase
        .from('views_snapshots')
        .select('video_id, views')
        .eq('snapshot_date', dateStr);

      if (snapData && snapData.length > 0) {
        snapshotInfo = `\nSnapshot previo (${dateStr}): ${snapData.length} vídeos registrados.`;
        if (videos) {
          const snapMap: Record<string, number> = {};
          snapData.forEach((s: any) => { snapMap[s.video_id] = s.views; });
          
          const { data: videoIds } = await supabase
            .from('videos')
            .select('id, title, views, platform')
            .order('published_at', { ascending: false })
            .limit(50);

          if (videoIds) {
            const changes = videoIds
              .filter((v: any) => snapMap[v.id] !== undefined && v.views !== snapMap[v.id])
              .map((v: any) => {
                const prev = snapMap[v.id];
                const diff = v.views - prev;
                const pct = prev > 0 ? ((diff / prev) * 100).toFixed(1) : 'N/A';
                return `  ${v.title.slice(0, 40)} (${v.platform}): ${prev} → ${v.views} (${diff >= 0 ? '+' : ''}${diff}, ${pct}%)`;
              });
            if (changes.length > 0) {
              snapshotInfo += '\nCambios de visitas desde el último snapshot:\n' + changes.join('\n');
            }
          }
        }
        break;
      }
    }

    // 3. Build platform summaries
    const vids = videos || [];
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayVideos = vids.filter(v => v.published_at?.startsWith(todayStr));
    
    const totalViews = vids.reduce((a, v) => a + (v.views || 0), 0);
    const totalLikes = vids.reduce((a, v) => a + (v.engagement?.likes || 0), 0);
    const totalComments = vids.reduce((a, v) => a + (v.engagement?.comments || 0), 0);

    const formatVideo = (v: any) => 
      `[${v.platform}] "${v.title?.slice(0, 60)}" — ${v.views} views, ${v.engagement?.likes || 0} likes, ${v.engagement?.comments || 0} comments (${v.published_at?.slice(0, 16)})`;

    const dataContext = `
DATOS ACTUALES DEL CANAL (${new Date().toLocaleDateString('es-ES')}):
Total vídeos: ${vids.length} | Total visitas: ${totalViews.toLocaleString()} | Likes: ${totalLikes.toLocaleString()} | Comentarios: ${totalComments}
Engagement rate: ${totalViews > 0 ? ((totalLikes + totalComments) / totalViews * 100).toFixed(2) : 0}%

VÍDEOS DE HOY (${todayVideos.length}):
${todayVideos.length > 0 ? todayVideos.map(formatVideo).join('\n') : 'Ninguno publicado hoy.'}

ÚLTIMOS 10 VÍDEOS:
${vids.slice(0, 10).map(formatVideo).join('\n')}
${snapshotInfo}
`;

    // 4. Build conversation for Gemini
    const systemPrompt = `Eres el "Oráculo VideoBalls", un analista de contenido de élite para redes sociales. 
Tu tono es PROFESIONAL pero CERCANO, como un amigo que es experto en analytics. 
Usas emojis con moderación. Respondes SIEMPRE en español.
Tienes acceso a los datos REALES del canal del usuario. Aquí están:

${dataContext}

REGLAS:
- Basa tus respuestas SIEMPRE en los datos reales de arriba
- Si te preguntan por el rendimiento de hoy, analiza los vídeos de hoy comparados con el histórico
- Si te preguntan consejos, básalos en los patrones reales de sus datos
- Sé conciso: máximo 3-4 párrafos por respuesta
- No inventes datos que no estén arriba`;

    const chatHistory = messages.slice(0, -1).map(m => ({
      role: m.role === 'user' ? 'user' as const : 'model' as const,
      parts: [{ text: m.content }],
    }));

    const lastMessage = messages[messages.length - 1].content;

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: 'Contexto del sistema: ' + systemPrompt }] },
        { role: 'model', parts: [{ text: '¡Entendido! Soy el Oráculo VideoBalls y tengo todos los datos del canal cargados. ¿En qué puedo ayudarte?' }] },
        ...chatHistory,
      ],
    });

    const result = await chat.sendMessage(lastMessage);
    const response = await result.response;
    const replyText = response.text();

    // 5. Persist messages to Supabase if we have a conversationId
    if (conversationId) {
      // Save user message
      await supabase.from('chat_messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: lastMessage,
      });

      // Save assistant reply
      await supabase.from('chat_messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: replyText,
      });

      // Auto-title the conversation from first user message
      if (messages.length === 1) {
        const title = lastMessage.slice(0, 60) + (lastMessage.length > 60 ? '...' : '');
        await supabase
          .from('chat_conversations')
          .update({ title, updated_at: new Date().toISOString() })
          .eq('id', conversationId);
      } else {
        // Update the timestamp
        await supabase
          .from('chat_conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId);
      }
    }

    return NextResponse.json({ reply: replyText });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ 
      error: `Error del Oráculo: ${error.message || 'Error desconocido'}` 
    }, { status: 500 });
  }
}
