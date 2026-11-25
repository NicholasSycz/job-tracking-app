import React, { useEffect, useState } from 'react';
import { Bell, Send } from 'lucide-react';
import { WebPushConfig, NotificationPreferences } from '../../types';
import { apiService } from '../../services/apiService';
import { currentPushSubscription, disablePush, enablePush, pushUnavailableReason } from '../../services/webPush';
import { useToast } from '../../contexts/ToastContext';
import SettingsSection from './SettingsSection';

const NotificationsSection: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [config, setConfig] = useState<WebPushConfig | null>(null);
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const unavailable = pushUnavailableReason();

  useEffect(() => {
    let active = true;
    Promise.all([apiService.fetchPushConfig(), currentPushSubscription()])
      .then(([settings, subscription]) => {
        if (!active) return;
        setConfig(settings);
        setEndpoint(subscription && settings.endpoints.includes(subscription.endpoint) ? subscription.endpoint : null);
      })
      .catch(() => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, []);

  const toggleDevice = async () => {
    setBusy(true);
    try {
      if (endpoint) {
        await disablePush();
        setEndpoint(null);
        showSuccess('Notifications disabled', 'This device will no longer receive notifications.');
      } else if (config?.publicKey) {
        const subscription = await enablePush(config.publicKey);
        setEndpoint(subscription.endpoint);
        showSuccess('Notifications enabled', 'JobJourney can now send notifications to this device.');
      }
    } catch (error) {
      showError('Notification setup failed', error instanceof Error ? error.message : 'Please try again.');
    } finally { setBusy(false); }
  };

  const savePreference = async (key: keyof NotificationPreferences) => {
    if (!config) return;
    setBusy(true);
    try {
      const preferences = await apiService.updateNotificationPreferences({
        ...config.preferences, [key]: !config.preferences[key],
      });
      setConfig(previous => previous && { ...previous, preferences });
    } catch (error) {
      showError('Unable to save preferences', error instanceof Error ? error.message : 'Please try again.');
    } finally { setBusy(false); }
  };

  const sendTest = async () => {
    if (!endpoint) return;
    setBusy(true);
    try {
      await apiService.testPush(endpoint);
      showSuccess('Test sent', 'Check this device’s notifications.');
    } catch (error) {
      showError('Test failed', error instanceof Error ? error.message : 'Please try again.');
    } finally { setBusy(false); }
  };

  return (
    <SettingsSection
      icon={<Bell className="text-blue-600 dark:text-blue-400" size={20} />}
      iconClass="bg-blue-100 dark:bg-blue-900/30"
      title="Notifications"
      description="Get job updates and reminders on your phone"
    >
      <div className="space-y-5">
        {loadError && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">Unable to load notification settings. Reopen Settings to try again.</p>}
        {!config && !loadError && <p className="text-sm text-slate-500">Loading notification settings…</p>}
        {config && (
          <>
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {endpoint ? 'Notifications are enabled on this device.' : 'Notifications are off on this device.'}
              </p>
              {!config.configured && <p className="text-sm text-slate-500 dark:text-slate-400">Web push is not set up on your JobJourney server yet.</p>}
              {unavailable && <p className="text-sm text-slate-500 dark:text-slate-400">{unavailable}</p>}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={toggleDevice}
                  disabled={busy || (!endpoint && (!config.configured || !!unavailable))}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {busy ? 'Working…' : endpoint ? 'Disable on this device' : 'Enable on this device'}
                </button>
                {endpoint && <button onClick={sendTest} disabled={busy || !!unavailable} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-50">
                  <Send size={16} /> Send test notification
                </button>}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Enable each phone separately. Job-added and job-updated alerts cover your shared workspaces. Follow-up and interview reminders are for applications you created. Signing out turns off notifications on this device.</p>
            </div>
            <div className="border-t border-slate-100 dark:border-slate-800 pt-2">
              {([
                ['jobsAdded', 'Jobs added', 'When anyone in your workspace adds a job.'],
                ['jobsUpdated', 'Jobs updated', 'When anyone in your workspace changes a job.'],
                ['followUps', 'Application follow-ups', 'One reminder when an application’s follow-up date is due.'],
                ['interviews', 'Interview reminders', 'One reminder for each interview round within the next 24 hours.'],
              ] as const).map(([key, label, description]) => (
                <div key={key} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-200">{label}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
                  </div>
                  <button role="switch" aria-checked={config.preferences[key]} aria-label={label} disabled={busy} onClick={() => savePreference(key)}
                    className={`relative shrink-0 w-12 h-6 rounded-full transition-colors disabled:opacity-50 ${config.preferences[key] ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                    <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${config.preferences[key] ? 'translate-x-6' : ''}`} />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </SettingsSection>
  );
};

export default React.memo(NotificationsSection);
