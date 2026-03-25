import { create } from 'zustand';
import { INCIDENT_CATEGORIES, INCIDENT_SOURCES, SYSTEM_CATEGORIES } from '../types';
import { settingsApi } from '../api/client';

const LIST_KEYS = {
  incidentCategories: 'incident_categories',
  incidentSources: 'incident_sources',
  systemCategories: 'system_categories',
  equipmentTypes: 'equipment_types',
  userRoles: 'user_roles',
} as const;

const DEFAULT_EQUIPMENT_TYPES = ['כונן נייד', 'מחשב נייד', 'טאבלט', 'USB', 'כבל', 'אחר'];
const DEFAULT_USER_ROLES = ['admin', 'team_lead', 'senior_analyst', 'analyst', 'viewer'];

export type ListName = keyof typeof LIST_KEYS;

interface ListsState {
  incidentCategories: string[];
  incidentSources: string[];
  systemCategories: string[];
  equipmentTypes: string[];
  userRoles: string[];
  loadLists: () => Promise<void>;
  addItem: (list: ListName, value: string) => Promise<void>;
  removeItem: (list: ListName, value: string) => Promise<void>;
  updateItem: (list: ListName, oldValue: string, newValue: string) => Promise<void>;
}

async function saveList(key: string, values: string[]) {
  await settingsApi.set(key, JSON.stringify(values));
}

export const useListsStore = create<ListsState>((set, get) => ({
  incidentCategories: INCIDENT_CATEGORIES,
  incidentSources: INCIDENT_SOURCES,
  systemCategories: SYSTEM_CATEGORIES,
  equipmentTypes: DEFAULT_EQUIPMENT_TYPES,
  userRoles: DEFAULT_USER_ROLES,

  loadLists: async () => {
    const map = await settingsApi.getAll();
    const parse = (key: string, defaults: string[]) => {
      if (!map[key]) return defaults;
      try { return JSON.parse(map[key]); } catch { return defaults; }
    };
    set({
      incidentCategories: parse(LIST_KEYS.incidentCategories, INCIDENT_CATEGORIES),
      incidentSources: parse(LIST_KEYS.incidentSources, INCIDENT_SOURCES),
      systemCategories: parse(LIST_KEYS.systemCategories, SYSTEM_CATEGORIES),
      equipmentTypes: parse(LIST_KEYS.equipmentTypes, DEFAULT_EQUIPMENT_TYPES),
      userRoles: parse(LIST_KEYS.userRoles, DEFAULT_USER_ROLES),
    });
  },

  addItem: async (list, value) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const current = (get() as unknown as Record<string, string[]>)[list];
    if (current.includes(trimmed)) return;
    const updated = [...current, trimmed];
    await saveList(LIST_KEYS[list], updated);
    set({ [list]: updated });
  },

  removeItem: async (list, value) => {
    const current = (get() as unknown as Record<string, string[]>)[list];
    const updated = current.filter((v: string) => v !== value);
    await saveList(LIST_KEYS[list], updated);
    set({ [list]: updated });
  },

  updateItem: async (list, oldValue, newValue) => {
    const trimmed = newValue.trim();
    if (!trimmed) return;
    const current = (get() as unknown as Record<string, string[]>)[list];
    const updated = current.map((v: string) => v === oldValue ? trimmed : v);
    await saveList(LIST_KEYS[list], updated);
    set({ [list]: updated });
  },
}));
