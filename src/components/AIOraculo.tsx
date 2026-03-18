'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Sparkles, Send, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_PROMPTS = [
  '📊 ¿Cómo ha ido hoy?',
  '🏆 ¿Cuál es mi mejor vídeo?',
  '💡 Dame consejos para mejorar',
];

export default function AIOraculo() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setIsExpanded(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.error || 'Error al conectar con el Oráculo.' }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Error de conexión. Inténtalo de nuevo.' }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setIsExpanded(false);
  };

  return (
    <div className="glass-card overflow-hidden relative border-blue-500/20 flex flex-col" style={{ maxHeight: isExpanded ? '500px' : 'auto' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2 flex-shrink-0">
        <h3 className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2">
          <Bot size={12} /> AI Oráculo
        </h3>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button 
              onClick={clearChat}
              className="p-1.5 rounded-lg bg-slate-800/50 hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all"
              title="Limpiar chat"
            >
              <Trash2 size={10} />
            </button>
          )}
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Conectado" />
        </div>
      </div>

      {/* Messages area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-2 space-y-3 custom-scrollbar"
        style={{ minHeight: messages.length > 0 ? '200px' : '0', maxHeight: '350px' }}
      >
        <AnimatePresence mode="popLayout">
          {messages.length === 0 && !loading ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-3 text-center"
            >
              <div className="w-10 h-10 rounded-full bg-blue-500/5 flex items-center justify-center mb-3">
                <Sparkles size={18} className="text-blue-500/40" />
              </div>
              <p className="text-[10px] text-slate-500 font-medium max-w-[180px] mb-3">
                Pregúntale al Oráculo sobre tus estadísticas, rendimiento o pide consejos.
              </p>
              {/* Quick prompts */}
              <div className="flex flex-col gap-1.5 w-full">
                {QUICK_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(prompt)}
                    className="text-[10px] text-left px-3 py-2 bg-slate-800/30 hover:bg-blue-500/10 border border-white/5 hover:border-blue-500/20 rounded-xl text-slate-400 hover:text-blue-300 transition-all"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[90%] px-3 py-2 rounded-2xl text-[11px] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600/20 text-blue-100 rounded-br-md border border-blue-500/20'
                    : 'bg-slate-800/60 text-slate-300 rounded-bl-md border border-white/5'
                }`}>
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1 mb-1 text-[9px] text-blue-400/60 font-bold">
                      <Bot size={9} /> Oráculo
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </motion.div>
            ))
          )}

          {/* Loading indicator */}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-slate-800/60 border border-white/5 px-3 py-2 rounded-2xl rounded-bl-md">
                <div className="flex items-center gap-1 mb-1 text-[9px] text-blue-400/60 font-bold">
                  <Bot size={9} /> Oráculo
                </div>
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div 
                      key={i} 
                      className="w-1.5 h-1.5 rounded-full bg-blue-400/50 animate-bounce" 
                      style={{ animationDelay: `${i * 0.15}s` }} 
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input area */}
      <div className="p-3 pt-2 border-t border-white/5 flex-shrink-0">
        <form 
          onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
          className="flex gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pregunta al Oráculo..."
            disabled={loading}
            className="flex-1 bg-slate-900/60 border border-white/5 rounded-xl px-3 py-2 text-[11px] text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/30 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/20 rounded-xl text-blue-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send size={12} />
          </button>
        </form>
      </div>

      {/* Subtle glow effect */}
      <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-blue-500/5 blur-[40px] rounded-full pointer-events-none" />
    </div>
  );
}
