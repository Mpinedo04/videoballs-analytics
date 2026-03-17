"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Mic, X, Youtube, Instagram, Music, Clock, History, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchResult {
  id: string;
  platform_id: string;
  title: string;
  platform: 'youtube' | 'instagram' | 'tiktok';
  thumbnail_url: string;
  published_at: string;
  group_id?: string;
}

interface VideoFinderProps {
  videos: SearchResult[];
  onSelect: (video: SearchResult) => void;
}

export default function VideoFinder({ videos, onSelect }: VideoFinderProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('video_search_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search logic with simple fuzzy (includes)
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      const filtered = videos.filter(v => 
        v.title.toLowerCase().includes(query.toLowerCase()) ||
        v.platform_id.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8);
      setResults(filtered);
    }, 180);

    return () => clearTimeout(timer);
  }, [query, videos]);

  const handleSelect = (video: SearchResult) => {
    // Save to history
    const newHistory = [video.title, ...history.filter(h => h !== video.title)].slice(0, 5);
    setHistory(newHistory);
    localStorage.setItem('video_search_history', JSON.stringify(newHistory));

    onSelect(video);
    setIsOpen(false);
    setQuery('');
  };

  const toggleVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Tu navegador no soporta búsqueda por voz.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      setIsOpen(true);
    };

    recognition.start();
  };

  return (
    <div className="relative w-full max-w-xl mx-auto z-50">
      <div className="relative flex items-center bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden focus-within:border-cyan-500/50 focus-within:ring-2 focus-within:ring-cyan-500/20 transition-all shadow-2xl">
        <div className="pl-4 text-gray-400">
          <Search size={20} />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Buscar un video por título, tag o ID..."
          className="w-full bg-transparent border-none focus:ring-0 text-white placeholder-gray-500 py-3 px-3 text-sm"
        />

        <div className="flex items-center gap-2 pr-2">
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400"
            >
              <X size={18} />
            </button>
          )}
          
          <button 
            onClick={toggleVoiceSearch}
            className={`p-2 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'hover:bg-white/10 text-gray-400'}`}
          >
            <Mic size={20} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (query || history.length > 0) && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full left-0 right-0 mt-3 bg-gray-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-2xl"
          >
            {/* Recent Searches */}
            {!query && history.length > 0 && (
              <div className="p-4 bg-gray-800/20">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                  <History size={14} />
                  <span>Búsqedas Recientes</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {history.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => setQuery(h)}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full text-xs text-gray-300 transition-all flex items-center gap-2"
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto">
              {results.length > 0 ? (
                <div className="p-2 space-y-1">
                  {results.map((video) => (
                    <button
                      key={video.id}
                      onClick={() => handleSelect(video)}
                      className="w-full flex items-center gap-4 p-2.5 rounded-xl hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/20 group transition-all text-left"
                    >
                      <div className="relative flex-shrink-0 w-20 h-12 rounded-lg overflow-hidden bg-gray-800">
                        <img 
                          src={video.thumbnail_url} 
                          alt={video.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute top-1 right-1">
                          {video.platform === 'youtube' && <Youtube size={14} className="text-red-500 drop-shadow-md" />}
                          {video.platform === 'instagram' && <Instagram size={14} className="text-pink-500 drop-shadow-md" />}
                          {video.platform === 'tiktok' && <Music size={14} className="text-cyan-400 drop-shadow-md" />}
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-white truncate group-hover:text-cyan-400 transition-colors">
                          {video.title}
                        </h4>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(video.published_at).toLocaleDateString()}
                          </span>
                          {video.group_id && (
                            <span className="flex items-center gap-1 text-cyan-500/80 bg-cyan-500/10 px-1.5 py-0.5 rounded uppercase font-bold text-[9px]">
                              <LayoutGrid size={10} />
                              Duplicado
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : query && (
                <div className="p-10 text-center text-gray-500">
                  <p className="text-sm">No hay resultados para "{query}"</p>
                  <p className="text-xs mt-2 opacity-50">Prueba con otras palabras o etiquetas</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
