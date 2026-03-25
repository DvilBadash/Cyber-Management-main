import { create } from 'zustand';
import type { Incident, IncidentAction, Severity, IncidentStatus } from '../types';
import { incidentsApi } from '../api/client';

interface IncidentsState {
  incidents: Incident[];
  actions: IncidentAction[];
  isLoading: boolean;
  filter: {
    severity?: Severity;
    status?: IncidentStatus;
    category?: string;
    search?: string;
  };

  loadIncidents: () => Promise<void>;
  addIncident: (incident: Omit<Incident, 'id' | 'incidentNumber' | 'createdAt' | 'updatedAt'>) => Promise<Incident>;
  updateIncident: (id: number, updates: Partial<Incident>) => Promise<void>;
  closeIncident: (id: number, rca: string, closedBy: string) => Promise<void>;
  addAction: (action: Omit<IncidentAction, 'id'>) => Promise<void>;
  loadActions: (incidentId: number) => Promise<void>;
  setFilter: (filter: Partial<IncidentsState['filter']>) => void;
  getFiltered: () => Incident[];
  getStats: () => { open: number; inProgress: number; critical: number; today: number };
}

let incidentCounter = 0;

async function getNextIncidentNumber(): Promise<string> {
  const year = new Date().getFullYear();
  // Fetch current count from server
  try {
    const all = await incidentsApi.getAll();
    incidentCounter = Math.max(incidentCounter, all.length);
  } catch {
    // fallback to in-memory counter
  }
  incidentCounter++;
  return `INC-${year}-${String(incidentCounter).padStart(4, '0')}`;
}

export const useIncidentsStore = create<IncidentsState>((set, get) => ({
  incidents: [],
  actions: [],
  isLoading: false,
  filter: {},

  loadIncidents: async () => {
    set({ isLoading: true });
    const incidents = await incidentsApi.getAll();
    set({ incidents, isLoading: false });
  },

  addIncident: async (data) => {
    const now = new Date().toISOString();
    const incidentNumber = await getNextIncidentNumber();
    const newIncident = await incidentsApi.create({
      ...data,
      incidentNumber,
      createdAt: now,
      updatedAt: now,
      status: 'open',
    });
    set((s) => ({ incidents: [newIncident, ...s.incidents] }));
    return newIncident;
  },

  updateIncident: async (id, updates) => {
    const now = new Date().toISOString();
    const updated = await incidentsApi.update(id, { ...updates, updatedAt: now });
    set((s) => ({
      incidents: s.incidents.map((inc) => (inc.id === id ? updated : inc)),
    }));
  },

  closeIncident: async (id, rca, closedBy) => {
    const now = new Date().toISOString();
    await incidentsApi.update(id, { status: 'closed', rca, closedAt: now, updatedAt: now });
    await incidentsApi.addAction(id, {
      incidentId: id,
      action: 'סגירת אירוע',
      performedBy: closedBy,
      timestamp: now,
      notes: rca,
    });
    set((s) => ({
      incidents: s.incidents.map((inc) =>
        inc.id === id ? { ...inc, status: 'closed', rca, closedAt: now, updatedAt: now } : inc
      ),
    }));
  },

  addAction: async (action) => {
    const created = await incidentsApi.addAction(action.incidentId, action);
    set((s) => ({ actions: [...s.actions, created] }));
  },

  loadActions: async (incidentId) => {
    const actions = await incidentsApi.getActions(incidentId);
    set({ actions });
  },

  setFilter: (filter) => set((s) => ({ filter: { ...s.filter, ...filter } })),

  getFiltered: () => {
    const { incidents, filter } = get();
    return incidents.filter((inc) => {
      if (filter.severity && inc.severity !== filter.severity) return false;
      if (filter.status && inc.status !== filter.status) return false;
      if (filter.category && inc.category !== filter.category) return false;
      if (filter.search) {
        const q = filter.search.toLowerCase();
        if (
          !inc.title.toLowerCase().includes(q) &&
          !inc.incidentNumber.toLowerCase().includes(q) &&
          !inc.description.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  },

  getStats: () => {
    const { incidents } = get();
    const today = new Date().toDateString();
    return {
      open: incidents.filter((i) => i.status === 'open').length,
      inProgress: incidents.filter((i) => i.status === 'in_progress').length,
      critical: incidents.filter((i) => i.severity === 'critical' && i.status !== 'closed').length,
      today: incidents.filter((i) => new Date(i.createdAt).toDateString() === today).length,
    };
  },
}));
