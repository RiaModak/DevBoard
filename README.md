# DevBoard

An all-in-one developer productivity platform combining real-time project metrics, Kanban planning, code snippet management, REST API drafting, and server-side assistant capabilities into a streamlined, high-density dashboard.

### 🔗 **[Explore Live Application on Render 🌐](https://devboard-zhsw.onrender.com/)**

---

##  Tech Stack

- **Frontend**: React 19, Tailwind CSS v4, Motion (Animations), Recharts (Data Visualizations)
- **Backend**: Express, Node.js, TypeScript
- **Database**: MongoDB (with automated local `db.json` flat-file fallback storage)
- **AI Integration**: Google Gemini API

---

##  Core Features

- ** Analytics Dashboard**: Real-time visual reports of task completion ratios, workspace distribution, active sprint velocities, and snippet language usage powered by responsive Recharts engines.
- ** Kanban Board**: A fluid drag-and-drop workflow planner to organize developer sprints, assign priorities (Low, Medium, High), and manage states (To Do, In Progress, Review, Completed).
- ** Snippet Vault**: A smart repository to save, categorize, and copy frequently used terminal scripts, config schemas, and code algorithms with copy-to-clipboard shortcuts.
- **🔌 API Planner**: Interactive REST API designer. Define endpoints, methods (GET, POST, etc.), query models, and test payloads before writing backend integration.
- ** Resources Hub**: A centralized hub to store database schemas, environment variables references, connection configurations, and documentation assets in high-density tables.
- ** Server-Side AI Assistant**: Direct integration with Google Gemini. Generate boilerplate schemas, document code blocks, write prompt guides, or troubleshoot syntax errors on demand.

---

##  Architecture Overview

DevBoard is structured as a robust full-stack package combining static client assets with an active Express server:

```text
├── server.ts           # Unified Express entrypoint with Vite development middleware
├── server/             # Backend Business Logic
│   ├── db/             # Smart Database Controller (Saves to MongoDB OR db.json fallback)
│   ├── middleware/     # Secure API route validation (gated by JWT token verification)
│   ├── routes/         # REST API namespaces (auth, tasks, snippets, resources, workspaces, ai)
│   └── utils/          # Token security helper scripts
├── src/                # Front-end Client (React v19 + Tailwind v4)
│   ├── components/     # Modular interfaces (KanbanBoard, SnippetVault, ApiPlanner, etc.)
│   ├── lib/            # Unified API Connector Client
│   └── types.ts        # Fully aligned TypeScript schemas
├── package.json        # Main scripts, packaging, and dependency definitions
└── vite.config.ts      # Fast Vite builds and plugin config
```

---

##  Running the Project Locally

If you would like to run the project locally, follow these steps:

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
JWT_SECRET="your-random-session-secret"
GEMINI_API_KEY="your-gemini-api-key"

# Optional: To persist data to a real database cluster
# MONGODB_URI="mongodb+srv://..."
# MONGODB_DB_NAME="devboard"
```

### 3. Start the Development Server
```bash
npm run dev
```
Open [**http://localhost:3000**](http://localhost:3000) in your browser!

---

##  Production Build & Deploy

### Build the application:
```bash
npm run build
```

### Start the production server:
```bash
npm run start
```
