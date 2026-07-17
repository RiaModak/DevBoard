/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  User, Workspace, Project, Task, Comment, Snippet, ApiDoc, Resource, Activity 
} from '../types.js';

// Base API Path matches our Express backend
const API_BASE = '/api/v1';

async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  // Always send cookies
  options.credentials = 'include';
  options.headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `HTTP error! status: ${response.status}`);
  }

  return data as T;
}

export const api = {
  // --- AUTHENTICATION ---
  async login(email: string, password: string) {
    return fetchJson<{ success: boolean; user: User; token: string }>(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async register(name: string, email: string, password: string) {
    return fetchJson<{ success: boolean; user: User; token: string }>(`${API_BASE}/auth/register`, {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  },

  async logout() {
    return fetchJson<{ success: boolean }>(`${API_BASE}/auth/logout`, {
      method: 'POST',
    });
  },

  async getCurrentUser() {
    return fetchJson<{ user: User | null }>(`${API_BASE}/auth/me`);
  },

  async updateProfile(name: string, avatarUrl?: string) {
    return fetchJson<{ success: boolean; user: User }>(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      body: JSON.stringify({ name, avatarUrl }),
    });
  },

  // --- WORKSPACES & PROJECTS ---
  async getWorkspaces() {
    return fetchJson<{ workspaces: Workspace[] }>(`${API_BASE}/workspaces`);
  },

  async createWorkspace(name: string, description?: string) {
    return fetchJson<{ success: boolean; workspace: Workspace }>(`${API_BASE}/workspaces`, {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  },

  async getWorkspaceProjects(workspaceId: string) {
    return fetchJson<{ projects: Project[] }>(`${API_BASE}/workspaces/${workspaceId}/projects`);
  },

  async createProject(workspaceId: string, name: string, description?: string) {
    return fetchJson<{ success: boolean; project: Project }>(`${API_BASE}/workspaces/${workspaceId}/projects`, {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  },

  async getWorkspaceMembers(workspaceId: string) {
    return fetchJson<{ members: { userId: string; role: string; name: string; email: string; avatarUrl?: string }[] }>(
      `${API_BASE}/workspaces/${workspaceId}/members`
    );
  },

  async inviteWorkspaceMember(workspaceId: string, email: string, role: string) {
    return fetchJson<{ success: boolean; message: string }>(`${API_BASE}/workspaces/${workspaceId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    });
  },

  // --- KANBAN TASKS & COMMENTS ---
  async getTasks(projectId: string, filters: { status?: string; priority?: string; assigneeId?: string; search?: string; page?: number; limit?: number } = {}) {
    const params = new URLSearchParams();
    params.append('projectId', projectId);
    if (filters.status) params.append('status', filters.status);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.assigneeId) params.append('assigneeId', filters.assigneeId);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    return fetchJson<{ tasks: Task[]; pagination: { total: number; page: number; limit: number; pages: number } }>(
      `${API_BASE}/tasks?${params.toString()}`
    );
  },

  async createTask(taskData: Omit<Task, 'id' | 'creatorId' | 'createdAt' | 'attachments'>) {
    return fetchJson<{ success: boolean; task: Task }>(`${API_BASE}/tasks`, {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  },

  async updateTask(taskId: string, updateData: Partial<Task>) {
    return fetchJson<{ success: boolean; task: Task }>(`${API_BASE}/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  },

  async deleteTask(taskId: string) {
    return fetchJson<{ success: boolean; message: string }>(`${API_BASE}/tasks/${taskId}`, {
      method: 'DELETE',
    });
  },

  async getTaskComments(taskId: string) {
    return fetchJson<{ comments: Comment[] }>(`${API_BASE}/tasks/${taskId}/comments`);
  },

  async createTaskComment(taskId: string, content: string, parentId?: string) {
    return fetchJson<{ success: boolean; comment: Comment }>(`${API_BASE}/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, parentId }),
    });
  },

  async getProjectTimeline(projectId: string) {
    return fetchJson<{ activities: Activity[] }>(`${API_BASE}/tasks/project/${projectId}/activities`);
  },

  async getProjectAnalytics(projectId: string) {
    return fetchJson<{
      summary: { total: number; backlog: number; todo: number; inProgress: number; review: number; done: number; completionRate: number };
      priority: { name: string; value: number; color: string }[];
      workload: { name: string; assigned: number; done: number }[];
      weeklyProgress: { name: string; completed: number; created: number }[];
      burndown: { day: string; remaining: number }[];
    }>(`${API_BASE}/tasks/project/${projectId}/analytics`);
  },

  // --- CODE SNIPPET VAULT ---
  async getSnippets(projectId: string, filters: { search?: string; tag?: string; language?: string } = {}) {
    const params = new URLSearchParams();
    params.append('projectId', projectId);
    if (filters.search) params.append('search', filters.search);
    if (filters.tag) params.append('tag', filters.tag);
    if (filters.language) params.append('language', filters.language);

    return fetchJson<{ snippets: Snippet[] }>(`${API_BASE}/snippets?${params.toString()}`);
  },

  async createSnippet(snippetData: { projectId: string; title: string; description: string; code: string; language: string; tags: string[] }) {
    return fetchJson<{ success: boolean; snippet: Snippet }>(`${API_BASE}/snippets`, {
      method: 'POST',
      body: JSON.stringify(snippetData),
    });
  },

  async updateSnippet(snippetId: string, updateData: Partial<Snippet>) {
    return fetchJson<{ success: boolean; snippet: Snippet }>(`${API_BASE}/snippets/${snippetId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  },

  async toggleFavoriteSnippet(snippetId: string) {
    return fetchJson<{ success: boolean; isFavorite: boolean }>(`${API_BASE}/snippets/${snippetId}/favorite`, {
      method: 'POST',
    });
  },

  async deleteSnippet(snippetId: string) {
    return fetchJson<{ success: boolean; message: string }>(`${API_BASE}/snippets/${snippetId}`, {
      method: 'DELETE',
    });
  },

  // --- API SPEC PLANNER ---
  async getApiDocs(projectId: string, search?: string) {
    const params = new URLSearchParams();
    params.append('projectId', projectId);
    if (search) params.append('search', search);

    return fetchJson<{ apiDocs: ApiDoc[] }>(`${API_BASE}/apidocs?${params.toString()}`);
  },

  async createApiDoc(apiData: Omit<ApiDoc, 'id'>) {
    return fetchJson<{ success: boolean; apiDoc: ApiDoc }>(`${API_BASE}/apidocs`, {
      method: 'POST',
      body: JSON.stringify(apiData),
    });
  },

  async updateApiDoc(apiId: string, updateData: Partial<ApiDoc>) {
    return fetchJson<{ success: boolean; apiDoc: ApiDoc }>(`${API_BASE}/apidocs/${apiId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  },

  async deleteApiDoc(apiId: string) {
    return fetchJson<{ success: boolean; message: string }>(`${API_BASE}/apidocs/${apiId}`, {
      method: 'DELETE',
    });
  },

  // --- DEVELOPER RESOURCES ---
  async getResources(projectId: string, type?: string) {
    const params = new URLSearchParams();
    params.append('projectId', projectId);
    if (type) params.append('type', type);

    return fetchJson<{ resources: Resource[] }>(`${API_BASE}/resources?${params.toString()}`);
  },

  async createResource(resourceData: Omit<Resource, 'id' | 'createdAt'>) {
    return fetchJson<{ success: boolean; resource: Resource }>(`${API_BASE}/resources`, {
      method: 'POST',
      body: JSON.stringify(resourceData),
    });
  },

  async deleteResource(resourceId: string) {
    return fetchJson<{ success: boolean; message: string }>(`${API_BASE}/resources/${resourceId}`, {
      method: 'DELETE',
    });
  },

  // --- COOPERATIVE AI CO-PILOT ENDPOINTS ---
  async assistantChat(message: string, chatHistory?: any[]) {
    return fetchJson<{ text: string; isFallback?: boolean }>(`${API_BASE}/ai/assistant-chat`, {
      method: 'POST',
      body: JSON.stringify({ message, chatHistory }),
    });
  },

  async generateAiSnippet(prompt: string) {
    return fetchJson<{ success: boolean; snippet: { title: string; description: string; language: string; code: string; tags: string[] }; isFallback?: boolean }>(
      `${API_BASE}/ai/generate-snippet`,
      {
        method: 'POST',
        body: JSON.stringify({ prompt }),
      }
    );
  },

  async draftAiApiDoc(description: string) {
    return fetchJson<{ success: boolean; apiDoc: Omit<ApiDoc, 'id' | 'projectId'>; isFallback?: boolean }>(
      `${API_BASE}/ai/draft-api-spec`,
      {
        method: 'POST',
        body: JSON.stringify({ description }),
      }
    );
  }
};
