import fs from 'fs';
import path from 'path';
import { MongoClient, Collection } from 'mongodb';
import { 
  User, Workspace, Project, Task, Comment, Notification, Snippet, ApiDoc, Resource, Activity 
} from '../../src/types.js';

interface DbSchema {
  users: (User & { passwordHash: string })[];
  workspaces: Workspace[];
  projects: Project[];
  tasks: Task[];
  comments: Comment[];
  notifications: Notification[];
  snippets: Snippet[];
  apiDocs: ApiDoc[];
  resources: Resource[];
  activities: Activity[];
}

const DB_FILE = path.join(process.cwd(), 'db.json');

// Initial seed data for first boot
const DEFAULT_USER_PASSWORD_HASH = '$2b$10$7Z25gZ7gMv/H7N26o7uOsu979LhKkE69ZzLq1f6H4V3pE4kP9f8sO'; // "password123" hashed

const initialDb: DbSchema = {
  users: [
    {
      id: 'usr_1',
      name: 'Sarah Chen',
      email: 'sarah.chen@devboard.io',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces',
      passwordHash: DEFAULT_USER_PASSWORD_HASH
    },
    {
      id: 'usr_2',
      name: 'Marcus Vance',
      email: 'marcus@devboard.io',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces',
      passwordHash: DEFAULT_USER_PASSWORD_HASH
    }
  ],
  workspaces: [
    {
      id: 'wsp_1',
      name: 'Acme SaaS Dev',
      description: 'Main workspace for Acme Corporation SaaS product. Includes Kanban boards, API specs, and technical documentation.',
      ownerId: 'usr_1',
      members: [
        { userId: 'usr_1', role: 'owner' },
        { userId: 'usr_2', role: 'admin' }
      ],
      createdAt: new Date('2026-06-01T00:00:00.000Z').toISOString()
    }
  ],
  projects: [
    {
      id: 'prj_1',
      workspaceId: 'wsp_1',
      name: 'DevBoard Backend API',
      description: 'Production-ready Node.js & Express API with comprehensive JWT authentication, HttpOnly cookies, and repository-pattern db services.',
      createdAt: new Date('2026-06-05T00:00:00.000Z').toISOString()
    },
    {
      id: 'prj_2',
      workspaceId: 'wsp_1',
      name: 'SaaS Client Dashboard',
      description: 'Vite & React client interface with interactive Kanban flows, live code snippet search, and team timeline streams.',
      createdAt: new Date('2026-06-10T00:00:00.000Z').toISOString()
    }
  ],
  tasks: [
    {
      id: 'tsk_1',
      projectId: 'prj_1',
      title: 'Configure JWT Auth with HttpOnly cookies',
      description: 'Set up a robust full-stack authentication flow. Implement access token validation, refresh token rotation, and strict security cookies.',
      status: 'done',
      priority: 'high',
      dueDate: '2026-07-20T18:00:00.000Z',
      assigneeId: 'usr_1',
      creatorId: 'usr_1',
      labels: ['Backend', 'Security'],
      attachments: [],
      createdAt: new Date('2026-07-10T08:30:00.000Z').toISOString()
    },
    {
      id: 'tsk_2',
      projectId: 'prj_1',
      title: 'Create MongoDB schema with index performance tuning',
      description: 'Optimize collections with proper composite indexes (e.g., `projectId` + `status` + `priority`). Implement aggregation pipelines for productivity charts.',
      status: 'review',
      priority: 'high',
      dueDate: '2026-07-22T12:00:00.000Z',
      assigneeId: 'usr_2',
      creatorId: 'usr_1',
      labels: ['Database', 'Optimization'],
      attachments: [],
      createdAt: new Date('2026-07-11T09:00:00.000Z').toISOString()
    },
    {
      id: 'tsk_3',
      projectId: 'prj_1',
      title: 'Integrate Server-Side Gemini Code Assistant',
      description: 'Implement `/api/ai/optimize` endpoint using the `@google/genai` SDK. Allow team members to review, refactor, and generate clean snippets directly within the vault.',
      status: 'in_progress',
      priority: 'medium',
      dueDate: '2026-07-25T17:00:00.000Z',
      assigneeId: 'usr_1',
      creatorId: 'usr_2',
      labels: ['AI', 'Feature'],
      attachments: [],
      createdAt: new Date('2026-07-12T10:15:00.000Z').toISOString()
    },
    {
      id: 'tsk_4',
      projectId: 'prj_2',
      title: 'Add responsive drag-and-drop mechanics to board',
      description: 'Leverage HTML5 Drag & Drop or lightweight hooks for Kanban updates. Support optimistic UI state changes and push immediate API payloads.',
      status: 'todo',
      priority: 'medium',
      dueDate: '2026-07-28T09:00:00.000Z',
      assigneeId: 'usr_2',
      creatorId: 'usr_1',
      labels: ['Frontend', 'UX'],
      attachments: [],
      createdAt: new Date('2026-07-14T11:00:00.000Z').toISOString()
    },
    {
      id: 'tsk_5',
      projectId: 'prj_2',
      title: 'Draft production deploy checklist',
      description: 'Review security response headers, rate limiter policies, CORS whitelist, environment variable schema validation, and cache rules.',
      status: 'backlog',
      priority: 'low',
      dueDate: '2026-08-05T18:00:00.000Z',
      creatorId: 'usr_2',
      labels: ['DevOps'],
      attachments: [],
      createdAt: new Date('2026-07-15T14:20:00.000Z').toISOString()
    }
  ],
  comments: [
    {
      id: 'cmt_1',
      taskId: 'tsk_3',
      userId: 'usr_2',
      userName: 'Marcus Vance',
      userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces',
      content: 'I have exposed the initial config properties on the backend. Let me know when you start connecting the client interface!',
      createdAt: new Date('2026-07-15T15:00:00.000Z').toISOString()
    },
    {
      id: 'cmt_2',
      taskId: 'tsk_3',
      userId: 'usr_1',
      userName: 'Sarah Chen',
      userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces',
      content: 'Awesome, will do! I will write a custom hook to manage loading states and format the markdown responses.',
      parentId: 'cmt_1',
      createdAt: new Date('2026-07-16T09:30:00.000Z').toISOString()
    }
  ],
  notifications: [
    {
      id: 'ntf_1',
      userId: 'usr_1',
      title: 'Task Assigned',
      message: 'Marcus Vance assigned you to the task: "Integrate Server-Side Gemini Code Assistant"',
      type: 'assigned',
      read: false,
      createdAt: new Date('2026-07-15T10:15:00.000Z').toISOString()
    }
  ],
  snippets: [
    {
      id: 'snp_1',
      projectId: 'prj_1',
      userId: 'usr_1',
      title: 'HttpOnly JWT Cookie configuration in Express',
      description: 'Standard security settings for registering a session cookie. Helps prevent XSS vulnerability attacks.',
      code: `res.cookie('token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
});`,
      language: 'javascript',
      tags: ['express', 'auth', 'security'],
      isFavorite: true,
      createdAt: new Date('2026-07-12T14:00:00.000Z').toISOString()
    },
    {
      id: 'snp_2',
      projectId: 'prj_2',
      userId: 'usr_2',
      title: 'Tailwind elegant gradient hover outline button',
      description: 'Reusable pure CSS button overlay that matches Linear or Vercel aesthetic styling.',
      code: `<button className="relative inline-flex items-center justify-center p-0.5 overflow-hidden text-sm font-medium text-gray-100 rounded-lg group bg-gradient-to-br from-indigo-500 to-purple-600 hover:text-white focus:ring-4 focus:outline-none focus:ring-indigo-800 transition">
  <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-zinc-950 rounded-md group-hover:bg-opacity-0">
    Deploy Project
  </span>
</button>`,
      language: 'html',
      tags: ['tailwind', 'ui', 'css'],
      isFavorite: false,
      createdAt: new Date('2026-07-14T10:00:00.000Z').toISOString()
    }
  ],
  apiDocs: [
    {
      id: 'api_1',
      projectId: 'prj_1',
      endpoint: '/api/v1/auth/login',
      method: 'POST',
      description: 'Authenticates a user using credentials and issues access & refresh tokens via HttpOnly cookies.',
      isAuthRequired: false,
      parameters: [
        { name: 'email', type: 'string', required: true, description: 'User account email address' },
        { name: 'password', type: 'string', required: true, description: 'Secret user password' }
      ],
      requestBody: `{\n  "email": "sarah.chen@devboard.io",\n  "password": "password123"\n}`,
      response: `{\n  "success": true,\n  "user": {\n    "id": "usr_1",\n    "name": "Sarah Chen",\n    "email": "sarah.chen@devboard.io"\n  }\n}`,
      statusCodes: [200, 400, 401],
      examplePayload: `{\n  "status": 200,\n  "body": {\n    "success": true,\n    "user": { ... }\n  }\n}`
    },
    {
      id: 'api_2',
      projectId: 'prj_1',
      endpoint: '/api/v1/tasks',
      method: 'GET',
      description: 'Fetches projects tasks with server-side pagination, sorting, status, priority, and keyword filtering.',
      isAuthRequired: true,
      parameters: [
        { name: 'projectId', type: 'string', required: true, description: 'Parent project identifier' },
        { name: 'status', type: 'string', required: false, description: 'Filter tasks by board column' },
        { name: 'search', type: 'string', required: false, description: 'Search term for task titles or logs' }
      ],
      response: `{\n  "tasks": [ ... ],\n  "pagination": {\n    "total": 5,\n    "page": 1,\n    "pages": 1\n  }\n}`,
      statusCodes: [200, 401, 403]
    }
  ],
  resources: [
    {
      id: 'res_1',
      projectId: 'prj_1',
      title: 'DevBoard Main Repository',
      type: 'github',
      url: 'https://github.com/developer/devboard-saas',
      description: 'Official GitHub repository featuring clean architecture, comprehensive controllers, and full test cases.',
      createdAt: new Date('2026-07-01T12:00:00.000Z').toISOString()
    },
    {
      id: 'res_2',
      projectId: 'prj_1',
      title: 'Vercel Deployment Pipeline',
      type: 'link',
      url: 'https://vercel.com/developer/projects/devboard-saas',
      description: 'Production frontend build pipeline linked to the main branch.',
      createdAt: new Date('2026-07-03T14:30:00.000Z').toISOString()
    },
    {
      id: 'res_3',
      projectId: 'prj_1',
      title: 'REST Standard Guidelines & Specs',
      type: 'note',
      content: 'Follow standard HTTP status codes: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error.\nAll responses should follow a consistent payload envelope structure.',
      description: 'Workspace-wide documentation note on architecture design constraints.',
      createdAt: new Date('2026-07-05T09:00:00.000Z').toISOString()
    }
  ],
  activities: [
    {
      id: 'act_1',
      projectId: 'prj_1',
      userId: 'usr_1',
      userName: 'Sarah Chen',
      action: 'completed task',
      targetType: 'task',
      targetName: 'Configure JWT Auth with HttpOnly cookies',
      createdAt: new Date('2026-07-15T08:30:00.000Z').toISOString()
    },
    {
      id: 'act_2',
      projectId: 'prj_1',
      userId: 'usr_2',
      userName: 'Marcus Vance',
      action: 'updated status of',
      targetType: 'task',
      targetName: 'Create MongoDB schema with index performance tuning',
      createdAt: new Date('2026-07-16T14:10:00.000Z').toISOString()
    }
  ]
};

