/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Trash2, 
  ExternalLink, 
  BookOpen, 
  Link2, 
  FileText, 
  Archive,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';
import { api } from '../lib/api.js';
import { Resource } from '../types.js';

interface ResourceManagerProps {
  projectId: string;
}

export default function ResourceManager({ projectId }: ResourceManagerProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Manual create form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'link' | 'note' | 'file'>('link');
  const [newUrl, setNewUrl] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('general');

  const fetchResources = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getResources(projectId);
      setResources(res.resources);
    } catch (err: any) {
      setError(err.message || 'Error fetching resources list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [projectId]);

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      await api.createResource({
        projectId,
        title: newTitle.trim(),
        type: newType,
        url: newType === 'link' ? newUrl.trim() : undefined,
        content: newType !== 'link' ? newContent : undefined,
        description: '',
        category: newCategory.trim().toLowerCase()
      });

      setShowAddForm(false);
      setNewTitle('');
      setNewUrl('');
      setNewContent('');
      setNewCategory('general');
      fetchResources();
    } catch (err: any) {
      alert(err.message || 'Failed to save developer resource');
    }
  };

  const handleDeleteResource = async (id: string) => {
    if (!confirm('Are you sure you want to remove this resource link?')) return;
    try {
      await api.deleteResource(id);
      fetchResources();
    } catch (err: any) {
      alert(err.message || 'Failed to delete resource');
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'link': return <Link2 className="w-5 h-5 text-sky-400" />;
      case 'note': return <FileText className="w-5 h-5 text-yellow-400" />;
      default: return <Archive className="w-5 h-5 text-indigo-400" />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#09090b] p-6 text-zinc-100 space-y-6" id="resource_manager">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            Developer Resources Hub
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">Bookmarks, architectural notes, and critical asset manifests</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Resource</span>
        </button>
      </div>

      {showAddForm && (
        // CREATE RESOURCE MODAL FORM
        <div className="bg-[#0c0c0e] border border-zinc-800 p-5 rounded-xl space-y-4 max-w-xl animate-in fade-in slide-in-from-top duration-150">
          <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
            <h3 className="text-sm font-bold text-zinc-200">New Technical Reference</h3>
            <button onClick={() => setShowAddForm(false)} className="text-xs text-zinc-500 hover:text-zinc-300">Cancel</button>
          </div>

          <form onSubmit={handleCreateResource} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Reference Title</label>
                <input 
                  type="text" 
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Acme API Staging Host"
                  className="w-full px-3 py-2 bg-[#050506] border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Resource Type</label>
                <select 
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#050506] border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="link">Web link / GitHub Repo</option>
                  <option value="note">Developer guide / Notebook logs</option>
                  <option value="file">Local mock database / Config files</option>
                </select>
              </div>
            </div>

            {newType === 'link' ? (
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Destination URL Link</label>
                <input 
                  type="url" 
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://github.com/company/project"
                  className="w-full px-3 py-2 bg-[#050506] border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  required={newType === 'link'}
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Reference Guide Content (Markdown/RawText)</label>
                <textarea 
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Paste database ports, secrets schema details, or deployment logs..."
                  className="w-full h-28 px-3 py-2 bg-[#050506] border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono resize-none leading-relaxed"
                  required={newType !== 'link'}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Organization Category Tag</label>
              <input 
                type="text" 
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="e.g. credentials, mock, hosting"
                className="w-full px-3 py-2 bg-[#050506] border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button 
                type="submit" 
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition shadow-md"
              >
                Log Resource
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Directory board */}
      {loading && resources.length === 0 ? (
        <div className="flex items-center justify-center text-xs font-mono text-zinc-500 py-12">
          Syncing developer indexes...
        </div>
      ) : resources.length === 0 ? (
        <div className="border border-dashed border-zinc-800 rounded-xl p-12 text-center max-w-md mx-auto space-y-3">
          <BookOpen className="w-12 h-12 text-zinc-700 mx-auto stroke-1" />
          <h4 className="text-zinc-200 font-bold">Directories Empty</h4>
          <p className="text-xs text-zinc-500 leading-relaxed">Save bookmarks, credentials schemas, environmental ports, or server-config details securely.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((res) => (
            <div 
              key={res.id}
              className="bg-[#0c0c0e] border border-zinc-800 hover:border-zinc-700/60 p-5 rounded-xl shadow-sm hover:shadow-md transition flex flex-col justify-between group relative"
            >
              <div className="space-y-3">
                {/* Header elements */}
                <div className="flex items-start justify-between">
                  <div className="p-2.5 bg-[#050506] border border-zinc-800 rounded-lg shrink-0">
                    {getIcon(res.type)}
                  </div>
                  <span className="text-[9px] font-bold font-mono uppercase text-zinc-500 bg-[#050506] px-2 py-0.5 rounded border border-zinc-800">
                    {res.category}
                  </span>
                </div>

                {/* Details */}
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 group-hover:text-indigo-400 transition">{res.title}</h3>
                  <span className="text-[10px] text-zinc-600 font-mono block mt-0.5">
                    Logged: {new Date(res.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Content body based on resource type */}
                {res.type === 'link' ? (
                  <p className="text-xs text-zinc-400 truncate font-mono bg-[#050506] p-2 rounded border border-zinc-800/40">
                    {res.url}
                  </p>
                ) : (
                  <div className="bg-[#050506]/80 p-3 rounded-lg border border-zinc-800/40 max-h-32 overflow-y-auto">
                    <pre className="font-mono text-[10px] text-zinc-300 whitespace-pre scrollbar-thin leading-relaxed">
                      {res.content}
                    </pre>
                  </div>
                )}
              </div>

              {/* Action row */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800/40 mt-4">
                {res.type === 'link' ? (
                  <a 
                    href={res.url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-indigo-400 transition"
                    title="Open destination in new tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                ) : (
                  <button 
                    onClick={() => handleCopyText(res.content || '', res.id)}
                    className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-indigo-400 transition"
                    title="Copy resource details to clipboard"
                  >
                    {copiedId === res.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
                
                <button 
                  onClick={() => handleDeleteResource(res.id)}
                  className="p-1.5 hover:bg-zinc-800 rounded text-zinc-500 hover:text-red-400 transition opacity-0 group-hover:opacity-100"
                  title="Remove reference bookmark"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
