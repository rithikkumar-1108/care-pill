// Local browser notification service for medicine reminders
// Works offline, no external API dependencies

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

interface ScheduledReminder {
  timeoutId: ReturnType<typeof setTimeout>;
  type: 'pre' | 'on-time' | 'post' | 'missed';
}

// Track all active reminders by medicine+session key
const activeReminders = new Map<string, ScheduledReminder[]>();

function getReminderKey(medicineId: string, sessionType: string): string {
  return `${medicineId}_${sessionType}`;
}

// Generate the 5 notification messages
function getNotificationMessages(name: string, dosage: string, unit: string, timeStr: string) {
  return [
    { offset: -2, title: '⏰ Upcoming Reminder', body: `Reminder: Take ${name} ${dosage}${unit} at ${timeStr}.` },
    { offset: -1, title: '💊 Almost Time', body: `Almost time for ${name} ${dosage}${unit}.` },
    { offset: 0, title: '🔔 Time to Take Medicine', body: `It's time to take ${name} ${dosage}${unit}.` },
    { offset: 1, title: '⚠️ Pending Dose', body: `You haven't marked ${name} ${dosage}${unit} as taken.` },
    { offset: 2, title: '🚨 Final Reminder', body: `Final reminder: Take ${name} ${dosage}${unit} now.` },
  ];
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Browser does not support notifications');
    return false;
  }
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

// Play a short alert sound + vibrate based on user's chosen style
function playAlertSound(isMissed = false) {
  const style = getSoundStyle();

  // Sound
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

  // Vibrate (always for vibrate_only, otherwise based on context)
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

// Preview sound for settings UI
export function previewSound(style: SoundStyle): void {
  const prev = getSoundStyle();
  localStorage.setItem('meditrack-sound-style', style);
  playAlertSound(false);
  localStorage.setItem('meditrack-sound-style', prev);
}

function showNotification(title: string, body: string, tag: string, isMissed = false) {
  // Play sound & vibrate regardless of notification permission
  playAlertSound(isMissed);

  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const notification = new Notification(title, {
    body,
    icon: '/favicon.ico',
    tag,
    requireInteraction: true,
    silent: true, // We handle sound ourselves
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}

export function scheduleReminders(
  config: ReminderConfig,
  onMarkTaken: () => void,
  onMarkSkipped: () => void,
  onMarkMissed: () => void,
): void {
  const key = getReminderKey(config.medicineId, config.sessionType);

  // Cancel any existing reminders for this medicine+session
  cancelReminders(config.medicineId, config.sessionType);

  const now = Date.now();
  const scheduledMs = config.scheduledTime.getTime();
  const timeStr = config.scheduledTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const messages = getNotificationMessages(config.medicineName, config.dosage, config.dosageUnit, timeStr);
  const tag = `medicine-${key}`;
  const reminders: ScheduledReminder[] = [];

  // Schedule the 5 notifications
  messages.forEach((msg) => {
    const triggerAt = scheduledMs + msg.offset * 60 * 1000;
    const delay = triggerAt - now;

    if (delay > 0) {
      const timeoutId = setTimeout(() => {
        showNotification(msg.title, msg.body, tag);
      }, delay);
      reminders.push({ timeoutId, type: msg.offset < 0 ? 'pre' : msg.offset === 0 ? 'on-time' : 'post' });
    }
  });

  // Schedule auto-miss at scheduled_time + 5 minutes
  const missDelay = scheduledMs + 5 * 60 * 1000 - now;
  if (missDelay > 0) {
    const missTimeout = setTimeout(() => {
      showNotification(
        '❌ Missed Dose',
        `You missed ${config.medicineName} ${config.dosage}${config.dosageUnit} scheduled at ${timeStr}.`,
        `${tag}-missed`,
        true,
      );
      onMarkMissed();
    }, missDelay);
    reminders.push({ timeoutId: missTimeout, type: 'missed' });
  }

  activeReminders.set(key, reminders);
}

export function cancelReminders(medicineId: string, sessionType: string): void {
  const key = getReminderKey(medicineId, sessionType);
  const reminders = activeReminders.get(key);
  if (reminders) {
    reminders.forEach((r) => clearTimeout(r.timeoutId));
    activeReminders.delete(key);
  }
}

export function cancelAllReminders(): void {
  activeReminders.forEach((reminders) => {
    reminders.forEach((r) => clearTimeout(r.timeoutId));
  });
  activeReminders.clear();
}

export function hasActiveReminders(medicineId: string, sessionType: string): boolean {
  return activeReminders.has(getReminderKey(medicineId, sessionType));
}
