/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  CheckSquare, 
  Tag, 
  Clock, 
  User, 
  ChevronRight, 
  ChevronLeft,
  X,
  MessageSquare,
  AlertCircle,
  MoreHorizontal
} from 'lucide-react';
import { api } from '../lib/api.js';
import { Task, TaskStatus, TaskPriority, Comment } from '../types.js';

interface KanbanBoardProps {
  projectId: string;
  members: { userId: string; name: string; avatarUrl?: string }[];
}

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'backlog', label: 'Backlog', color: 'border-t-zinc-600 bg-zinc-950/40 text-zinc-400' },
  { id: 'todo', label: 'Todo', color: 'border-t-indigo-600 bg-zinc-950/40 text-indigo-300' },
  { id: 'in_progress', label: 'In Progress', color: 'border-t-yellow-600 bg-zinc-950/40 text-yellow-300' },
  { id: 'review', label: 'Review', color: 'border-t-purple-600 bg-zinc-950/40 text-purple-300' },
  { id: 'done', label: 'Done', color: 'border-t-emerald-600 bg-zinc-950/40 text-emerald-300' },
];

export default function KanbanBoard({ projectId, members }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering states
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');

  // Drag and drop states
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [activeDropCol, setActiveDropCol] = useState<TaskStatus | null>(null);

  // New task modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [addColId, setAddColId] = useState<TaskStatus>('todo');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [newAssignee, setNewAssignee] = useState('');
  const [newLabels, setNewLabels] = useState('');
  const [newDueDate, setNewDueDate] = useState('');

  // Detail Drawer states
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [drawerComments, setDrawerComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSavingComment, setIsSavingComment] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getTasks(projectId, {
        search: search || undefined,
        priority: priorityFilter || undefined,
        assigneeId: assigneeFilter || undefined,
      });
      setTasks(res.tasks);
    } catch (err: any) {
      setError(err.message || 'Error fetching tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [projectId, search, priorityFilter, assigneeFilter]);

  // Handle Drag & Drop logic
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent, colId: TaskStatus) => {
    e.preventDefault();
    setActiveDropCol(colId);
  };

  const handleDrop = async (e: React.DragEvent, colId: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    setDraggedTaskId(null);
    setActiveDropCol(null);

    if (!taskId) return;

    // Optimistic UI state update
    const previousTasks = [...tasks];
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: colId } : t));

    try {
      await api.updateTask(taskId, { status: colId });
    } catch (err) {
      console.error('Drag and Drop state write-back failed, reverting UI', err);
      setTasks(previousTasks);
    }
  };

  // Move task via button (useful for mobile accessibility!)
  const moveTaskColumn = async (task: Task, direction: 'left' | 'right') => {
    const statusSequence: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'review', 'done'];
    const currIdx = statusSequence.indexOf(task.status);
    let newIdx = currIdx;
    
    if (direction === 'left' && currIdx > 0) newIdx--;
    if (direction === 'right' && currIdx < statusSequence.length - 1) newIdx++;
    
    if (newIdx === currIdx) return;
    const newStatus = statusSequence[newIdx];

    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    try {
      await api.updateTask(task.id, { status: newStatus });
    } catch (err) {
      fetchTasks();
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const payloadLabels = newLabels.split(',').map(l => l.trim()).filter(Boolean);
      await api.createTask({
        projectId,
        title: newTitle.trim(),
        description: newDesc,
        status: addColId,
        priority: newPriority,
        dueDate: newDueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        assigneeId: newAssignee || undefined,
        labels: payloadLabels
      });

      setShowAddModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewPriority('medium');
      setNewAssignee('');
      setNewLabels('');
      setNewDueDate('');
      fetchTasks();
    } catch (err: any) {
      alert(err.message || 'Failed to create task');
    }
  };

  const inspectTask = async (task: Task) => {
    setSelectedTask(task);
    try {
      const res = await api.getTaskComments(task.id);
      setDrawerComments(res.comments);
    } catch (err) {
      console.error('Error fetching task comments', err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedTask) return;

    setIsSavingComment(true);
    try {
      const res = await api.createTaskComment(selectedTask.id, newCommentText);
      setDrawerComments(prev => [...prev, res.comment]);
      setNewCommentText('');
    } catch (err: any) {
      alert(err.message || 'Error publishing comment');
    } finally {
      setIsSavingComment(false);
    }
  };

  const handleUpdateTaskDetails = async (updateData: Partial<Task>) => {
    if (!selectedTask) return;
    setSelectedTask(prev => prev ? { ...prev, ...updateData } : null);
    setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, ...updateData } : t));
    
    try {
      await api.updateTask(selectedTask.id, updateData);
    } catch (err) {
      fetchTasks();
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task? This action is permanent.')) return;
    try {
      await api.deleteTask(taskId);
      setShowAddModal(false);
      setSelectedTask(null);
      fetchTasks();
    } catch (err: any) {
      alert(err.message || 'Failed to delete task');
    }
  };

  // Get Assignee display properties
  const getAssigneeInfo = (id?: string) => {
    if (!id) return null;
    return members.find(m => m.userId === id) || { name: 'Unknown User', avatarUrl: undefined };
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 p-6 overflow-hidden text-zinc-200 space-y-4" id="kanban_board_view">
      {/* Filters bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-900/40 p-4 border border-zinc-900 rounded-xl">
        <div className="flex flex-1 flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Keyword Search */}
          <div className="relative flex-1">
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks by name or description..."
              className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-850 rounded-lg text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
            />
          </div>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 bg-zinc-950 border border-zinc-850 rounded-lg text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Priorities</option>
            <option value="high">🔴 High Priority</option>
            <option value="medium">🟡 Medium Priority</option>
            <option value="low">🔵 Low Priority</option>
          </select>

          {/* Assignee filter */}
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#050506] border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Assignees</option>
            <option value="unassigned">Unassigned Only</option>
            {members.map(m => (
              <option key={m.userId} value={m.userId}>👤 {m.name}</option>
            ))}
          </select>
        </div>

        <button 
          onClick={() => {
            setAddColId('todo');
            setShowAddModal(true);
          }}
          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* Kanban Board columns wrapper */}
      {loading && tasks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-xs font-mono text-zinc-500">
          Syncing task board...
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.id);
            const isColOver = activeDropCol === col.id;

            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`flex flex-col h-full min-w-[220px] rounded-xl border-t-2 ${col.color} p-3 transition-colors ${
                  isColOver ? 'bg-zinc-900/40' : 'bg-[#0c0c0e]/30'
                }`}
              >
                {/* Column header */}
                <div className="flex items-center justify-between mb-3.5">
                  <span className="text-xs font-bold uppercase tracking-wider">{col.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-zinc-400 bg-[#050506] border border-zinc-800 px-2 py-0.5 rounded-full">
                      {colTasks.length}
                    </span>
                    <button 
                      onClick={() => {
                        setAddColId(col.id);
                        setShowAddModal(true);
                      }}
                      className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition"
                      title={`Add task to ${col.label}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Column cards container */}
                <div className="flex-1 space-y-3 overflow-y-auto pr-0.5">
                  {colTasks.map((task) => {
                    const assignee = getAssigneeInfo(task.assigneeId);
                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onClick={() => inspectTask(task)}
                        className="bg-[#0c0c0e] border border-zinc-800 hover:border-zinc-700/60 p-3 rounded-lg shadow-sm hover:shadow-md cursor-pointer transition flex flex-col group select-none relative overflow-hidden"
                      >
                        {/* Task Priority Bar indicator */}
                        <div className={`absolute top-0 left-0 right-0 h-1 ${
                          task.priority === 'high' ? 'bg-red-500' : task.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                        }`} />

                        {/* Heading */}
                        <h4 className="text-xs font-bold text-zinc-200 line-clamp-2 mt-1 leading-relaxed group-hover:text-indigo-400 transition">
                          {task.title}
                        </h4>

                        {/* Labels / Tags */}
                        {task.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2.5">
                            {task.labels.slice(0, 3).map((l, i) => (
                              <span key={i} className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-zinc-800/40 text-zinc-400 border border-zinc-800/50">
                                {l}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Footer details row */}
                        <div className="flex items-center justify-between mt-4 pt-2.5 border-t border-zinc-800/60">
                          {/* Due Date tag */}
                          <div className="flex items-center gap-1 text-[9px] text-zinc-500 font-mono">
                            <Clock className="w-3 h-3" />
                            <span>
                              {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          </div>

                          {/* Quick accessibility directional buttons for iframe/mobile frames */}
                          <div className="hidden group-hover:flex items-center gap-1 bg-[#050506] p-0.5 rounded border border-zinc-800">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveTaskColumn(task, 'left');
                              }}
                              className="p-0.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-indigo-400 transition"
                              title="Move Left"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveTaskColumn(task, 'right');
                              }}
                              className="p-0.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-indigo-400 transition"
                              title="Move Right"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Assignee display */}
                          {assignee ? (
                            <img 
                              src={assignee.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(assignee.name)}`} 
                              alt={assignee.name} 
                              className="w-4.5 h-4.5 rounded-full object-cover border border-zinc-800 bg-zinc-800"
                              title={assignee.name}
                            />
                          ) : (
                            <div className="w-4.5 h-4.5 rounded-full border border-zinc-800 bg-[#050506] flex items-center justify-center text-zinc-600" title="Unassigned">
                              <User className="w-2.5 h-2.5" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {colTasks.length === 0 && (
                    <div className="border border-dashed border-zinc-850 rounded-lg p-4 text-center text-[10px] text-zinc-600 font-mono">
                      Empty column
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DRAWER: DETAILED TASK INSPECTION */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-end z-50 animate-in slide-in-from-right duration-200">
          <div className="w-full max-w-lg bg-zinc-900 border-l border-zinc-800 h-full flex flex-col p-6 shadow-2xl text-zinc-200 overflow-y-auto">
            {/* Header row */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-850">
              <span className="text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-850 uppercase tracking-wider">
                ID: {selectedTask.id}
              </span>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => handleDeleteTask(selectedTask.id)}
                  className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition"
                  title="Delete task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setSelectedTask(null)}
                  className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Task main body */}
            <div className="flex-1 py-4 space-y-5 overflow-y-auto">
              {/* Title input editable */}
              <div>
                <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Title</label>
                <input 
                  type="text" 
                  value={selectedTask.title}
                  onChange={(e) => handleUpdateTaskDetails({ title: e.target.value })}
                  className="w-full bg-transparent border-0 hover:bg-zinc-950/40 p-2 rounded text-base font-bold text-zinc-100 focus:bg-zinc-950 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition"
                />
              </div>

              {/* Attributes row */}
              <div className="grid grid-cols-2 gap-4 bg-zinc-950/40 p-3 rounded-lg border border-zinc-850">
                {/* Status Column dropdown */}
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Status</label>
                  <select
                    value={selectedTask.status}
                    onChange={(e) => handleUpdateTaskDetails({ status: e.target.value as TaskStatus })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-1 px-2.5 text-xs text-zinc-300 focus:outline-none"
                  >
                    <option value="backlog">Backlog</option>
                    <option value="todo">Todo</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                {/* Priority dropdown */}
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Priority</label>
                  <select
                    value={selectedTask.priority}
                    onChange={(e) => handleUpdateTaskDetails({ priority: e.target.value as TaskPriority })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-1 px-2.5 text-xs text-zinc-300 focus:outline-none"
                  >
                    <option value="high">🔴 High</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="low">🔵 Low</option>
                  </select>
                </div>

                {/* Assignee dropdown */}
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Assignee</label>
                  <select
                    value={selectedTask.assigneeId || ''}
                    onChange={(e) => handleUpdateTaskDetails({ assigneeId: e.target.value || undefined })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-1 px-2.5 text-xs text-zinc-300 focus:outline-none"
                  >
                    <option value="">Unassigned</option>
                    {members.map(m => (
                      <option key={m.userId} value={m.userId}>{m.name}</option>
                    ))}
                  </select>
                </div>

                {/* Due Date picker */}
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Due Date</label>
                  <input
                    type="date"
                    value={selectedTask.dueDate.substring(0, 10)}
                    onChange={(e) => handleUpdateTaskDetails({ dueDate: new Date(e.target.value).toISOString() })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-1 px-2.5 text-xs text-zinc-300 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Description Markdown text field */}
              <div>
                <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Description (Markdown)</label>
                <textarea 
                  value={selectedTask.description}
                  onChange={(e) => handleUpdateTaskDetails({ description: e.target.value })}
                  placeholder="Task specifications, checklist logs, or terminal outputs..."
                  className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono resize-none leading-relaxed"
                />
              </div>

              {/* Nested Comment Thread Panel */}
              <div className="space-y-3 pt-3 border-t border-zinc-850">
                <h3 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                  Discussion Thread
                </h3>

                {/* Existing comments list */}
                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {drawerComments.length === 0 ? (
                    <p className="text-[10px] text-zinc-600 font-mono text-center py-2 bg-zinc-950/20 border border-zinc-900 rounded-lg">
                      Quiet discussion. Start the conversation!
                    </p>
                  ) : (
                    drawerComments.map(c => (
                      <div key={c.id} className="p-3 bg-zinc-950/40 border border-zinc-850/80 rounded-lg space-y-1.5">
                        <div className="flex items-center gap-2">
                          <img 
                            src={c.userAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.userName)}`} 
                            alt={c.userName} 
                            className="w-4.5 h-4.5 rounded-full object-cover"
                          />
                          <span className="text-[10px] font-bold text-zinc-200">{c.userName}</span>
                          <span className="text-[9px] text-zinc-600 font-mono ml-auto">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 pl-1 leading-relaxed">
                          {c.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* Post comment input */}
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input 
                    type="text" 
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Add operational update or note..."
                    className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                  <button 
                    type="submit" 
                    disabled={isSavingComment}
                    className="px-3.5 bg-zinc-800 hover:bg-zinc-700 hover:text-zinc-100 text-zinc-400 rounded-lg text-xs font-semibold transition"
                  >
                    Send
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE NEW KANBAN TASK */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-850 rounded-xl p-6 w-full max-w-md animate-in fade-in zoom-in duration-150">
            <h3 className="text-lg font-bold text-zinc-100 mb-1 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-indigo-400" />
              New Kanban Task
            </h3>
            <p className="text-xs text-zinc-400 mb-4">Add specifications, priority, and assignees directly to the Board.</p>
            
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Task Title</label>
                <input 
                  type="text" 
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Implement refresh token rotation middleware"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Detailed Description</label>
                <textarea 
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Detailed logs, prerequisites, checklists, or steps..."
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 h-20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Priority</label>
                  <select 
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="high">🔴 High</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="low">🔵 Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Assignee</label>
                  <select 
                    value={newAssignee}
                    onChange={(e) => setNewAssignee(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Unassigned</option>
                    {members.map(m => (
                      <option key={m.userId} value={m.userId}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Labels (Comma-separated)</label>
                  <input 
                    type="text" 
                    value={newLabels}
                    onChange={(e) => setNewLabels(e.target.value)}
                    placeholder="Backend, Auth, Security"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Due Date</label>
                  <input 
                    type="date" 
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold hover:bg-zinc-800 text-zinc-300 rounded-lg transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition shadow-md"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
