import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { Incidents } from './pages/Incidents';
import { Tasks } from './pages/Tasks';
import { WorkSchedule } from './pages/WorkSchedule';
import { ShiftHandover } from './pages/ShiftHandover';
import { SystemsCheck } from './pages/SystemsCheck';
import { CVEManagement } from './pages/CVEManagement';
import { SpecialEvents } from './pages/SpecialEvents';
import { UserManagement } from './pages/UserManagement';
import { Settings } from './pages/Settings';
import { Playbooks } from './pages/Playbooks';
import { Reports } from './pages/Reports';
import { Inventory } from './pages/Inventory';
import { Login } from './pages/Login';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { useAppStore } from './store/appStore';
import { useIncidentsStore } from './store/incidentsStore';
import { useTasksStore } from './store/tasksStore';
import { useSystemsStore } from './store/systemsStore';
import { useListsStore } from './store/listsStore';
import { usePlaybooksStore } from './store/playbooksStore';
import { seedDatabase, ensureSocAdmin, db } from './db/database';

function AppInitializer() {
  const { loadSettings, loadBanner, loadTickerMessages, theme, isAuthenticated, setCurrentUser } = useAppStore();
  const { loadIncidents } = useIncidentsStore();
  const { loadTasks } = useTasksStore();
  const { loadSystems, loadCVEs } = useSystemsStore();
  const { loadLists } = useListsStore();
  const { loadPlaybooks } = usePlaybooksStore();

  useEffect(() => {
    const init = async () => {
      try {
        document.documentElement.setAttribute('data-theme', theme);
        await seedDatabase();
        await ensureSocAdmin();
        await loadSettings();
        await loadBanner();
        await loadTickerMessages();
        await loadLists();

        if (isAuthenticated) {
          await loadIncidents();
          await loadTasks();
          await loadSystems();
          await loadCVEs();
          await loadPlaybooks();
          const user = await db.users.toCollection().first();
          if (user) setCurrentUser(user);
        }
      } catch (err) {
        console.error('Init error:', err);
      }
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload data when authentication state changes to true
  useEffect(() => {
    if (!isAuthenticated) return;
    const load = async () => {
      try {
        await loadIncidents();
        await loadTasks();
        await loadSystems();
        await loadCVEs();
        await loadPlaybooks();
      } catch (err) {
        console.error('Load error:', err);
      }
    };
    load();
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

function AuthGate() {
  const isAuthenticated = useAppStore(s => s.isAuthenticated);

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/incidents" element={<Incidents />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/schedule" element={<WorkSchedule />} />
        <Route path="/handover" element={<ShiftHandover />} />
        <Route path="/systems" element={<SystemsCheck />} />
        <Route path="/cves" element={<CVEManagement />} />
        <Route path="/events" element={<SpecialEvents />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="/playbooks" element={<Playbooks />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppInitializer />
        <AuthGate />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
