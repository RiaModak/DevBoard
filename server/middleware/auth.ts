import { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../utils/jwt.js';
import { db } from '../db/jsonDb.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

export function parseCookies(req: Request): Record<string, string> {
  const list: Record<string, string> = {};
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    cookieHeader.split(';').forEach((cookie) => {
      const parts = cookie.split('=');
      const name = parts.shift()?.trim();
      if (name) {
        list[name] = decodeURIComponent(parts.join('='));
      }
    });
  }
  return list;
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    const cookies = parseCookies(req);
    let token = cookies['token'];

    // Also support Bearer Authorization header
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({ error: 'Authentication required. No token provided.' });
      return;
    }

    const payload = verifyJwt<{ id: string; email: string }>(token);
    if (!payload) {
      res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
      return;
    }

    const user = db.getData().users.find((u) => u.id === payload.id);
    if (!user) {
      res.status(401).json({ error: 'User associated with this token no longer exists.' });
      return;
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
    };
    next();
  } catch (error) {
    res.status(500).json({ error: 'Internal server authentication error' });
  }
}
