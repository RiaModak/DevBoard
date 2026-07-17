import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

// Route imports
import authRouter from './server/routes/auth.js';
import workspacesRouter from './server/routes/workspaces.js';
import tasksRouter from './server/routes/tasks.js';
import snippetsRouter from './server/routes/snippets.js';
import apiDocsRouter from './server/routes/apiDocs.js';
import resourcesRouter from './server/routes/resources.js';
import aiRouter from './server/routes/ai.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON and URL-encoded body parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Custom Security Headers (Simple Helmet alternative to prevent script exploits)
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // REST API Routes
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/workspaces', workspacesRouter);
  app.use('/api/v1/tasks', tasksRouter);
  app.use('/api/v1/snippets', snippetsRouter);
  app.use('/api/v1/apidocs', apiDocsRouter);
  app.use('/api/v1/resources', resourcesRouter);
  app.use('/api/v1/ai', aiRouter);

  // Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Global Error Handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('[Global Error Catch]:', err);
    res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Internal Server Error'
    });
  });

  // Vite development or static file serving
  if (process.env.NODE_ENV !== 'production') {
    console.log('Starting server in DEVELOPMENT mode...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Starting server in PRODUCTION mode...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=========================================`);
    console.log(`🚀 DevBoard Server running on Port ${PORT}`);
    console.log(`🔗 Interface available: http://localhost:${PORT}`);
    console.log(`=========================================`);
  });
}

startServer().catch((err) => {
  console.error('Fatal: Failed to start the DevBoard backend server:', err);
  process.exit(1);
});
