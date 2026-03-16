import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.json({ error: searchParams.get('error_description') || 'Auth failed' }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  // En una app real, aquí intercambiaríamos el 'code' por un 'access_token'
  // Usando el CLIENT_KEY y CLIENT_SECRET que ya tenemos.
  
  return NextResponse.json({ 
    message: '¡Autorización de TikTok exitosa!', 
    info: 'Copia el código de abajo y ponlo en tu .env.local como TIKTOK_AUTH_CODE (temporalmente)',
    code 
  });
}
