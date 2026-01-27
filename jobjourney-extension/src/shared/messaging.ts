import type {
  Message,
  MessageResponse,
  MessageType,
  AuthState,
  ExtensionSettings,
  JobApplication,
  CreateJobRequest,
} from './types';

// Send message to background worker
function sendMessage<T>(type: MessageType, payload?: unknown): Promise<MessageResponse<T>> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, payload } as Message, (response: MessageResponse<T>) => {
      if (chrome.runtime.lastError) {
        resolve({
          success: false,
          error: chrome.runtime.lastError.message || 'Failed to send message',
        });
      } else {
        resolve(response);
      }
    });
  });
}

// Auth messaging
export const authMessages = {
  getState(): Promise<MessageResponse<AuthState>> {
    return sendMessage('GET_AUTH_STATE');
  },

  login(email: string, password: string): Promise<MessageResponse<AuthState>> {
    return sendMessage('LOGIN', { email, password });
  },

  logout(): Promise<MessageResponse<void>> {
    return sendMessage('LOGOUT');
  },
};

// Settings messaging
export const settingsMessages = {
  get(): Promise<MessageResponse<ExtensionSettings>> {
    return sendMessage('GET_SETTINGS');
  },

  update(settings: Partial<ExtensionSettings>): Promise<MessageResponse<ExtensionSettings>> {
    return sendMessage('UPDATE_SETTINGS', settings);
  },
};

// Job messaging
export const jobMessages = {
  save(job: CreateJobRequest): Promise<MessageResponse<JobApplication>> {
    return sendMessage('SAVE_JOB', job);
  },

  checkDuplicate(
    externalJobId?: string,
    link?: string
  ): Promise<MessageResponse<{ isDuplicate: boolean; existingJob?: { id: string; company: string; role: string } }>> {
    return sendMessage('CHECK_DUPLICATE', { externalJobId, link });
  },
};

// Reminder messaging
export const reminderMessages = {
  set(
    applicationId: string,
    followUpDate?: string,
    reminderEnabled?: boolean
  ): Promise<MessageResponse<JobApplication>> {
    return sendMessage('SET_REMINDER', { applicationId, followUpDate, reminderEnabled });
  },

  snooze(applicationId: string, days: number): Promise<MessageResponse<JobApplication>> {
    return sendMessage('SNOOZE_REMINDER', { applicationId, days });
  },
};
