import { useState, useEffect } from 'react';
import { Clock, Bell, BellOff } from 'lucide-react';
import { getNextReminderTime, getActiveReminderCount } from '@/services/notificationService';

export function NextReminderCountdown() {
  const [now, setNow] = useState(Date.now());
  const [nextReminder, setNextReminder] = useState<ReturnType<typeof getNextReminderTime>>(null);
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
      setNextReminder(getNextReminderTime());
      setActiveCount(getActiveReminderCount());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (activeCount === 0) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-muted/50 rounded-xl border">
        <BellOff className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">No upcoming reminders</span>
      </div>
    );
  }

  const formatCountdown = (ms: number): string => {
    if (ms <= 0) return 'Now!';
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const remaining = nextReminder ? nextReminder.triggerAtMs - now : 0;
  const triggerTime = nextReminder
    ? new Date(nextReminder.triggerAtMs).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : '';

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 border border-primary/20 rounded-xl">
      <div className="relative">
        <Bell className="h-5 w-5 text-primary animate-pulse" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full text-[8px] text-primary-foreground flex items-center justify-center font-bold">
          {activeCount}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">Next reminder at {triggerTime}</p>
        <p className="text-sm font-semibold tabular-nums text-foreground">
          <Clock className="inline h-3.5 w-3.5 mr-1 text-primary" />
          {formatCountdown(remaining)}
        </p>
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">{activeCount} active</span>
    </div>
  );
}
