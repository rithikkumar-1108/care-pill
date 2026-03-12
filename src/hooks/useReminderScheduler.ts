import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  scheduleReminders,
  cancelAllReminders,
  requestNotificationPermission,
  type ReminderConfig,
} from '@/services/notificationService';
import { registerSWReminders, sendRemindersToSW, cancelSWReminders } from '@/services/swReminderService';
import type { SessionType, Medicine, MedicineSession, SessionSchedule, DoseLogWithMedicine } from '@/types/database';
import { SESSION_INFO } from '@/types/database';

interface UseReminderSchedulerProps {
  medicines: Medicine[];
  medicineSessions: MedicineSession[];
  schedules: SessionSchedule[];
  doseLogs: DoseLogWithMedicine[];
  onUpdate: () => void;
}

export function useReminderScheduler({
  medicines,
  medicineSessions,
  schedules,
  doseLogs,
  onUpdate,
}: UseReminderSchedulerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const hasScheduledRef = useRef(false);

  const getScheduledDateTime = useCallback(
    (sessionType: SessionType, customTime?: string | null): Date => {
      // Use per-medicine custom_time first, then fall back to session schedule, then default
      const timeStr = customTime
        ? customTime.slice(0, 5)
        : schedules.find((s) => s.session_type === sessionType)?.scheduled_time || SESSION_INFO[sessionType].defaultTime;
      const today = format(new Date(), 'yyyy-MM-dd');
      return new Date(`${today}T${timeStr}`);
    },
    [schedules],
  );

  const markDose = useCallback(
    async (medicineId: string, sessionType: SessionType, status: 'taken' | 'skipped' | 'missed') => {
      if (!user) return;
      const today = format(new Date(), 'yyyy-MM-dd');
      const existingLog = doseLogs.find(
        (log) => log.medicine_id === medicineId && log.session_type === sessionType,
      );

      try {
        if (existingLog) {
          await supabase
            .from('dose_logs')
            .update({ status, taken_at: status === 'taken' ? new Date().toISOString() : null })
            .eq('id', existingLog.id);
        } else {
          await supabase.from('dose_logs').insert({
            user_id: user.id,
            medicine_id: medicineId,
            session_type: sessionType,
            scheduled_date: today,
            status,
            taken_at: status === 'taken' ? new Date().toISOString() : null,
          });
        }
        onUpdate();
      } catch (err) {
        console.error('Reminder auto-update failed:', err);
      }
    },
    [user, doseLogs, onUpdate],
  );

  useEffect(() => {
    if (!user || medicines.length === 0) return;

    requestNotificationPermission();

    const sessionTypes: SessionType[] = ['morning', 'afternoon', 'night'];

    cancelAllReminders();

    sessionTypes.forEach((sessionType) => {
      const sessionMedicineSessions = medicineSessions.filter((ms) => ms.session_type === sessionType);

      const sessionMeds = medicines.filter((m) =>
        sessionMedicineSessions.some((ms) => ms.medicine_id === m.id)
      );

      sessionMeds.forEach((medicine) => {
        const existingLog = doseLogs.find(
          (l) => l.medicine_id === medicine.id && l.session_type === sessionType,
        );
        if (existingLog && existingLog.status !== 'pending') return;

        // Get custom_time for this specific medicine+session
        const ms = sessionMedicineSessions.find((s) => s.medicine_id === medicine.id);
        const customTime = (ms as any)?.custom_time as string | undefined;
        const scheduledTime = getScheduledDateTime(sessionType, customTime);

        const config: ReminderConfig = {
          medicineId: medicine.id,
          medicineName: medicine.name,
          dosage: medicine.dosage,
          dosageUnit: medicine.dosage_unit,
          sessionType,
          scheduledTime,
        };

        scheduleReminders(
          config,
          () => markDose(medicine.id, sessionType, 'taken'),
          () => markDose(medicine.id, sessionType, 'skipped'),
          () => markDose(medicine.id, sessionType, 'missed'),
        );
      });
    });

    hasScheduledRef.current = true;

    return () => {
      cancelAllReminders();
    };
  }, [user, medicines, medicineSessions, schedules, doseLogs, getScheduledDateTime, markDose]);
}
