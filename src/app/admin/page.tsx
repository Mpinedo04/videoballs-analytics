'use client';

import { useEffect, useState } from 'react';
import { Layout, Lock, RefreshCw, Save } from 'lucide-react';

interface AdminVideo {
  id: string;
  platform: string;
  title: string;
  published_at: string;
  group_id: string | null;
  views: number;
}

const SECRET_KEY = 'vb_admin_secret';

function readSecret() {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem(SECRET_KEY) || '';
}

function askSecret() {
  const current = readSecret();
  const next = window.prompt('Clave de administrador', current);
  if (!next) return '';
  sessionStorage.setItem(SECRET_KEY, next);
  return next;
}

export default function AdminPage() {
  const [videos, setVideos] = useState<AdminVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSecret, setHasSecret] = useState(false);

  const fetchVideos = async (forcePrompt = false) => {
    const secret = forcePrompt || !readSecret() ? askSecret() : readSecret();
    if (!secret) return;

    setHasSecret(true);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/videos', {
        headers: { 'x-admin-secret': secret },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo cargar el panel');
      setVideos(data.videos || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      if (err instanceof Error && err.message.toLowerCase().includes('unauthorized')) {
        sessionStorage.removeItem(SECRET_KEY);
        setHasSecret(false);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (readSecret()) fetchVideos();
  }, []);

  const updateGroupId = async (id: string, groupId: string) => {
    const secret = readSecret() || askSecret();
    if (!secret) return;

    setSaving(id);
    setError(null);

    try {
      const res = await fetch('/api/admin/videos', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': secret,
        },
        body: JSON.stringify({ id, group_id: groupId || null }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar');

      setVideos(prev => prev.map(video =>
        video.id === id ? { ...video, group_id: data.video.group_id } : video
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layout className="text-blue-400" /> Admin Video Matching
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Panel protegido para revisar y corregir grupos entre plataformas.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => fetchVideos(true)}
            className="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/20 px-4 py-2 rounded-xl transition-colors text-sm flex items-center gap-2"
          >
            <Lock size={16} /> {hasSecret ? 'Cambiar clave' : 'Entrar'}
          </button>
          <button
            onClick={() => fetchVideos()}
            disabled={loading}
            className="bg-slate-800 hover:bg-slate-700 p-2 rounded-xl transition-colors disabled:opacity-50"
            title="Refrescar"
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} size={20} />
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {!hasSecret && videos.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-10 text-center">
          <Lock className="mx-auto mb-4 text-slate-500" size={36} />
          <p className="text-slate-300 font-semibold">Introduce la clave de administrador para cargar el panel.</p>
          <button
            onClick={() => fetchVideos(true)}
            className="mt-5 rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold hover:bg-blue-500"
          >
            Entrar
          </button>
        </div>
      ) : (
        <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-slate-800/80 text-slate-400 text-sm">
                <tr>
                  <th className="p-4">Platform</th>
                  <th className="p-4">Title</th>
                  <th className="p-4">Views</th>
                  <th className="p-4">Published At</th>
                  <th className="p-4">Group ID</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {videos.map(video => (
                  <tr key={video.id} className="border-t border-slate-800 hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 font-mono text-xs uppercase text-slate-400">{video.platform}</td>
                    <td className="p-4 font-medium max-w-md truncate">{video.title}</td>
                    <td className="p-4 text-sm text-slate-400">{video.views?.toLocaleString()}</td>
                    <td className="p-4 text-sm text-slate-400">
                      {new Date(video.published_at).toLocaleString('es-ES')}
                    </td>
                    <td className="p-4">
                      <input
                        type="text"
                        defaultValue={video.group_id || ''}
                        onBlur={(e) => updateGroupId(video.id, e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-blue-500"
                        placeholder="Sin grupo"
                      />
                    </td>
                    <td className="p-4">
                      {saving === video.id ? (
                        <RefreshCw className="animate-spin text-blue-400" size={16} />
                      ) : (
                        <Save className="text-slate-500" size={16} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
