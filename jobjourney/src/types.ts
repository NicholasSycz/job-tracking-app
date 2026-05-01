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

export type ViewType = 'dashboard' | 'applications' | 'analytics' | 'messages' | 'settings';

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
