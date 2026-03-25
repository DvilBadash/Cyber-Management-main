import { create } from 'zustand';
import type { Task, TaskChecklistItem, TaskComment } from '../types';
import { tasksApi } from '../api/client';

interface TasksState {
  tasks: Task[];
  isLoading: boolean;

  loadTasks: () => Promise<void>;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTask: (id: number, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
  getChecklist: (taskId: number) => Promise<TaskChecklistItem[]>;
  updateChecklistItem: (id: number, isDone: boolean) => Promise<void>;
  addChecklistItem: (item: Omit<TaskChecklistItem, 'id'>) => Promise<void>;
  getComments: (taskId: number) => Promise<TaskComment[]>;
  addComment: (comment: Omit<TaskComment, 'id'>) => Promise<void>;
  getStats: () => { todo: number; inProgress: number; review: number; done: number; urgent: number };
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  isLoading: false,

  loadTasks: async () => {
    set({ isLoading: true });
    const tasks = await tasksApi.getAll();
    set({ tasks, isLoading: false });
  },

  addTask: async (data) => {
    const now = new Date().toISOString();
    const task = await tasksApi.create({ ...data, createdAt: now, updatedAt: now });
    set((s) => ({ tasks: [task, ...s.tasks] }));
  },

  updateTask: async (id, updates) => {
    const now = new Date().toISOString();
    const updated = await tasksApi.update(id, { ...updates, updatedAt: now });
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? updated : t)),
    }));
  },

  deleteTask: async (id) => {
    await tasksApi.delete(id);
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
  },

  getChecklist: (taskId) => tasksApi.getChecklist(taskId),

  updateChecklistItem: (id, isDone) => tasksApi.updateChecklistItem(id, isDone).then(() => {}),

  addChecklistItem: (item) => tasksApi.addChecklistItem(item.taskId, item).then(() => {}),

  getComments: (taskId) => tasksApi.getComments(taskId),

  addComment: (comment) => tasksApi.addComment(comment.taskId, comment).then(() => {}),

  getStats: () => {
    const { tasks } = get();
    return {
      todo: tasks.filter((t) => t.status === 'todo').length,
      inProgress: tasks.filter((t) => t.status === 'in_progress').length,
      review: tasks.filter((t) => t.status === 'review').length,
      done: tasks.filter((t) => t.status === 'done').length,
      urgent: tasks.filter((t) => t.priority === 'urgent' && t.status !== 'done').length,
    };
  },
}));
