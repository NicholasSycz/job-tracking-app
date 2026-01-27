import React, { useState, useEffect } from 'react';
import { getSettings, setSettings } from '../../shared/storage';
import { REMINDER_PRESETS } from '../../shared/constants';
import type { ExtensionSettings } from '../../shared/types';

const SettingsView: React.FC = () => {
  const [settings, setLocalSettings] = useState<ExtensionSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const s = await getSettings();
    setLocalSettings(s);
  };

  const updateSetting = async <K extends keyof ExtensionSettings>(
    key: K,
    value: ExtensionSettings[K]
  ) => {
    if (!settings) return;

    const newSettings = { ...settings, [key]: value };
    setLocalSettings(newSettings);
    setSaving(true);

    try {
      await setSettings({ [key]: value });
    } catch (error) {
      console.error('Failed to save setting:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Notifications */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Notifications</h3>

        <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg cursor-pointer">
          <span className="text-sm text-slate-700 dark:text-slate-300">Enable reminders</span>
          <input
            type="checkbox"
            checked={settings.notificationsEnabled}
            onChange={(e) => updateSetting('notificationsEnabled', e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500"
          />
        </label>
      </div>

      {/* Default Reminder */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Default Reminder</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          When saving a job with reminder enabled
        </p>

        <div className="flex gap-2 flex-wrap">
          {REMINDER_PRESETS.filter((p) => p.value > 0).map((preset) => (
            <button
              key={preset.value}
              onClick={() => updateSetting('defaultReminderDays', preset.value)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                settings.defaultReminderDays === preset.value
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Auto Scrape */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Job Detection</h3>

        <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg cursor-pointer">
          <div>
            <span className="text-sm text-slate-700 dark:text-slate-300">Auto-detect jobs</span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Show save button on job pages
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.autoScrapeEnabled}
            onChange={(e) => updateSetting('autoScrapeEnabled', e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500"
          />
        </label>
      </div>

      {/* Version Info */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
        <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
          JobJourney Extension v1.0.0
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-1">
          <a
            href="http://localhost:3000"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-600 hover:text-emerald-700"
          >
            Open Dashboard
          </a>
        </p>
      </div>

      {saving && (
        <div className="fixed bottom-4 right-4 bg-slate-800 text-white text-xs px-3 py-1.5 rounded-full">
          Saving...
        </div>
      )}
    </div>
  );
};

export default SettingsView;
