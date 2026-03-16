
const CLIENT_KEY = 'sbaw8oawxu1kbnrnel';
const CLIENT_SECRET = 'jRdzNL0NKD1sHmzRHgROwcSU8pHH4Rl1';
const REDIRECT_URI = 'https://videoballs-analyticsraulmiguel2.vercel.app/api/auth/callback/tiktok';
const AUTH_CODE = 'XOmEkyLBMo_AXlsFa6c8WkQ_uiTCQrngOIGTYcHfrvLDuhtkRETwKJ7S72zWHCkd9BqaJEhN_K_LaulyBd-yLyrQzQ8GezZbb0yB3Vj86_uwICVbPcVPaOT4-SX0qi7U5UC9cdvl3fZduChZkPy7HFnxuIWRi6ellgwtLfE77ScyZxsOIkhxnpW7rKC1LUPF59_jT-T5nOxbroGJwOYjBNKQ2PxQop3dResnta2xdVTTo9dQI0peTPKvBy9OJ4GWglcFyqYVNS3blp0OVaYoQbhl-YJ2RSXTwblikHTXsbiwZQ2gZ2QSdTCepho*v!4827.e1';

async function getTikTokToken() {
  console.log('--- Intercambiando Código por Token (Modo Sandbox) ---');
  
  const params = new URLSearchParams();
  params.append('client_key', CLIENT_KEY);
  params.append('client_secret', CLIENT_SECRET);
  params.append('code', AUTH_CODE);
  params.append('grant_type', 'authorization_code');
  params.append('redirect_uri', REDIRECT_URI);

  try {
    const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();
    console.log('Respuesta de TikTok:', JSON.stringify(data, null, 2));
    
    if (data.access_token) {
      console.log('\n✅ ¡TOKEN OBTENIDO CON ÉXITO!');
      console.log('ACCESS_TOKEN:', data.access_token);
      console.log('REFRESH_TOKEN:', data.refresh_token);
      console.log('EXPIRES_IN:', data.expires_in);
    } else {
      console.log('\n❌ Error al obtener el token:', data.error_description || data.error);
    }
  } catch (error) {
    console.error('\n❌ Error de red:', error);
  }
}

getTikTokToken();
