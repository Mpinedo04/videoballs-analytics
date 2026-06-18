'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, ChevronLeft, MessageSquare, Plus, Send, Sparkles, Trash2 } from 'lucide-react';
import { adminHeaders, clearStoredAdminSecret, getStoredAdminSecret, requestAdminSecret } from '@/lib/clientAdminSecret';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

const QUICK_PROMPTS = [
  'Como ha ido hoy?',
  'Cual es mi mejor video?',
  'Dame consejos para mejorar',
  'Analiza patrones de mis datos',
];

export default function AIOraculo() {
  const [view, setView] = useState<'list' | 'chat'>('list');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const loadConversations = useCallback(async () => {
    const secret = getStoredAdminSecret();
    if (!secret) {
      setConversations([]);
      setLoadingConvos(false);
      return;
    }

    setLoadingConvos(true);
    setError(null);

    try {
      const res = await fetch('/api/conversations', { headers: adminHeaders(secret) });
      if (res.status === 401) clearStoredAdminSecret();

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudieron cargar conversaciones');
      setConversations(data.conversations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando conversaciones');
    } finally {
      setLoadingConvos(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const openConversation = async (conversation: Conversation) => {
    const secret = getStoredAdminSecret() || requestAdminSecret('Clave de administrador para abrir el Oraculo');
    if (!secret) return;

    setActiveConversationId(conversation.id);
    setMessages([]);
    setView('chat');
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/conversations/messages?conversationId=${conversation.id}`, {
        headers: adminHeaders(secret),
      });
      if (res.status === 401) clearStoredAdminSecret();

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudieron cargar mensajes');
      setMessages((data.messages || []).map((message: { role: 'user' | 'assistant'; content: string }) => ({
        role: message.role,
        content: message.content,
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error abriendo conversacion');
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const newConversation = async () => {
    const secret = getStoredAdminSecret() || requestAdminSecret('Clave de administrador para usar el Oraculo');
    if (!secret) return;

    setError(null);

    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders(secret) },
        body: JSON.stringify({}),
      });
      if (res.status === 401) clearStoredAdminSecret();

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo crear conversacion');

      setActiveConversationId(data.conversation.id);
      setMessages([]);
      setView('chat');
      inputRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creando conversacion');
    }
  };

  const deleteConversation = async (id: string, event: MouseEvent) => {
    event.stopPropagation();

    const secret = getStoredAdminSecret() || requestAdminSecret('Clave de administrador para borrar conversaciones');
    if (!secret) return;

    try {
      const res = await fetch(`/api/conversations?id=${id}`, {
        method: 'DELETE',
        headers: adminHeaders(secret),
      });
      if (res.status === 401) clearStoredAdminSecret();

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo borrar conversacion');

      setConversations(prev => prev.filter(conversation => conversation.id !== id));
      if (activeConversationId === id) {
        setActiveConversationId(null);
        setMessages([]);
        setView('list');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error borrando conversacion');
    }
  };

  const goBack = () => {
    setView('list');
    setActiveConversationId(null);
    setMessages([]);
    loadConversations();
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const secret = getStoredAdminSecret() || requestAdminSecret('Clave de administrador para usar el Oraculo');
    if (!secret) return;

    let conversationId = activeConversationId;
    setError(null);

    if (!conversationId) {
      try {
        const res = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...adminHeaders(secret) },
          body: JSON.stringify({}),
        });
        if (res.status === 401) clearStoredAdminSecret();

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo crear conversacion');

        conversationId = data.conversation.id;
        setActiveConversationId(conversationId);
        setView('chat');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error creando conversacion');
        return;
      }
    }

    const userMessage: ChatMessage = { role: 'user', content: text.trim() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders(secret) },
        body: JSON.stringify({ messages: nextMessages, conversationId }),
      });
      if (res.status === 401) clearStoredAdminSecret();

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo conectar con el Oraculo');

      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: err instanceof Error ? err.message : 'Error de conexion. Intentalo de nuevo.',
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `hace ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    return `hace ${Math.floor(hours / 24)}d`;
  };

  return (
    <div className="glass-card overflow-hidden relative border-blue-500/20 flex flex-col" style={{ height: view === 'chat' ? '460px' : 'auto' }}>
      <div className="flex items-center justify-between p-4 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          {view === 'chat' && (
            <button onClick={goBack} className="p-1 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-all">
              <ChevronLeft size={14} />
            </button>
          )}
          <h3 className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <Bot size={12} /> Oraculo IA
          </h3>
        </div>
        <div className="flex items-center gap-1">
          {view === 'list' && (
            <button
              onClick={newConversation}
              className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-all"
              title="Nueva conversacion"
            >
              <Plus size={10} />
            </button>
          )}
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Conectado" />
        </div>
      </div>

      {error && (
        <div className="mx-4 mb-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[10px] text-red-200">
          {error}
        </div>
      )}

      {view === 'list' ? (
        <div className="px-4 py-2 flex-1 overflow-y-auto custom-scrollbar">
          {loadingConvos ? (
            <div className="space-y-2 py-2">
              {[1, 2, 3].map(item => (
                <div key={item} className="h-10 bg-slate-800/30 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="w-10 h-10 rounded-full bg-blue-500/5 flex items-center justify-center mb-3">
                <Sparkles size={18} className="text-blue-500/40" />
              </div>
              <p className="text-[10px] text-slate-500 font-medium max-w-[180px] mb-4">
                Preguntale al Oraculo sobre estadisticas, rendimiento o ideas para mejorar.
              </p>
              <div className="flex flex-col gap-1.5 w-full">
                {QUICK_PROMPTS.map(prompt => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="text-[10px] text-left px-3 py-2 bg-slate-800/30 hover:bg-blue-500/10 border border-white/5 hover:border-blue-500/20 rounded-xl text-slate-400 hover:text-blue-300 transition-all"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 py-1">
              <div className="grid grid-cols-2 gap-1 mb-3">
                {QUICK_PROMPTS.slice(0, 2).map(prompt => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="text-[9px] text-center px-2 py-1.5 bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/10 rounded-lg text-blue-400/70 hover:text-blue-300 transition-all"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {conversations.map(conversation => (
                <div
                  key={conversation.id}
                  onClick={() => openConversation(conversation)}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/20 hover:bg-slate-800/40 border border-white/5 hover:border-white/10 cursor-pointer transition-all group"
                >
                  <MessageSquare size={12} className="text-slate-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-slate-300 font-medium truncate group-hover:text-white transition-colors">
                      {conversation.title}
                    </p>
                    <p className="text-[9px] text-slate-600">{timeAgo(conversation.updated_at)}</p>
                  </div>
                  <button
                    onClick={(event) => deleteConversation(conversation.id, event)}
                    className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-slate-600 hover:text-red-400 transition-all"
                    title="Eliminar"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2 space-y-3 custom-scrollbar">
            <AnimatePresence mode="popLayout">
              {messages.length === 0 && !loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-6 text-center">
                  <p className="text-[10px] text-slate-500 font-medium mb-3">
                    Empieza a escribir o usa un prompt rapido:
                  </p>
                  <div className="flex flex-col gap-1.5 w-full">
                    {QUICK_PROMPTS.map(prompt => (
                      <button
                        key={prompt}
                        onClick={() => sendMessage(prompt)}
                        className="text-[10px] text-left px-3 py-2 bg-slate-800/30 hover:bg-blue-500/10 border border-white/5 hover:border-blue-500/20 rounded-xl text-slate-400 hover:text-blue-300 transition-all"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {messages.map((message, index) => (
                <motion.div
                  key={`${message.role}-${index}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[90%] px-3 py-2 rounded-2xl text-[11px] leading-relaxed ${
                    message.role === 'user'
                      ? 'bg-blue-600/20 text-blue-100 rounded-br-md border border-blue-500/20'
                      : 'bg-slate-800/60 text-slate-300 rounded-bl-md border border-white/5'
                  }`}>
                    {message.role === 'assistant' && (
                      <div className="flex items-center gap-1 mb-1 text-[9px] text-blue-400/60 font-bold">
                        <Bot size={9} /> Oraculo
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  </div>
                </motion.div>
              ))}

              {loading && messages.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="bg-slate-800/60 border border-white/5 px-3 py-2 rounded-2xl rounded-bl-md">
                    <div className="flex items-center gap-1 mb-1 text-[9px] text-blue-400/60 font-bold">
                      <Bot size={9} /> Oraculo
                    </div>
                    <div className="flex gap-1">
                      {[0, 1, 2].map(item => (
                        <div key={item} className="w-1.5 h-1.5 rounded-full bg-blue-400/50 animate-bounce" style={{ animationDelay: `${item * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="p-3 pt-2 border-t border-white/5 flex-shrink-0">
            <form
              onSubmit={(event) => { event.preventDefault(); sendMessage(input); }}
              className="flex gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Pregunta al Oraculo..."
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
        </>
      )}

      <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-blue-500/5 blur-[40px] rounded-full pointer-events-none" />
    </div>
  );
}
