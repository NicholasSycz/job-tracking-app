import { ALARM_NAMES, ALARM_INTERVALS } from '../shared/constants';
import {
  getAuthState,
  setAuthState,
  clearAuthState,
  getSettings,
  setSettings,
} from '../shared/storage';
import { authApi, applicationsApi, remindersApi, ApiError } from './api';
import type {
  Message,
  MessageResponse,
  CreateJobRequest,
  ExtensionSettings,
} from '../shared/types';

// Initialize alarms on extension install/update
chrome.runtime.onInstalled.addListener(() => {
  console.log('JobJourney Extension installed');

  // Set up reminder check alarm
  chrome.alarms.create(ALARM_NAMES.CHECK_REMINDERS, {
    periodInMinutes: ALARM_INTERVALS.CHECK_REMINDERS,
  });
});

// Handle alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAMES.CHECK_REMINDERS) {
    await checkPendingReminders();
  }
});

// Check for pending reminders and show notifications
async function checkPendingReminders() {
  const authState = await getAuthState();
  const settings = await getSettings();

  if (!authState.isAuthenticated || !settings.notificationsEnabled) {
    return;
  }

  try {
    const reminders = await remindersApi.getPending();

    for (const reminder of reminders) {
      // Show notification for each pending reminder
      chrome.notifications.create(`reminder-${reminder.applicationId}`, {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon128.svg'),
        title: 'Follow Up Reminder',
        message: `Time to follow up on ${reminder.role} at ${reminder.company}`,
        buttons: [
          { title: 'Open App' },
          { title: 'Snooze 1 day' },
        ],
        priority: 2,
        requireInteraction: true,
      });

      // Mark reminder as sent
      try {
        await remindersApi.markSent(reminder.applicationId);
      } catch (error) {
        console.error('Failed to mark reminder as sent:', error);
      }
    }
  } catch (error) {
    console.error('Failed to check reminders:', error);
  }
}

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  const match = notificationId.match(/^reminder-(.+)$/);
  if (!match) return;

  const applicationId = match[1];

  if (buttonIndex === 0) {
    // Open - open the JobJourney app
    chrome.tabs.create({ url: 'http://localhost:3000' });
  } else if (buttonIndex === 1) {
    // Snooze - add 1 day to follow-up date
    try {
      await remindersApi.snooze(applicationId, 1);
    } catch (error) {
      console.error('Failed to snooze reminder:', error);
    }
  }

  chrome.notifications.clear(notificationId);
});

// Handle notification click (not button)
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith('reminder-')) {
    chrome.tabs.create({ url: 'http://localhost:3000' });
    chrome.notifications.clear(notificationId);
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((error) => {
      console.error('Message handler error:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    });

  return true; // Keep message channel open for async response
});

async function handleMessage(
  message: Message,
  _sender: chrome.runtime.MessageSender
): Promise<MessageResponse> {
  switch (message.type) {
    case 'GET_AUTH_STATE': {
      const authState = await getAuthState();
      return { success: true, data: authState };
    }

    case 'LOGIN': {
      const { email, password } = message.payload as { email: string; password: string };
      try {
        const response = await authApi.login(email, password);
        await setAuthState(response.token, response.tenantId, response.user);
        return {
          success: true,
          data: {
            token: response.token,
            user: response.user,
            tenantId: response.tenantId,
            isAuthenticated: true,
          },
        };
      } catch (error) {
        if (error instanceof ApiError) {
          return { success: false, error: error.message };
        }
        throw error;
      }
    }

    case 'LOGOUT': {
      await clearAuthState();
      return { success: true };
    }

    case 'GET_SETTINGS': {
      const settings = await getSettings();
      return { success: true, data: settings };
    }

    case 'UPDATE_SETTINGS': {
      const updates = message.payload as Partial<ExtensionSettings>;
      await setSettings(updates);
      const settings = await getSettings();
      return { success: true, data: settings };
    }

    case 'SAVE_JOB': {
      const jobData = message.payload as CreateJobRequest;
      try {
        const job = await applicationsApi.create(jobData);
        return { success: true, data: job };
      } catch (error) {
        if (error instanceof ApiError) {
          return { success: false, error: error.message };
        }
        throw error;
      }
    }

    case 'CHECK_DUPLICATE': {
      const { externalJobId, link } = message.payload as {
        externalJobId?: string;
        link?: string;
      };
      try {
        const result = await applicationsApi.checkDuplicate(externalJobId, link);
        return { success: true, data: result };
      } catch (error) {
        if (error instanceof ApiError) {
          return { success: false, error: error.message };
        }
        throw error;
      }
    }

    case 'SET_REMINDER': {
      const { applicationId, followUpDate, reminderEnabled } = message.payload as {
        applicationId: string;
        followUpDate?: string;
        reminderEnabled?: boolean;
      };
      try {
        const job = await remindersApi.updateReminder(applicationId, {
          followUpDate,
          reminderEnabled,
        });
        return { success: true, data: job };
      } catch (error) {
        if (error instanceof ApiError) {
          return { success: false, error: error.message };
        }
        throw error;
      }
    }

    case 'SNOOZE_REMINDER': {
      const { applicationId, days } = message.payload as {
        applicationId: string;
        days: number;
      };
      try {
        const job = await remindersApi.snooze(applicationId, days);
        return { success: true, data: job };
      } catch (error) {
        if (error instanceof ApiError) {
          return { success: false, error: error.message };
        }
        throw error;
      }
    }

    default:
      return { success: false, error: `Unknown message type: ${message.type}` };
  }
}

// Log that background worker is running
console.log('JobJourney background worker started');

// Check reminders on startup (after a short delay to let things initialize)
setTimeout(() => {
  checkPendingReminders();
}, 5000);
