// Service Worker script for background medicine reminder notifications
// This runs independently of the main app and can trigger notifications
// even when the app tab is closed (but browser must be running).

const REMINDERS_STORE = 'meditrack-reminders';
const SNOOZE_MINUTES = 10;

// Listen for messages from the main app
self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};

  if (type === 'SCHEDULE_REMINDERS') {
    // Store reminders in the SW scope and set up check interval
    self._scheduledReminders = payload.reminders || [];
    console.log('[SW] Received', self._scheduledReminders.length, 'reminders');
  }

  if (type === 'CANCEL_ALL') {
    self._scheduledReminders = [];
  }
});

// Periodic check using the service worker's own timer
// The SW wakes up on push/sync events; we also use setInterval while active
let checkInterval = null;

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
  startReminderCheck();
});

function startReminderCheck() {
  if (checkInterval) clearInterval(checkInterval);
  // Check every 30 seconds
  checkInterval = setInterval(checkReminders, 30000);
}

function checkReminders() {
  if (!self._scheduledReminders || self._scheduledReminders.length === 0) return;

  const now = Date.now();

  self._scheduledReminders = self._scheduledReminders.filter((reminder) => {
    const triggerAt = reminder.triggerAt;
    // If trigger time has passed (within last 60 seconds window)
    if (now >= triggerAt && now - triggerAt < 60000 && !reminder.fired) {
      fireNotification(reminder);
      reminder.fired = true;
      return !reminder.isMissed; // Keep non-missed for reference
    }
    // Remove old fired reminders
    if (reminder.fired && now - triggerAt > 120000) return false;
    // Remove future reminders that are too far past
    if (now - triggerAt > 120000) return false;
    return true;
  });
}

async function fireNotification(reminder) {
  const title = reminder.title || '💊 Medicine Reminder';
  const body = reminder.body || `Time to take your medicine`;
  const tag = reminder.tag || `meditrack-${reminder.medicineId}-${reminder.sessionType}`;

  try {
    await self.registration.showNotification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag,
      requireInteraction: true,
      silent: false,
      vibrate: [200, 100, 200],
      actions: [
        { action: 'taken', title: '✅ Taken' },
        { action: 'snooze', title: '⏰ Snooze' },
      ],
      data: {
        medicineId: reminder.medicineId,
        medicineName: reminder.medicineName,
        sessionType: reminder.sessionType,
        dosage: reminder.dosage,
        dosageUnit: reminder.dosageUnit,
        scheduledTime: reminder.scheduledTime,
      },
    });
  } catch (err) {
    console.error('[SW] Notification failed:', err);
  }
}

// Handle notification click actions
self.addEventListener('notificationclick', (event) => {
  const { action, notification } = event;
  const data = notification.data || {};

  notification.close();

  if (action === 'taken') {
    // Notify main app that dose was taken
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'DOSE_ACTION',
            payload: {
              medicineId: data.medicineId,
              sessionType: data.sessionType,
              action: 'taken',
            },
          });
        });
        // Also open the app if no window is open
        if (clients.length === 0) {
          self.clients.openWindow('/dashboard');
        }
      })
    );
  } else if (action === 'snooze') {
    // Re-schedule notification for 10 minutes later
    const snoozeTime = Date.now() + SNOOZE_MINUTES * 60 * 1000;
    if (!self._scheduledReminders) self._scheduledReminders = [];
    self._scheduledReminders.push({
      ...data,
      triggerAt: snoozeTime,
      fired: false,
      title: '⏰ Snoozed Reminder',
      body: `Reminder: Take ${data.medicineName} ${data.dosage}${data.dosageUnit}`,
      tag: `meditrack-snooze-${data.medicineId}-${data.sessionType}`,
      isMissed: false,
    });
  } else {
    // Default click - open app
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        if (clients.length > 0) {
          clients[0].focus();
        } else {
          self.clients.openWindow('/dashboard');
        }
      })
    );
  }
});
