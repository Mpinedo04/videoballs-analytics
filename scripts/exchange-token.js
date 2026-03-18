
const client_key = 'sbaw8oawxu1kbnrnel';
const client_secret = 'jRdzNL0NKD1sHmzRHgROwcSU8pHH4Rl1';
const code = 'MMVCt1bMiRuN9S4uPQUCQCY9-1TZv7C8g_orbALGTrfGhsw31SrdMNZsELb_bnm9ObPmzDeYj3PqIBmDVT8BQApnLK2uucL-d7xyk8jG-IahIqLK6uTBekean9A4OGSZBrZtOUlQUSpQFrj5baB9XYQRyWIwBD4f-jb8kJNvkuipts6l6kS5z0Ibe1GhNwSRIfsY24xyJ5qjLdScb829890VG2nYGtzkz7xgxt9xhxr0fay7Rl_fd_U2apreWBfkqHuf5Wprie_ECR7LnMYXHzqu-Xq0LDmCvBQUmpHXoZlsbz8uFQOJUR8cQE8*v!4783.e1';
const redirect_uri = 'https://videoballs-analyticsraulmiguel2.vercel.app/api/auth/callback/tiktok';

async function getTokens() {
  console.log('Exchanging code for tokens...');
  
  const params = new URLSearchParams();
  params.append('client_key', client_key);
  params.append('client_secret', client_secret);
  params.append('code', code);
  params.append('grant_type', 'authorization_code');
  params.append('redirect_uri', redirect_uri);

  try {
    const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache'
      },
      body: params
    });

    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

getTokens();
