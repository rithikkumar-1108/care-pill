// Real-time clock-based notification service for medicine reminders
// Uses a 1-second polling interval to compare device clock against scheduled times
// This ensures exact real-world clock triggering, not drift-prone setTimeout

export type SoundStyle = 'gentle' | 'loud' | 'vibrate_only';

export function getSoundStyle(): SoundStyle {
  return (localStorage.getItem('meditrack-sound-style') as SoundStyle) || 'gentle';
}

export function setSoundStyle(style: SoundStyle): void {
  localStorage.setItem('meditrack-sound-style', style);
}

export interface ReminderConfig {
  medicineId: string;
  medicineName: string;
  dosage: string;
  dosageUnit: string;
  sessionType: string;
  scheduledTime: Date; // Full date+time of the dose
}

interface ClockReminder {
  id: string; // unique key: medicineId_sessionType_offset
  medicineId: string;
  sessionType: string;
  triggerAtMs: number; // exact ms timestamp to fire
  title: string;
  body: string;
  tag: string;
  isMissed: boolean;
  fired: boolean;
  onFire?: () => void; // callback (e.g. markMissed)
}

// All registered reminders checked every second
const clockReminders: Map<string, ClockReminder> = new Map();
let clockInterval: ReturnType<typeof setInterval> | null = null;

// --- Sound & Vibration ---

function playAlertSound(isMissed = false) {
  const style = getSoundStyle();

  if (style !== 'vibrate_only') {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const volume = style === 'loud' ? 0.6 : 0.2;

      if (isMissed) {
        osc.frequency.value = style === 'loud' ? 1000 : 880;
        osc.type = style === 'loud' ? 'sawtooth' : 'square';
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(volume, ctx.currentTime + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        if (style === 'loud') {
          gain.gain.setValueAtTime(volume, ctx.currentTime + 0.5);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7);
        }
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + (style === 'loud' ? 0.7 : 0.4));
      } else {
        osc.frequency.value = style === 'loud' ? 800 : 660;
        osc.type = 'sine';
        const duration = style === 'loud' ? 0.5 : 0.3;
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
      }
    } catch {
      // AudioContext not available
    }
  }

  if ('vibrate' in navigator) {
    if (style === 'vibrate_only') {
      navigator.vibrate(isMissed ? [300, 150, 300, 150, 300] : [200, 100, 200]);
    } else if (style === 'loud') {
      navigator.vibrate(isMissed ? [200, 100, 200, 100, 200] : [200]);
    } else {
      navigator.vibrate(isMissed ? [200, 100, 200] : [150]);
    }
  }
}

export function previewSound(style: SoundStyle): void {
  const prev = getSoundStyle();
  localStorage.setItem('meditrack-sound-style', style);
  playAlertSound(false);
  localStorage.setItem('meditrack-sound-style', prev);
}

// --- Notification Permission ---

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

// --- Show Notification ---

