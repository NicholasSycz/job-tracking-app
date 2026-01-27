import { ALARM_NAMES, ALARM_INTERVALS } from '../shared/constants';
import { getAuthState, getSettings } from '../shared/storage';

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

// Check for pending reminders
async function checkPendingReminders() {
  const authState = await getAuthState();
  const settings = await getSettings();

  if (!authState.isAuthenticated || !settings.notificationsEnabled) {
    return;
  }

  try {
    const response = await fetch(
      `http://localhost:4000/api/tenants/${authState.tenantId}/reminders/pending`,
      {
        headers: { Authorization: `Bearer ${authState.token}` },
      }
    );

    if (!response.ok) return;

    const reminders = await response.json();

    for (const reminder of reminders) {
      // Show notification for each pending reminder
      chrome.notifications.create(`reminder-${reminder.id}`, {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon128.png'),
        title: 'Follow Up Reminder',
        message: `Time to follow up on ${reminder.role} at ${reminder.company}`,
        buttons: [
          { title: 'Open' },
          { title: 'Snooze 1 day' },
        ],
        priority: 2,
        requireInteraction: true,
      });

      // Mark reminder as sent
      await fetch(
        `http://localhost:4000/api/tenants/${authState.tenantId}/applications/${reminder.id}/reminder-sent`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${authState.token}` },
        }
      );
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
    const authState = await getAuthState();
    if (!authState.isAuthenticated) return;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await fetch(
      `http://localhost:4000/api/tenants/${authState.tenantId}/applications/${applicationId}/reminder`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authState.token}`,
        },
        body: JSON.stringify({
          followUpDate: tomorrow.toISOString(),
          reminderSentAt: null, // Reset sent status
        }),
      }
    );
  }

  chrome.notifications.clear(notificationId);
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse);
  return true; // Keep message channel open for async response
});

async function handleMessage(
  message: { type: string; payload?: unknown },
  _sender: chrome.runtime.MessageSender
) {
  switch (message.type) {
    case 'GET_AUTH_STATE':
      return { success: true, data: await getAuthState() };

    case 'GET_SETTINGS':
      return { success: true, data: await getSettings() };

    default:
      return { success: false, error: 'Unknown message type' };
  }
}

// Log that background worker is running
console.log('JobJourney background worker started');
