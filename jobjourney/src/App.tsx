import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Briefcase,
  BarChart3,
  Plus,
  Search,
  Sun,
  Moon,
  Loader2,
  LogOut,
  User as UserIcon,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { JobApplication, ApplicationStatus, ViewType, AuthUser, MonthlyGoal } from "./types";
import DashboardView from "./components/DashboardView";
import ApplicationsView from "./components/ApplicationsView";
import AnalyticsView from "./components/AnalyticsView";
import SettingsView from "./components/SettingsView";
import LoginView from "./components/LoginView";
import JobModal from "./components/JobModal";
import ConfirmModal from "./components/ConfirmModal";
import BulkImportModal from "./components/BulkImportModal";
import { apiService } from "./services/apiService";
import { useToast } from "./contexts/ToastContext";
import { useTheme } from "./contexts/ThemeContext";
import { API_BASE_URL } from "./config";

function getAvatarUrl(user: AuthUser): string {
  if (user.avatarUrl) {
    return `${API_BASE_URL}${user.avatarUrl}`;
  }
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.email)}`;
}

const App: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const { theme, toggleTheme } = useTheme();
  const darkMode = theme === 'dark';

  const [user, setUser] = useState<AuthUser | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [currentView, setCurrentView] = useState<ViewType>("dashboard");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobApplication | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [currentGoal, setCurrentGoal] = useState<MonthlyGoal | null>(null);
  const [goalHistory, setGoalHistory] = useState<MonthlyGoal[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Filter applications based on search query
  const filteredApplications = applications.filter((app) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      app.company.toLowerCase().includes(query) ||
      app.role.toLowerCase().includes(query) ||
      app.location?.toLowerCase().includes(query) ||
      app.notes?.toLowerCase().includes(query) ||
      app.description?.toLowerCase().includes(query)
    );
  });

  // Handle Login
  const handleLogin = (authenticatedUser: AuthUser) => {
    setUser(authenticatedUser);
    setIsLoading(true);
    loadData();
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("tenant_id");
    setUser(null);
    setApplications([]);
  };

  // Fetch from Node.js/Prisma Backend on mount if user is set
  const loadData = async () => {
    try {
      const applicationsData = await apiService.fetchApplications();
      setApplications(applicationsData);

      // Load goals separately so a failure doesn't block applications
      try {
        const [goalData, historyData] = await Promise.all([
          apiService.fetchCurrentGoal(),
          apiService.fetchGoalHistory(),
        ]);
        setCurrentGoal(goalData);
        setGoalHistory(historyData);
      } catch (err) {
        console.error("Failed to load goals:", err);
      }
    } catch (err) {
      console.error("Backend connection failed.", err);
      showError("Connection Failed", "Unable to load your applications. Please try again.");
      setApplications([]);
    } finally {
      setIsLoading(false);
    }
  };

  const updateGoal = async (target: number) => {
    try {
      const updated = await apiService.updateCurrentGoal(target);
      setCurrentGoal(updated);
      setGoalHistory(prev => {
        const filtered = prev.filter(g => !(g.month === updated.month && g.year === updated.year));
        return [updated, ...filtered];
      });
      showSuccess("Goal Updated", `Your ${new Date(updated.year, updated.month - 1).toLocaleString('default', { month: 'long' })} goal is now ${target} applications.`);
    } catch (err) {
      console.error("Failed to update goal:", err);
      showError("Update Failed", "Unable to save your goal.");
    }
  };

  const updateGoalMet = async (goalId: string, met: boolean) => {
    try {
      const updated = await apiService.updateGoalMet(goalId, met);
      setGoalHistory(prev => prev.map(g => g.id === updated.id ? updated : g));
      if (currentGoal?.id === updated.id) {
        setCurrentGoal(updated);
      }
    } catch (err) {
      console.error("Failed to update goal status:", err);
      showError("Update Failed", "Unable to update goal status.");
    }
  };

  useEffect(() => {
    const restoreSession = async () => {
      // Check for OAuth callback parameters in URL
      const urlParams = new URLSearchParams(window.location.search);
      const oauthToken = urlParams.get("token");
      const oauthTenantId = urlParams.get("tenantId");
      const oauthError = urlParams.get("error");

      // Clear URL parameters
      if (oauthToken || oauthError) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      // Handle OAuth error
      if (oauthError) {
        console.error("OAuth error:", oauthError);
        showError("Authentication Failed", oauthError);
        return;
      }

      // Handle OAuth success
      if (oauthToken && oauthTenantId) {
        localStorage.setItem("auth_token", oauthToken);
        localStorage.setItem("tenant_id", oauthTenantId);
      }

      const token = localStorage.getItem("auth_token");
      if (!token) return;

      setIsLoading(true);

      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          // token invalid/expired
          localStorage.removeItem("auth_token");
          localStorage.removeItem("tenant_id");
          setUser(null);
          return;
        }

        const data = await res.json();
        setUser(data.user as AuthUser);

        // Store tenantId from session restore
        if (data.tenantId) {
          localStorage.setItem("tenant_id", data.tenantId);
        }

        // now fetch the real data
        await loadData();
      } catch (err) {
        console.error("Failed to restore session:", err);
        showError("Session Error", "Unable to restore your session. Please log in again.");
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddApplication = async (newApp: Omit<JobApplication, "id">) => {
    setIsSaving(true);
    try {
      const savedApp = await apiService.createApplication(newApp);
      setApplications((prev) => [savedApp, ...prev]);
      showSuccess("Application Added", `Added ${newApp.role} at ${newApp.company}`);
    } catch (err) {
      console.error("Failed to save to backend", err);
      showError("Save Failed", "Unable to save the application. Please try again.");
      throw err; // Re-throw so modal knows save failed
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateApplication = async (updatedApp: JobApplication) => {
    setIsSaving(true);
    try {
      const savedApp = await apiService.updateApplication(
        updatedApp.id,
        updatedApp
      );
      setApplications((prev) =>
        prev.map((app) => (app.id === savedApp.id ? savedApp : app))
      );
      showSuccess("Application Updated", `Updated ${updatedApp.role} at ${updatedApp.company}`);
    } catch (err) {
      console.error("Failed to update backend", err);
      showError("Update Failed", "Unable to update the application. Please try again.");
      throw err; // Re-throw so modal knows save failed
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveApplication = async (job: JobApplication | Omit<JobApplication, "id">) => {
    if ("id" in job && job.id) {
      await handleUpdateApplication(job as JobApplication);
    } else {
      await handleAddApplication(job as Omit<JobApplication, "id">);
    }
  };

  const handleDeleteApplication = async (id: string) => {
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      await apiService.deleteApplication(id);
      setApplications((prev) => prev.filter((app) => app.id !== id));
      showSuccess("Application Deleted", "The application has been removed.");
    } catch (err) {
      console.error("Failed to delete from backend", err);
      showError("Delete Failed", "Unable to delete the application. Please try again.");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    try {
      const result = await apiService.bulkDeleteApplications(ids);
      setApplications((prev) => prev.filter((app) => !ids.includes(app.id)));
      showSuccess("Applications Deleted", `Deleted ${result.deleted} application${result.deleted !== 1 ? 's' : ''}.`);
    } catch (err) {
      console.error("Failed to bulk delete", err);
      showError("Delete Failed", "Unable to delete the selected applications. Please try again.");
    }
  };

  const handleBulkStatusUpdate = async (ids: string[], status: ApplicationStatus) => {
    try {
      const result = await apiService.bulkUpdateStatus(ids, status);
      setApplications((prev) =>
        prev.map((app) => (ids.includes(app.id) ? { ...app, status } : app))
      );
      showSuccess("Status Updated", `Updated ${result.updated} application${result.updated !== 1 ? 's' : ''} to ${status}.`);
    } catch (err) {
      console.error("Failed to bulk update status", err);
      showError("Update Failed", "Unable to update the selected applications. Please try again.");
    }
  };

  const handleBulkImport = async (applications: Partial<JobApplication>[]) => {
    const result = await apiService.bulkImportApplications(applications);
    setApplications((prev) => [...result.applications, ...prev]);
    showSuccess("Import Complete", `Successfully imported ${result.imported} application${result.imported !== 1 ? 's' : ''}.`);
    return result;
  };

  const openAddModal = () => {
    setEditingJob(undefined);
    setIsModalOpen(true);
  };

  const openEditModal = (job: JobApplication) => {
    setEditingJob(job);
    setIsModalOpen(true);
  };

  const handleUpdateUser = (updates: Partial<AuthUser>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  if (!user) {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen overflow-hidden transition-colors duration-300 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">

      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/60 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-emerald-200/50 dark:shadow-none">
                J
              </div>
              <span className="text-xl font-black text-slate-800 dark:text-white tracking-tight">
                JobJourney
              </span>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-400 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="space-y-1.5">
            {([
              { view: "dashboard" as ViewType, icon: LayoutDashboard, label: "Dashboard" },
              { view: "applications" as ViewType, icon: Briefcase, label: "Applications" },
              { view: "analytics" as ViewType, icon: BarChart3, label: "Analytics" },
              { view: "settings" as ViewType, icon: Settings, label: "Settings" },
            ]).map(({ view, icon: Icon, label }) => (
              <button
                key={view}
                onClick={() => { setCurrentView(view); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  currentView === view
                    ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50"
                }`}
              >
                <Icon size={20} className={currentView === view ? "text-emerald-600 dark:text-emerald-400" : ""} />
                <span className="text-sm">{label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-4 space-y-2">
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-3 mb-4 flex items-center gap-3 border border-slate-100 dark:border-slate-800">
            <img
              src={getAvatarUrl(user)}
              className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/40 object-cover"
              alt="Avatar"
            />

            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                {user.name}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate uppercase tracking-wider">
                Explorer
              </p>
            </div>
          </div>

          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl transition-all hover:bg-slate-50 dark:hover:bg-slate-900"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            <span className="font-bold text-xs uppercase tracking-widest">
              {darkMode ? "Light" : "Dark"}
            </span>
          </button>

          <button
            onClick={() => { openAddModal(); setIsSidebarOpen(false); }}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-100 dark:shadow-none group"
          >
            <Plus
              size={18}
              className="group-hover:rotate-90 transition-transform"
            />
            <span className="text-sm">New Opportunity</span>
          </button>

          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center justify-center gap-2 text-rose-500 dark:text-rose-400/80 hover:bg-rose-50 dark:hover:bg-rose-900/20 py-2.5 rounded-xl transition-all font-bold text-xs uppercase tracking-widest"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto scroll-smooth dark:bg-slate-950 pb-16 lg:pb-0">
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-4 flex justify-between items-center transition-colors">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
            >
              <Menu size={22} />
            </button>
            <h1 className="text-xl font-black text-slate-800 dark:text-white capitalize tracking-tight">
              {currentView}
            </h1>
            <span className="hidden sm:inline px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-tighter">
              Live
            </span>
          </div>
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-transparent focus:bg-white dark:focus:bg-slate-950 focus:border-emerald-300 dark:focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900/20 rounded-full text-xs outline-none transition-all w-36 sm:w-64 text-slate-800 dark:text-slate-200"
              />
            </div>
            <button
              onClick={() => setCurrentView("settings")}
              className="hidden sm:flex w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center text-slate-500 dark:text-slate-400 hover:text-emerald-600 transition-colors"
            >
              <UserIcon size={18} />
            </button>
          </div>
        </header>

        <div className="p-4 sm:p-8 max-w-7xl mx-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
              <Loader2
                size={40}
                className="animate-spin mb-4 text-emerald-500"
              />
              <p className="font-bold uppercase tracking-widest text-[10px] animate-pulse">
                Syncing with Node.js...
              </p>
            </div>
          ) : (
            <>
              {currentView === "dashboard" && (
                <DashboardView
                  applications={applications}
                  onEdit={openEditModal}
                  currentGoal={currentGoal}
                />
              )}
              {currentView === "applications" && (
                <ApplicationsView
                  applications={filteredApplications}
                  onEdit={openEditModal}
                  onDelete={handleDeleteApplication}
                  onBulkDelete={handleBulkDelete}
                  onBulkStatusUpdate={handleBulkStatusUpdate}
                  onImport={() => setIsImportModalOpen(true)}
                  deletingIds={deletingIds}
                />
              )}
              {currentView === "analytics" && (
                <AnalyticsView applications={filteredApplications} />
              )}
              {currentView === "settings" && (
                <SettingsView
                  user={user}
                  onUpdateUser={handleUpdateUser}
                  onLogout={handleLogout}
                  currentGoal={currentGoal}
                  goalHistory={goalHistory}
                  onUpdateGoal={updateGoal}
                  onUpdateGoalMet={updateGoalMet}
                />
              )}
            </>
          )}
        </div>
      </main>

      <JobModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveApplication}
        editingJob={editingJob}
        isSaving={isSaving}
      />

      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="Sign Out"
        message="Are you sure you want to sign out? You'll need to log in again to access your applications."
        confirmLabel="Sign Out"
        cancelLabel="Stay"
        variant="danger"
        onConfirm={() => {
          setShowLogoutConfirm(false);
          handleLogout();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      <BulkImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleBulkImport}
      />

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 lg:hidden">
        <div className="flex items-center justify-around py-2">
          {([
            { view: "dashboard" as ViewType, icon: LayoutDashboard, label: "Home" },
            { view: "applications" as ViewType, icon: Briefcase, label: "Apps" },
            { view: "analytics" as ViewType, icon: BarChart3, label: "Analytics" },
            { view: "settings" as ViewType, icon: Settings, label: "Settings" },
          ]).map(({ view, icon: Icon, label }) => (
            <button
              key={view}
              onClick={() => setCurrentView(view)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                currentView === view
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-slate-400 dark:text-slate-500"
              }`}
            >
              <Icon size={20} />
              <span className="text-[10px] font-bold">{label}</span>
            </button>
          ))}
          <button
            onClick={openAddModal}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5"
          >
            <div className="w-9 h-9 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-200/50 dark:shadow-none -mt-4">
              <Plus size={20} />
            </div>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default App;