class JsonDb {
  private data: DbSchema;
  private mongoClient: MongoClient | null = null;
  private mongoCollection: Collection<any> | null = null;
  private isMongoConnected: boolean = false;

  constructor() {
    this.data = this.load();
  }

  // Connects to MongoDB, retrieves the latest state, and sets up sync
  public async connectMongo(): Promise<void> {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.log('[DB Sync]: MONGODB_URI env variable is not set. Falling back to local db.json.');
      return;
    }

    try {
      console.log('[DB Sync]: Connecting to MongoDB...');
      this.mongoClient = new MongoClient(mongoUri);
      await this.mongoClient.connect();
      
      const dbName = process.env.MONGODB_DB_NAME || 'devboard';
      const dbInstance = this.mongoClient.db(dbName);
      this.mongoCollection = dbInstance.collection('state');
      
      this.isMongoConnected = true;
      console.log(`[DB Sync]: Successfully connected to MongoDB database: "${dbName}"`);

      // Try to load the existing database state from the collection
      const existingState = await this.mongoCollection.findOne({ _id: 'main_state' as any });
      
      if (existingState) {
        console.log('[DB Sync]: Found existing database state in MongoDB. Syncing memory cache...');
        // Cast and set the internal state, ignoring the MongoDB specific _id field
        const { _id, ...cleanState } = existingState;
        this.data = cleanState as unknown as DbSchema;
        // Keep the local fallback db.json in sync
        this.save(this.data);
      } else {
        console.log('[DB Sync]: No existing state found in MongoDB. Initializing with local/default data...');
        await this.mongoCollection.updateOne(
          { _id: 'main_state' as any },
          { $set: this.data as any },
          { upsert: true }
        );
        console.log('[DB Sync]: Local database state successfully pushed to MongoDB!');
      }
    } catch (error) {
      console.error('[DB Sync]: Failed to initialize MongoDB connection:', error);
      console.log('[DB Sync]: Continuing with local memory/file storage fallback...');
    }
  }

  private load(): DbSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(fileContent);
      }
    } catch (e) {
      console.error('Error loading db.json, resetting to default', e);
    }
    this.save(initialDb);
    return JSON.parse(JSON.stringify(initialDb));
  }

  private save(data: DbSchema): void {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error writing to db.json', e);
    }
  }

  public getData(): DbSchema {
    return this.data;
  }

  public update(updater: (data: DbSchema) => void): void {
    updater(this.data);
    this.save(this.data);

    // Sync asynchronously to MongoDB if connected
    if (this.isMongoConnected && this.mongoCollection) {
      this.mongoCollection.updateOne(
        { _id: 'main_state' as any },
        { $set: this.data as any },
        { upsert: true }
      ).catch((err) => {
        console.error('[DB Sync]: Async background sync to MongoDB failed:', err);
      });
    }
  }
}

export const db = new JsonDb();
