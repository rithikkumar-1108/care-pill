import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isFuture } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2, Check, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DoseLog, SessionType } from '@/types/database';
import { SESSION_INFO } from '@/types/database';
import { cn } from '@/lib/utils';

interface DayStatus {
  date: Date;
  taken: number;
  missed: number;
  pending: number;
  total: number;
}

export default function CalendarPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [doseLogs, setDoseLogs] = useState<DoseLog[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDayLogs, setSelectedDayLogs] = useState<DoseLog[]>([]);

  const fetchDoseLogs = async () => {
    if (!user) return;

    setIsLoading(true);
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

    try {
      const { data, error } = await supabase
        .from('dose_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('scheduled_date', start)
        .lte('scheduled_date', end);

      if (error) throw error;
      setDoseLogs(data as DoseLog[]);
    } catch (error) {
      console.error('Error fetching dose logs:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchDoseLogs();
  }, [user, currentMonth]);

  const getDayStatus = (date: Date): DayStatus => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayLogs = doseLogs.filter((log) => log.scheduled_date === dateStr);

    return {
      date,
      taken: dayLogs.filter((l) => l.status === 'taken').length,
      missed: dayLogs.filter((l) => l.status === 'missed').length,
      pending: dayLogs.filter((l) => l.status === 'pending').length,
      total: dayLogs.length,
    };
  };

  const getDayColor = (status: DayStatus): string => {
    if (status.total === 0) return 'bg-muted';
    if (isFuture(status.date) && !isToday(status.date)) return 'bg-muted';
    if (status.missed > 0) return 'bg-destructive/20 border-destructive';
    if (status.pending > 0 && status.taken > 0) return 'bg-warning/20 border-warning';
    if (status.taken === status.total) return 'bg-success/20 border-success';
    if (status.pending === status.total) return 'bg-muted';
    return 'bg-muted';
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const dateStr = format(date, 'yyyy-MM-dd');
    setSelectedDayLogs(doseLogs.filter((log) => log.scheduled_date === dateStr));
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const firstDayOfMonth = startOfMonth(currentMonth).getDay();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Calendar</h1>
          <p className="text-muted-foreground text-lg">
            Track your medicine adherence over time
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-success/20 border-2 border-success" />
            <span className="text-sm">All Taken</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-warning/20 border-2 border-warning" />
            <span className="text-sm">Partial</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-destructive/20 border-2 border-destructive" />
            <span className="text-sm">Missed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-muted border-2 border-muted" />
            <span className="text-sm">Pending/No Data</span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Calendar */}
          <Card className="card-warm lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12"
                  onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <CardTitle className="text-2xl">
                  {format(currentMonth, 'MMMM yyyy')}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12"
                  onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Week days header */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {weekDays.map((day) => (
                  <div key={day} className="text-center font-medium text-muted-foreground p-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-2">
                {/* Empty cells for days before the first day of month */}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {/* Day cells */}
                {days.map((day) => {
                  const status = getDayStatus(day);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => handleDateClick(day)}
                      className={cn(
                        'aspect-square rounded-xl flex flex-col items-center justify-center border-2 transition-all',
                        getDayColor(status),
                        isToday(day) && 'ring-2 ring-primary ring-offset-2',
                        isSelected && 'ring-2 ring-secondary ring-offset-2',
                        'hover:scale-105'
                      )}
                    >
                      <span className={cn('text-lg font-medium', isToday(day) && 'text-primary')}>
                        {format(day, 'd')}
                      </span>
                      {status.total > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {status.taken}/{status.total}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Day Detail */}
          <Card className="card-warm">
            <CardHeader>
              <CardTitle className="text-xl">
                {selectedDate
                  ? format(selectedDate, 'EEEE, MMMM d')
                  : 'Select a Day'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedDate ? (
                <p className="text-muted-foreground text-center py-8">
                  Click on a day to see details
                </p>
              ) : selectedDayLogs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No medicine logs for this day
                </p>
              ) : (
                <div className="space-y-4">
                  {(['morning', 'afternoon', 'night'] as SessionType[]).map((session) => {
                    const sessionLogs = selectedDayLogs.filter((l) => l.session_type === session);
                    if (sessionLogs.length === 0) return null;

                    return (
                      <div key={session} className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2">
                          <span>{SESSION_INFO[session].icon}</span>
                          {SESSION_INFO[session].label}
                        </h4>
                        <div className="space-y-2 pl-6">
                          {sessionLogs.map((log) => (
                            <div
                              key={log.id}
                              className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                            >
                              <span className="text-sm">Medicine</span>
                              <Badge
                                className={cn(
                                  'text-sm',
                                  log.status === 'taken' && 'status-taken',
                                  log.status === 'missed' && 'status-missed',
                                  log.status === 'pending' && 'status-pending',
                                  log.status === 'skipped' && 'status-skipped'
                                )}
                              >
                                {log.status === 'taken' && <Check className="w-3 h-3 mr-1" />}
                                {log.status === 'missed' && <X className="w-3 h-3 mr-1" />}
                                {log.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                                {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
