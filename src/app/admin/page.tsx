'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Layout, Save, RefreshCw } from 'lucide-react';

export default function AdminPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchVideos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .order('published_at', { ascending: false });
    
    if (data) setVideos(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const updateGroupId = async (id: string, groupId: string) => {
    setSaving(id);
    const { error } = await supabase
      .from('videos')
      .update({ group_id: groupId || null })
      .eq('id', id);
    
    if (!error) {
      setVideos(videos.map(v => v.id === id ? { ...v, group_id: groupId } : v));
    }
    setSaving(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Layout className="text-blue-400" /> Admin Video Matching
        </h1>
        <button 
          onClick={fetchVideos}
          className="bg-slate-800 hover:bg-slate-700 p-2 rounded-full transition-colors"
        >
          <RefreshCw className={loading ? 'animate-spin' : ''} size={20} />
        </button>
      </header>

      <div className="bg-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead className="bg-slate-700/50 text-slate-400 text-sm">
            <tr>
              <th className="p-4">Platform</th>
              <th className="p-4">Title</th>
              <th className="p-4">Published At</th>
              <th className="p-4">Group ID</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {videos.map((video) => (
              <tr key={video.id} className="border-t border-slate-700 hover:bg-slate-700/30 transition-colors">
                <td className="p-4 font-mono text-xs uppercase text-slate-400">{video.platform}</td>
                <td className="p-4 font-medium max-w-md truncate">{video.title}</td>
                <td className="p-4 text-sm text-slate-400">
                  {new Date(video.published_at).toLocaleString()}
                </td>
                <td className="p-4">
                  <input
                    type="text"
                    defaultValue={video.group_id || ''}
                    onBlur={(e) => updateGroupId(video.id, e.target.value)}
                    className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm w-full focus:outline-none focus:border-blue-500"
                    placeholder="None"
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
  );
}
