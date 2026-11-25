import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { JobApplication, ViewType } from "./types";
import DashboardView from "./components/DashboardView";
import ApplicationsView from "./components/ApplicationsView";
import AnalyticsView from "./components/AnalyticsView";
import MessagesView from "./components/MessagesView";
import CalendarView from "./components/CalendarView";
import SettingsView from "./components/SettingsView";
import LoginView from "./components/LoginView";
import JobModal from "./components/JobModal";
import ConfirmModal from "./components/ConfirmModal";
import BulkImportModal from "./components/BulkImportModal";
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import MobileBottomNav from "./components/layout/MobileBottomNav";
import { ToastProvider, useToast } from "./contexts/ToastContext";
import { useTheme } from "./contexts/ThemeContext";
import { useAuth } from "./hooks/useAuth";
import { useApplications } from "./hooks/useApplications";
import { useGoals } from "./hooks/useGoals";
import { useSettings } from "./hooks/useSettings";
import { useCalendarEvents } from "./hooks/useCalendarEvents";
import { useUnreadCount } from "./hooks/useUnreadCount";

const AppSession: React.FC<{ onSessionEnd: () => void }> = ({ onSessionEnd }) => {
  const { showError } = useToast();
  const { theme, toggleTheme } = useTheme();
  const darkMode = theme === "dark";

  const {
    applications,
    isSaving,
    deletingIds,
    load: loadApplications,
    clear: clearApplications,
    save: saveApplication,
    remove: removeApplication,
    bulkDelete,
    bulkStatusUpdate,
    bulkImport,
  } = useApplications();

  const {
    currentGoal,
    goalHistory,
    loadCurrent: loadCurrentGoal,
    loadHistory: loadGoalHistory,
    updateGoal,
    updateGoalMet,
  } = useGoals();

  const { userSettings, setUserSettings, load: loadSettings } = useSettings();

  const {
    calendarEvents,
    load: loadEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  } = useCalendarEvents();

  const [currentView, setCurrentView] = useState<ViewType>("dashboard");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobApplication | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  const loadData = useCallback(async () => {
    try {
      await loadApplications();
      if (!active.current) return;

      // Goals, settings and calendar events load independently so one failing
      // request doesn't blank out the others (e.g. a failed events fetch must
      // not wipe userSettings and make custom job sources revert to defaults).
      const results = await Promise.allSettled([
        loadCurrentGoal(),
        loadGoalHistory(),
        loadSettings(),
        loadEvents(),
      ]);

      const failed = results.filter(
        (r): r is PromiseRejectedResult => r.status === "rejected"
      );
      if (!active.current) return;
      if (failed.length) {
        failed.forEach((r) =>
          console.error("Failed to load goals/settings/events:", r.reason)
        );
        showError("Partial load", "Some of your data couldn't be loaded. Please refresh.");
      }
    } catch (err) {
      if (!active.current) return;
      console.error("Backend connection failed.", err);
      showError("Connection Failed", "Unable to load your applications. Please try again.");
      clearApplications();
    }
  }, [
    loadApplications,
    clearApplications,
    loadCurrentGoal,
    loadGoalHistory,
    loadSettings,
    loadEvents,
    showError,
  ]);

  const { user, isLoading, pendingInviteToken, resetToken, login, logout, updateUser } = useAuth({
    onAuthenticated: loadData,
  });

  const { unreadCount, refresh: refreshUnreadCount } = useUnreadCount(user);

  const filteredApplications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return applications;
    return applications.filter(
      (app) =>
        app.company.toLowerCase().includes(query) ||
        app.role.toLowerCase().includes(query) ||
        app.location?.toLowerCase().includes(query) ||
        app.notes?.toLowerCase().includes(query) ||
        app.description?.toLowerCase().includes(query)
    );
  }, [applications, searchQuery]);

  const openAddModal = useCallback(() => {
    setEditingJob(undefined);
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((job: JobApplication) => {
    setEditingJob(job);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => setIsModalOpen(false), []);

  const handleSignOut = useCallback(() => {
    logout();
    onSessionEnd();
  }, [logout, onSessionEnd]);

  const openImportModal = useCallback(() => setIsImportModalOpen(true), []);

  if (!user) {
    return <LoginView onLogin={login} inviteToken={pendingInviteToken} initialResetToken={resetToken} />;
  }

  return (
    <div className="flex h-screen overflow-hidden transition-colors duration-300 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <Sidebar
        user={user}
        currentView={currentView}
        unreadCount={unreadCount}
        isOpen={isSidebarOpen}
        darkMode={darkMode}
        onNavigate={setCurrentView}
        onClose={() => setIsSidebarOpen(false)}
        onToggleTheme={toggleTheme}
        onAddApplication={openAddModal}
        onSignOut={() => setShowLogoutConfirm(true)}
      />

      <main className="flex-1 overflow-y-auto scroll-smooth dark:bg-slate-950 pb-16 lg:pb-0">
        <Header
          currentView={currentView}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onOpenSettings={() => setCurrentView("settings")}
        />

        <div className="p-4 sm:p-8 max-w-7xl mx-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
              <Loader2 size={40} className="animate-spin mb-4 text-emerald-500" />
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
                  currentUser={user}
                  onEdit={openEditModal}
                  onDelete={removeApplication}
                  onBulkDelete={bulkDelete}
                  onBulkStatusUpdate={bulkStatusUpdate}
                  onImport={openImportModal}
                  deletingIds={deletingIds}
                />
              )}
              {currentView === "analytics" && (
                <AnalyticsView applications={filteredApplications} />
              )}
              {currentView === "calendar" && (
                <CalendarView
                  applications={applications}
                  calendarEvents={calendarEvents}
                  onEditJob={openEditModal}
                  onCreateEvent={createEvent}
                  onUpdateEvent={updateEvent}
                  onDeleteEvent={deleteEvent}
                />
              )}
              {currentView === "messages" && (
                <MessagesView currentUser={user} onUnreadChange={refreshUnreadCount} />
              )}
              {currentView === "settings" && (
                <SettingsView
                  user={user}
                  onUpdateUser={updateUser}
                  currentGoal={currentGoal}
                  goalHistory={goalHistory}
                  onUpdateGoal={updateGoal}
                  onUpdateGoalMet={updateGoalMet}
                  userSettings={userSettings}
                  onUpdateSettings={setUserSettings}
                />
              )}
            </>
          )}
        </div>
      </main>

      <JobModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={saveApplication}
        editingJob={editingJob}
        isSaving={isSaving}
        jobSources={userSettings?.jobSources ?? null}
        recruitingServices={userSettings?.recruitingServices ?? null}
        interviewTypes={userSettings?.interviewTypes ?? null}
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
          handleSignOut();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      <BulkImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={bulkImport}
      />

      <MobileBottomNav
        currentView={currentView}
        unreadCount={unreadCount}
        onNavigate={setCurrentView}
        onAddApplication={openAddModal}
      />
    </div>
  );
};

const App: React.FC = () => {
  const [sessionKey, setSessionKey] = useState(0);
  const endSession = useCallback(() => setSessionKey(key => key + 1), []);

  // Discard user data, modals and notifications together. Late responses belong
  // to the unmounted session and cannot populate the next account's state.
  return (
    <ToastProvider key={sessionKey}>
      <AppSession onSessionEnd={endSession} />
    </ToastProvider>
  );
};

export default App;
