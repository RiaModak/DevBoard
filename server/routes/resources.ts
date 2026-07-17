import { Router } from 'express';
import { db } from '../db/jsonDb.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/resources - Query developer resources
router.get('/', authenticate, (req, res) => {
  try {
    const { projectId, type } = req.query;

    if (!projectId) {
      res.status(400).json({ error: 'projectId is required' });
      return;
    }

    let resources = db.getData().resources.filter((r) => r.projectId === projectId);

    if (type) {
      resources = resources.filter((r) => r.type === type);
    }

    // Newest first
    resources.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ resources });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching resources' });
  }
});

// POST /api/v1/resources - Add new developer resource
router.post('/', authenticate, (req: AuthenticatedRequest, res) => {
  try {
    const { projectId, title, type, url, description, content } = req.body;
    const userId = req.user!.id;

    if (!projectId || !title || !type) {
      res.status(400).json({ error: 'projectId, title, and type are required' });
      return;
    }

    const id = `res_${Date.now()}`;
    const newResource = {
      id,
      projectId,
      title: title.trim(),
      type: type as 'link' | 'github' | 'note' | 'file',
      url: url ? url.trim() : undefined,
      description: description || '',
      content: content || '',
      createdAt: new Date().toISOString()
    };

    db.update((data) => {
      data.resources.push(newResource);

      // Log activity
      data.activities.push({
        id: `act_${Date.now()}`,
        projectId,
        userId,
        userName: req.user!.name,
        action: `added ${newResource.type} resource`,
        targetType: 'resource',
        targetName: newResource.title,
        createdAt: new Date().toISOString()
      });
    });

    res.status(201).json({ success: true, resource: newResource });
  } catch (error) {
    res.status(500).json({ error: 'Error adding resource' });
  }
});

// DELETE /api/v1/resources/:id - Delete resource
router.delete('/:id', authenticate, (req: AuthenticatedRequest, res) => {
  try {
    const resourceId = req.params.id;
    const resource = db.getData().resources.find((item) => item.id === resourceId);
    if (!resource) {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }

    db.update((data) => {
      data.resources = data.resources.filter((item) => item.id !== resourceId);

      // Log activity
      data.activities.push({
        id: `act_${Date.now()}`,
        projectId: resource.projectId,
        userId: req.user!.id,
        userName: req.user!.name,
        action: 'deleted resource',
        targetType: 'resource',
        targetName: resource.title,
        createdAt: new Date().toISOString()
      });
    });

    res.json({ success: true, message: 'Resource deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting resource' });
  }
});

export default router;
