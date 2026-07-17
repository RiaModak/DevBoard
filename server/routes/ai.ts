import { Router } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Lazy-initialization helper to prevent server crashing on boot if key is missing
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY is missing. Please configure it in Settings > Secrets.');
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// POST /api/v1/ai/assistant-chat - Developer chatbot assistant
router.post('/assistant-chat', authenticate, async (req, res) => {
  try {
    const { message, chatHistory } = req.body;
    if (!message) {
      res.status(400).json({ error: 'Message content is required' });
      return;
    }

    try {
      const ai = getAiClient();
      
      // Let's model a developer persona using system instructions
      const systemInstruction = `You are "DevBoard AI Assistant", a veteran Principal Software Engineer, Senior Software Architect, and DevOps specialist.
Your goal is to assist software developers, student engineers, and team leads inside the DevBoard collaborative SaaS workspace.
Provide clean, concise, production-ready TypeScript/JavaScript/Python/HTML/CSS code, RESTful design advice, container/deployment strategies, and system debugging steps.
Acknowledge best practices like clean architecture, solid principles, separation of concerns, and security. Use markdown formatting with code highlights.`;

      // Build chat object or direct content generation
      // Since standard contents can include historic conversations, let's combine history into a standard prompt or chat structure
      const prompt = `System: ${systemInstruction}\n\nUser Question: ${message}`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
      });

      res.json({ text: response.text });
    } catch (apiError: any) {
      console.warn('AI Client execution failed, using high-quality deterministic fallback', apiError.message);
      
      // High quality fallback answers if GEMINI_API_KEY is not set or fails, keeping preview 100% functional
      let fallbackText = `### DevBoard AI Assistant (Local Sandbox Mode)\n\nI am currently running in offline fallback mode because no \`GEMINI_API_KEY\` was found in your environments. Configure it in the **Secrets** panel to enable live responses!\n\nHere is some architecture advice based on your developer workspace:\n\n1. **Use HTTPOnly Cookies**: When building JWT sessions, prioritize cookies with the \`HttpOnly\` and \`Secure\` attributes over \`localStorage\` to mitigate XSS exposure.\n2. **Optimize Query Engines**: If you are using MongoDB, ensure you index fields used in lookups (like \`projectId\` and \`status\`).\n3. **Modular React Layouts**: Split massive files (like large views) into modular child components within \`/src/components\` for maintainability.`;
      
      if (message.toLowerCase().includes('database') || message.toLowerCase().includes('mongo')) {
        fallbackText = `### MongoDB & Database Advice (Fallback Mode)\n\nWhen organizing MongoDB collections via Mongoose:\n- Use compound indexes for multi-field queries, e.g., \`schema.index({ projectId: 1, status: 1 })\`\n- Leverage virtual populates instead of massive embedded arrays to handle one-to-many growth\n- Use MongoDB Aggregation pipelines for statistics like task count rate and workload balances.`;
      } else if (message.toLowerCase().includes('jwt') || message.toLowerCase().includes('auth')) {
        fallbackText = `### JWT & Sessions Security (Fallback Mode)\n\nBest practices for SaaS authentication:\n- **Access Tokens**: Short expiry times (15-30 minutes), carried in memory or Bearer headers.\n- **Refresh Tokens**: Long expiry times, stored in \`HttpOnly\`, \`Secure\`, \`SameSite=Strict\` cookies.\n- **Rotation**: Rotate the refresh token on every issuance to immediately invalidate hijacked sessions.`;
      }
      
      res.json({ text: fallbackText, isFallback: true });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error executing developer assistant' });
  }
});

