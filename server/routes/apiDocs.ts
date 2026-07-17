import { Router } from 'express';
import { db } from '../db/jsonDb.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/apidocs - Fetch API docs for project
router.get('/', authenticate, (req, res) => {
  try {
    const { projectId, search } = req.query;

    if (!projectId) {
      res.status(400).json({ error: 'projectId is required' });
      return;
    }

    let docs = db.getData().apiDocs.filter((d) => d.projectId === projectId);

    if (search) {
      const term = (search as string).toLowerCase();
      docs = docs.filter((d) => 
        d.endpoint.toLowerCase().includes(term) || 
        d.description.toLowerCase().includes(term) ||
        d.method.toLowerCase().includes(term)
      );
    }

    res.json({ apiDocs: docs });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching API documentation' });
  }
});

// POST /api/v1/apidocs - Create API documentation endpoint spec
router.post('/', authenticate, (req: AuthenticatedRequest, res) => {
  try {
    const { projectId, endpoint, method, description, isAuthRequired, parameters, requestBody, response, statusCodes, examplePayload } = req.body;
    const userId = req.user!.id;

    if (!projectId || !endpoint || !method) {
      res.status(400).json({ error: 'projectId, endpoint, and method are required' });
      return;
    }

    const id = `api_${Date.now()}`;
    const newDoc = {
      id,
      projectId,
      endpoint: endpoint.trim(),
      method: method.toUpperCase(),
      description: description || '',
      isAuthRequired: !!isAuthRequired,
      parameters: parameters || [],
      requestBody: requestBody || '',
      response: response || '',
      statusCodes: statusCodes || [200],
      examplePayload: examplePayload || ''
    };

    db.update((data) => {
      data.apiDocs.push(newDoc);

      // Log activity
      data.activities.push({
        id: `act_${Date.now()}`,
        projectId,
        userId,
        userName: req.user!.name,
        action: 'added API endpoint specification for',
        targetType: 'api_doc',
        targetName: `${newDoc.method} ${newDoc.endpoint}`,
        createdAt: new Date().toISOString()
      });
    });

    res.status(201).json({ success: true, apiDoc: newDoc });
  } catch (error) {
    res.status(500).json({ error: 'Error creating API document spec' });
  }
});

// PUT /api/v1/apidocs/:id - Update API spec
router.put('/:id', authenticate, (req: AuthenticatedRequest, res) => {
  try {
    const apiId = req.params.id;
    const { endpoint, method, description, isAuthRequired, parameters, requestBody, response, statusCodes, examplePayload } = req.body;
    const userId = req.user!.id;

    const doc = db.getData().apiDocs.find((d) => d.id === apiId);
    if (!doc) {
      res.status(404).json({ error: 'API doc spec not found' });
      return;
    }

    db.update((data) => {
      const d = data.apiDocs.find((item) => item.id === apiId);
      if (d) {
        if (endpoint !== undefined) d.endpoint = endpoint.trim();
        if (method !== undefined) d.method = method.toUpperCase();
        if (description !== undefined) d.description = description;
        if (isAuthRequired !== undefined) d.isAuthRequired = !!isAuthRequired;
        if (parameters !== undefined) d.parameters = parameters;
        if (requestBody !== undefined) d.requestBody = requestBody;
        if (response !== undefined) d.response = response;
        if (statusCodes !== undefined) d.statusCodes = statusCodes;
        if (examplePayload !== undefined) d.examplePayload = examplePayload;
      }

      // Log activity
      data.activities.push({
        id: `act_${Date.now()}`,
        projectId: doc.projectId,
        userId,
        userName: req.user!.name,
        action: 'updated API document spec for',
        targetType: 'api_doc',
        targetName: `${d?.method || doc.method} ${d?.endpoint || doc.endpoint}`,
        createdAt: new Date().toISOString()
      });
    });

    const updated = db.getData().apiDocs.find((item) => item.id === apiId);
    res.json({ success: true, apiDoc: updated });
  } catch (error) {
    res.status(500).json({ error: 'Error updating API document spec' });
  }
});

// DELETE /api/v1/apidocs/:id - Delete API spec
router.delete('/:id', authenticate, (req: AuthenticatedRequest, res) => {
  try {
    const apiId = req.params.id;
    const doc = db.getData().apiDocs.find((item) => item.id === apiId);
    if (!doc) {
      res.status(404).json({ error: 'API spec not found' });
      return;
    }

    db.update((data) => {
      data.apiDocs = data.apiDocs.filter((item) => item.id !== apiId);

      // Log activity
      data.activities.push({
        id: `act_${Date.now()}`,
        projectId: doc.projectId,
        userId: req.user!.id,
        userName: req.user!.name,
        action: 'deleted API spec for',
        targetType: 'api_doc',
        targetName: `${doc.method} ${doc.endpoint}`,
        createdAt: new Date().toISOString()
      });
    });

    res.json({ success: true, message: 'API specification deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting API document' });
  }
});

export default router;
