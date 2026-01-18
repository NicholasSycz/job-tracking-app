export enum ApplicationStatus {
  INTERESTED = 'INTERESTED',
  APPLIED = 'APPLIED',
  INTERVIEWING = 'INTERVIEWING',
  OFFER = 'OFFER',
  REJECTED = 'REJECTED',
  GHOSTED = 'GHOSTED'
}


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
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export type ViewType = 'dashboard' | 'applications' | 'analytics' | 'settings';
