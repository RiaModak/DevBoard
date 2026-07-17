/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Terminal, 
  Layers, 
  FolderGit2, 
  Compass, 
  Globe, 
  Unlock,
  AlertCircle,
  CodeXml,
  RefreshCw,
  Plus,
  BookOpen,
  ArrowRight
} from 'lucide-react';

import { api } from './lib/api.js';
import { User, Workspace, Project } from './types.js';

// Components
import Sidebar from './components/Sidebar.js';
import AnalyticsDashboard from './components/AnalyticsDashboard.js';
import KanbanBoard from './components/KanbanBoard.js';
import SnippetVault from './components/SnippetVault.js';
import ApiPlanner from './components/ApiPlanner.js';
import ResourceManager from './components/ResourceManager.js';
import AiAssistant from './components/AiAssistant.js';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');

  // Input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Workspaces & Projects
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);

  // Navigation
  const [activeTab, setActiveTab] = useState('dashboard');

  // Check auth session on startup
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await api.getCurrentUser();
        if (res.user) {
          setUser(res.user);
          await loadWorkspaces();
        }
      } catch (err) {
        console.log('No existing auth session active');
      } finally {
        setAuthChecking(false);
      }
    };
    checkAuth();
  }, []);

  const loadWorkspaces = async () => {
    try {
      const res = await api.getWorkspaces();
      setWorkspaces(res.workspaces);
      if (res.workspaces.length > 0) {
        // Default to first workspace
        setActiveWorkspace(res.workspaces[0]);
        await loadProjects(res.workspaces[0].id);
        await loadMembers(res.workspaces[0].id);
      }
    } catch (err) {
      console.error('Failed to load workspaces list', err);
    }
  };

  const loadProjects = async (wId: string) => {
    try {
      const res = await api.getWorkspaceProjects(wId);
      setProjects(res.projects);
      if (res.projects.length > 0) {
        setActiveProject(res.projects[0]);
      } else {
        setActiveProject(null);
      }
    } catch (err) {
      console.error('Error loading projects list', err);
    }
  };

  const loadMembers = async (wId: string) => {
    try {
      const res = await api.getWorkspaceMembers(wId);
      setWorkspaceMembers(res.members);
    } catch (err) {
      console.error('Error loading members list', err);
    }
  };

  const handleSelectWorkspace = async (w: Workspace) => {
    setActiveWorkspace(w);
    await loadProjects(w.id);
    await loadMembers(w.id);
  };

  const handleCreateWorkspace = async (wName: string, wDesc?: string) => {
    const res = await api.createWorkspace(wName, wDesc);
    if (res.success) {
      setWorkspaces(prev => [...prev, res.workspace]);
      setActiveWorkspace(res.workspace);
      await loadProjects(res.workspace.id);
      await loadMembers(res.workspace.id);
    }
  };

  const handleCreateProject = async (pName: string, pDesc?: string) => {
    if (!activeWorkspace) return;
    const res = await api.createProject(activeWorkspace.id, pName, pDesc);
    if (res.success) {
      setProjects(prev => [...prev, res.project]);
      setActiveProject(res.project);
    }
  };

  const handleInviteMember = async (email: string, role: string) => {
    if (!activeWorkspace) return;
    await api.inviteWorkspaceMember(activeWorkspace.id, email, role);
    await loadMembers(activeWorkspace.id);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      if (authTab === 'login') {
        const res = await api.login(email.trim(), password);
        setUser(res.user);
        await loadWorkspaces();
      } else {
        if (!name.trim()) throw new Error('Please specify your display name');
        const res = await api.register(name.trim(), email.trim(), password);
        setUser(res.user);
        await loadWorkspaces();
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication operation failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail('developer@devboard.io');
    setPassword('password123');
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await api.login('developer@devboard.io', 'password123');
      setUser(res.user);
      await loadWorkspaces();
    } catch (err: any) {
      setAuthError(err.message || 'Demo credentials expired');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.error('Logout error', err);
    }
    setUser(null);
    setWorkspaces([]);
    setActiveWorkspace(null);
    setProjects([]);
    setActiveProject(null);
    setWorkspaceMembers([]);
  };

  const renderActiveTabContent = () => {
    if (!activeProject) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 p-6 text-center space-y-4">
          <FolderGit2 className="w-16 h-16 text-zinc-800 stroke-1" />
          <div className="space-y-1.5 max-w-sm">
            <h2 className="text-lg font-bold text-zinc-100">Project Not Selected</h2>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Every workspace holds multiple projects. Use the Sidebar project creator to add or select a project directory now.
            </p>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <AnalyticsDashboard project={activeProject} />;
      case 'kanban':
        return <KanbanBoard projectId={activeProject.id} members={workspaceMembers} />;
      case 'snippets':
        return <SnippetVault projectId={activeProject.id} />;
      case 'apidocs':
        return <ApiPlanner projectId={activeProject.id} />;
      case 'resources':
        return <ResourceManager projectId={activeProject.id} />;
      default:
        return <AnalyticsDashboard project={activeProject} />;
    }
  };

  // Pre-boot checking session loader
  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center text-zinc-400 space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="text-xs font-mono tracking-wide">Bootstrapping DevBoard full-stack microservices...</span>
      </div>
    );
  }

  // LOGIN / REGISTRATION LANDING WINDOW
  if (!user) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-6 relative overflow-hidden" id="auth_landing_viewport">
        {/* Absolute ambient lights */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-600/10 rounded-full filter blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-10 w-[250px] h-[250px] bg-purple-600/5 rounded-full filter blur-[80px] pointer-events-none" />

        <div className="w-full max-w-md space-y-6 relative z-10">
          {/* Logo Heading */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0c0c0e] border border-zinc-800 rounded-full text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              <span>Full-Stack SaaS Portfolio</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
              <Layers className="w-7 h-7 text-indigo-500 animate-pulse" />
              <span>DevBoard</span>
            </h1>
            <p className="text-xs text-zinc-500 max-w-xs mx-auto">
              Collaborative developer management featuring custom SVG sprints, API planners, and team resource indexers.
            </p>
          </div>

          {/* Form Container */}
          <div className="bg-[#0c0c0e] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5">
            {/* Tab switch */}
            <div className="grid grid-cols-2 bg-[#050506] p-1 rounded-xl border border-zinc-850">
              <button
                type="button"
                onClick={() => {
                  setAuthTab('login');
                  setAuthError('');
                }}
                className={`py-1.5 text-xs font-bold rounded-lg transition ${
                  authTab === 'login' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthTab('register');
                  setAuthError('');
                }}
                className={`py-1.5 text-xs font-bold rounded-lg transition ${
                  authTab === 'register' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Register
              </button>
            </div>

            {/* Auth error message */}
            {authError && (
              <div className="p-3 bg-red-950/20 border border-red-900 rounded-lg text-xs text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs">
              {authTab === 'register' && (
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1.5">Full Display Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sarah Connor"
                    className="w-full px-3 py-2 bg-[#050506] border border-zinc-800 focus:border-indigo-500 focus:outline-none rounded-lg text-zinc-100"
                    required={authTab === 'register'}
                  />
                </div>
              )}

              <div>
                <label className="block text-zinc-400 font-semibold mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full px-3 py-2 bg-[#050506] border border-zinc-800 focus:border-indigo-500 focus:outline-none rounded-lg text-zinc-100 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-[#050506] border border-zinc-800 focus:border-indigo-500 focus:outline-none rounded-lg text-zinc-100 font-mono"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition shadow-md flex items-center justify-center gap-1.5"
              >
                {authLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <span>{authTab === 'login' ? 'Access Board' : 'Create Account'}</span>
                )}
              </button>
            </form>

            
          </div>
          
        </div>
      </div>
    );
  }

  // MAIN SECURE WORKSPACE AND ACTIVE APPLICATION INTERFACE
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-200 flex overflow-hidden font-sans" id="app_workspace_viewport">
      {/* Sidebar navigation */}
      <Sidebar 
        user={user}
        workspaces={workspaces}
        activeWorkspace={activeWorkspace}
        projects={projects}
        activeProject={activeProject}
        activeTab={activeTab}
        onSelectWorkspace={handleSelectWorkspace}
        onSelectProject={setActiveProject}
        onSelectTab={setActiveTab}
        onCreateWorkspace={handleCreateWorkspace}
        onCreateProject={handleCreateProject}
        onInviteMember={handleInviteMember}
        onLogout={handleLogout}
      />

      {/* Main Feature Content Canvas Frame */}
      <div className="flex-1 flex flex-col overflow-hidden h-screen bg-[#09090b]" id="main_content_area">
        {activeWorkspace ? (
          renderActiveTabContent()
        ) : (
          // WELCOME NO WORKSPACE PLACEHOLDER
          <div className="flex-1 flex flex-col items-center justify-center bg-[#09090b] p-6 text-center space-y-4">
            <Sparkles className="w-16 h-16 text-indigo-500 animate-bounce" />
            <div className="space-y-1.5 max-w-sm">
              <h2 className="text-xl font-bold text-white">Welcome to DevBoard!</h2>
              <p className="text-xs text-zinc-500 leading-relaxed">
                To start collaborating, create your first development workspace inside the Sidebar or trigger the quick sandbox button on the left!
              </p>
            </div>
            <button
              onClick={() => handleCreateWorkspace('Engineering Project Alpha', 'Acme cloud development scope')}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition shadow-md"
            >
              Instantly Provision Workspace
            </button>
          </div>
        )}
      </div>

      {/* Persistent floating developer co-pilot chat widget */}
      <AiAssistant />
    </div>
  );
}
