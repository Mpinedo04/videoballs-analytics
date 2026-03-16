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
    const totalViews = videos.reduce((acc, v) => acc + (v.views || 0), 0);
    const totalLikes = videos.reduce((acc, v) => acc + (v.engagement?.likes || 0), 0);
    const topVideos = [...videos]
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 3)
      .map(v => `- ${v.title} (${v.platform}): ${v.views} vistas`);

    const platformStats = {
      youtube: videos.filter(v => v.platform === 'youtube').length,
      instagram: videos.filter(v => v.platform === 'instagram').length,
      tiktok: videos.filter(v => v.platform === 'tiktok').length,
    };

    // 3. Create the prompt
    const prompt = `
      Eres un consultor experto en crecimiento viral de videos cortos (Shorts, Reels, TikTok).
      Analiza los siguientes datos de Miguel y Raúl (VideoBalls Analytics) y dales 3 consejos cortos, directos y motivadores en español.

      DATOS:
      - Videos analizados: ${videos.length}
      - Vistas totales: ${totalViews.toLocaleString()}
      - TOP 3 Videos:
      ${topVideos.join('\n')}
      - Distribución: YouTube (${platformStats.youtube}), Instagram (${platformStats.instagram}), TikTok (${platformStats.tiktok})

      INSTRUCCIONES:
      - Los consejos deben ser específicos.
      - Usa un tono "Premium" y canalla (estilo Miguel).
      - Si ves que una plataforma va mejor que otra, diles por qué.
      - Formato: Devuelve solo los 3 puntos con emojis. Máximo 2 frases por punto.
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
