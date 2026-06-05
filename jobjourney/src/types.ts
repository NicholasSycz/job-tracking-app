export enum ApplicationStatus {
  INTERESTED = 'INTERESTED',
  APPLIED = 'APPLIED',
  INTERVIEWING = 'INTERVIEWING',
  OFFER = 'OFFER',
  REJECTED = 'REJECTED',
  GHOSTED = 'GHOSTED'
}

export enum InterviewOutcome {
  PENDING = 'PENDING',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  DECLINED = 'DECLINED',
}


export type JobSource = 'other' | 'linkedin' | 'indeed' | 'ycombinator' | 'gittap' | 'gaijinpot' | 'weworkremotely' | 'extension';

export interface InterviewRound {
  id: string;                   // stable id (crypto.randomUUID())
  type: string;                 // value from configurable interview types; '' = unspecified
  scheduledAt: string;          // ISO datetime
  outcome?: InterviewOutcome;
  notes?: string;
}

export interface JobApplication {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  dateApplied: string;
  description: string;
  location: string;
  createdByUserId: string;
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
  interviewOutcome?: InterviewOutcome;
  interviewNotes?: string;
  interviews?: InterviewRound[];
  recruitingService?: string;
}

export type TenantRole = 'owner' | 'member';

export type JobApplicationCreateInput = Omit<JobApplication, 'id' | 'createdByUserId'>;

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  role: TenantRole | null;
}

export interface MonthlyGoal {
  id: string;
  userId: string;
  month: number;
  year: number;
  target: number;
  met: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ViewType = 'dashboard' | 'applications' | 'analytics' | 'calendar' | 'messages' | 'settings';

export enum EventType {
  INTERVIEW = 'INTERVIEW',
  RECRUITER_CALL = 'RECRUITER_CALL',
  NETWORKING = 'NETWORKING',
  OTHER = 'OTHER',
}

export interface CalendarEvent {
  id: string;
  tenantId: string;
  createdByUserId: string;
  title: string;
  description?: string;
  startAt: string;
  endAt?: string;
  type: EventType;
  jobId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  applicationGoal: number | null;
  jobSources: { value: string; label: string }[] | null;
  recruitingServices: string[] | null;
  interviewTypes: { value: string; label: string }[] | null;
}

export interface TenantMember {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  role: TenantRole;
  joinedAt: string;
}

export interface TenantInvite {
  id: string;
  tenantId: string;
  email: string;
  token: string;
  link: string;
  role: TenantRole;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  deletedAt: string | null;
}

export interface ConversationParticipantSummary {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface Conversation {
  id: string;
  tenantId: string;
  otherParticipants: ConversationParticipantSummary[];
  lastMessage: Message | null;
  lastMessageAt: string | null;
  unreadCount: number;
}
