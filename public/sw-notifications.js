// Service Worker script for background medicine reminder notifications
// Uses real-time clock polling (every 5s) to trigger notifications
// even when the app tab is closed (browser must be running).

const SNOOZE_MINUTES = 10;

let scheduledReminders = [];

// Listen for messages from the main app
self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};

  if (type === 'SCHEDULE_REMINDERS') {
    scheduledReminders = payload.reminders || [];
    console.log('[SW] Received', scheduledReminders.length, 'clock-based reminders');
    // Ensure check loop is running
    startClockCheck();
  }

  if (type === 'CANCEL_ALL') {
    scheduledReminders = [];
    console.log('[SW] All reminders cancelled');
  }
});

let checkInterval = null;

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
  startClockCheck();
});

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

function startClockCheck() {
  if (checkInterval) clearInterval(checkInterval);
  // Check every 5 seconds for precise real-clock triggering
  checkInterval = setInterval(checkReminders, 5000);
  // Also check immediately
  checkReminders();
}

function checkReminders() {
  if (!scheduledReminders || scheduledReminders.length === 0) return;

  const now = Date.now();
  const toRemove = [];

  for (let i = 0; i < scheduledReminders.length; i++) {
    const reminder = scheduledReminders[i];
    if (reminder.fired) {
      // Clean up old fired reminders (> 2 min past)
      if (now - reminder.triggerAt > 120000) {
        toRemove.push(i);
      }
      continue;
    }

    // Fire if current real clock >= trigger time (within 10s window to avoid misses)
    if (now >= reminder.triggerAt && now - reminder.triggerAt < 10000) {
      reminder.fired = true;
      console.log(`[SW] 🔔 Clock trigger: ${reminder.title} at ${new Date().toLocaleTimeString()}`);
      fireNotification(reminder);
    }

    // Clean up reminders that are too far past (> 2 min) and never fired
    if (!reminder.fired && now - reminder.triggerAt > 120000) {
      toRemove.push(i);
    }
  }

  // Remove old entries (iterate in reverse)
  for (let i = toRemove.length - 1; i >= 0; i--) {
    scheduledReminders.splice(toRemove[i], 1);
  }
}

async function fireNotification(reminder) {
  const title = reminder.title || '💊 Medicine Reminder';
  const body = reminder.body || 'Time to take your medicine';
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
        if (clients.length === 0) {
          self.clients.openWindow('/dashboard');
        }
      })
    );
  } else if (action === 'snooze') {
    // Re-schedule notification for 10 minutes later using real clock
    const snoozeTime = Date.now() + SNOOZE_MINUTES * 60 * 1000;
    scheduledReminders.push({
      ...data,
      triggerAt: snoozeTime,
      fired: false,
      title: '⏰ Snoozed Reminder',
      body: `Reminder: Take ${data.medicineName} ${data.dosage}${data.dosageUnit}`,
      tag: `meditrack-snooze-${data.medicineId}-${data.sessionType}`,
      isMissed: false,
    });
    console.log(`[SW] Snoozed ${data.medicineName} for ${SNOOZE_MINUTES} min — next at ${new Date(snoozeTime).toLocaleTimeString()}`);
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
