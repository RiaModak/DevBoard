import { Router, Response } from 'express';
import { db } from '../db/jsonDb.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/workspaces - Fetch workspaces where user is owner or member
router.get('/', authenticate, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const workspaces = db.getData().workspaces.filter((w) => 
      w.ownerId === userId || w.members.some((m) => m.userId === userId)
    );
    res.json({ workspaces });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching workspaces' });
  }
});

// POST /api/v1/workspaces - Create workspace
router.post('/', authenticate, (req: AuthenticatedRequest, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.user!.id;

    if (!name) {
      res.status(400).json({ error: 'Workspace name is required' });
      return;
    }

    const id = `wsp_${Date.now()}`;
    const newWorkspace = {
      id,
      name: name.trim(),
      description: (description || '').trim(),
      ownerId: userId,
      members: [{ userId, role: 'owner' as const }],
      createdAt: new Date().toISOString()
    };

    db.update((data) => {
      data.workspaces.push(newWorkspace);
    });

    res.status(201).json({ success: true, workspace: newWorkspace });
  } catch (error) {
    res.status(500).json({ error: 'Error creating workspace' });
  }
});

// GET /api/v1/workspaces/:id/projects - Fetch projects for a workspace
router.get('/:id/projects', authenticate, (req: AuthenticatedRequest, res) => {
  try {
    const workspaceId = req.params.id;
    const userId = req.user!.id;

    // RBAC: Check if user is a member of this workspace
    const workspace = db.getData().workspaces.find((w) => w.id === workspaceId);
    if (!workspace) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }

    const isMember = workspace.ownerId === userId || workspace.members.some((m) => m.userId === userId);
    if (!isMember) {
      res.status(403).json({ error: 'Access denied. You are not a member of this workspace.' });
      return;
    }

    const projects = db.getData().projects.filter((p) => p.workspaceId === workspaceId);
    res.json({ projects });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching projects' });
  }
});

// POST /api/v1/workspaces/:id/projects - Create project in a workspace
router.post('/:id/projects', authenticate, (req: AuthenticatedRequest, res) => {
  try {
    const workspaceId = req.params.id;
    const { name, description } = req.body;
    const userId = req.user!.id;

    if (!name) {
      res.status(400).json({ error: 'Project name is required' });
      return;
    }

    // RBAC: Check workspace permissions. Only Owner and Admin roles can create projects!
    const workspace = db.getData().workspaces.find((w) => w.id === workspaceId);
    if (!workspace) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }

    const memberRole = workspace.ownerId === userId ? 'owner' : workspace.members.find((m) => m.userId === userId)?.role;
    if (!memberRole || (memberRole !== 'owner' && memberRole !== 'admin')) {
      res.status(403).json({ error: 'Access denied. Only workspace owners and administrators can create projects.' });
      return;
    }

    const id = `prj_${Date.now()}`;
    const newProject = {
      id,
      workspaceId,
      name: name.trim(),
      description: (description || '').trim(),
      createdAt: new Date().toISOString()
    };

    db.update((data) => {
      data.projects.push(newProject);
      // Log workspace project activity
      data.activities.push({
        id: `act_${Date.now()}`,
        projectId: id,
        userId,
        userName: req.user!.name,
        action: 'created project',
        targetType: 'project',
        targetName: newProject.name,
        createdAt: new Date().toISOString()
      });
    });

    res.status(201).json({ success: true, project: newProject });
  } catch (error) {
    res.status(500).json({ error: 'Error creating project' });
  }
});

// GET /api/v1/workspaces/:id/members - Get list of workspace members
router.get('/:id/members', authenticate, (req: AuthenticatedRequest, res) => {
  try {
    const workspaceId = req.params.id;
    const userId = req.user!.id;

    const workspace = db.getData().workspaces.find((w) => w.id === workspaceId);
    if (!workspace) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }

    const isMember = workspace.ownerId === userId || workspace.members.some((m) => m.userId === userId);
    if (!isMember) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    const allUsers = db.getData().users;
    const membersPopulated = workspace.members.map((m) => {
      const u = allUsers.find((user) => user.id === m.userId);
      return {
        userId: m.userId,
        role: m.role,
        name: u?.name || 'Unknown User',
        email: u?.email || '',
        avatarUrl: u?.avatarUrl
      };
    });

    res.json({ members: membersPopulated });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching members' });
  }
});

// POST /api/v1/workspaces/:id/members - Invite/Add user to workspace
router.post('/:id/members', authenticate, (req: AuthenticatedRequest, res) => {
  try {
    const workspaceId = req.params.id;
    const { email, role } = req.body; // role: owner | admin | member
    const userId = req.user!.id;

    if (!email) {
      res.status(400).json({ error: 'User email is required' });
      return;
    }

    const workspace = db.getData().workspaces.find((w) => w.id === workspaceId);
    if (!workspace) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }

    // RBAC: Only owner and admin can invite users
    const memberRole = workspace.ownerId === userId ? 'owner' : workspace.members.find((m) => m.userId === userId)?.role;
    if (!memberRole || (memberRole !== 'owner' && memberRole !== 'admin')) {
      res.status(403).json({ error: 'Access denied. Only workspace owners and admins can invite members.' });
      return;
    }

    // Check if target user exists
    const targetUser = db.getData().users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
    if (!targetUser) {
      res.status(404).json({ error: 'User with this email not found. Tell them to register on DevBoard first!' });
      return;
    }

    // Check if user is already a member
    const alreadyMember = workspace.members.some((m) => m.userId === targetUser.id);
    if (alreadyMember) {
      res.status(400).json({ error: 'User is already a member of this workspace' });
      return;
    }

    const finalRole = (role || 'member') as 'owner' | 'admin' | 'member';

    db.update((data) => {
      const wsp = data.workspaces.find((w) => w.id === workspaceId);
      if (wsp) {
        wsp.members.push({ userId: targetUser.id, role: finalRole });
      }

      // Add notification for target user
      data.notifications.push({
        id: `ntf_${Date.now()}`,
        userId: targetUser.id,
        title: 'Workspace Invitation',
        message: `${req.user!.name} invited you to the workspace: "${workspace.name}" as an ${finalRole}.`,
        type: 'invite',
        read: false,
        createdAt: new Date().toISOString()
      });
    });

    res.json({ success: true, message: `Successfully added ${targetUser.name} to the workspace` });
  } catch (error) {
    res.status(500).json({ error: 'Error inviting user' });
  }
});

export default router;
