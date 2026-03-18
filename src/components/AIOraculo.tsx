'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Sparkles, Send, Trash2, Plus, ChevronLeft, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  '📊 ¿Cómo ha ido hoy?',
  '🏆 ¿Cuál es mi mejor vídeo?',
  '💡 Dame consejos para mejorar',
  '📈 Analiza patrones de mis datos',
];

export default function AIOraculo() {
  // View state: 'list' = conversation list, 'chat' = active chat
  const [view, setView] = useState<'list' | 'chat'>('list');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Load conversation list on mount
  const loadConversations = useCallback(async () => {
    setLoadingConvos(true);
    try {
      const res = await fetch('/api/conversations');
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (err) {
      console.warn('Could not load conversations:', err);
    } finally {
      setLoadingConvos(false);
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Open a conversation
  const openConversation = async (convo: Conversation) => {
    setActiveConversationId(convo.id);
    setMessages([]);
    setView('chat');
    setLoading(true);

    try {
      const res = await fetch(`/api/conversations/messages?conversationId=${convo.id}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages.map((m: any) => ({ role: m.role, content: m.content })));
      }
    } catch (err) {
      console.warn('Could not load messages:', err);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  // Create a new conversation
  const newConversation = async () => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.conversation) {
        setActiveConversationId(data.conversation.id);
        setMessages([]);
        setView('chat');
        inputRef.current?.focus();
      }
    } catch (err) {
      console.warn('Could not create conversation:', err);
    }
  };

  // Delete a conversation
  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/conversations?id=${id}`, { method: 'DELETE' });
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConversationId === id) {
        setActiveConversationId(null);
        setMessages([]);
        setView('list');
      }
    } catch (err) {
      console.warn('Could not delete conversation:', err);
    }
  };

  // Go back to list
  const goBack = () => {
    setView('list');
    setActiveConversationId(null);
    setMessages([]);
    loadConversations();
  };

  // Send a message
  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    // If no active conversation, create one first
    let convId = activeConversationId;
    if (!convId) {
      try {
        const res = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (data.conversation) {
          convId = data.conversation.id;
          setActiveConversationId(convId);
          setView('chat');
        }
      } catch (err) {
        console.warn('Could not create conversation:', err);
        return;
      }
    }

    const userMsg: ChatMessage = { role: 'user', content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, conversationId: convId }),
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

  // Format relative time
  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `hace ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `hace ${days}d`;
  };

  return (
    <div className="glass-card overflow-hidden relative border-blue-500/20 flex flex-col" style={{ height: view === 'chat' ? '460px' : 'auto' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          {view === 'chat' && (
            <button onClick={goBack} className="p-1 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-all">
              <ChevronLeft size={14} />
            </button>
          )}
          <h3 className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <Bot size={12} /> AI Oráculo
          </h3>
        </div>
        <div className="flex items-center gap-1">
          {view === 'list' && (
            <button 
              onClick={newConversation}
              className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-all"
              title="Nueva conversación"
            >
              <Plus size={10} />
            </button>
          )}
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Conectado" />
        </div>
      </div>

      {view === 'list' ? (
        /* ═══ CONVERSATION LIST VIEW ═══ */
        <div className="px-4 py-2 flex-1 overflow-y-auto custom-scrollbar">
          {loadingConvos ? (
            <div className="space-y-2 py-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 bg-slate-800/30 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="w-10 h-10 rounded-full bg-blue-500/5 flex items-center justify-center mb-3">
                <Sparkles size={18} className="text-blue-500/40" />
              </div>
              <p className="text-[10px] text-slate-500 font-medium max-w-[180px] mb-4">
                Pregúntale al Oráculo sobre tus estadísticas, rendimiento o pide consejos.
              </p>
              {/* Quick start buttons */}
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
            </div>
          ) : (
            <div className="space-y-1.5 py-1">
              {/* Quick prompts at top */}
              <div className="grid grid-cols-2 gap-1 mb-3">
                {QUICK_PROMPTS.slice(0, 2).map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(prompt)}
                    className="text-[9px] text-center px-2 py-1.5 bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/10 rounded-lg text-blue-400/70 hover:text-blue-300 transition-all"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Conversation list */}
              {conversations.map(convo => (
                <div
                  key={convo.id}
                  onClick={() => openConversation(convo)}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/20 hover:bg-slate-800/40 border border-white/5 hover:border-white/10 cursor-pointer transition-all group"
                >
                  <MessageSquare size={12} className="text-slate-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-slate-300 font-medium truncate group-hover:text-white transition-colors">
                      {convo.title}
                    </p>
                    <p className="text-[9px] text-slate-600">{timeAgo(convo.updated_at)}</p>
                  </div>
                  <button
                    onClick={(e) => deleteConversation(convo.id, e)}
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
        /* ═══ CHAT VIEW ═══ */
        <>
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-2 space-y-3 custom-scrollbar"
          >
            <AnimatePresence mode="popLayout">
              {messages.length === 0 && !loading && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-6 text-center"
                >
                  <p className="text-[10px] text-slate-500 font-medium mb-3">
                    Empieza a escribir o usa un prompt rápido:
                  </p>
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
              )}

              {messages.map((msg, i) => (
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
              ))}

              {loading && messages.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="bg-slate-800/60 border border-white/5 px-3 py-2 rounded-2xl rounded-bl-md">
                    <div className="flex items-center gap-1 mb-1 text-[9px] text-blue-400/60 font-bold">
                      <Bot size={9} /> Oráculo
                    </div>
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-400/50 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
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
        </>
      )}

      {/* Subtle glow effect */}
      <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-blue-500/5 blur-[40px] rounded-full pointer-events-none" />
    </div>
  );
}
