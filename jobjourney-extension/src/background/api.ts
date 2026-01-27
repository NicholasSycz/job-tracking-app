import { API_BASE_URL } from '../shared/constants';
import { getAuthToken, getTenantId } from '../shared/storage';
import type {
  JobApplication,
  CreateJobRequest,
  LoginResponse,
  ReminderData,
} from '../shared/types';

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Base fetch wrapper with auth
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.error || `Request failed with status ${response.status}`,
      response.status,
      errorData.code
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// Get tenant-scoped endpoint
async function tenantEndpoint(path: string): Promise<string> {
  const tenantId = await getTenantId();
  if (!tenantId) {
    throw new ApiError('Not authenticated', 401);
  }
  return `/api/tenants/${tenantId}${path}`;
}

// Auth API
export const authApi = {
  async login(email: string, password: string): Promise<LoginResponse> {
    return apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async getMe(): Promise<{ user: { id: string; email: string; name: string }; tenantId: string }> {
    return apiFetch('/auth/me');
  },

  async validateToken(): Promise<boolean> {
    try {
      await this.getMe();
      return true;
    } catch {
      return false;
    }
  },
};

// Applications API
export const applicationsApi = {
  async list(): Promise<JobApplication[]> {
    const endpoint = await tenantEndpoint('/applications');
    return apiFetch<JobApplication[]>(endpoint);
  },

  async create(data: CreateJobRequest): Promise<JobApplication> {
    const endpoint = await tenantEndpoint('/applications');
    return apiFetch<JobApplication>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Partial<CreateJobRequest>): Promise<JobApplication> {
    const endpoint = await tenantEndpoint(`/applications/${id}`);
    return apiFetch<JobApplication>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<void> {
    const endpoint = await tenantEndpoint(`/applications/${id}`);
    await apiFetch(endpoint, { method: 'DELETE' });
  },

  async checkDuplicate(
    externalJobId?: string,
    link?: string
  ): Promise<{ isDuplicate: boolean; existingJob?: { id: string; company: string; role: string } }> {
    const params = new URLSearchParams();
    if (externalJobId) params.append('externalJobId', externalJobId);
    if (link) params.append('link', link);

    const endpoint = await tenantEndpoint(`/applications/check-duplicate?${params}`);
    return apiFetch(endpoint);
  },
};

// Reminders API
export const remindersApi = {
  async getPending(): Promise<ReminderData[]> {
    const endpoint = await tenantEndpoint('/reminders/pending');
    return apiFetch<ReminderData[]>(endpoint);
  },

  async markSent(applicationId: string): Promise<void> {
    const endpoint = await tenantEndpoint(`/applications/${applicationId}/reminder-sent`);
    await apiFetch(endpoint, { method: 'POST' });
  },

  async updateReminder(
    applicationId: string,
    data: {
      followUpDate?: string | null;
      reminderEnabled?: boolean;
      reminderSentAt?: string | null;
    }
  ): Promise<JobApplication> {
    const endpoint = await tenantEndpoint(`/applications/${applicationId}/reminder`);
    return apiFetch<JobApplication>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async snooze(applicationId: string, days: number): Promise<JobApplication> {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + days);

    return this.updateReminder(applicationId, {
      followUpDate: newDate.toISOString(),
      reminderSentAt: null, // Reset sent status so it triggers again
    });
  },
};

export { ApiError };
