import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, CalendarDays, ArrowLeftRight, AlertTriangle,
  CheckSquare, Monitor, ShieldAlert, Star, Users, Settings, BookOpen, FileBarChart2, HardDrive,
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useIncidentsStore } from '../../store/incidentsStore';
import { useTasksStore } from '../../store/tasksStore';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'ראשי', icon: LayoutDashboard, path: '/' },
  { id: 'schedule', label: 'סידור עבודה', icon: CalendarDays, path: '/schedule' },
  { id: 'handover', label: 'העברת משמרת', icon: ArrowLeftRight, path: '/handover' },
  { id: 'incidents', label: 'ניהול אירועים', icon: AlertTriangle, path: '/incidents' },
  { id: 'tasks', label: 'ניהול משימות', icon: CheckSquare, path: '/tasks' },
  { id: 'systems', label: 'בדיקת מערכות', icon: Monitor, path: '/systems' },
  { id: 'cves', label: 'ניהול CVEs', icon: ShieldAlert, path: '/cves' },
  { id: 'playbooks', label: 'Playbooks', icon: BookOpen, path: '/playbooks' },
  { id: 'reports', label: 'דוחות', icon: FileBarChart2, path: '/reports' },
  { id: 'events', label: 'אירועים מיוחדים', icon: Star, path: '/events' },
  { id: 'inventory', label: 'מלאי וציוד', icon: HardDrive, path: '/inventory' },
  { id: 'users', label: 'ניהול משתמשים', icon: Users, path: '/users' },
  { id: 'settings', label: 'הגדרות מערכת', icon: Settings, path: '/settings' },
];

export function Sidebar() {
  const { sidebarCollapsed } = useAppStore();
  const { incidents } = useIncidentsStore();
  const { tasks } = useTasksStore();

  const openIncidents = incidents.filter((i) => i.status === 'open' || i.status === 'in_progress').length;
  const criticalIncidents = incidents.filter((i) => i.severity === 'critical' && i.status !== 'closed').length;
  const pendingTasks = tasks.filter((t) => t.status === 'todo' || t.status === 'in_progress').length;

  const getBadge = (id: string) => {
    if (id === 'incidents') return { count: openIncidents, danger: criticalIncidents > 0 };
    if (id === 'tasks') return { count: pendingTasks, danger: false };
    return null;
  };

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 64 : 260 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      style={{
        background: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border)',
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'relative',
      }}
    >
      <nav style={{ padding: '12px 8px', flex: 1, overflowY: 'auto' }}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const badge = getBadge(item.id);

          return (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.path === '/'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: sidebarCollapsed ? '12px' : '10px 14px',
                borderRadius: '10px',
                marginBottom: '2px',
                textDecoration: 'none',
                background: isActive ? 'var(--bg-hover)' : 'transparent',
                color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: isActive ? 600 : 400,
                fontSize: '15px',
                position: 'relative',
                justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                boxShadow: isActive ? 'var(--glow-cyan)' : 'none',
                transition: 'all 0.2s ease',
                borderLeft: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
              })}
              className="sidebar-link"
            >
              <Icon size={18} style={{ flexShrink: 0 }} />
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    style={{ flex: 1, whiteSpace: 'nowrap' }}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {badge && badge.count > 0 && (
                <span
                  style={{
                    background: badge.danger ? 'var(--accent-danger)' : 'var(--accent-warning)',
                    color: 'white',
                    borderRadius: '10px',
                    padding: '2px 6px',
                    fontSize: '10px',
                    fontWeight: 700,
                    minWidth: '18px',
                    textAlign: 'center',
                    flexShrink: 0,
                    ...(sidebarCollapsed ? {
                      position: 'absolute',
                      top: 6, left: 6,
                      width: '14px', height: '14px',
                      borderRadius: '50%',
                      padding: 0,
                      fontSize: '8px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    } : {}),
                  }}
                >
                  {badge.count > 99 ? '99+' : badge.count}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Version */}
      <AnimatePresence>
        {!sidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--border)',
              fontSize: '10px',
              color: 'var(--text-muted)',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            SOC MGMT v2026.1
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