function showNotification(title: string, body: string, tag: string, isMissed = false) {
  playAlertSound(isMissed);

  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const notification = new Notification(title, {
    body,
    icon: '/pwa-192x192.png',
    tag,
    requireInteraction: true,
    silent: true, // We handle sound ourselves
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}

// --- Real-Time Clock Engine ---

function startClockEngine() {
  if (clockInterval) return; // already running
  clockInterval = setInterval(tickClock, 1000);
  console.log('[ReminderEngine] Real-time clock started – checking every 1s');
}

function stopClockEngine() {
  if (clockInterval) {
    clearInterval(clockInterval);
    clockInterval = null;
  }
}

function tickClock() {
  const now = Date.now();

  clockReminders.forEach((reminder) => {
    if (reminder.fired) return;

    // Fire if current time is within 1.5s window of trigger time
    if (now >= reminder.triggerAtMs && now - reminder.triggerAtMs < 1500) {
      reminder.fired = true;
      console.log(`[ReminderEngine] 🔔 Firing: ${reminder.title} at ${new Date().toLocaleTimeString()}`);
      showNotification(reminder.title, reminder.body, reminder.tag, reminder.isMissed);
      if (reminder.onFire) reminder.onFire();
    }
  });

  // Clean up old fired reminders (> 2 min past trigger)
  clockReminders.forEach((reminder, key) => {
    if (reminder.fired && now - reminder.triggerAtMs > 120_000) {
      clockReminders.delete(key);
    }
    // Also remove reminders that were never fired but are > 2 min past
    if (!reminder.fired && now - reminder.triggerAtMs > 120_000) {
      clockReminders.delete(key);
    }
  });

  // Stop engine if no reminders left
  if (clockReminders.size === 0) {
    stopClockEngine();
  }
}

// --- Notification Messages ---

function getNotificationMessages(name: string, dosage: string, unit: string, timeStr: string) {
  return [
    { offset: -2, title: '⏰ Upcoming Reminder', body: `Reminder: Take ${name} ${dosage}${unit} at ${timeStr}.`, isMissed: false },
    { offset: -1, title: '💊 Almost Time', body: `Almost time for ${name} ${dosage}${unit}.`, isMissed: false },
    { offset: 0, title: '🔔 Time to Take Medicine', body: `It's time to take ${name} ${dosage}${unit}.`, isMissed: false },
    { offset: 1, title: '⚠️ Pending Dose', body: `You haven't marked ${name} ${dosage}${unit} as taken.`, isMissed: false },
    { offset: 2, title: '🚨 Final Reminder', body: `Final reminder: Take ${name} ${dosage}${unit} now.`, isMissed: false },
  ];
}

// --- Public API ---

export function scheduleReminders(
  config: ReminderConfig,
  onMarkTaken: () => void,
  onMarkSkipped: () => void,
  onMarkMissed: () => void,
): void {
  const baseKey = `${config.medicineId}_${config.sessionType}`;

  // Cancel existing reminders for this medicine+session
  cancelReminders(config.medicineId, config.sessionType);

  const now = Date.now();
  const scheduledMs = config.scheduledTime.getTime();
  const timeStr = config.scheduledTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const messages = getNotificationMessages(config.medicineName, config.dosage, config.dosageUnit, timeStr);

  // Register each notification checkpoint with the clock engine
  messages.forEach((msg) => {
    const triggerAtMs = scheduledMs + msg.offset * 60_000;
    if (triggerAtMs <= now) return; // skip past triggers

    const id = `${baseKey}_offset${msg.offset}`;
    clockReminders.set(id, {
      id,
      medicineId: config.medicineId,
      sessionType: config.sessionType,
      triggerAtMs,
      title: msg.title,
      body: msg.body,
      tag: `medicine-${baseKey}`,
      isMissed: false,
      fired: false,
    });
  });

  // Missed dose trigger at +5 min
  const missedTrigger = scheduledMs + 5 * 60_000;
  if (missedTrigger > now) {
    const missedId = `${baseKey}_missed`;
    clockReminders.set(missedId, {
      id: missedId,
      medicineId: config.medicineId,
      sessionType: config.sessionType,
      triggerAtMs: missedTrigger,
      title: '❌ Missed Dose',
      body: `You missed ${config.medicineName} ${config.dosage}${config.dosageUnit} scheduled at ${timeStr}.`,
      tag: `medicine-${baseKey}-missed`,
      isMissed: true,
      fired: false,
      onFire: onMarkMissed,
    });
  }

  // Start the engine if not running
  startClockEngine();

  console.log(`[ReminderEngine] Scheduled ${config.medicineName} (${config.sessionType}) at ${timeStr} — ${clockReminders.size} total entries`);
}

export function cancelReminders(medicineId: string, sessionType: string): void {
  const prefix = `${medicineId}_${sessionType}`;
  clockReminders.forEach((_, key) => {
    if (key.startsWith(prefix)) {
      clockReminders.delete(key);
    }
  });
}

export function cancelAllReminders(): void {
  clockReminders.clear();
  stopClockEngine();
}

export function hasActiveReminders(medicineId: string, sessionType: string): boolean {
  const prefix = `${medicineId}_${sessionType}`;
  for (const key of clockReminders.keys()) {
    if (key.startsWith(prefix)) return true;
  }
  return false;
}

/** Returns the next upcoming (unfired) reminder trigger time, or null */
export function getNextReminderTime(): { triggerAtMs: number; medicineName: string; title: string } | null {
  let earliest: ClockReminder | null = null;
  const now = Date.now();

  clockReminders.forEach((r) => {
    if (r.fired || r.triggerAtMs <= now) return;
    if (!earliest || r.triggerAtMs < earliest.triggerAtMs) {
      earliest = r;
    }
  });

  if (!earliest) return null;
  return {
    triggerAtMs: (earliest as ClockReminder).triggerAtMs,
    medicineName: (earliest as ClockReminder).body,
    title: (earliest as ClockReminder).title,
  };
}

/** Returns count of active (unfired, future) reminders */
export function getActiveReminderCount(): number {
  const now = Date.now();
  let count = 0;
  clockReminders.forEach((r) => {
    if (!r.fired && r.triggerAtMs > now) count++;
  });
  return count;
}
