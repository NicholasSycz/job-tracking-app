// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

// Storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  TENANT_ID: 'tenant_id',
  USER: 'user',
  SETTINGS: 'extension_settings',
} as const;

// Default extension settings
export const DEFAULT_SETTINGS = {
  defaultReminderDays: 7,
  notificationsEnabled: true,
  autoScrapeEnabled: true,
  darkMode: false,
};

// Alarm names
export const ALARM_NAMES = {
  CHECK_REMINDERS: 'check_reminders',
} as const;

// Alarm intervals (in minutes)
export const ALARM_INTERVALS = {
  CHECK_REMINDERS: 15,
} as const;

// Reminder preset options (in days)
export const REMINDER_PRESETS = [
  { label: '3 days', value: 3 },
  { label: '1 week', value: 7 },
  { label: '2 weeks', value: 14 },
  { label: 'Custom', value: -1 },
] as const;

// Status colors for UI
export const STATUS_COLORS = {
  INTERESTED: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
  APPLIED: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
  INTERVIEWING: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400' },
  OFFER: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400' },
  REJECTED: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
  GHOSTED: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-500 dark:text-slate-400' },
} as const;

// Job site patterns for detection
export const JOB_SITE_PATTERNS = {
  linkedin: [
    /linkedin\.com\/jobs\/view\//,
    /linkedin\.com\/jobs\/collections\//,
  ],
  indeed: [
    /indeed\.com\/viewjob/,
    /indeed\.com\/jobs\?/,
    /indeed\.com\/rc\/clk/,
  ],
  glassdoor: [
    /glassdoor\.com\/job-listing\//,
    /glassdoor\.com\/Job\//,
  ],
} as const;
