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
import { API_URL } from "../config";
import { API_BASE_URL } from "../config";

const API_BASE = API_URL;

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

export const apiService = {
  async fetchApplications(): Promise<JobApplication[]> {
    const tenantId = getTenantId();
    const response = await fetch(`${API_BASE}/tenants/${tenantId}/applications`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch applications");
    return await response.json();
  },

  async createApplication(
    application: JobApplicationCreateInput
  ): Promise<JobApplication> {
    const tenantId = getTenantId();
    const response = await fetch(`${API_BASE}/tenants/${tenantId}/applications`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(application),
    });
    if (!response.ok) throw new Error("Failed to create application");
    return await response.json();
  },

  async updateApplication(
    id: string,
    updates: Partial<JobApplication>
  ): Promise<JobApplication> {
    const tenantId = getTenantId();
    const response = await fetch(`${API_BASE}/tenants/${tenantId}/applications/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error("Failed to update application");
    return await response.json();
  },

  async deleteApplication(id: string): Promise<void> {
    const tenantId = getTenantId();
    const response = await fetch(`${API_BASE}/tenants/${tenantId}/applications/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to delete application");
  },

  async bulkDeleteApplications(ids: string[]): Promise<{ deleted: number }> {
    const tenantId = getTenantId();
    const response = await fetch(`${API_BASE}/tenants/${tenantId}/applications/bulk`, {
      method: "DELETE",
      headers: getAuthHeaders(),
      body: JSON.stringify({ ids }),
    });
    if (!response.ok) throw new Error("Failed to delete applications");
    return await response.json();
  },

  async bulkUpdateStatus(ids: string[], status: string): Promise<{ updated: number }> {
    const tenantId = getTenantId();
    const response = await fetch(`${API_BASE}/tenants/${tenantId}/applications/bulk`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ ids, status }),
    });
    if (!response.ok) throw new Error("Failed to update applications");
    return await response.json();
  },

  async bulkImportApplications(applications: Partial<JobApplication>[]): Promise<{ imported: number; applications: JobApplication[] }> {
    const tenantId = getTenantId();
    const response = await fetch(`${API_BASE}/tenants/${tenantId}/applications/bulk`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ applications }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Failed to import applications" }));
      throw new Error(error.message || "Failed to import applications");
    }
    return await response.json();
  },

  // Monthly Goals
  async fetchCurrentGoal(): Promise<MonthlyGoal> {
    const response = await fetch(`${API_BASE_URL}/api/goals/current`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch current goal");
    return await response.json();
  },

  async updateCurrentGoal(target: number): Promise<MonthlyGoal> {
    const response = await fetch(`${API_BASE_URL}/api/goals/current`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ target }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Failed to update goal" }));
      throw new Error(error.error || error.message || "Failed to update goal");
    }
    return await response.json();
  },

  async fetchGoalHistory(): Promise<MonthlyGoal[]> {
    const response = await fetch(`${API_BASE_URL}/api/goals/history`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch goal history");
    return await response.json();
  },

  async updateGoalMet(goalId: string, met: boolean): Promise<MonthlyGoal> {
    const response = await fetch(`${API_BASE_URL}/api/goals/${goalId}/met`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ met }),
    });
    if (!response.ok) throw new Error("Failed to update goal status");
    return await response.json();
  },

  // Tenant members
  async fetchTenantMembers(): Promise<TenantMember[]> {
    const tenantId = getTenantId();
    const response = await fetch(`${API_BASE}/tenants/${tenantId}/members`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch tenant members");
    return await response.json();
  },

  // Invites
  async fetchInvites(): Promise<TenantInvite[]> {
    const tenantId = getTenantId();
    const response = await fetch(`${API_BASE}/tenants/${tenantId}/invites`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch invites");
    return await response.json();
  },

  async createInvite(email: string, role: TenantRole = "member"): Promise<TenantInvite> {
    const tenantId = getTenantId();
    const response = await fetch(`${API_BASE}/tenants/${tenantId}/invites`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ email, role }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Failed to create invite" }));
      throw new Error(error.error || "Failed to create invite");
    }
    return await response.json();
  },

  async revokeInvite(inviteId: string): Promise<void> {
    const tenantId = getTenantId();
    const response = await fetch(`${API_BASE}/tenants/${tenantId}/invites/${inviteId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to revoke invite");
  },

  async updateMemberRole(userId: string, role: TenantRole): Promise<{ id: string; role: TenantRole }> {
    const tenantId = getTenantId();
    const response = await fetch(`${API_BASE}/tenants/${tenantId}/members/${userId}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ role }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Failed to update member role" }));
      throw new Error(error.error || error.message || "Failed to update member role");
    }
    return await response.json();
  },

  async removeMember(userId: string): Promise<void> {
    const tenantId = getTenantId();
    const response = await fetch(`${API_BASE}/tenants/${tenantId}/members/${userId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Failed to remove member" }));
      throw new Error(error.error || error.message || "Failed to remove member");
    }
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Failed to change password" }));
      throw new Error(error.error || error.message || "Failed to change password");
    }
  },

  async acceptInvite(token: string): Promise<{ tenantId: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/invite/accept`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ token }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Failed to accept invite" }));
      throw new Error(error.error || "Failed to accept invite");
    }
    return await response.json();
  },

  // Conversations + messages
  async fetchConversations(): Promise<Conversation[]> {
    const tenantId = getTenantId();
    const response = await fetch(`${API_BASE}/tenants/${tenantId}/conversations`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch conversations");
    return await response.json();
  },

  async createConversation(recipientUserId: string): Promise<Conversation> {
    const tenantId = getTenantId();
    const response = await fetch(`${API_BASE}/tenants/${tenantId}/conversations`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ recipientUserId }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Failed to start conversation" }));
      throw new Error(error.error || "Failed to start conversation");
    }
    return await response.json();
  },

  async fetchMessages(conversationId: string): Promise<Message[]> {
    const tenantId = getTenantId();
    const response = await fetch(
      `${API_BASE}/tenants/${tenantId}/conversations/${conversationId}/messages`,
      { headers: getAuthHeaders() }
    );
    if (!response.ok) throw new Error("Failed to fetch messages");
    return await response.json();
  },

  async sendMessage(conversationId: string, body: string): Promise<Message> {
    const tenantId = getTenantId();
    const response = await fetch(
      `${API_BASE}/tenants/${tenantId}/conversations/${conversationId}/messages`,
      {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ body }),
      }
    );
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Failed to send message" }));
      throw new Error(error.error || "Failed to send message");
    }
    return await response.json();
  },

  async markConversationRead(conversationId: string): Promise<void> {
    const tenantId = getTenantId();
    const response = await fetch(
      `${API_BASE}/tenants/${tenantId}/conversations/${conversationId}/read`,
      { method: "POST", headers: getAuthHeaders() }
    );
    if (!response.ok) throw new Error("Failed to mark conversation as read");
  },

  async deleteMessage(messageId: string): Promise<void> {
    const tenantId = getTenantId();
    const response = await fetch(`${API_BASE}/tenants/${tenantId}/messages/${messageId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to delete message");
  },

  async fetchUnreadCount(): Promise<number> {
    const tenantId = getTenantId();
    const response = await fetch(
      `${API_BASE}/tenants/${tenantId}/messages/unread-count`,
      { headers: getAuthHeaders() }
    );
    if (!response.ok) throw new Error("Failed to fetch unread count");
    const data = (await response.json()) as { count: number };
    return data.count;
  },

  async fetchEvents(month?: number, year?: number): Promise<CalendarEvent[]> {
    const tenantId = getTenantId();
    const params = month && year ? `?month=${month}&year=${year}` : "";
    const response = await fetch(`${API_BASE}/tenants/${tenantId}/events${params}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch events");
    return await response.json();
  },

  async createEvent(event: { title: string; description?: string; startAt: string; endAt?: string; type?: EventType; jobId?: string }): Promise<CalendarEvent> {
    const tenantId = getTenantId();
    const response = await fetch(`${API_BASE}/tenants/${tenantId}/events`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(event),
    });
    if (!response.ok) throw new Error("Failed to create event");
    return await response.json();
  },

  async updateEvent(id: string, updates: Partial<{ title: string; description: string; startAt: string; endAt: string; type: EventType; jobId: string }>): Promise<CalendarEvent> {
    const tenantId = getTenantId();
    const response = await fetch(`${API_BASE}/tenants/${tenantId}/events/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error("Failed to update event");
    return await response.json();
  },

  async deleteEvent(id: string): Promise<void> {
    const tenantId = getTenantId();
    const response = await fetch(`${API_BASE}/tenants/${tenantId}/events/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to delete event");
  },

  async fetchSettings(): Promise<UserSettings> {
    const response = await fetch(`${API_BASE_URL}/api/settings`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error("Failed to fetch settings");
    return await response.json();
  },

  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    const response = await fetch(`${API_BASE_URL}/api/settings`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(settings),
    });
    if (!response.ok) throw new Error("Failed to update settings");
    return await response.json();
  },
};
