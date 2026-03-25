import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Theme, Toast, User, EmergencyBanner, TickerMessage } from '../types';
import { authApi, usersApi, settingsApi } from '../api/client';

interface AppState {
  theme: Theme;
  sidebarCollapsed: boolean;
  currentUser: User | null;
  isAuthenticated: boolean;
  toasts: Toast[];
  emergencyBanner: EmergencyBanner | null;
  tickerMessages: TickerMessage[];
  tickerEnabled: boolean;
  tickerSpeed: number;
  systemName: string;
  isLoading: boolean;

  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setCurrentUser: (user: User | null) => void;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  changePassword: (userId: number, newPassword: string) => Promise<void>;
  logActivity: (action: string, module: string, details?: string) => Promise<void>;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  loadSettings: () => Promise<void>;
  loadBanner: () => Promise<void>;
  loadTickerMessages: () => Promise<void>;
  dismissBannerTemporary: () => void;
  dismissBannerPermanent: () => Promise<void>;
  isBannerDismissed: () => boolean;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      sidebarCollapsed: false,
      currentUser: null,
      isAuthenticated: false,
      toasts: [],
      emergencyBanner: null,
      tickerMessages: [],
      tickerEnabled: true,
      tickerSpeed: 120,
      systemName: 'מרכז פעולות סייבר',
      isLoading: false,

      login: async (username, password) => {
        try {
          const user = await authApi.login(username, password);
          if (!user) return false;
          set({ currentUser: user, isAuthenticated: true });
          return true;
        } catch { return false; }
      },

      logout: () => {
        const { currentUser } = get();
        if (currentUser?.id) {
          usersApi.logActivity({
            userId: currentUser.id,
            action: 'יציאה מהמערכת',
            module: 'מערכת',
            details: `משתמש ${currentUser.username} התנתק`,
            timestamp: new Date().toISOString(),
          }).catch(() => {});
        }
        set({ currentUser: null, isAuthenticated: false });
      },

      changePassword: async (userId, newPassword) => {
        await usersApi.changePassword(userId, newPassword);
        const currentUser = get().currentUser;
        if (currentUser?.id === userId) {
          // Re-fetch updated user to get new hash in memory
          const updated = await usersApi.getById(userId);
          set({ currentUser: updated });
        }
      },

      logActivity: async (action, module, details) => {
        const { currentUser } = get();
        if (!currentUser?.id) return;
        await usersApi.logActivity({
          userId: currentUser.id,
          action,
          module,
          details,
          timestamp: new Date().toISOString(),
        });
      },

      setTheme: (theme) => {
        set({ theme });
        document.documentElement.setAttribute('data-theme', theme);
      },

      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      setCurrentUser: (user) => set({ currentUser: user }),

      addToast: (toast) => {
        const id = Date.now().toString();
        set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
        setTimeout(() => {
          get().removeToast(id);
        }, toast.duration ?? 4000);
      },

      removeToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      loadSettings: async () => {
        try {
          const map = await settingsApi.getAll();
          const theme = (map['theme'] as Theme) || 'dark';
          document.documentElement.setAttribute('data-theme', theme);
          set({
            theme,
            systemName: map['system_name'] || 'מרכז פעולות סייבר',
            tickerEnabled: map['ticker_enabled'] !== 'false',
            tickerSpeed: parseInt(map['ticker_speed'] || '120'),
          });
        } catch (err) {
          console.error('Failed to load settings', err);
        }
      },

      loadBanner: async () => {
        try {
          const banner = await settingsApi.getActiveBanner();
          set({ emergencyBanner: banner });
        } catch {
          set({ emergencyBanner: null });
        }
      },

      loadTickerMessages: async () => {
        try {
          const all = await settingsApi.getTicker();
          const messages = all.filter((m) => m.isActive).sort((a, b) => a.order - b.order);
          set({ tickerMessages: messages });
        } catch {
          set({ tickerMessages: [] });
        }
      },

      dismissBannerTemporary: () => {
        const banner = get().emergencyBanner;
        const until = Date.now() + 5 * 60 * 1000;
        localStorage.setItem('banner_dismissed_until', until.toString());
        if (banner?.id) {
          localStorage.setItem('banner_dismissed_id', banner.id.toString());
        }
      },

      dismissBannerPermanent: async () => {
        const banner = get().emergencyBanner;
        if (banner?.id) {
          await settingsApi.updateBanner(banner.id, { isActive: false });
        }
        set({ emergencyBanner: null });
      },

      isBannerDismissed: () => {
        const banner = get().emergencyBanner;
        const until = localStorage.getItem('banner_dismissed_until');
        if (!until) return false;
        // If the current banner is different from the dismissed one, always show it
        const dismissedId = localStorage.getItem('banner_dismissed_id');
        if (banner?.id && dismissedId && banner.id.toString() !== dismissedId) {
          return false;
        }
        return Date.now() < parseInt(until);
      },
    }),
    {
      name: 'cyber-app-store',
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
