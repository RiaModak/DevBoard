import { Router } from 'express';
import { db } from '../db/jsonDb.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/snippets - Query code snippets
router.get('/', authenticate, (req, res) => {
  try {
    const { projectId, search, tag, language } = req.query;

    if (!projectId) {
      res.status(400).json({ error: 'projectId is required' });
      return;
    }

    let snippets = db.getData().snippets.filter((s) => s.projectId === projectId);

    if (search) {
      const term = (search as string).toLowerCase();
      snippets = snippets.filter((s) => 
        s.title.toLowerCase().includes(term) || 
        s.description.toLowerCase().includes(term) ||
        s.code.toLowerCase().includes(term)
      );
    }

    if (tag) {
      const targetTag = (tag as string).toLowerCase();
      snippets = snippets.filter((s) => s.tags.some((t) => t.toLowerCase() === targetTag));
    }

    if (language) {
      const targetLang = (language as string).toLowerCase();
      snippets = snippets.filter((s) => s.language.toLowerCase() === targetLang);
    }

    // Newest first
    snippets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ snippets });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching snippets' });
  }
});

// POST /api/v1/snippets - Save new code snippet
router.post('/', authenticate, (req: AuthenticatedRequest, res) => {
  try {
    const { projectId, title, description, code, language, tags } = req.body;
    const userId = req.user!.id;

    if (!projectId || !title || !code || !language) {
      res.status(400).json({ error: 'projectId, title, code, and language are required' });
      return;
    }

    const id = `snp_${Date.now()}`;
    const newSnippet = {
      id,
      projectId,
      userId,
      title: title.trim(),
      description: description || '',
      code: code,
      language: language.toLowerCase().trim(),
      tags: tags || [],
      isFavorite: false,
      createdAt: new Date().toISOString()
    };

    db.update((data) => {
      data.snippets.push(newSnippet);
      
      // Log activity
      data.activities.push({
        id: `act_${Date.now()}`,
        projectId,
        userId,
        userName: req.user!.name,
        action: 'added code snippet',
        targetType: 'snippet',
        targetName: newSnippet.title,
        createdAt: new Date().toISOString()
      });
    });

    res.status(201).json({ success: true, snippet: newSnippet });
  } catch (error) {
    res.status(500).json({ error: 'Error saving code snippet' });
  }
});

// PUT /api/v1/snippets/:id - Update code snippet
router.put('/:id', authenticate, (req: AuthenticatedRequest, res) => {
  try {
    const snippetId = req.params.id;
    const { title, description, code, language, tags } = req.body;
    const userId = req.user!.id;

    const existingSnippet = db.getData().snippets.find((s) => s.id === snippetId);
    if (!existingSnippet) {
      res.status(404).json({ error: 'Snippet not found' });
      return;
    }

    db.update((data) => {
      const s = data.snippets.find((snippet) => snippet.id === snippetId);
      if (s) {
        if (title !== undefined) s.title = title.trim();
        if (description !== undefined) s.description = description;
        if (code !== undefined) s.code = code;
        if (language !== undefined) s.language = language.toLowerCase().trim();
        if (tags !== undefined) s.tags = tags;
      }

      // Log activity
      data.activities.push({
        id: `act_${Date.now()}`,
        projectId: existingSnippet.projectId,
        userId,
        userName: req.user!.name,
        action: 'updated snippet',
        targetType: 'snippet',
        targetName: existingSnippet.title,
        createdAt: new Date().toISOString()
      });
    });

    const updated = db.getData().snippets.find((s) => s.id === snippetId);
    res.json({ success: true, snippet: updated });
  } catch (error) {
    res.status(500).json({ error: 'Error updating snippet' });
  }
});

// POST /api/v1/snippets/:id/favorite - Toggle favorite status
router.post('/:id/favorite', authenticate, (req: AuthenticatedRequest, res) => {
  try {
    const snippetId = req.params.id;
    const snippet = db.getData().snippets.find((s) => s.id === snippetId);
    if (!snippet) {
      res.status(404).json({ error: 'Snippet not found' });
      return;
    }

    db.update((data) => {
      const s = data.snippets.find((x) => x.id === snippetId);
      if (s) {
        s.isFavorite = !s.isFavorite;
      }
    });

    res.json({ success: true, isFavorite: !snippet.isFavorite });
  } catch (error) {
    res.status(500).json({ error: 'Error favoriting snippet' });
  }
});

// DELETE /api/v1/snippets/:id - Delete snippet
router.delete('/:id', authenticate, (req: AuthenticatedRequest, res) => {
  try {
    const snippetId = req.params.id;
    const snippet = db.getData().snippets.find((s) => s.id === snippetId);
    if (!snippet) {
      res.status(404).json({ error: 'Snippet not found' });
      return;
    }

    db.update((data) => {
      data.snippets = data.snippets.filter((s) => s.id !== snippetId);

      // Log activity
      data.activities.push({
        id: `act_${Date.now()}`,
        projectId: snippet.projectId,
        userId: req.user!.id,
        userName: req.user!.name,
        action: 'deleted snippet',
        targetType: 'snippet',
        targetName: snippet.title,
        createdAt: new Date().toISOString()
      });
    });

    res.json({ success: true, message: 'Snippet deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting snippet' });
  }
});

export default router;
