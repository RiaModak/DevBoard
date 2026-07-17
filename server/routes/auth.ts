import { Router, Response } from 'express';
import { db } from '../db/jsonDb.js';
import { hashPassword, verifyPassword } from '../utils/hash.js';
import { signJwt } from '../utils/jwt.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// POST /api/v1/auth/register
router.post('/register', (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long' });
      return;
    }

    const lowerEmail = email.toLowerCase().trim();
    const existingUser = db.getData().users.find((u) => u.email.toLowerCase() === lowerEmail);
    if (existingUser) {
      res.status(400).json({ error: 'An account with this email already exists' });
      return;
    }

    const passwordHash = hashPassword(password);
    const id = `usr_${Date.now()}`;
    const newUser = {
      id,
      name: name.trim(),
      email: lowerEmail,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      passwordHash,
    };

    // Auto-create workspace for the new user
    const workspaceId = `wsp_${Date.now()}`;
    const newWorkspace = {
      id: workspaceId,
      name: `${name}'s Workspace`,
      description: 'Your default workspace for managing personal developer projects, snippets, and resources.',
      ownerId: id,
      members: [{ userId: id, role: 'owner' as const }],
      createdAt: new Date().toISOString(),
    };

    // Add some initial projects to make onboarding spectacular
    const prjId1 = `prj_${Date.now()}_1`;
    const newProject1 = {
      id: prjId1,
      workspaceId: workspaceId,
      name: 'My First DevBoard Project',
      description: 'A sample project loaded with Kanban tasks, snippets, and mock APIs to demonstrate DevBoard features.',
      createdAt: new Date().toISOString(),
    };

    db.update((data) => {
      data.users.push(newUser);
      data.workspaces.push(newWorkspace);
      data.projects.push(newProject1);
      
      // Let's seed a couple of tasks so it doesn't look empty
      data.tasks.push(
        {
          id: `tsk_${Date.now()}_1`,
          projectId: prjId1,
          title: 'Explore DevBoard Kanban board',
          description: 'Try moving this card to "Done" using the drag or move buttons, edit labels, or add comment threads.',
          status: 'todo',
          priority: 'medium',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          assigneeId: id,
          creatorId: id,
          labels: ['Getting Started', 'UI'],
          attachments: [],
          createdAt: new Date().toISOString(),
        },
        {
          id: `tsk_${Date.now()}_2`,
          projectId: prjId1,
          title: 'Save your first code snippet',
          description: 'Head to the Snippet Vault and save a useful code segment. Categorize it by language and tag it for quick search.',
          status: 'backlog',
          priority: 'low',
          dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          creatorId: id,
          labels: ['Snippet'],
          attachments: [],
          createdAt: new Date().toISOString(),
        }
      );
    });

    const token = signJwt({ id, email: lowerEmail });
    
    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: false, // Set to true if running over https, false is perfect for iframe development proxy
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      success: true,
      token,
      user: {
        id,
        name: newUser.name,
        email: newUser.email,
        avatarUrl: newUser.avatarUrl,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Server registration error' });
  }
});

// POST /api/v1/auth/login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const lowerEmail = email.toLowerCase().trim();
    const user = db.getData().users.find((u) => u.email.toLowerCase() === lowerEmail);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = signJwt({ id: user.id, email: user.email });

    res.cookie('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Server authentication error' });
  }
});

// POST /api/v1/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/v1/auth/me
router.get('/me', authenticate, (req: AuthenticatedRequest, res) => {
  res.json({ user: req.user });
});

// PUT /api/v1/auth/profile
router.put('/profile', authenticate, (req: AuthenticatedRequest, res) => {
  try {
    const { name, avatarUrl } = req.body;
    const userId = req.user!.id;

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    db.update((data) => {
      const user = data.users.find((u) => u.id === userId);
      if (user) {
        user.name = name.trim();
        if (avatarUrl) user.avatarUrl = avatarUrl;
      }
    });

    res.json({
      success: true,
      user: {
        id: userId,
        name: name.trim(),
        email: req.user!.email,
        avatarUrl: avatarUrl || req.user!.avatarUrl,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Error updating user profile' });
  }
});

// PUT /api/v1/auth/change-password
router.put('/change-password', authenticate, (req: AuthenticatedRequest, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user!.id;

    if (!oldPassword || !newPassword) {
      res.status(400).json({ error: 'Current password and new password are required' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters long' });
      return;
    }

    const user = db.getData().users.find((u) => u.id === userId);
    if (!user || !verifyPassword(oldPassword, user.passwordHash)) {
      res.status(400).json({ error: 'Incorrect current password' });
      return;
    }

    const newHash = hashPassword(newPassword);
    db.update((data) => {
      const u = data.users.find((user) => user.id === userId);
      if (u) {
        u.passwordHash = newHash;
      }
    });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error updating password' });
  }
});

export default router;
