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

    // 3. Create the advanced prompt
    const prompt = `
      Eres el "Oráculo VideoBalls", un consultor de élite en crecimiento viral para creadores de contenido.
      Analiza los datos de Miguel y Raúl y proporciónales una hoja de ruta ganadora.

      DATOS POR PLATAFORMA (Últimos vídeos):

      YOUTUBE SHORTS:
      ${formatVideoList(platformVideos.youtube)}

      INSTAGRAM REELS:
      ${formatVideoList(platformVideos.instagram)}

      TIKTOK:
      ${formatVideoList(platformVideos.tiktok)}

      TAREAS DE ANÁLISIS:
      1. Identifica qué DURACIÓN de vídeo está reteniendo más tráfico en cada red.
      2. Detecta qué HASHTAGS están presentes en los vídeos con más vistas.
      3. Analiza el ESTILO DE CONTENIDO basándote en los títulos (unboxing, humor, tutorial, etc).
      4. Si hay miniaturas interesantes, menciónalo (basándote en los títulos descriptivos).

      FORMATO DE RESPUESTA (Mandatorio):
      Dales 3 secciones claras:
      🚀 ESTRATEGIA YOUTUBE: (Consejo sobre duración y tags)
      📸 ESTRATEGIA INSTAGRAM: (Consejo sobre engagement y estilo)
      🎵 ESTRATEGIA TIKTOK: (Consejo sobre hooks y viralidad)

      Usa el tono "Premium", directo y motivador de Miguel. Máximo 3 frases por sección. Devuelve solo el texto de las estrategias.
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
