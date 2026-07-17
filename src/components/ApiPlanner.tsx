/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Trash2, 
  Sparkles,
  RefreshCw,
  Globe,
  Lock,
  Unlock,
  Check,
  ChevronRight,
  Eye,
  FileJson
} from 'lucide-react';
import { api } from '../lib/api.js';
import { ApiDoc, ApiDocParameter } from '../types.js';

interface ApiPlannerProps {
  projectId: string;
}

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;

export default function ApiPlanner({ projectId }: ApiPlannerProps) {
  const [docs, setDocs] = useState<ApiDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Selected document spec
  const [activeDoc, setActiveDoc] = useState<ApiDoc | null>(null);

  // Manual create spec states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEndpoint, setNewEndpoint] = useState('');
  const [newMethod, setNewMethod] = useState<typeof METHODS[number]>('GET');
  const [newDesc, setNewDesc] = useState('');
  const [newAuth, setNewAuth] = useState(false);
  const [newReqBody, setNewReqBody] = useState('');
  const [newRespBody, setNewRespBody] = useState('');
  const [newCodes, setNewCodes] = useState('200, 400');
  
  // Custom temporary parameter builder
  const [tempParams, setTempParams] = useState<ApiDocParameter[]>([]);
  const [pName, setPName] = useState('');
  const [pType, setPType] = useState('string');
  const [pReq, setPReq] = useState(true);
  const [pDesc, setPDesc] = useState('');

  // AI Spec drafting states
  const [aiDraftPrompt, setAiDraftPrompt] = useState('');
  const [draftingAi, setDraftingAi] = useState(false);
  const [generatedAiDoc, setGeneratedAiDoc] = useState<any>(null);

  const fetchDocs = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getApiDocs(projectId, search || undefined);
      setDocs(res.apiDocs);
      if (res.apiDocs.length > 0 && !activeDoc) {
        setActiveDoc(res.apiDocs[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching API planner specifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [projectId, search]);

  const addTempParam = () => {
    if (!pName.trim()) return;
    setTempParams(prev => [...prev, {
      name: pName.trim(),
      type: pType,
      required: pReq,
      description: pDesc.trim()
    }]);
    setPName('');
    setPDesc('');
  };

  const removeTempParam = (index: number) => {
    setTempParams(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEndpoint.trim() || !newMethod) return;

    try {
      const statusArray = newCodes.split(',').map(c => parseInt(c.trim(), 10)).filter(Number.isInteger);
      await api.createApiDoc({
        projectId,
        endpoint: newEndpoint.trim(),
        method: newMethod,
        description: newDesc,
        isAuthRequired: newAuth,
        parameters: tempParams,
        requestBody: newReqBody,
        response: newRespBody,
        statusCodes: statusArray.length > 0 ? statusArray : [200]
      });

      setShowAddForm(false);
      setNewEndpoint('');
      setNewDesc('');
      setNewMethod('GET');
      setNewAuth(false);
      setNewReqBody('');
      setNewRespBody('');
      setNewCodes('200, 400');
      setTempParams([]);
      fetchDocs();
    } catch (err: any) {
      alert(err.message || 'Error creating API spec document');
    }
  };

  const handleDeleteDoc = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API specification?')) return;
    try {
      await api.deleteApiDoc(id);
      if (activeDoc?.id === id) setActiveDoc(null);
      fetchDocs();
    } catch (err: any) {
      alert(err.message || 'Failed to delete API spec');
    }
  };

  // AI Drafting mechanics
  const handleDraftAiSpec = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiDraftPrompt.trim()) return;

    setDraftingAi(true);
    setGeneratedAiDoc(null);
    try {
      const res = await api.draftAiApiDoc(aiDraftPrompt);
      setGeneratedAiDoc(res.apiDoc);
    } catch (err: any) {
      alert(err.message || 'Failed to draft spec via Gemini');
    } finally {
      setDraftingAi(false);
    }
  };

  const handleSaveAiSpec = async () => {
    if (!generatedAiDoc) return;
    try {
      await api.createApiDoc({
        projectId,
        endpoint: generatedAiDoc.endpoint,
        method: generatedAiDoc.method,
        description: generatedAiDoc.description,
        isAuthRequired: generatedAiDoc.isAuthRequired,
        parameters: generatedAiDoc.parameters,
        requestBody: generatedAiDoc.requestBody,
        response: generatedAiDoc.response,
        statusCodes: generatedAiDoc.statusCodes
      });
      setGeneratedAiDoc(null);
      setAiDraftPrompt('');
      fetchDocs();
    } catch (err: any) {
      alert(err.message || 'Failed to persist drafted spec');
    }
  };

  const getMethodBadgeColor = (m: string) => {
    switch (m) {
      case 'GET': return 'bg-blue-950/40 text-blue-400 border-blue-900/60';
      case 'POST': return 'bg-emerald-950/40 text-emerald-400 border-emerald-900/60';
      case 'PUT': return 'bg-yellow-950/40 text-yellow-400 border-yellow-900/60';
      case 'DELETE': return 'bg-red-950/40 text-red-400 border-red-900/60';
      default: return 'bg-purple-950/40 text-purple-400 border-purple-900/60';
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full bg-[#09090b] text-zinc-100 overflow-hidden" id="api_planner_view">
      {/* LEFT: API specs catalogue directory */}
      <div className="w-full md:w-80 border-r border-zinc-800 flex flex-col h-full bg-[#0c0c0e]/30 p-4 space-y-4">
        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter API specs..."
              className="w-full px-3 py-1.5 bg-[#050506] border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
            />
          </div>
          <button 
            onClick={() => {
              setGeneratedAiDoc(null);
              setShowAddForm(true);
            }}
            className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition shrink-0"
            title="Draft spec manually"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Catalog */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loading && docs.length === 0 ? (
            <p className="text-[10px] text-zinc-500 font-mono text-center py-4">Syncing schema specs...</p>
          ) : docs.length === 0 ? (
            <p className="text-[10px] text-zinc-600 font-mono text-center py-4 bg-[#050506]/20 border border-dashed border-zinc-800 rounded-lg">No endpoints mapped</p>
          ) : (
            docs.map((d) => (
              <button
                key={d.id}
                onClick={() => {
                  setShowAddForm(false);
                  setGeneratedAiDoc(null);
                  setActiveDoc(d);
                }}
                className={`w-full text-left p-3 rounded-lg border text-xs flex flex-col gap-1.5 transition ${
                  activeDoc?.id === d.id
                    ? 'bg-zinc-800 border-indigo-500/80 text-zinc-100 font-medium'
                    : 'bg-[#0c0c0e]/40 hover:bg-zinc-800/40 border-zinc-800/50 text-zinc-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getMethodBadgeColor(d.method)}`}>
                    {d.method}
                  </span>
                  {d.isAuthRequired && <Lock className="w-3 h-3 text-zinc-500" title="Security token required" />}
                </div>
                <span className="font-mono text-zinc-200 font-bold line-clamp-1 truncate">{d.endpoint}</span>
                <span className="text-[10px] text-zinc-500 line-clamp-2">{d.description}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* RIGHT: Selected API specification inspection OR forms */}
      <div className="flex-1 flex flex-col h-full bg-[#09090b] p-6 overflow-hidden">
        {showAddForm ? (
          // MANUAL ADD FORM PANEL
          <div className="flex-1 flex flex-col space-y-4 overflow-y-auto max-w-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                <Globe className="w-5 h-5 text-indigo-400" />
                Draft API Specification
              </h2>
              <button 
                onClick={() => {
                  setShowAddForm(false);
                  if (docs.length > 0) setActiveDoc(docs[0]);
                }}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition font-semibold"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateDoc} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Endpoint URL Path</label>
                  <input 
                    type="text" 
                    value={newEndpoint}
                    onChange={(e) => setNewEndpoint(e.target.value)}
                    placeholder="e.g. /api/v1/auth/register"
                    className="w-full px-3 py-2 bg-[#050506] border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">HTTP Method</label>
                  <select 
                    value={newMethod}
                    onChange={(e) => setNewMethod(e.target.value as typeof METHODS[number])}
                    className="w-full px-3 py-2 bg-[#050506] border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {METHODS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="new_auth"
                  checked={newAuth}
                  onChange={(e) => setNewAuth(e.target.checked)}
                  className="rounded bg-[#050506] border-zinc-800 text-indigo-600 focus:ring-0"
                />
                <label htmlFor="new_auth" className="text-xs font-semibold text-zinc-400 select-none cursor-pointer">
                  Require HttpOnly Session/JWT validation header
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Endpoint Objective</label>
                <textarea 
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Describe what values this route queries or updates..."
                  className="w-full h-16 px-3 py-2 bg-[#050506] border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none leading-relaxed"
                />
              </div>

              {/* Parameters temporary creator */}
              <div className="space-y-2 p-3 bg-zinc-950/40 rounded-lg border border-zinc-900">
                <span className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Request Parameters / Query Fields</span>
                
                {/* Temp params lists */}
                {tempParams.length > 0 && (
                  <div className="space-y-1 pb-2 border-b border-zinc-900">
                    {tempParams.map((p, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-zinc-900 px-2.5 py-1.5 rounded text-xs font-mono">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-100">{p.name}</span>
                          <span className="text-indigo-400">({p.type})</span>
                          {p.required && <span className="text-[10px] text-red-400 bg-red-950/20 px-1 rounded">Required</span>}
                          <span className="text-zinc-500 font-sans text-[10px]">— {p.description}</span>
                        </div>
                        <button type="button" onClick={() => removeTempParam(idx)} className="text-zinc-600 hover:text-red-400 transition">✕</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Builders */}
                <div className="grid grid-cols-4 gap-2">
                  <input 
                    type="text" 
                    value={pName}
                    onChange={(e) => setPName(e.target.value)}
                    placeholder="field_name"
                    className="px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-xs focus:outline-none"
                  />
                  <select 
                    value={pType}
                    onChange={(e) => setPType(e.target.value)}
                    className="px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-xs focus:outline-none"
                  >
                    <option value="string">string</option>
                    <option value="number">number</option>
                    <option value="boolean">boolean</option>
                    <option value="object">object</option>
                  </select>
                  <input 
                    type="text" 
                    value={pDesc}
                    onChange={(e) => setPDesc(e.target.value)}
                    placeholder="objective..."
                    className="px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-xs focus:outline-none"
                  />
                  <button 
                    type="button" 
                    onClick={addTempParam}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold rounded text-xs transition"
                  >
                    Add Parameter
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">JSON Request Body Schema (Optional)</label>
                  <textarea 
                    value={newReqBody}
                    onChange={(e) => setNewReqBody(e.target.value)}
                    placeholder={`{\n  "email": "sarah@devboard.io"\n}`}
                    className="w-full h-24 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">JSON Response Body Schema</label>
                  <textarea 
                    value={newRespBody}
                    onChange={(e) => setNewRespBody(e.target.value)}
                    placeholder={`{\n  "success": true\n}`}
                    className="w-full h-24 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono resize-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Response HTTP Codes (Comma-separated)</label>
                <input 
                  type="text" 
                  value={newCodes}
                  onChange={(e) => setNewCodes(e.target.value)}
                  placeholder="200, 400, 401"
                  className="w-full px-3 py-2 bg-[#050506] border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition shadow-md"
                >
                  Save API Spec
                </button>
              </div>
            </form>
          </div>
        ) : activeDoc ? (
          // API SCHEMA INSPECTOR DISPLAY
          <div className="flex-1 flex flex-col h-full overflow-hidden space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-zinc-800 gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold border shrink-0 ${getMethodBadgeColor(activeDoc.method)}`}>
                  {activeDoc.method}
                </span>
                <span className="font-mono text-zinc-100 font-bold text-sm truncate">{activeDoc.endpoint}</span>
              </div>
              <div className="flex items-center gap-2">
                {activeDoc.isAuthRequired ? (
                  <span className="px-2 py-1 bg-[#0c0c0e]/60 border border-zinc-800 rounded-lg text-[10px] font-mono text-indigo-400 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>JWT REQUIRED</span>
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-[#0c0c0e]/60 border border-zinc-800 rounded-lg text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                    <Unlock className="w-3 h-3" />
                    <span>PUBLIC ROUTE</span>
                  </span>
                )}
                <button 
                  onClick={() => handleDeleteDoc(activeDoc.id)}
                  className="p-2 bg-[#0c0c0e]/60 border border-zinc-800 hover:border-red-900/40 hover:bg-red-950/20 text-zinc-400 hover:text-red-400 rounded-lg transition"
                  title="Delete API spec"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* description */}
              <div>
                <span className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Route Objective</span>
                <p className="text-xs text-zinc-300 leading-relaxed bg-[#050506]/30 p-3 rounded-lg border border-zinc-800">
                  {activeDoc.description}
                </p>
              </div>

              {/* Parameter table specs */}
              {activeDoc.parameters.length > 0 && (
                <div>
                  <span className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Request Parameters</span>
                  <div className="bg-[#050506]/40 rounded-lg border border-zinc-800 overflow-hidden">
                    <table className="w-full text-left text-xs text-zinc-400 font-mono">
                      <thead className="bg-[#0c0c0e] text-[10px] font-bold text-zinc-500 uppercase">
                        <tr>
                          <th className="p-2.5">Field</th>
                          <th className="p-2.5">Type</th>
                          <th className="p-2.5">Required</th>
                          <th className="p-2.5">Usage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeDoc.parameters.map((p, i) => (
                          <tr key={i} className="border-t border-zinc-800">
                            <td className="p-2.5 font-bold text-zinc-200">{p.name}</td>
                            <td className="p-2.5 text-indigo-400">({p.type})</td>
                            <td className="p-2.5">
                              {p.required ? <span className="text-red-400 font-bold font-sans text-[10px]">True</span> : <span className="text-zinc-600">False</span>}
                            </td>
                            <td className="p-2.5 text-zinc-400 font-sans">{p.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Payloads */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeDoc.requestBody && (
                  <div>
                    <span className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <FileJson className="w-3.5 h-3.5" />
                      Request payload schema
                    </span>
                    <pre className="bg-[#050506] p-3.5 rounded-xl border border-zinc-800 font-mono text-xs text-zinc-300 overflow-x-auto leading-relaxed scrollbar-thin max-h-48">
                      {activeDoc.requestBody}
                    </pre>
                  </div>
                )}
                <div>
                  <span className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <FileJson className="w-3.5 h-3.5" />
                    Response payload structure
                  </span>
                  <pre className="bg-[#050506] p-3.5 rounded-xl border border-zinc-800 font-mono text-xs text-zinc-300 overflow-x-auto leading-relaxed scrollbar-thin max-h-48">
                    {activeDoc.response}
                  </pre>
                </div>
              </div>

              {/* Status codes */}
              <div>
                <span className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">HTTP Status Responses</span>
                <div className="flex gap-2.5">
                  {activeDoc.statusCodes.map((c) => (
                    <span 
                      key={c} 
                      className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                        c >= 200 && c < 300 
                          ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400' 
                          : 'bg-red-950/20 border-red-900/40 text-red-400'
                      }`}
                    >
                      {c} {c === 200 ? 'OK' : c === 201 ? 'Created' : c === 400 ? 'Bad Request' : c === 401 ? 'Unauthorized' : 'Error'}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          // EMPTY STATE
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 max-w-md mx-auto">
            <Globe className="w-16 h-16 text-zinc-700 stroke-1" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-zinc-200">No Mapped Endpoints</h3>
              <p className="text-xs text-zinc-500">Draft your project's microservice specs or trigger the Gemini drafting tool below.</p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 text-xs font-semibold rounded-lg transition"
            >
              Draft first route
            </button>
          </div>
        )}

        {/* BOTTOM SECTION: COOPERATIVE AI SPEC GENERATOR */}
        <div className="mt-6 border-t border-zinc-900 pt-6 shrink-0">
          <div className="bg-gradient-to-r from-indigo-950/20 via-purple-950/20 to-zinc-950 border border-indigo-900/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                Gemini AI API Spec Drafter
              </h3>
              <span className="text-[9px] font-mono text-zinc-500">Express + `@google/genai`</span>
            </div>

            {generatedAiDoc ? (
              // AI PREVIEW CONTAINER
              <div className="space-y-3 bg-zinc-950/80 p-3.5 rounded-lg border border-indigo-900/30 animate-in fade-in slide-in-from-bottom duration-150">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getMethodBadgeColor(generatedAiDoc.method)}`}>
                      {generatedAiDoc.method}
                    </span>
                    <span className="font-mono text-zinc-200 font-bold text-xs truncate">{generatedAiDoc.endpoint}</span>
                  </div>
                  <span className="text-[9px] font-mono text-zinc-500">Draft specifications</span>
                </div>
                
                <p className="text-[10px] text-zinc-400 italic">“{generatedAiDoc.description}”</p>

                <div className="flex justify-end gap-2.5">
                  <button 
                    onClick={() => setGeneratedAiDoc(null)}
                    className="px-3 py-1.5 hover:bg-zinc-900 text-[10px] text-zinc-400 rounded-lg transition"
                  >
                    Discard
                  </button>
                  <button 
                    onClick={handleSaveAiSpec}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold rounded-lg transition shadow-md"
                  >
                    Add to API Specs Directory
                  </button>
                </div>
              </div>
            ) : (
              // PROMPT FORM
              <form onSubmit={handleDraftAiSpec} className="flex gap-2.5">
                <input 
                  type="text" 
                  value={aiDraftPrompt}
                  onChange={(e) => setAiDraftPrompt(e.target.value)}
                  placeholder="Describe your endpoint (e.g. a POST endpoint that logs users in and sends back a profile payload)..."
                  className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-850 rounded-lg text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  disabled={draftingAi}
                  required
                />
                <button 
                  type="submit" 
                  disabled={draftingAi}
                  className="px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition shadow-md flex items-center gap-1 shrink-0"
                >
                  {draftingAi ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{draftingAi ? 'Drafting...' : 'Draft Route'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
