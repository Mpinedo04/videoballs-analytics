import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { getGeminiModel } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = getSupabaseService();

  try {
    const model = getGeminiModel();
    // 1. Fetch data from Supabase
    const { data: videos, error } = await supabase
      .from('videos')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    if (!videos || videos.length === 0) {
      return NextResponse.json({ insights: "No hay videos suficientes para analizar todavía. ¡Sigue subiendo contenido! 🚀" });
    }

    // 2. Prepare data for the prompt
    const platformVideos = {
      youtube: videos.filter(v => v.platform === 'youtube'),
      instagram: videos.filter(v => v.platform === 'instagram'),
      tiktok: videos.filter(v => v.platform === 'tiktok')
    };

    const formatVideoList = (vlist: any[]) => vlist.map(v => 
      `- [${v.title}] | Vistas: ${v.views} | Duración: ${v.duration || 'N/A'}s | Tags: ${(v.hashtags || []).join(', ')}`
    ).join('\n');

    // 3. Create the advanced prompt (Optimized to avoid timeouts)
    const prompt = `
      Eres el "Oráculo VideoBalls", consultor de élite. Analiza estos datos:
      ${formatVideoList(videos.slice(0, 30))} // Limitado a 30 para velocidad

      PROPORCIONA:
      🚀 YOUTUBE: (Duración y tags)
      📸 INSTAGRAM: (Engagement y estilo)
      🎵 TIKTOK: (Hooks y viralidad)

      Tono: Premium, directo. Máximo 2 frases por sección.
    `;

    // 4. Generate AI response
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ insights: text });
  } catch (error: any) {
    console.error('Insights Error:', error);
    // Devolvemos el error real para poder diagnosticarlo en Vercel
    return NextResponse.json({ 
      error: `Error del Oráculo: ${error.message || 'Error desconocido'}`,
      details: 'Asegúrate de que GOOGLE_GENERATIVE_AI_API_KEY esté bien puesta en Vercel.'
    }, { status: 500 });
  }
}