// POST /api/v1/ai/generate-snippet - AI Code Snippet Generator
router.post('/generate-snippet', authenticate, async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      res.status(400).json({ error: 'Prompt description is required' });
      return;
    }

    try {
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `You are a high-fidelity code generator.
Based on the prompt: "${prompt}", generate a single code snippet.
You MUST respond with a JSON object following this EXACT schema (do not wrap in markdown block, just return plain JSON):
{
  "title": "A short, descriptive, professional title for the snippet",
  "description": "An explanation of what the code does and its benefits",
  "language": "html" or "javascript" or "typescript" or "css" or "json" or "sql" or "python",
  "code": "The raw code string",
  "tags": ["tag1", "tag2", "tag3"]
}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              language: { type: Type.STRING },
              code: { type: Type.STRING },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['title', 'description', 'language', 'code', 'tags'],
          },
        },
      });

      const data = JSON.parse(response.text || '{}');
      res.json({ success: true, snippet: data });
    } catch (apiError) {
      console.warn('AI Client failed or key missing. Returning a highly specific static snippet.');
      
      // Highly professional static fallback based on keyword matching
      let fallbackSnippet = {
        title: 'Custom React UseFetch Hook with AbortController',
        description: 'A fully typed React hook designed for handling client-side HTTP requests with automated lifecycle cleanups and fetch abort signals.',
        language: 'typescript',
        code: `import { useState, useEffect } from 'react';

export function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    
    setLoading(true);
    fetch(url, { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          setError(err);
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [url]);

  return { data, loading, error };
}`,
        tags: ['react', 'hook', 'typescript']
      };

      if (prompt.toLowerCase().includes('express') || prompt.toLowerCase().includes('server')) {
        fallbackSnippet = {
          title: 'Express Centered Error Handler Middleware',
          description: 'A robust, typed error handling interceptor for Express.js applications to catch operational and database errors safely without crashing the node process.',
          language: 'typescript',
          code: `import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || 'Internal Server Error';

  console.error('[Error Interceptor]:', err);

  res.status(statusCode).json({
    success: false,
    status: statusCode,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}`,
          tags: ['express', 'middleware', 'typescript']
        };
      }

      res.json({ success: true, snippet: fallbackSnippet, isFallback: true });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error generating code snippet' });
  }
});

// POST /api/v1/ai/draft-api-spec - AI API documentation drafting
router.post('/draft-api-spec', authenticate, async (req, res) => {
  try {
    const { description } = req.body;
    if (!description) {
      res.status(400).json({ error: 'Endpoint description is required' });
      return;
    }

    try {
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `You are a REST API designer.
Based on the description: "${description}", generate a draft of a REST API endpoint specification.
You MUST respond with a JSON object following this EXACT schema:
{
  "endpoint": "/api/v1/resource-path",
  "method": "GET" or "POST" or "PUT" or "DELETE" or "PATCH",
  "description": "Short explanation of purpose",
  "isAuthRequired": true or false,
  "parameters": [
    { "name": "paramName", "type": "string" or "number" or "boolean", "required": true, "description": "usage" }
  ],
  "requestBody": "JSON string showing request body structure if POST/PUT",
  "response": "JSON string showing standard response body",
  "statusCodes": [200, 400, 401]
}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              endpoint: { type: Type.STRING },
              method: { type: Type.STRING },
              description: { type: Type.STRING },
              isAuthRequired: { type: Type.BOOLEAN },
              parameters: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    type: { type: Type.STRING },
                    required: { type: Type.BOOLEAN },
                    description: { type: Type.STRING },
                  },
                  required: ['name', 'type', 'required', 'description'],
                },
              },
              requestBody: { type: Type.STRING },
              response: { type: Type.STRING },
              statusCodes: { type: Type.ARRAY, items: { type: Type.INTEGER } },
            },
            required: ['endpoint', 'method', 'description', 'isAuthRequired', 'parameters', 'response', 'statusCodes'],
          },
        },
      });

      const data = JSON.parse(response.text || '{}');
      res.json({ success: true, apiDoc: data });
    } catch (apiError) {
      console.warn('AI Client failed or key missing. Returning a highly structured mock specification.');
      
      const fallbackSpec = {
        endpoint: '/api/v1/auth/register',
        method: 'POST',
        description: 'Registers a new developer account, creates a default workspace, and issues an access token.',
        isAuthRequired: false,
        parameters: [
          { name: 'name', type: 'string', required: true, description: 'Display name for profile initial avatar' },
          { name: 'email', type: 'string', required: true, description: 'Unique email address' },
          { name: 'password', type: 'string', required: true, description: 'Password, minimum 6 characters' }
        ],
        requestBody: `{\n  "name": "Alex Carter",\n  "email": "alex@devboard.io",\n  "password": "password123"\n}`,
        response: `{\n  "success": true,\n  "token": "header.payload.signature",\n  "user": {\n    "id": "usr_902",\n    "name": "Alex Carter",\n    "email": "alex@devboard.io"\n  }\n}`,
        statusCodes: [201, 400, 409]
      };

      res.json({ success: true, apiDoc: fallbackSpec, isFallback: true });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error drafting API specification' });
  }
});

export default router;
