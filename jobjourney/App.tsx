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
} from "lucide-react";
import { JobApplication, ApplicationStatus, ViewType, AuthUser } from "./types";
import DashboardView from "./components/DashboardView";
import ApplicationsView from "./components/ApplicationsView";
import AnalyticsView from "./components/AnalyticsView";
import LoginView from "./components/LoginView";
import JobModal from "./components/JobModal";
import { apiService } from "./services/apiService";

const App: React.FC = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return (
      localStorage.getItem("theme") === "dark" ||
      (!("theme" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
  });
  const [currentView, setCurrentView] = useState<ViewType>("dashboard");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobApplication | undefined>();

  const API_BASE_URL = "http://localhost:4000";

  // Handle Login
  const handleLogin = (authenticatedUser: AuthUser) => {
    setUser(authenticatedUser);
    setIsLoading(true);
    loadData();
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    setUser(null);
    setApplications([]);
  };

  // Fetch from Node.js/Prisma Backend on mount if user is set
  const loadData = async () => {
    try {
      const data = await apiService.fetchApplications();
      setApplications(data);
    } catch (err) {
      console.error("Backend connection failed.", err);
      setApplications([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  useEffect(() => {
    const restoreSession = async () => {
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
          setUser(null);
          return;
        }

        const data = await res.json();
        setUser(data.user as AuthUser);

        // now fetch the real data
        await loadData();
      } catch (err) {
        console.error("Failed to restore session:", err);
        // optional: keep token, but user stays logged out if backend unreachable
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddApplication = async (newApp: JobApplication) => {
    try {
      const savedApp = await apiService.createApplication(newApp);
      setApplications((prev) => [savedApp, ...prev]);
    } catch (err) {
      console.error("Failed to save to backend", err);
    }
  };

  const handleUpdateApplication = async (updatedApp: JobApplication) => {
    try {
      const savedApp = await apiService.updateApplication(
        updatedApp.id,
        updatedApp
      );
      setApplications((prev) =>
        prev.map((app) => (app.id === savedApp.id ? savedApp : app))
      );
    } catch (err) {
      console.error("Failed to update backend", err);
    }
  };

  const handleDeleteApplication = async (id: string) => {
    try {
      await apiService.deleteApplication(id);
      setApplications((prev) => prev.filter((app) => app.id !== id));
    } catch (err) {
      console.error("Failed to delete from backend", err);
    }
  };

  const openAddModal = () => {
    setEditingJob(undefined);
    setIsModalOpen(true);
  };

  const openEditModal = (job: JobApplication) => {
    setEditingJob(job);
    setIsModalOpen(true);
  };

  if (!user) {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <div
      className={`flex h-screen overflow-hidden transition-colors duration-300 ${
        darkMode
          ? "dark bg-slate-900 text-slate-100"
          : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col transition-colors duration-300">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-emerald-200/50 dark:shadow-none">
              J
            </div>
            <span className="text-xl font-black text-slate-800 dark:text-white tracking-tight">
              JobJourney
            </span>
          </div>

          <nav className="space-y-1.5">
            <button
              onClick={() => setCurrentView("dashboard")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                currentView === "dashboard"
                  ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50"
              }`}
            >
              <LayoutDashboard
                size={20}
                className={
                  currentView === "dashboard"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : ""
                }
              />
              <span className="text-sm">Dashboard</span>
            </button>
            <button
              onClick={() => setCurrentView("applications")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                currentView === "applications"
                  ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50"
              }`}
            >
              <Briefcase
                size={20}
                className={
                  currentView === "applications"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : ""
                }
              />
              <span className="text-sm">Applications</span>
            </button>
            <button
              onClick={() => setCurrentView("analytics")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                currentView === "analytics"
                  ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50"
              }`}
            >
              <BarChart3
                size={20}
                className={
                  currentView === "analytics"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : ""
                }
              />
              <span className="text-sm">Analytics</span>
            </button>
          </nav>
        </div>

        <div className="mt-auto p-4 space-y-2">
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-3 mb-4 flex items-center gap-3 border border-slate-100 dark:border-slate-800">
            <img
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                user.email
              )}`}
              className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/40"
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
            onClick={() => setDarkMode(!darkMode)}
            className="w-full flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl transition-all hover:bg-slate-50 dark:hover:bg-slate-900"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            <span className="font-bold text-xs uppercase tracking-widest">
              {darkMode ? "Light" : "Dark"}
            </span>
          </button>

          <button
            onClick={openAddModal}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-100 dark:shadow-none group"
          >
            <Plus
              size={18}
              className="group-hover:rotate-90 transition-transform"
            />
            <span className="text-sm">New Opportunity</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-rose-500 dark:text-rose-400/80 hover:bg-rose-50 dark:hover:bg-rose-900/20 py-2.5 rounded-xl transition-all font-bold text-xs uppercase tracking-widest"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto scroll-smooth">
        <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-8 py-4 flex justify-between items-center transition-colors">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black text-slate-800 dark:text-white capitalize tracking-tight">
              {currentView}
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-tighter">
              Live
            </span>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative hidden md:block">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Search your journey..."
                className="pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-transparent focus:bg-white dark:focus:bg-slate-950 focus:border-emerald-300 dark:focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900/20 rounded-full text-xs outline-none transition-all w-64 text-slate-800 dark:text-slate-200"
              />
            </div>
            <button className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-emerald-600 transition-colors">
              <UserIcon size={18} />
            </button>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
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
                />
              )}
              {currentView === "applications" && (
                <ApplicationsView
                  applications={applications}
                  onEdit={openEditModal}
                  onDelete={handleDeleteApplication}
                />
              )}
              {currentView === "analytics" && (
                <AnalyticsView applications={applications} />
              )}
            </>
          )}
        </div>
      </main>

      <JobModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={editingJob ? handleUpdateApplication : handleAddApplication}
        editingJob={editingJob}
      />
    </div>
  );
};

export default App;
