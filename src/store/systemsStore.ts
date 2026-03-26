import { create } from 'zustand';
import type { MonitoredSystem, SystemCheck, CVE, CVEAsset } from '../types';
import { systemsApi, cvesApi } from '../api/client';

interface SystemsState {
  systems: MonitoredSystem[];
  cves: CVE[];
  isLoading: boolean;

  loadSystems: () => Promise<void>;
  updateSystemStatus: (id: number, status: MonitoredSystem['currentStatus'], notes: string, checkedBy: string) => Promise<void>;
  updateSystem: (id: number, updates: Partial<MonitoredSystem>) => Promise<void>;
  addSystem: (system: Omit<MonitoredSystem, 'id'>) => Promise<void>;
  getChecks: (systemId: number) => Promise<SystemCheck[]>;

  loadCVEs: () => Promise<void>;
  addCVE: (cve: Omit<CVE, 'id'>) => Promise<void>;
  updateCVE: (id: number, updates: Partial<CVE>) => Promise<void>;
  getCVEAssets: (cveId: number) => Promise<CVEAsset[]>;
  updateCVEAsset: (id: number, updates: Partial<CVEAsset>) => Promise<void>;
  addCVEAsset: (asset: Omit<CVEAsset, 'id'>) => Promise<void>;
}

export const useSystemsStore = create<SystemsState>((set) => ({
  systems: [],
  cves: [],
  isLoading: false,

  loadSystems: async () => {
    set({ isLoading: true });
    const systems = await systemsApi.getAll();
    set({ systems, isLoading: false });
  },

  updateSystemStatus: async (id, status, notes, checkedBy) => {
    const now = new Date().toISOString();
    // The server route handles downtime + daily session updates
    await systemsApi.addCheck(id, { systemId: id, status, checkedBy, checkedAt: now, notes });
    set((s) => ({
      systems: s.systems.map((sys) =>
        sys.id === id ? { ...sys, currentStatus: status, lastChecked: now } : sys
      ),
    }));
  },

  updateSystem: async (id, updates) => {
    const updated = await systemsApi.update(id, updates);
    set((s) => ({ systems: s.systems.map((sys) => (sys.id === id ? { ...sys, ...updated } : sys)) }));
  },

  addSystem: async (system) => {
    const created = await systemsApi.create(system);
    set((s) => ({ systems: [...s.systems, created] }));
  },

  getChecks: (systemId) => systemsApi.getChecks(systemId),

  loadCVEs: async () => {
    set({ isLoading: true });
    const cves = await cvesApi.getAll();
    set({ cves, isLoading: false });
  },

  addCVE: async (cve) => {
    const created = await cvesApi.create(cve);
    set((s) => ({ cves: [created, ...s.cves] }));
  },

  updateCVE: async (id, updates) => {
    const updated = await cvesApi.update(id, updates);
    set((s) => ({ cves: s.cves.map((c) => (c.id === id ? updated : c)) }));
  },

  getCVEAssets: (cveId) => cvesApi.getAssets(cveId),

  updateCVEAsset: (id, updates) => cvesApi.updateAsset(id, updates).then(() => {}),

  addCVEAsset: (asset) => cvesApi.addAsset(asset.cveId, asset).then(() => {}),
}));
