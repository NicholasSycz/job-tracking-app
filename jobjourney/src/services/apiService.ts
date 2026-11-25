import {
  JobApplication,
  JobApplicationCreateInput,
  MonthlyGoal,
  TenantMember,
  TenantInvite,
  TenantRole,
  Conversation,
  Message,
  UserSettings,
  CalendarEvent,
  EventType,
} from "../types";
import { API_BASE_URL, API_URL } from "../config";

/**
 * Error carrying the server's own message, status and error code, so callers
 * can surface something more useful than "Failed to update application".
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;

    if (body && typeof body === "object") {
      const payload = body as Record<string, unknown>;
      if (typeof payload.code === "string") this.code = payload.code;
      if ("details" in payload) this.details = payload.details;
    }
  }
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("auth_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function getTenantId(): string {
  const tenantId = localStorage.getItem("tenant_id");
  if (!tenantId) {
    throw new Error("No tenant ID found. Please log in again.");
  }
  return tenantId;
}

// Resolved at call time so a missing tenant still throws before the request.
function tenantUrl(suffix: string): string {
  return `${API_URL}/tenants/${getTenantId()}${suffix}`;
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

// The API sends { error, code, details }; `message` is tolerated as a fallback.
function errorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    const { error, message } = body as Record<string, unknown>;
    if (typeof error === "string" && error.trim()) return error;
    if (typeof message === "string" && message.trim()) return message;
  }

  // A short plain-text body is usually a real message; an HTML page is not.
  if (typeof body === "string") {
    const text = body.trim();
    if (text && text.length < 200 && !text.startsWith("<")) return text;
  }

  return fallback;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Used only when the server gave us nothing better. */
  fallback: string;
}

async function request<T>(
  url: string,
  { method = "GET", body, fallback }: RequestOptions
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: getAuthHeaders(),
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  const payload = await readBody(response);

  if (!response.ok) {
    throw new ApiError(errorMessage(payload, fallback), response.status, payload);
  }

  return payload as T;
}

