// Application status enum (matches backend)
export enum ApplicationStatus {
  INTERESTED = 'INTERESTED',
  APPLIED = 'APPLIED',
  INTERVIEWING = 'INTERVIEWING',
  OFFER = 'OFFER',
  REJECTED = 'REJECTED',
  GHOSTED = 'GHOSTED',
}

// Scraped job data from content scripts
export interface ScrapedJobData {
  company: string;
  role: string;
  location?: string;
  salary?: string;
  description?: string;
  link: string;
  externalJobId?: string;
  source: JobSource;
}

// Job source enum
export type JobSource = 'linkedin' | 'indeed' | 'glassdoor' | 'manual' | 'extension';

// Full job application (matches backend response)
export interface JobApplication {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  dateApplied: string;
  description: string;
  location: string;
  salary?: string;
  link?: string;
  notes?: string;
  source?: JobSource;
  externalJobId?: string;
  followUpDate?: string;
  reminderEnabled?: boolean;
  reminderSentAt?: string;
}

// Create job request (for API)
export interface CreateJobRequest {
  company: string;
  role: string;
  status?: ApplicationStatus;
  dateApplied?: string;
  description?: string;
  location?: string;
  salary?: string;
  link?: string;
  notes?: string;
  source?: JobSource;
  externalJobId?: string;
  followUpDate?: string;
  reminderEnabled?: boolean;
}

// Auth user
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

// Login response
export interface LoginResponse {
  token: string;
  user: AuthUser;
  tenantId: string;
}

// Auth state stored in chrome.storage
export interface AuthState {
  token: string | null;
  user: AuthUser | null;
  tenantId: string | null;
  isAuthenticated: boolean;
}

// Extension settings
export interface ExtensionSettings {
  defaultReminderDays: number;
  notificationsEnabled: boolean;
  autoScrapeEnabled: boolean;
  darkMode: boolean;
}

// Message types for communication between content scripts and background worker
export type MessageType =
  | 'SCRAPE_JOB'
  | 'SAVE_JOB'
  | 'CHECK_DUPLICATE'
  | 'GET_AUTH_STATE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'GET_SETTINGS'
  | 'UPDATE_SETTINGS'
  | 'SET_REMINDER'
  | 'SNOOZE_REMINDER'
  | 'GET_RECENT_JOBS'
  | 'UPDATE_JOB_STATUS';

export interface Message<T = unknown> {
  type: MessageType;
  payload?: T;
}

export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Reminder data
export interface ReminderData {
  applicationId: string;
  company: string;
  role: string;
  followUpDate: string;
}
