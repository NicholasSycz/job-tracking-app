export enum ApplicationStatus {
  INTERESTED = 'INTERESTED',
  APPLIED = 'APPLIED',
  INTERVIEWING = 'INTERVIEWING',
  OFFER = 'OFFER',
  REJECTED = 'REJECTED',
  GHOSTED = 'GHOSTED'
}


export type JobSource = 'linkedin' | 'indeed' | 'glassdoor' | 'manual' | 'extension';

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
  interviewDate?: string;
  interviewReminderEnabled?: boolean;
  interviewReminderSentAt?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export type ViewType = 'dashboard' | 'applications' | 'analytics' | 'settings';
