import { JobApplication, MonthlyGoal } from "../types";
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
    application: Omit<JobApplication, "id">
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
};
