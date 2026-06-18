'use client';

const SECRET_KEY = 'vb_admin_secret';

export function getStoredAdminSecret() {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem(SECRET_KEY) || '';
}

export function clearStoredAdminSecret() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(SECRET_KEY);
}

export function requestAdminSecret(message = 'Clave de administrador') {
  if (typeof window === 'undefined') return '';

  const current = getStoredAdminSecret();
  const next = window.prompt(message, current);
  if (!next) return '';

  sessionStorage.setItem(SECRET_KEY, next);
  return next;
}

export function adminHeaders(secret: string) {
  return {
    'x-admin-secret': secret,
  };
}