export const apiService = {
  async fetchApplications(): Promise<JobApplication[]> {
    return request(tenantUrl("/applications"), {
      fallback: "Failed to fetch applications",
    });
  },

  async createApplication(
    application: JobApplicationCreateInput
  ): Promise<JobApplication> {
    return request(tenantUrl("/applications"), {
      method: "POST",
      body: application,
      fallback: "Failed to create application",
    });
  },

  async updateApplication(
    id: string,
    updates: Partial<JobApplication>
  ): Promise<JobApplication> {
    return request(tenantUrl(`/applications/${id}`), {
      method: "PUT",
      body: updates,
      fallback: "Failed to update application",
    });
  },

  async deleteApplication(id: string): Promise<void> {
    await request<void>(tenantUrl(`/applications/${id}`), {
      method: "DELETE",
      fallback: "Failed to delete application",
    });
  },

  async bulkDeleteApplications(ids: string[]): Promise<{ deleted: number }> {
    return request(tenantUrl("/applications/bulk"), {
      method: "DELETE",
      body: { ids },
      fallback: "Failed to delete applications",
    });
  },

  async bulkUpdateStatus(ids: string[], status: string): Promise<{ updated: number }> {
    return request(tenantUrl("/applications/bulk"), {
      method: "PATCH",
      body: { ids, status },
      fallback: "Failed to update applications",
    });
  },

  async bulkImportApplications(
    applications: Partial<JobApplication>[]
  ): Promise<{ imported: number; applications: JobApplication[] }> {
    return request(tenantUrl("/applications/bulk"), {
      method: "POST",
      body: { applications },
      fallback: "Failed to import applications",
    });
  },

  // Monthly Goals
  async fetchCurrentGoal(): Promise<MonthlyGoal> {
    return request(`${API_URL}/goals/current`, {
      fallback: "Failed to fetch current goal",
    });
  },

  async updateCurrentGoal(target: number): Promise<MonthlyGoal> {
    return request(`${API_URL}/goals/current`, {
      method: "PUT",
      body: { target },
      fallback: "Failed to update goal",
    });
  },

  async fetchGoalHistory(): Promise<MonthlyGoal[]> {
    return request(`${API_URL}/goals/history`, {
      fallback: "Failed to fetch goal history",
    });
  },

  async updateGoalMet(goalId: string, met: boolean): Promise<MonthlyGoal> {
    return request(`${API_URL}/goals/${goalId}/met`, {
      method: "PATCH",
      body: { met },
      fallback: "Failed to update goal status",
    });
  },

  // Tenant members
  async fetchTenantMembers(): Promise<TenantMember[]> {
    return request(tenantUrl("/members"), {
      fallback: "Failed to fetch tenant members",
    });
  },

  // Invites
  async fetchInvites(): Promise<TenantInvite[]> {
    return request(tenantUrl("/invites"), {
      fallback: "Failed to fetch invites",
    });
  },

  async createInvite(email: string, role: TenantRole = "member"): Promise<TenantInvite> {
    return request(tenantUrl("/invites"), {
      method: "POST",
      body: { email, role },
      fallback: "Failed to create invite",
    });
  },

  async revokeInvite(inviteId: string): Promise<void> {
    await request<void>(tenantUrl(`/invites/${inviteId}`), {
      method: "DELETE",
      fallback: "Failed to revoke invite",
    });
  },

  async updateMemberRole(
    userId: string,
    role: TenantRole
  ): Promise<{ id: string; role: TenantRole }> {
    return request(tenantUrl(`/members/${userId}`), {
      method: "PATCH",
      body: { role },
      fallback: "Failed to update member role",
    });
  },

  async removeMember(userId: string): Promise<void> {
    await request<void>(tenantUrl(`/members/${userId}`), {
      method: "DELETE",
      fallback: "Failed to remove member",
    });
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await request<void>(`${API_BASE_URL}/auth/change-password`, {
      method: "POST",
      body: { currentPassword, newPassword },
      fallback: "Failed to change password",
    });
  },

  async acceptInvite(token: string): Promise<{ tenantId: string }> {
    return request(`${API_BASE_URL}/auth/invite/accept`, {
      method: "POST",
      body: { token },
      fallback: "Failed to accept invite",
    });
  },

  // Conversations + messages
  async fetchConversations(): Promise<Conversation[]> {
    return request(tenantUrl("/conversations"), {
      fallback: "Failed to fetch conversations",
    });
  },

  async createConversation(recipientUserId: string): Promise<Conversation> {
    return request(tenantUrl("/conversations"), {
      method: "POST",
      body: { recipientUserId },
      fallback: "Failed to start conversation",
    });
  },

  async fetchMessages(conversationId: string): Promise<Message[]> {
    return request(tenantUrl(`/conversations/${conversationId}/messages`), {
      fallback: "Failed to fetch messages",
    });
  },

  async sendMessage(conversationId: string, body: string): Promise<Message> {
    return request(tenantUrl(`/conversations/${conversationId}/messages`), {
      method: "POST",
      body: { body },
      fallback: "Failed to send message",
    });
  },

  async markConversationRead(conversationId: string): Promise<void> {
    await request<void>(tenantUrl(`/conversations/${conversationId}/read`), {
      method: "POST",
      fallback: "Failed to mark conversation as read",
    });
  },

  async deleteMessage(messageId: string): Promise<void> {
    await request<void>(tenantUrl(`/messages/${messageId}`), {
      method: "DELETE",
      fallback: "Failed to delete message",
    });
  },

  async fetchUnreadCount(): Promise<number> {
    const data = await request<{ count: number }>(
      tenantUrl("/messages/unread-count"),
      { fallback: "Failed to fetch unread count" }
    );
    return data.count;
  },

  async fetchEvents(month?: number, year?: number): Promise<CalendarEvent[]> {
    const params = month && year ? `?month=${month}&year=${year}` : "";
    return request(tenantUrl(`/events${params}`), {
      fallback: "Failed to fetch events",
    });
  },

  async createEvent(event: {
    title: string;
    description?: string;
    startAt: string;
    endAt?: string;
    type?: EventType;
    jobId?: string;
  }): Promise<CalendarEvent> {
    return request(tenantUrl("/events"), {
      method: "POST",
      body: event,
      fallback: "Failed to create event",
    });
  },

  async updateEvent(
    id: string,
    updates: Partial<{
      title: string;
      description: string;
      startAt: string;
      endAt: string;
      type: EventType;
      jobId: string;
    }>
  ): Promise<CalendarEvent> {
    return request(tenantUrl(`/events/${id}`), {
      method: "PUT",
      body: updates,
      fallback: "Failed to update event",
    });
  },

  async deleteEvent(id: string): Promise<void> {
    await request<void>(tenantUrl(`/events/${id}`), {
      method: "DELETE",
      fallback: "Failed to delete event",
    });
  },

  async fetchSettings(): Promise<UserSettings> {
    return request(`${API_URL}/settings`, {
      fallback: "Failed to fetch settings",
    });
  },

  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    return request(`${API_URL}/settings`, {
      method: "PUT",
      body: settings,
      fallback: "Failed to update settings",
    });
  },
};
