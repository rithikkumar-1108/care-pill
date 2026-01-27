import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { SessionCard } from '@/components/dashboard/SessionCard';
import { QuickStats } from '@/components/dashboard/QuickStats';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import type { SessionType, DoseLogWithMedicine, SessionSchedule, Medicine, MedicineSession } from '@/types/database';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [schedules, setSchedules] = useState<SessionSchedule[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [medicineSessions, setMedicineSessions] = useState<MedicineSession[]>([]);
  const [doseLogs, setDoseLogs] = useState<DoseLogWithMedicine[]>([]);

  const today = format(new Date(), 'yyyy-MM-dd');

  const fetchData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Fetch all data in parallel
      const [schedulesRes, medicinesRes, sessionsRes, logsRes] = await Promise.all([
        supabase
          .from('session_schedules')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('medicines')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true),
        supabase
          .from('medicine_sessions')
          .select('*'),
        supabase
          .from('dose_logs')
          .select('*, medicine:medicines(*)')
          .eq('user_id', user.id)
          .eq('scheduled_date', today),
      ]);

      if (schedulesRes.data) setSchedules(schedulesRes.data as SessionSchedule[]);
      if (medicinesRes.data) setMedicines(medicinesRes.data as Medicine[]);
      if (sessionsRes.data) setMedicineSessions(sessionsRes.data as MedicineSession[]);
      if (logsRes.data) setDoseLogs(logsRes.data as DoseLogWithMedicine[]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const getMedicinesForSession = (sessionType: SessionType) => {
    const sessionMedicineIds = medicineSessions
      .filter((ms) => ms.session_type === sessionType)
      .map((ms) => ms.medicine_id);
    
    return medicines.filter((m) => sessionMedicineIds.includes(m.id));
  };

  const getDoseLogsForSession = (sessionType: SessionType) => {
    return doseLogs.filter((log) => log.session_type === sessionType);
  };

  const getScheduleForSession = (sessionType: SessionType) => {
    return schedules.find((s) => s.session_type === sessionType);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const sessions: SessionType[] = ['morning', 'afternoon', 'night'];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {profile?.full_name?.split(' ')[0] || 'there'}! 👋
          </h1>
          <p className="text-lg text-muted-foreground">
            {format(new Date(), 'EEEE, MMMM do, yyyy')}
          </p>
        </div>

        {/* Quick Stats */}
        <QuickStats
          totalMedicines={medicines.length}
          takenToday={doseLogs.filter((l) => l.status === 'taken').length}
          pendingToday={doseLogs.filter((l) => l.status === 'pending').length}
          missedToday={doseLogs.filter((l) => l.status === 'missed').length}
        />

        {/* Session Cards */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">Today's Sessions</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {sessions.map((sessionType) => (
              <SessionCard
                key={sessionType}
                sessionType={sessionType}
                schedule={getScheduleForSession(sessionType)}
                medicines={getMedicinesForSession(sessionType)}
                doseLogs={getDoseLogsForSession(sessionType)}
                onUpdate={fetchData}
              />
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
