import { NextResponse } from 'next/server';

function configuredSecret() {
  return process.env.ADMIN_SECRET || process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET || '';
}

function bearerToken(request: Request) {
  const auth = request.headers.get('authorization') || '';
  return auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
}

export function isAdminRequest(request: Request) {
  const secret = configuredSecret();
  const isDev = process.env.NODE_ENV !== 'production';

  if (!secret) return isDev;

  const url = new URL(request.url);
  const provided =
    request.headers.get('x-admin-secret') ||
    bearerToken(request) ||
    url.searchParams.get('adminKey') ||
    url.searchParams.get('key') ||
    '';

  return provided === secret;
}

export function requireAdminRequest(request: Request) {
  const secret = configuredSecret();
  if (!secret && process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'ADMIN_SECRET or CRON_SECRET is required in production.' },
      { status: 503 }
    );
  }

  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}

export function requireCronRequest(request: Request) {
  const url = new URL(request.url);
  const queryKey = url.searchParams.get('key');
  const authHeader = request.headers.get('authorization');

  const isValidVercelCron =
    !!process.env.VERCEL_CRON_SECRET &&
    authHeader === `Bearer ${process.env.VERCEL_CRON_SECRET}`;

  const isValidExternal =
    !!process.env.CRON_SECRET &&
    queryKey === process.env.CRON_SECRET;

  if (isValidVercelCron || isValidExternal || isAdminRequest(request)) {
    return null;
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

