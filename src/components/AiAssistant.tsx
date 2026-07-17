/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  MessageSquare, 
  RefreshCw,
  Terminal,
  ChevronDown,
  ArrowRight,
  HelpCircle
} from 'lucide-react';
import { api } from '../lib/api.js';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  isFallback?: boolean;
}

const AI_SUGGESTIONS = [
  'Draft a secure register endpoint in Node.js',
  'How do I implement custom React hooks for fetch wrapper?',
  'Explain JWT Token storage in HttpOnly Cookies vs localStorage',
  'Generate typescript schemas for Mongo collection index'
];

export default function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'Greetings developer. I am your DevBoard Cooperative AI assistant. Ask me to draft code snippets, map out REST APIs, resolve bugs, or structure database schemas!',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  const threadEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      role: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      // Map history to standard chat payload
      const chatHistory = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const res = await api.assistantChat(textToSend, chatHistory);

      const assistantMsg: Message = {
        role: 'assistant',
        text: res.text,
        timestamp: new Date(),
        isFallback: res.isFallback
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: `Error parsing query: ${err.message || 'Check your Gemini key settings.'}`,
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end" id="ai_assistant_dock">
      {/* TRIGGER FLOATING BUTTON */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-full shadow-2xl flex items-center justify-center gap-2 border border-indigo-400/40 relative group transition-all duration-300 hover:scale-105"
          id="ai_trigger_btn"
        >
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-zinc-950 animate-pulse" />
          <Sparkles className="w-5 h-5" />
          <span className="text-xs font-bold font-sans tracking-wide max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300">
            AI Co-Pilot
          </span>
        </button>
      )}

      {/* CHAT CONTAINER BOX */}
      {isOpen && (
        <div className="w-96 h-[500px] bg-[#0c0c0e] border border-zinc-800 rounded-2xl shadow-2xl flex flex-col text-zinc-100 overflow-hidden animate-in slide-in-from-bottom duration-200" id="ai_chat_window">
          {/* Header */}
          <div className="p-4 bg-[#050506] border-b border-zinc-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-950/40 border border-indigo-900/60 rounded text-indigo-400">
                <Terminal className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                  Cooperative AI Assistant
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                </h3>
                <span className="text-[10px] text-zinc-500 font-mono block">DevBoard Terminal v1.0</span>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 rounded transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Stream Thread */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-thin">
            {messages.map((m, idx) => (
              <div 
                key={idx} 
                className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}
                
                <div className={`max-w-[80%] p-3 rounded-xl text-xs leading-relaxed space-y-2 relative ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white font-medium rounded-tr-none'
                    : 'bg-[#050506] text-zinc-300 border border-zinc-800 rounded-tl-none'
                }`}>
                  <p className="whitespace-pre-wrap font-sans">{m.text}</p>
                  
                  {m.isFallback && (
                    <span className="text-[9px] text-zinc-500 font-mono block mt-2 border-t border-zinc-900/40 pt-1.5">
                      💡 Offline safe synthesis fallback active
                    </span>
                  )}
                  
                  <span className={`text-[8px] font-mono block text-right mt-1.5 ${m.role === 'user' ? 'text-indigo-200' : 'text-zinc-600'}`}>
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 items-center text-xs font-mono text-zinc-500">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                <span>AI co-pilot analyzing request stack...</span>
              </div>
            )}
            
            <div ref={threadEndRef} />
          </div>

          {/* Prompt Suggestions (Only if quiet) */}
          {messages.length === 1 && (
            <div className="px-4 pb-2 shrink-0">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">Suggested prompts</span>
              <div className="space-y-1.5">
                {AI_SUGGESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(s)}
                    className="w-full text-left px-2.5 py-1.5 bg-[#050506] hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-lg text-[10px] text-zinc-400 hover:text-zinc-200 transition flex items-center justify-between"
                  >
                    <span>{s}</span>
                    <ArrowRight className="w-3 h-3 text-zinc-500" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Footer Form */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputText);
            }} 
            className="p-3 bg-[#050506] border-t border-zinc-800 flex gap-2 shrink-0"
          >
            <input 
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask AI helper to draft code or plan schemas..."
              className="flex-1 px-3 py-2 bg-[#0c0c0e] border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              disabled={loading}
              required
            />
            <button 
              type="submit"
              disabled={loading}
              className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition shadow-md shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
