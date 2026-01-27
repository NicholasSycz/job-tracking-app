import React, { useState, useEffect } from 'react';
import { getAuthState } from '../shared/storage';
import type { AuthState, ScrapedJobData } from '../shared/types';
import LoginView from './components/LoginView';
import MainView from './components/MainView';

const App: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [loading, setLoading] = useState(true);
  const [scrapedJob, setScrapedJob] = useState<ScrapedJobData | null>(null);

  useEffect(() => {
    loadAuthState();
    requestScrapedData();
  }, []);

  const loadAuthState = async () => {
    try {
      const state = await getAuthState();
      setAuthState(state);
    } catch (error) {
      console.error('Failed to load auth state:', error);
      setAuthState({
        token: null,
        user: null,
        tenantId: null,
        isAuthenticated: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const requestScrapedData = async () => {
    try {
      // Request scraped data from content script on current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_JOB' }, (response) => {
          if (response?.success && response.data) {
            setScrapedJob(response.data);
          }
        });
      }
    } catch (error) {
      // Content script may not be loaded on this page - that's ok
      console.log('Could not request scraped data:', error);
    }
  };

  const handleLoginSuccess = (state: AuthState) => {
    setAuthState(state);
  };

  const handleLogout = () => {
    setAuthState({
      token: null,
      user: null,
      tenantId: null,
      isAuthenticated: false,
    });
  };

  if (loading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!authState?.isAuthenticated) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <MainView
      authState={authState}
      scrapedJob={scrapedJob}
      onLogout={handleLogout}
      onJobSaved={() => setScrapedJob(null)}
    />
  );
};

export default App;
