'use client';

import { useState } from 'react';
import { Bot, Sparkles, RefreshCw, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AIOraculo() {
  const [insights, setInsights] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/insights');
      const data = await res.json();
      setInsights(data.insights || data.error);
    } catch (err) {
      setInsights("Error al conectar con el Oráculo. ¿Clave configurarada?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-5 overflow-hidden relative border-blue-500/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2">
          <Bot size={12} /> AI Oráculo
        </h3>
        <button 
          onClick={fetchInsights}
          disabled={loading}
          className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-all disabled:opacity-50"
        >
          {loading ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {!insights && !loading ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-4 text-center"
          >
            <div className="w-10 h-10 rounded-full bg-blue-500/5 flex items-center justify-center mb-3">
              <Lightbulb size={18} className="text-blue-500/40" />
            </div>
            <p className="text-[10px] text-slate-500 font-medium max-w-[150px]">
              Pulsa el botón para que la IA analice tus estadísticas.
            </p>
          </motion.div>
        ) : loading ? (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3 py-2"
          >
            {[1, 2, 3].map(i => (
              <div key={i} className="h-4 bg-slate-800/50 rounded animate-pulse" style={{ width: `${100 - (i * 10)}%` }} />
            ))}
          </motion.div>
        ) : (
          <motion.div 
            key="result"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap font-medium"
          >
            {insights}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtle glow effect */}
      <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-blue-500/5 blur-[40px] rounded-full pointer-events-none" />
    </div>
  );
}
