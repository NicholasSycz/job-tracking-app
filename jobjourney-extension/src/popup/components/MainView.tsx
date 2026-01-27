import React, { useState } from 'react';
import { clearAuthState } from '../../shared/storage';
import type { AuthState, ScrapedJobData, ApplicationStatus } from '../../shared/types';
import QuickAddForm from './QuickAddForm';
import SettingsView from './SettingsView';

interface Props {
  authState: AuthState;
  scrapedJob: ScrapedJobData | null;
  onLogout: () => void;
  onJobSaved: () => void;
}

type Tab = 'save' | 'settings';

const MainView: React.FC<Props> = ({ authState, scrapedJob, onLogout, onJobSaved }) => {
  const [activeTab, setActiveTab] = useState<Tab>('save');

  const handleLogout = async () => {
    await clearAuthState();
    onLogout();
  };

  return (
    <div className="min-h-[500px] bg-white dark:bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-100 dark:border-slate-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-800 dark:text-white">JobJourney</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">{authState.user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition-colors"
            title="Sign out"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('save')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'save'
                ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Save Job
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'settings'
                ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Settings
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'save' && (
          <QuickAddForm
            scrapedJob={scrapedJob}
            authState={authState}
            onJobSaved={onJobSaved}
          />
        )}
        {activeTab === 'settings' && <SettingsView />}
      </div>
    </div>
  );
};

export default MainView;
