/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Trash2, 
  Star, 
  Copy, 
  Sparkles,
  RefreshCw,
  Tag,
  Check,
  Eye,
  FileCode2
} from 'lucide-react';
import { api } from '../lib/api.js';
import { Snippet } from '../types.js';

interface SnippetVaultProps {
  projectId: string;
}

export default function SnippetVault({ projectId }: SnippetVaultProps) {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering states
  const [search, setSearch] = useState('');
  const [langFilter, setLangFilter] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  // Snippet detail inspector
  const [activeSnippet, setActiveSnippet] = useState<Snippet | null>(null);

  // Manual Snippet create form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newLang, setNewLang] = useState('typescript');
  const [newTags, setNewTags] = useState('');

  // AI Generation states
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingAi, setGeneratingAi] = useState(false);
  const [generatedAiSnippet, setGeneratedAiSnippet] = useState<any>(null);

  // Clipboard copies
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchSnippets = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getSnippets(projectId, {
        search: search || undefined,
        language: langFilter || undefined,
        tag: selectedTag || undefined,
      });
      setSnippets(res.snippets);
      if (res.snippets.length > 0 && !activeSnippet) {
        setActiveSnippet(res.snippets[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching code vault');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSnippets();
  }, [projectId, search, langFilter, selectedTag]);

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateSnippet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newCode.trim()) return;

    try {
      const tagsPayload = newTags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
      await api.createSnippet({
        projectId,
        title: newTitle.trim(),
        description: newDesc,
        code: newCode,
        language: newLang,
        tags: tagsPayload,
      });

      setShowAddForm(false);
      setNewTitle('');
      setNewDesc('');
      setNewCode('');
      setNewTags('');
      fetchSnippets();
    } catch (err: any) {
      alert(err.message || 'Error saving snippet');
    }
  };

  const handleToggleFavorite = async (snippet: Snippet) => {
    try {
      await api.toggleFavoriteSnippet(snippet.id);
      setSnippets(prev => prev.map(s => s.id === snippet.id ? { ...s, isFavorite: !s.isFavorite } : s));
      if (activeSnippet?.id === snippet.id) {
        setActiveSnippet(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
      }
    } catch (err) {
      console.error('Error toggling snippet favorite status', err);
    }
  };

  const handleDeleteSnippet = async (snippetId: string) => {
    if (!confirm('Are you sure you want to delete this code snippet?')) return;
    try {
      await api.deleteSnippet(snippetId);
      if (activeSnippet?.id === snippetId) {
        setActiveSnippet(null);
      }
      fetchSnippets();
    } catch (err: any) {
      alert(err.message || 'Error deleting snippet');
    }
  };

  // AI-powered generative assistant
  const handleGenerateAiSnippet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    setGeneratingAi(true);
    setGeneratedAiSnippet(null);
    try {
      const res = await api.generateAiSnippet(aiPrompt);
      setGeneratedAiSnippet(res.snippet);
    } catch (err: any) {
      alert(err.message || 'Error generating snippet via Gemini');
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleSaveAiSnippet = async () => {
    if (!generatedAiSnippet) return;
    try {
      await api.createSnippet({
        projectId,
        title: generatedAiSnippet.title,
        description: generatedAiSnippet.description,
        code: generatedAiSnippet.code,
        language: generatedAiSnippet.language,
        tags: generatedAiSnippet.tags,
      });
      setGeneratedAiSnippet(null);
      setAiPrompt('');
      fetchSnippets();
    } catch (err: any) {
      alert(err.message || 'Failed to persist generated snippet');
    }
  };

  // Collect all unique tags inside currently loaded snippets for sidebar tags cloud
  const allUniqueTags = Array.from(
    new Set(snippets.flatMap(s => s.tags))
  );

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full bg-[#09090b] text-zinc-100 overflow-hidden" id="snippet_vault_container">
      {/* LEFT: Code list directory */}
      <div className="w-full md:w-80 border-r border-zinc-800 flex flex-col h-full bg-[#0c0c0e]/30 p-4 space-y-4">
        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code vault..."
              className="w-full px-3 py-1.5 bg-[#050506] border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
            />
          </div>
          <button 
            onClick={() => {
              setGeneratedAiSnippet(null);
              setShowAddForm(true);
            }}
            className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition shrink-0"
            title="Create manually"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Categories/Languages Quick select */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <select 
            value={langFilter}
            onChange={(e) => setLangFilter(e.target.value)}
            className="w-full px-2 py-1 bg-[#050506] border border-zinc-800 rounded text-xs text-zinc-400 focus:outline-none"
          >
            <option value="">All Languages</option>
            <option value="typescript">TypeScript</option>
            <option value="javascript">JavaScript</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="sql">SQL</option>
            <option value="python">Python</option>
          </select>

          <select 
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="w-full px-2 py-1 bg-[#050506] border border-zinc-800 rounded text-xs text-zinc-400 focus:outline-none"
          >
            <option value="">All Tags</option>
            {allUniqueTags.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Snippets lists */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loading && snippets.length === 0 ? (
            <p className="text-[10px] text-zinc-500 font-mono text-center py-4">Loading snippets directory...</p>
          ) : snippets.length === 0 ? (
            <p className="text-[10px] text-zinc-600 font-mono text-center py-4 bg-[#050506]/20 border border-dashed border-zinc-800 rounded-lg">No saved snippets match</p>
          ) : (
            snippets.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setShowAddForm(false);
                  setGeneratedAiSnippet(null);
                  setActiveSnippet(s);
                }}
                className={`w-full text-left p-3 rounded-lg border text-xs flex flex-col gap-1.5 transition ${
                  activeSnippet?.id === s.id
                    ? 'bg-zinc-800 border-indigo-500/80 text-zinc-100 font-medium'
                    : 'bg-[#0c0c0e]/40 hover:bg-zinc-800/40 border-zinc-800/50 text-zinc-400'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-mono text-[9px] uppercase font-bold tracking-wider text-indigo-400">
                    {s.language}
                  </span>
                  {s.isFavorite && <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />}
                </div>
                <span className="font-bold text-zinc-200 line-clamp-1">{s.title}</span>
                <span className="text-[10px] text-zinc-500 line-clamp-2">{s.description}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* RIGHT: Selected code snippet editor display OR Create Form OR AI Co-Pilot panels */}
      <div className="flex-1 flex flex-col h-full bg-[#09090b] p-6 overflow-hidden">
        {showAddForm ? (
          // MANUAL ADD FORM PANEL
          <div className="flex-1 flex flex-col space-y-4 overflow-y-auto max-w-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                <FileCode2 className="w-5 h-5 text-indigo-400" />
                Add Code Snippet
              </h2>
              <button 
                onClick={() => {
                  setShowAddForm(false);
                  if (snippets.length > 0) setActiveSnippet(snippets[0]);
                }}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition font-semibold"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateSnippet} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Snippet Title</label>
                  <input 
                    type="text" 
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. JWT Sign & Verification helper"
                    className="w-full px-3 py-2 bg-[#050506] border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Language</label>
                  <select 
                    value={newLang}
                    onChange={(e) => setNewLang(e.target.value)}
                    className="w-full px-3 py-2 bg-[#050506] border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="typescript">TypeScript</option>
                    <option value="javascript">JavaScript</option>
                    <option value="html">HTML</option>
                    <option value="css">CSS</option>
                    <option value="sql">SQL</option>
                    <option value="python">Python</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Objective / Purpose</label>
                <textarea 
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Explains usage or dependencies..."
                  className="w-full h-16 px-3 py-2 bg-[#050506] border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Source Code</label>
                <textarea 
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="// Paste raw source code segment here..."
                  className="w-full h-48 px-3 py-3 bg-[#050506] border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono resize-none leading-relaxed"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Tags (Comma-separated)</label>
                <input 
                  type="text" 
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="auth, express, node"
                  className="w-full px-3 py-2 bg-[#050506] border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition shadow-md"
                >
                  Save Code Snippet
                </button>
              </div>
            </form>
          </div>
        ) : activeSnippet ? (
          // SNIPPET DETAILS INPSECTOR
          <div className="flex-1 flex flex-col h-full overflow-hidden space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-zinc-800 gap-2 shrink-0">
              <div>
                <h2 className="text-base font-bold text-zinc-100">{activeSnippet.title}</h2>
                <span className="text-[10px] text-zinc-500 block mt-0.5">{activeSnippet.description}</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleToggleFavorite(activeSnippet)}
                  className={`p-2 rounded-lg border transition ${
                    activeSnippet.isFavorite 
                      ? 'bg-yellow-950/20 border-yellow-900/60 text-yellow-500' 
                      : 'bg-[#0c0c0e]/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Toggle Favorite"
                >
                  <Star className="w-4 h-4 fill-current" />
                </button>
                <button 
                  onClick={() => handleCopyCode(activeSnippet.code, activeSnippet.id)}
                  className="p-2 bg-[#0c0c0e]/60 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-300 rounded-lg transition flex items-center gap-1.5 text-xs font-semibold"
                >
                  {copiedId === activeSnippet.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedId === activeSnippet.id ? 'Copied' : 'Copy'}</span>
                </button>
                <button 
                  onClick={() => handleDeleteSnippet(activeSnippet.id)}
                  className="p-2 bg-[#0c0c0e]/60 border border-zinc-800 hover:border-red-900/40 hover:bg-red-950/20 text-zinc-400 hover:text-red-400 rounded-lg transition"
                  title="Delete snippet"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Code view panel */}
            <div className="flex-1 overflow-auto bg-zinc-950 rounded-xl border border-zinc-850 relative group p-4 leading-relaxed font-mono text-xs text-zinc-300 whitespace-pre scrollbar-thin">
              <span className="absolute top-3 right-3 text-[9px] font-bold tracking-wider font-mono uppercase bg-zinc-900 text-indigo-400 px-2 py-0.5 rounded border border-zinc-800">
                {activeSnippet.language}
              </span>
              {activeSnippet.code}
            </div>

            {/* Tags row */}
            {activeSnippet.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 shrink-0 pt-2">
                {activeSnippet.tags.map((tag) => (
                  <span 
                    key={tag} 
                    onClick={() => setSelectedTag(selectedTag === tag ? '' : tag)}
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full cursor-pointer transition ${
                      selectedTag === tag 
                        ? 'bg-indigo-900/40 border-indigo-500/60 text-indigo-300 border' 
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Tag className="w-2.5 h-2.5 inline mr-1" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          // EMPTY BOARD STATE / WELCOME CO-PILOT PROMPT
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 max-w-md mx-auto">
            <FileCode2 className="w-16 h-16 text-zinc-700 stroke-1" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-zinc-200">Vault Empty</h3>
              <p className="text-xs text-zinc-500">Save critical boilerplate elements or utilities, or trigger the AI generator below.</p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 text-xs font-semibold rounded-lg transition"
            >
              Add first segment
            </button>
          </div>
        )}

        {/* BOTTOM SECTION: COOPERATIVE AI CO-PILOT GENERATOR (Always available!) */}
        <div className="mt-6 border-t border-zinc-900 pt-6 shrink-0">
          <div className="bg-gradient-to-r from-indigo-950/20 via-purple-950/20 to-zinc-950 border border-indigo-900/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                Gemini AI Code Vault Co-Pilot
              </h3>
              <span className="text-[9px] font-mono text-zinc-500">Express + `@google/genai`</span>
            </div>

            {generatedAiSnippet ? (
              // AI PREVIEW GENERATED CONTAINER
              <div className="space-y-3 bg-zinc-950/80 p-3.5 rounded-lg border border-indigo-900/30 animate-in fade-in slide-in-from-bottom duration-150">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-200">{generatedAiSnippet.title}</h4>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{generatedAiSnippet.description}</p>
                  </div>
                  <span className="text-[9px] font-mono font-bold uppercase text-indigo-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                    {generatedAiSnippet.language}
                  </span>
                </div>
                
                {/* Code segment */}
                <div className="bg-zinc-950 p-2.5 rounded text-[10px] font-mono max-h-36 overflow-y-auto leading-relaxed border border-zinc-900 text-zinc-300 whitespace-pre">
                  {generatedAiSnippet.code}
                </div>

                <div className="flex justify-end gap-2.5">
                  <button 
                    onClick={() => setGeneratedAiSnippet(null)}
                    className="px-3 py-1.5 hover:bg-zinc-900 text-[10px] text-zinc-400 rounded-lg transition"
                  >
                    Discard
                  </button>
                  <button 
                    onClick={handleSaveAiSnippet}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold rounded-lg transition shadow-md"
                  >
                    Add to Snippets Vault
                  </button>
                </div>
              </div>
            ) : (
              // PROMPT FORM
              <form onSubmit={handleGenerateAiSnippet} className="flex gap-2.5">
                <input 
                  type="text" 
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Describe your target utility (e.g. React hook to capture browser camera)..."
                  className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-850 rounded-lg text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  disabled={generatingAi}
                  required
                />
                <button 
                  type="submit" 
                  disabled={generatingAi}
                  className="px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition shadow-md flex items-center gap-1 shrink-0"
                >
                  {generatingAi ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{generatingAi ? 'Generating...' : 'Ask AI'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
