import { JobApplication } from "../types";

const API_BASE = "/api/tenants/:tenantId";
const token = localStorage.getItem("auth_token");


export const apiService = {
  async fetchApplications(): Promise<JobApplication[]> {
    const response = await fetch(`${API_BASE}/applications`);
    if (!response.ok) throw new Error("Failed to fetch applications");
    return await response.json();
  },

  async createApplication(
    application: JobApplication
  ): Promise<JobApplication> {
    const response = await fetch(`${API_BASE}/applications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(application),
    });
    if (!response.ok) throw new Error("Failed to create application");
    return await response.json();
  },

  async updateApplication(
    id: string,
    updates: Partial<JobApplication>
  ): Promise<JobApplication> {
    const response = await fetch(`${API_BASE}/applications/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error("Failed to update application");
    return await response.json();
  },

  async deleteApplication(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/applications/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete application");
  },
};
