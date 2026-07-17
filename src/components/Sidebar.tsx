/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FolderGit2, 
  Plus, 
  LogOut, 
  LayoutDashboard, 
  Trello, 
  CodeXml, 
  Globe, 
  BookOpen, 
  User, 
  Settings,
  ChevronDown,
  UserPlus,
  Compass,
  Bell
} from 'lucide-react';
import { Workspace, Project } from '../types.js';

interface SidebarProps {
  user: { name: string; email: string; avatarUrl?: string };
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  projects: Project[];
  activeProject: Project | null;
  activeTab: string;
  onSelectWorkspace: (w: Workspace) => void;
  onSelectProject: (p: Project | null) => void;
  onSelectTab: (tab: string) => void;
  onCreateWorkspace: (name: string, description?: string) => Promise<void>;
  onCreateProject: (name: string, description?: string) => Promise<void>;
  onInviteMember: (email: string, role: string) => Promise<void>;
  onLogout: () => void;
}

export default function Sidebar({
  user,
  workspaces,
  activeWorkspace,
  projects,
  activeProject,
  activeTab,
  onSelectWorkspace,
  onSelectProject,
  onSelectTab,
  onCreateWorkspace,
  onCreateProject,
  onInviteMember,
  onLogout
}: SidebarProps) {
  const [showWspDropdown, setShowWspDropdown] = useState(false);
  const [showNewWspModal, setShowNewWspModal] = useState(false);
  const [showNewPrjModal, setShowNewPrjModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Form states
  const [wspName, setWspName] = useState('');
  const [wspDesc, setWspDesc] = useState('');
  const [prjName, setPrjName] = useState('');
  const [prjDesc, setPrjDesc] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wspName.trim()) return;
    setLoading(true);
    setErrorMsg('');
    try {
      await onCreateWorkspace(wspName, wspDesc);
      setShowNewWspModal(false);
      setWspName('');
      setWspDesc('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create workspace');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prjName.trim()) return;
    setLoading(true);
    setErrorMsg('');
    try {
      await onCreateProject(prjName, prjDesc);
      setShowNewPrjModal(false);
      setPrjName('');
      setPrjDesc('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setLoading(true);
    setErrorMsg('');
    try {
      await onInviteMember(inviteEmail, inviteRole);
      setShowInviteModal(false);
      setInviteEmail('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to invite member');
    } finally {
      setLoading(false);
    }
  };

  const mainNavItems = [
    { id: 'dashboard', label: 'Analytics Dashboard', icon: LayoutDashboard },
    { id: 'kanban', label: 'Kanban Board', icon: Trello },
    { id: 'snippets', label: 'Snippet Vault', icon: CodeXml },
    { id: 'apidocs', label: 'API Planner', icon: Globe },
    { id: 'resources', label: 'Resources Hub', icon: BookOpen },
  ];

  return (
    <div className="w-64 bg-[#0c0c0e] border-r border-zinc-800 text-zinc-300 flex flex-col h-full select-none" id="sidebar_container">
      {/* Workspace Selector */}
      <div className="p-4 border-b border-zinc-800 relative">
        <button 
          onClick={() => setShowWspDropdown(!showWspDropdown)}
          className="w-full flex items-center justify-between p-2 rounded-lg bg-zinc-900/50 hover:bg-zinc-900/80 border border-zinc-800 text-left transition"
          id="wsp_selector_btn"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shrink-0">
              {activeWorkspace?.name.substring(0, 2).toUpperCase() || 'DB'}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm text-zinc-100 truncate">{activeWorkspace?.name || 'Loading...'}</h3>
              <span className="text-xs text-zinc-500 truncate block">Workspace</span>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-zinc-500" />
        </button>

        {showWspDropdown && (
          <div className="absolute left-4 right-4 mt-2 bg-[#0c0c0e] border border-zinc-800 rounded-lg shadow-xl py-1.5 z-50">
            <div className="px-2 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              Workspaces
            </div>
            {workspaces.map((w) => (
              <button
                key={w.id}
                onClick={() => {
                  onSelectWorkspace(w);
                  setShowWspDropdown(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-zinc-800 transition ${
                  activeWorkspace?.id === w.id ? 'text-indigo-400 font-medium bg-zinc-850/50' : 'text-zinc-300'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span className="truncate">{w.name}</span>
              </button>
            ))}
            <div className="border-t border-zinc-800 my-1.5" />
            <button
              onClick={() => {
                setShowNewWspModal(true);
                setShowWspDropdown(false);
              }}
              className="w-full text-left px-3 py-2 text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-2 font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>New Workspace</span>
            </button>
          </div>
        )}
      </div>

      {/* Project Selector */}
      <div className="px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-2 py-1">Projects</span>
          <button 
            onClick={() => setShowNewPrjModal(true)}
            className="p-1 rounded hover:bg-zinc-900 text-zinc-400 hover:text-zinc-100 transition"
            title="Create Project"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        {projects.length === 0 ? (
          <div className="text-xs text-zinc-600 p-2 text-center bg-[#050506]/30 rounded-lg border border-zinc-800/50">
            No active projects
          </div>
        ) : (
          <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelectProject(p)}
                className={`w-full text-left px-3 py-1.5 rounded-md text-xs flex items-center gap-2 transition ${
                  activeProject?.id === p.id 
                    ? 'bg-zinc-800 text-indigo-400 font-semibold border-l-2 border-indigo-500' 
                    : 'hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <FolderGit2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{p.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Navigation (only enabled if a project is active) */}
      <div className="flex-1 p-4 space-y-1">
        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-2 py-2">
          Navigation
        </div>
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isDisabled = !activeProject;
          return (
            <button
              key={item.id}
              disabled={isDisabled}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition text-left ${
                isDisabled
                  ? 'opacity-40 cursor-not-allowed'
                  : activeTab === item.id
                  ? 'bg-zinc-800 text-zinc-100 font-medium border border-zinc-700/50'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${activeTab === item.id ? 'text-indigo-400' : 'text-zinc-500'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}

        {activeWorkspace && (
          <div className="pt-4 border-t border-zinc-800 mt-4">
            <button
              onClick={() => setShowInviteModal(true)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 transition text-left"
            >
              <UserPlus className="w-4 h-4 text-zinc-500" />
              <span>Invite Team Member</span>
            </button>
          </div>
        )}
      </div>

      {/* User profile & controls */}
      <div className="p-4 border-t border-zinc-800 bg-[#0c0c0e]">
        <div className="flex items-center gap-3 mb-3">
          <img 
            src={user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`} 
            alt={user.name} 
            className="w-9 h-9 rounded-full object-cover bg-zinc-800 border border-zinc-700" 
          />
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-zinc-100 truncate">{user.name}</h4>
            <span className="text-xs text-zinc-500 truncate block">{user.email}</span>
          </div>
        </div>

        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-medium border border-zinc-800 hover:border-red-900 hover:bg-red-950/20 hover:text-red-400 text-zinc-400 transition"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* MODAL: CREATE WORKSPACE */}
      {showNewWspModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-850 rounded-xl p-6 w-full max-w-md animate-in fade-in zoom-in duration-150">
            <h3 className="text-lg font-bold text-zinc-100 mb-1 flex items-center gap-2">
              <Compass className="w-5 h-5 text-indigo-400" />
              Create Workspace
            </h3>
            <p className="text-xs text-zinc-400 mb-4">Workspaces group team members, multiple projects, and custom snippets together.</p>
            
            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Workspace Name</label>
                <input 
                  type="text" 
                  value={wspName}
                  onChange={(e) => setWspName(e.target.value)}
                  placeholder="e.g. Acme Software Dev"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description (Optional)</label>
                <textarea 
                  value={wspDesc}
                  onChange={(e) => setWspDesc(e.target.value)}
                  placeholder="Brief summary of the target projects or team scope..."
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 h-20 resize-none"
                />
              </div>

              {errorMsg && <div className="text-xs text-red-400 bg-red-950/20 p-2.5 rounded-lg border border-red-900">{errorMsg}</div>}

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowNewWspModal(false)}
                  className="px-4 py-2 text-xs font-semibold hover:bg-zinc-800 text-zinc-300 rounded-lg transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition shadow-md"
                >
                  {loading ? 'Creating...' : 'Create Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE PROJECT */}
      {showNewPrjModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-850 rounded-xl p-6 w-full max-w-md animate-in fade-in zoom-in duration-150">
            <h3 className="text-lg font-bold text-zinc-100 mb-1 flex items-center gap-2">
              <FolderGit2 className="w-5 h-5 text-indigo-400" />
              Add Project
            </h3>
            <p className="text-xs text-zinc-400 mb-4">Each project houses tasks, API logs, and resource directories.</p>
            
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Project Name</label>
                <input 
                  type="text" 
                  value={prjName}
                  onChange={(e) => setPrjName(e.target.value)}
                  placeholder="e.g. DevBoard REST API"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Objective / Summary</label>
                <textarea 
                  value={prjDesc}
                  onChange={(e) => setPrjDesc(e.target.value)}
                  placeholder="What is the architecture stack or scope of this project?..."
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 h-20 resize-none"
                />
              </div>

              {errorMsg && <div className="text-xs text-red-400 bg-red-950/20 p-2.5 rounded-lg border border-red-900">{errorMsg}</div>}

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowNewPrjModal(false)}
                  className="px-4 py-2 text-xs font-semibold hover:bg-zinc-800 text-zinc-300 rounded-lg transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition shadow-md"
                >
                  {loading ? 'Adding...' : 'Add Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INVITE MEMBER */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-850 rounded-xl p-6 w-full max-w-md animate-in fade-in zoom-in duration-150">
            <h3 className="text-lg font-bold text-zinc-100 mb-1 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-400" />
              Invite Team Member
            </h3>
            <p className="text-xs text-zinc-400 mb-4">Grant role-based access control inside the current workspace.</p>
            
            <form onSubmit={handleInviteMember} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Registered Email Address</label>
                <input 
                  type="email" 
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@domain.com"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Security Role (RBAC)</label>
                <select 
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="member">Workspace Member (Default task worker)</option>
                  <option value="admin">Workspace Administrator (Can manage projects)</option>
                </select>
              </div>

              {errorMsg && <div className="text-xs text-red-400 bg-red-950/20 p-2.5 rounded-lg border border-red-900">{errorMsg}</div>}

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-xs font-semibold hover:bg-zinc-800 text-zinc-300 rounded-lg transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition shadow-md"
                >
                  {loading ? 'Inviting...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
