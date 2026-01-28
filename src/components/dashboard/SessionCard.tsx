import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Clock, Sun, Cloud, Moon, Pill } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { SessionType, Medicine, DoseLogWithMedicine, SessionSchedule, DoseStatus } from '@/types/database';
import { cn } from '@/lib/utils';

interface SessionCardProps {
  sessionType: SessionType;
  schedule: SessionSchedule | undefined;
  medicines: Medicine[];
  doseLogs: DoseLogWithMedicine[];
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

export function SessionCard({ sessionType, schedule, medicines, doseLogs, onUpdate }: SessionCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const scheduledTime = schedule?.scheduled_time
    ? format(new Date(`2000-01-01T${schedule.scheduled_time}`), 'h:mm a')
    : sessionType === 'morning'
    ? '8:00 AM'
    : sessionType === 'afternoon'
    ? '2:00 PM'
    : '8:00 PM';

  const handleMarkDose = async (medicine: Medicine, status: DoseStatus) => {
    if (!user) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    
    try {
      // Check if dose log exists
      const existingLog = doseLogs.find(
        (log) => log.medicine_id === medicine.id && log.session_type === sessionType
      );

      if (existingLog) {
        // Update existing log
        const { error } = await supabase
          .from('dose_logs')
          .update({
            status,
            taken_at: status === 'taken' ? new Date().toISOString() : null,
          })
          .eq('id', existingLog.id);

        if (error) throw error;
      } else {
        // Create new log
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
          <Badge className="status-taken text-base px-3 py-1">
            <Check className="w-4 h-4 mr-1" /> Taken
          </Badge>
        );
      case 'missed':
        return (
          <Badge className="status-missed text-base px-3 py-1">
            <X className="w-4 h-4 mr-1" /> Missed
          </Badge>
        );
      case 'skipped':
        return (
          <Badge className="status-skipped text-base px-3 py-1">
            <X className="w-4 h-4 mr-1" /> Skipped
          </Badge>
        );
      default:
        return (
          <Badge className="status-pending text-base px-3 py-1">
            <Clock className="w-4 h-4 mr-1" /> Pending
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
            return (
              <div
                key={medicine.id}
                className="p-4 bg-white/50 dark:bg-black/10 rounded-xl space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-lg">{medicine.name}</h4>
                    <p className="text-muted-foreground">
                      {medicine.dosage} {medicine.dosage_unit}
                    </p>
                    {medicine.instructions && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {medicine.instructions}
                      </p>
                    )}
                  </div>
                  {getStatusBadge(status)}
                </div>

                {status === 'pending' && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      className="flex-1 btn-elderly bg-success hover:bg-success/90"
                      onClick={() => handleMarkDose(medicine, 'taken')}
                    >
                      <Check className="mr-2 h-5 w-5" />
                      Take Medicine
                    </Button>
                    <Button
                      variant="outline"
                      className="btn-elderly shrink-0"
                      onClick={() => handleMarkDose(medicine, 'skipped')}
                    >
                      <X className="mr-2 h-5 w-5" />
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
