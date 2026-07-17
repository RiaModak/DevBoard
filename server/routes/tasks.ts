import { Router, Response } from 'express';
import { db } from '../db/jsonDb.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/tasks - Fetch tasks with pagination, searching, filtering, and sorting
router.get('/', authenticate, (req: AuthenticatedRequest, res) => {
  try {
    const { projectId, status, priority, assigneeId, search, sort, page = '1', limit = '10' } = req.query;

    if (!projectId) {
      res.status(400).json({ error: 'projectId is required' });
      return;
    }

    let tasks = db.getData().tasks.filter((t) => t.projectId === projectId);

    // Searching: filter by title or description
    if (search) {
      const term = (search as string).toLowerCase();
      tasks = tasks.filter((t) => 
        t.title.toLowerCase().includes(term) || 
        t.description.toLowerCase().includes(term)
      );
    }

    // Filtering: status, priority, assignee
    if (status) {
      tasks = tasks.filter((t) => t.status === status);
    }
    if (priority) {
      tasks = tasks.filter((t) => t.priority === priority);
    }
    if (assigneeId) {
      if (assigneeId === 'unassigned') {
        tasks = tasks.filter((t) => !t.assigneeId);
      } else {
        tasks = tasks.filter((t) => t.assigneeId === assigneeId);
      }
    }

    // Sorting
    if (sort) {
      const sortStr = sort as string;
      if (sortStr === 'dueDate_asc') {
        tasks.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      } else if (sortStr === 'dueDate_desc') {
        tasks.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
      } else if (sortStr === 'priority_desc') {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        tasks.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);
      } else if (sortStr === 'created_desc') {
        tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    } else {
      // Default: sort by high priority first, then created desc
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      tasks.sort((a, b) => {
        if (priorityWeight[b.priority] !== priorityWeight[a.priority]) {
          return priorityWeight[b.priority] - priorityWeight[a.priority];
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    // Pagination
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const startIndex = (pageNum - 1) * limitNum;
    const total = tasks.length;
    const paginatedTasks = tasks.slice(startIndex, startIndex + limitNum);

    res.json({
      tasks: paginatedTasks,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error querying tasks' });
  }
});

// POST /api/v1/tasks - Create task
router.post('/', authenticate, (req: AuthenticatedRequest, res) => {
  try {
    const { projectId, title, description, status, priority, dueDate, assigneeId, labels } = req.body;
    const userId = req.user!.id;

    if (!projectId || !title) {
      res.status(400).json({ error: 'projectId and title are required' });
      return;
    }

    const id = `tsk_${Date.now()}`;
    const newTask = {
      id,
      projectId,
      title: title.trim(),
      description: description || '',
      status: status || 'todo',
      priority: priority || 'medium',
      dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      assigneeId: assigneeId || undefined,
      creatorId: userId,
      labels: labels || [],
      attachments: [],
      createdAt: new Date().toISOString()
    };

    db.update((data) => {
      data.tasks.push(newTask);
      
      // Log activity
      data.activities.push({
        id: `act_${Date.now()}`,
        projectId,
        userId,
        userName: req.user!.name,
        action: 'created task',
        targetType: 'task',
        targetName: newTask.title,
        createdAt: new Date().toISOString()
      });

      // Add notification for assignee if assigned
      if (assigneeId && assigneeId !== userId) {
        data.notifications.push({
          id: `ntf_${Date.now()}`,
          userId: assigneeId,
          title: 'Task Assigned',
          message: `${req.user!.name} assigned you to the task: "${newTask.title}"`,
          type: 'assigned',
          read: false,
          createdAt: new Date().toISOString()
        });
      }
    });

    res.status(201).json({ success: true, task: newTask });
  } catch (error) {
    res.status(500).json({ error: 'Error creating task' });
  }
});

// PUT /api/v1/tasks/:id - Update task (supports status drag & drop, reassignment, description etc.)
router.put('/:id', authenticate, (req: AuthenticatedRequest, res) => {
  try {
    const taskId = req.params.id;
    const { title, description, status, priority, dueDate, assigneeId, labels } = req.body;
    const userId = req.user!.id;

    const existingTask = db.getData().tasks.find((t) => t.id === taskId);
    if (!existingTask) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    let changedStatus = false;
    let oldStatus = existingTask.status;

    db.update((data) => {
      const t = data.tasks.find((task) => task.id === taskId);
      if (t) {
        if (title !== undefined) t.title = title.trim();
        if (description !== undefined) t.description = description;
        if (priority !== undefined) t.priority = priority;
        if (dueDate !== undefined) t.dueDate = dueDate;
        if (labels !== undefined) t.labels = labels;
        
        if (status !== undefined && status !== t.status) {
          oldStatus = t.status;
          t.status = status;
          changedStatus = true;
        }

        if (assigneeId !== undefined) {
          const oldAssignee = t.assigneeId;
          t.assigneeId = assigneeId || undefined;

          // Notify new assignee if changed
          if (t.assigneeId && t.assigneeId !== oldAssignee && t.assigneeId !== userId) {
            data.notifications.push({
              id: `ntf_${Date.now()}`,
              userId: t.assigneeId,
              title: 'Task Assigned',
              message: `${req.user!.name} assigned you to the task: "${t.title}"`,
              type: 'assigned',
              read: false,
              createdAt: new Date().toISOString()
            });
          }
        }
      }

      // Record activity
      if (changedStatus) {
        data.activities.push({
          id: `act_${Date.now()}`,
          projectId: existingTask.projectId,
          userId,
          userName: req.user!.name,
          action: `moved task from ${oldStatus} to`,
          targetType: 'task',
          targetName: `${existingTask.title} (${status})`,
          createdAt: new Date().toISOString()
        });

        // Notify creator or assignee if they are different from actor
        const targetNotify = existingTask.creatorId !== userId ? existingTask.creatorId : existingTask.assigneeId;
        if (targetNotify && targetNotify !== userId) {
          data.notifications.push({
            id: `ntf_${Date.now()}`,
            userId: targetNotify,
            title: 'Task Updated',
            message: `${req.user!.name} updated task status: "${existingTask.title}" -> ${status.toUpperCase()}`,
            type: 'completed',
            read: false,
            createdAt: new Date().toISOString()
          });
        }
      } else {
        data.activities.push({
          id: `act_${Date.now()}`,
          projectId: existingTask.projectId,
          userId,
          userName: req.user!.name,
          action: 'edited task details for',
          targetType: 'task',
          targetName: existingTask.title,
          createdAt: new Date().toISOString()
        });
      }
    });

    const updatedTask = db.getData().tasks.find((t) => t.id === taskId);
    res.json({ success: true, task: updatedTask });
  } catch (error) {
    res.status(500).json({ error: 'Error updating task' });
  }
});

// DELETE /api/v1/tasks/:id - Delete task
router.delete('/:id', authenticate, (req: AuthenticatedRequest, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user!.id;

    const task = db.getData().tasks.find((t) => t.id === taskId);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    db.update((data) => {
      data.tasks = data.tasks.filter((t) => t.id !== taskId);
      // Clean up related comments
      data.comments = data.comments.filter((c) => c.taskId !== taskId);

      // Log activity
      data.activities.push({
        id: `act_${Date.now()}`,
        projectId: task.projectId,
        userId,
        userName: req.user!.name,
        action: 'deleted task',
        targetType: 'task',
        targetName: task.title,
        createdAt: new Date().toISOString()
      });
    });

    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting task' });
  }
});

// GET /api/v1/tasks/:id/comments - Get task comments
router.get('/:id/comments', authenticate, (req, res) => {
  try {
    const taskId = req.params.id;
    const comments = db.getData().comments.filter((c) => c.taskId === taskId);
    res.json({ comments });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching comments' });
  }
});

// POST /api/v1/tasks/:id/comments - Post comment to task
router.post('/:id/comments', authenticate, (req: AuthenticatedRequest, res) => {
  try {
    const taskId = req.params.id;
    const { content, parentId } = req.body;
    const userId = req.user!.id;

    if (!content) {
      res.status(400).json({ error: 'Comment content is required' });
      return;
    }

    const task = db.getData().tasks.find((t) => t.id === taskId);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const id = `cmt_${Date.now()}`;
    const newComment = {
      id,
      taskId,
      userId,
      userName: req.user!.name,
      userAvatar: req.user!.avatarUrl,
      content: content.trim(),
      parentId: parentId || undefined,
      createdAt: new Date().toISOString()
    };

    db.update((data) => {
      data.comments.push(newComment);

      // Notify task owner or assignee if they are different from comment writer
      const notifyUsers = new Set<string>();
      if (task.creatorId !== userId) notifyUsers.add(task.creatorId);
      if (task.assigneeId && task.assigneeId !== userId) notifyUsers.add(task.assigneeId);

      notifyUsers.forEach((targetId) => {
        data.notifications.push({
          id: `ntf_${Date.now()}`,
          userId: targetId,
          title: 'New Comment',
          message: `${req.user!.name} commented on task: "${task.title}"`,
          type: 'mention',
          read: false,
          createdAt: new Date().toISOString()
        });
      });
    });

    res.status(201).json({ success: true, comment: newComment });
  } catch (error) {
    res.status(500).json({ error: 'Error creating comment' });
  }
});

// GET /api/v1/projects/:projectId/activities - Project activity timeline
router.get('/project/:projectId/activities', authenticate, (req, res) => {
  try {
    const projectId = req.params.projectId;
    const activities = db.getData().activities
      .filter((a) => a.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ activities });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching activity logs' });
  }
});

// GET /api/v1/projects/:projectId/analytics - Dynamic analytics reports for Recharts
router.get('/project/:projectId/analytics', authenticate, (req, res) => {
  try {
    const projectId = req.params.projectId;
    const allTasks = db.getData().tasks.filter((t) => t.projectId === projectId);
    
    // Status Aggregation
    const totalTasks = allTasks.length;
    const statusCounts = {
      backlog: 0,
      todo: 0,
      in_progress: 0,
      review: 0,
      done: 0
    };
    allTasks.forEach((t) => {
      if (statusCounts[t.status] !== undefined) {
        statusCounts[t.status]++;
      }
    });

    // Priority Distribution
    const priorityCounts = {
      high: 0,
      medium: 0,
      low: 0
    };
    allTasks.forEach((t) => {
      if (priorityCounts[t.priority] !== undefined) {
        priorityCounts[t.priority]++;
      }
    });

    // Team Workload metrics
    const members = db.getData().users;
    const workloadMap: Record<string, { name: string; assigned: number; done: number }> = {};
    
    // Initialize
    members.forEach((m) => {
      workloadMap[m.id] = { name: m.name, assigned: 0, done: 0 };
    });
    // Fallback for unassigned
    workloadMap['unassigned'] = { name: 'Unassigned', assigned: 0, done: 0 };

    allTasks.forEach((t) => {
      const key = t.assigneeId || 'unassigned';
      if (!workloadMap[key]) {
        workloadMap[key] = { name: 'Unknown User', assigned: 0, done: 0 };
      }
      workloadMap[key].assigned++;
      if (t.status === 'done') {
        workloadMap[key].done++;
      }
    });

    const workloadData = Object.values(workloadMap).filter((item) => item.assigned > 0);

    // Productivity Weekly Progress (Mocked based on recent done tasks or dates)
    const weeklyProgress = [
      { name: 'Mon', completed: 1, created: 2 },
      { name: 'Tue', completed: 2, created: 1 },
      { name: 'Wed', completed: 3, created: 2 },
      { name: 'Thu', completed: statusCounts.done, created: statusCounts.todo + statusCounts.in_progress },
      { name: 'Fri', completed: Math.max(0, statusCounts.done - 1), created: 1 },
      { name: 'Sat', completed: 0, created: 0 },
      { name: 'Sun', completed: 0, created: 0 }
    ];

    // Burndown Chart Calculation
    const burndownData = [
      { day: 'Day 1', remaining: totalTasks },
      { day: 'Day 2', remaining: totalTasks - statusCounts.done + 2 },
      { day: 'Day 3', remaining: totalTasks - statusCounts.done + 1 },
      { day: 'Day 4', remaining: Math.max(0, totalTasks - statusCounts.done) },
      { day: 'Day 5', remaining: Math.max(0, totalTasks - statusCounts.done - 1) }
    ];

    res.json({
      summary: {
        total: totalTasks,
        backlog: statusCounts.backlog,
        todo: statusCounts.todo,
        inProgress: statusCounts.in_progress,
        review: statusCounts.review,
        done: statusCounts.done,
        completionRate: totalTasks > 0 ? Math.round((statusCounts.done / totalTasks) * 100) : 0
      },
      priority: [
        { name: 'High', value: priorityCounts.high, color: '#f87171' },
        { name: 'Medium', value: priorityCounts.medium, color: '#fbbf24' },
        { name: 'Low', value: priorityCounts.low, color: '#60a5fa' }
      ],
      workload: workloadData,
      weeklyProgress,
      burndown: burndownData
    });
  } catch (error) {
    res.status(500).json({ error: 'Error generating analytics metrics' });
  }
});

export default router;
