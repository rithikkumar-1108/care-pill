import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Clock, Sun, Cloud, Moon, Pill } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { SessionType, Medicine, DoseLogWithMedicine, SessionSchedule, DoseStatus, MedicineSession } from '@/types/database';
import { cn } from '@/lib/utils';

interface SessionCardProps {
  sessionType: SessionType;
  schedule: SessionSchedule | undefined;
  medicines: Medicine[];
  doseLogs: DoseLogWithMedicine[];
  medicineSessions?: MedicineSession[];
  onUpdate: () => void;
}

const sessionIcons: Record<SessionType, React.ReactNode> = {
  morning: <Sun className="h-8 w-8" />,
  afternoon: <Cloud className="h-8 w-8" />,
  night: <Moon className="h-8 w-8" />,
};

const sessionLabels: Record<SessionType, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  night: 'Night',
};

const sessionGradients: Record<SessionType, string> = {
  morning: 'session-morning',
  afternoon: 'session-afternoon',
  night: 'session-night',
};

export function SessionCard({ sessionType, schedule, medicines, doseLogs, medicineSessions, onUpdate }: SessionCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [animatingId, setAnimatingId] = useState<string | null>(null);

  const scheduledTime = schedule?.scheduled_time
    ? format(new Date(`2000-01-01T${schedule.scheduled_time}`), 'h:mm a')
    : sessionType === 'morning'
    ? '8:00 AM'
    : sessionType === 'afternoon'
    ? '2:00 PM'
    : '8:00 PM';

  const getCustomTime = (medicineId: string): string | null => {
    if (!medicineSessions) return null;
    const ms = medicineSessions.find(
      (s) => s.medicine_id === medicineId && s.session_type === sessionType
    );
    if (ms && (ms as any).custom_time) {
      try {
        return format(new Date(`2000-01-01T${(ms as any).custom_time}`), 'h:mm a');
      } catch {
        return null;
      }
    }
    return null;
  };

  const handleMarkDose = async (medicine: Medicine, status: DoseStatus) => {
    if (!user) return;

    if (status === 'taken') {
      setAnimatingId(medicine.id);
      setTimeout(() => setAnimatingId(null), 600);
    }

    const today = format(new Date(), 'yyyy-MM-dd');

    try {
      const existingLog = doseLogs.find(
        (log) => log.medicine_id === medicine.id && log.session_type === sessionType
      );

      if (existingLog) {
        const { error } = await supabase
          .from('dose_logs')
          .update({
            status,
            taken_at: status === 'taken' ? new Date().toISOString() : null,
          })
          .eq('id', existingLog.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('dose_logs').insert({
          user_id: user.id,
          medicine_id: medicine.id,
          session_type: sessionType,
          scheduled_date: today,
          status,
          taken_at: status === 'taken' ? new Date().toISOString() : null,
        });
        if (error) throw error;
      }

      toast({
        title: status === 'taken' ? 'Medicine Taken! ✅' : 'Dose Skipped',
        description: `${medicine.name} marked as ${status}`,
      });

      onUpdate();
    } catch (error) {
      console.error('Error marking dose:', error);
      toast({
        title: 'Error',
        description: 'Failed to update dose status',
        variant: 'destructive',
      });
    }
  };

  const getDoseStatus = (medicineId: string): DoseStatus => {
    const log = doseLogs.find((l) => l.medicine_id === medicineId);
    return log?.status || 'pending';
  };

  const getStatusBadge = (status: DoseStatus) => {
    switch (status) {
      case 'taken':
        return (
          <Badge className="status-taken text-sm px-2 py-0.5">
            <Check className="w-3 h-3 mr-1" /> Taken
          </Badge>
        );
      case 'missed':
        return (
          <Badge className="status-missed text-sm px-2 py-0.5">
            <X className="w-3 h-3 mr-1" /> Missed
          </Badge>
        );
      case 'skipped':
        return (
          <Badge className="status-skipped text-sm px-2 py-0.5">
            <X className="w-3 h-3 mr-1" /> Skipped
          </Badge>
        );
      default:
        return (
          <Badge className="status-pending text-sm px-2 py-0.5">
            <Clock className="w-3 h-3 mr-1" /> Pending
          </Badge>
        );
    }
  };

  return (
    <Card className={cn('card-warm overflow-hidden', sessionGradients[sessionType])}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/50 dark:bg-black/20 rounded-xl">
              {sessionIcons[sessionType]}
            </div>
            <div>
              <CardTitle className="text-2xl">{sessionLabels[sessionType]}</CardTitle>
              <p className="text-muted-foreground text-lg">{scheduledTime}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {medicines.length === 0 ? (
          <div className="text-center py-6 bg-white/30 dark:bg-black/10 rounded-xl">
            <Pill className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground text-lg">No medicines scheduled</p>
          </div>
        ) : (
          medicines.map((medicine) => {
            const status = getDoseStatus(medicine.id);
            const customTime = getCustomTime(medicine.id);
            const isTakenAnim = animatingId === medicine.id;

            return (
              <div
                key={medicine.id}
                className={cn(
                  'p-4 bg-white/50 dark:bg-black/10 rounded-xl space-y-3 transition-all duration-300',
                  isTakenAnim && 'scale-95 opacity-70'
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-lg">{medicine.name}</h4>
                    <p className="text-muted-foreground">
                      {medicine.dosage} {medicine.dosage_unit}
                    </p>
                    {customTime && (
                      <p className="text-xs text-primary flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> {customTime}
                      </p>
                    )}
                    {medicine.instructions && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {medicine.instructions}
                      </p>
                    )}
                  </div>
                  {getStatusBadge(status)}
                </div>

                {status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 h-9 rounded-full bg-success hover:bg-success/90 text-success-foreground text-sm font-medium gap-1.5 transition-transform active:scale-95"
                      onClick={() => handleMarkDose(medicine, 'taken')}
                    >
                      <Check className="h-4 w-4" />
                      Taken
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 rounded-full px-4 text-sm font-medium gap-1.5 transition-transform active:scale-95"
                      onClick={() => handleMarkDose(medicine, 'skipped')}
                    >
                      <X className="h-4 w-4" />
                      Skip
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
