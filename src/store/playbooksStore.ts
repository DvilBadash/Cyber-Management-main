import { create } from 'zustand';
import type { Playbook, PlaybookItem, IncidentChecklistItem } from '../types';
import { playbooksApi, incidentsApi } from '../api/client';

interface PlaybooksState {
  playbooks: Playbook[];
  isLoading: boolean;

  loadPlaybooks: () => Promise<void>;
  addPlaybook: (p: Omit<Playbook, 'id'>) => Promise<number>;
  updatePlaybook: (id: number, updates: Partial<Playbook>) => Promise<void>;
  deletePlaybook: (id: number) => Promise<void>;

  getPlaybookItems: (playbookId: number) => Promise<PlaybookItem[]>;
  addPlaybookItem: (item: Omit<PlaybookItem, 'id'>) => Promise<void>;
  updatePlaybookItem: (id: number, updates: Partial<PlaybookItem>) => Promise<void>;
  deletePlaybookItem: (id: number) => Promise<void>;
  reorderPlaybookItems: (playbookId: number, items: PlaybookItem[]) => Promise<void>;

  getIncidentChecklist: (incidentId: number) => Promise<IncidentChecklistItem[]>;
  createChecklistFromPlaybook: (incidentId: number, playbookId: number) => Promise<void>;
  toggleChecklistItem: (id: number, isDone: boolean, doneBy: string) => Promise<void>;
  addChecklistItem: (item: Omit<IncidentChecklistItem, 'id'>) => Promise<void>;
  deleteChecklistItem: (id: number) => Promise<void>;
}

export const usePlaybooksStore = create<PlaybooksState>((set) => ({
  playbooks: [],
  isLoading: false,

  loadPlaybooks: async () => {
    set({ isLoading: true });
    const playbooks = await playbooksApi.getAll();
    set({ playbooks, isLoading: false });
  },

  addPlaybook: async (p) => {
    const created = await playbooksApi.create(p);
    set((s) => ({ playbooks: [...s.playbooks, created] }));
    return created.id!;
  },

  updatePlaybook: async (id, updates) => {
    await playbooksApi.update(id, updates);
    set((s) => ({ playbooks: s.playbooks.map((p) => (p.id === id ? { ...p, ...updates } : p)) }));
  },

  deletePlaybook: async (id) => {
    await playbooksApi.delete(id);
    set((s) => ({ playbooks: s.playbooks.filter((p) => p.id !== id) }));
  },

  getPlaybookItems: (playbookId) => playbooksApi.getItems(playbookId),

  addPlaybookItem: (item) => playbooksApi.addItem(item.playbookId, item).then(() => {}),

  updatePlaybookItem: (id, updates) => playbooksApi.updateItem(id, updates).then(() => {}),

  deletePlaybookItem: (id) => playbooksApi.deleteItem(id).then(() => {}),

  reorderPlaybookItems: async (_playbookId, items) => {
    for (let i = 0; i < items.length; i++) {
      await playbooksApi.updateItem(items[i].id!, { order: i + 1 });
    }
  },

  getIncidentChecklist: (incidentId) => incidentsApi.getChecklist(incidentId),

  createChecklistFromPlaybook: async (incidentId, playbookId) => {
    const items = await playbooksApi.getItems(playbookId);
    for (const item of items) {
      await incidentsApi.addChecklistItem(incidentId, {
        incidentId,
        playbookItemId: item.id,
        item: item.item,
        isDone: false,
        order: item.order,
      });
    }
  },

  toggleChecklistItem: async (id, isDone, doneBy) => {
    const now = new Date().toISOString();
    await incidentsApi.updateChecklistItem(id, {
      isDone,
      doneBy: isDone ? doneBy : undefined,
      doneAt: isDone ? now : undefined,
    });
  },

  addChecklistItem: (item) => incidentsApi.addChecklistItem(item.incidentId, item).then(() => {}),

  deleteChecklistItem: async (_id) => {
    // No delete endpoint for checklist items — mark as not done
    // The item stays but is unchecked; to fully implement, add DELETE /incidents/checklist/:id route
  },
}));
