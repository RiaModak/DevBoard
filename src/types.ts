/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'owner' | 'admin' | 'member';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  members: {
    userId: string;
    role: UserRole;
  }[];
  createdAt: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  createdAt: string;
}

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string; // Markdown description
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  assigneeId?: string;
  creatorId: string;
  labels: string[];
  attachments: string[]; // URLs or filenames
  createdAt: string;
}

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  parentId?: string; // For nested discussion threads
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'assigned' | 'completed' | 'deadline' | 'mention' | 'invite';
  read: boolean;
  createdAt: string;
}

export interface Snippet {
  id: string;
  projectId: string;
  userId: string;
  title: string;
  description: string;
  code: string;
  language: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: string;
}

export interface ApiDocParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface ApiDoc {
  id: string;
  projectId: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  description: string;
  isAuthRequired: boolean;
  parameters: ApiDocParameter[];
  requestBody?: string;
  response?: string;
  statusCodes: number[];
  examplePayload?: string;
}

export interface Resource {
  id: string;
  projectId: string;
  title: string;
  type: 'link' | 'github' | 'note' | 'file';
  url?: string;
  description: string;
  content?: string; // For notes or file attachment descriptions
  category?: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  action: string;
  targetType: 'task' | 'project' | 'snippet' | 'api_doc' | 'resource';
  targetName: string;
  createdAt: string;
}
