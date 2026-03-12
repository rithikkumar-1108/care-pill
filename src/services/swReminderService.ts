// Service Worker based reminder scheduling
// Sends reminder configs to the SW for background notification delivery

import type { SessionType } from '@/types/database';

export interface SWReminderEntry {
  medicineId: string;
  medicineName: string;
  dosage: string;
  dosageUnit: string;
  sessionType: string;
  scheduledTime: string; // ISO string
  triggerAt: number; // ms timestamp
  title: string;
  body: string;
  tag: string;
  fired: boolean;
  isMissed: boolean;
}

function getNotificationEntries(
  medicineId: string,
  medicineName: string,
  dosage: string,
  dosageUnit: string,
  sessionType: string,
  scheduledMs: number,
): SWReminderEntry[] {
  const timeStr = new Date(scheduledMs).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const base = { medicineId, medicineName, dosage, dosageUnit, sessionType, scheduledTime: new Date(scheduledMs).toISOString(), fired: false };

  return [
    { ...base, triggerAt: scheduledMs - 2 * 60000, title: '⏰ Upcoming Reminder', body: `Reminder: Take ${medicineName} ${dosage}${dosageUnit} at ${timeStr}.`, tag: `meditrack-pre2-${medicineId}-${sessionType}`, isMissed: false },
    { ...base, triggerAt: scheduledMs - 1 * 60000, title: '💊 Almost Time', body: `Almost time for ${medicineName} ${dosage}${dosageUnit}.`, tag: `meditrack-pre1-${medicineId}-${sessionType}`, isMissed: false },
    { ...base, triggerAt: scheduledMs, title: '🔔 Time to Take Medicine', body: `It's time to take ${medicineName} ${dosage}${dosageUnit}.`, tag: `meditrack-ontime-${medicineId}-${sessionType}`, isMissed: false },
    { ...base, triggerAt: scheduledMs + 1 * 60000, title: '⚠️ Pending Dose', body: `You haven't marked ${medicineName} ${dosage}${dosageUnit} as taken.`, tag: `meditrack-post1-${medicineId}-${sessionType}`, isMissed: false },
    { ...base, triggerAt: scheduledMs + 2 * 60000, title: '🚨 Final Reminder', body: `Final reminder: Take ${medicineName} ${dosage}${dosageUnit} now.`, tag: `meditrack-post2-${medicineId}-${sessionType}`, isMissed: false },
    { ...base, triggerAt: scheduledMs + 5 * 60000, title: '❌ Missed Dose', body: `You missed ${medicineName} ${dosage}${dosageUnit} scheduled at ${timeStr}.`, tag: `meditrack-missed-${medicineId}-${sessionType}`, isMissed: true },
  ];
}

let swRegistration: ServiceWorkerRegistration | null = null;

export async function registerSWReminders(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;

  try {
    // Register our custom notification SW alongside the PWA SW
    const reg = await navigator.serviceWorker.register('/sw-notifications.js', { scope: '/' });
    swRegistration = reg;

    // Listen for dose actions from SW
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'DOSE_ACTION') {
        const { medicineId, sessionType, action } = event.data.payload;
        window.dispatchEvent(new CustomEvent('sw-dose-action', {
          detail: { medicineId, sessionType, action },
        }));
      }
    });

    return reg;
  } catch (err) {
    console.warn('SW registration failed:', err);
    return null;
  }
}

export function sendRemindersToSW(
  reminders: Array<{
    medicineId: string;
    medicineName: string;
    dosage: string;
    dosageUnit: string;
    sessionType: string;
    scheduledMs: number;
  }>,
): void {
  const allEntries: SWReminderEntry[] = [];
  const now = Date.now();

  for (const r of reminders) {
    const entries = getNotificationEntries(r.medicineId, r.medicineName, r.dosage, r.dosageUnit, r.sessionType, r.scheduledMs);
    // Only include future entries
    allEntries.push(...entries.filter((e) => e.triggerAt > now));
  }

  if (swRegistration?.active) {
    swRegistration.active.postMessage({ type: 'SCHEDULE_REMINDERS', payload: { reminders: allEntries } });
  } else if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SCHEDULE_REMINDERS', payload: { reminders: allEntries } });
  }
}

export function cancelSWReminders(): void {
  if (swRegistration?.active) {
    swRegistration.active.postMessage({ type: 'CANCEL_ALL' });
  } else if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CANCEL_ALL' });
  }
}
