import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays } from 'date-fns';
import { Search, Download, Loader2, Check, X, Clock, Calendar } from 'lucide-react';
import type { DoseLog, Medicine, SessionType } from '@/types/database';
import { SESSION_INFO } from '@/types/database';
import { cn } from '@/lib/utils';

interface DoseLogWithMedicine extends DoseLog {
  medicine: Medicine;
}

export default function HistoryPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [logs, setLogs] = useState<DoseLogWithMedicine[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const fetchLogs = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('dose_logs')
        .select('*, medicine:medicines(*)')
        .eq('user_id', user.id)
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate)
        .order('scheduled_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs(data as DoseLogWithMedicine[]);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [user, startDate, endDate]);

  const filteredLogs = logs.filter((log) =>
    log.medicine?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedLogs = filteredLogs.reduce((groups, log) => {
    const date = log.scheduled_date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(log);
    return groups;
  }, {} as Record<string, DoseLogWithMedicine[]>);

  const handleExport = () => {
    const csvContent = [
      ['Date', 'Session', 'Medicine', 'Status', 'Taken At', 'Notes'].join(','),
      ...filteredLogs.map((log) =>
        [
          log.scheduled_date,
          log.session_type,
          log.medicine?.name || 'Unknown',
          log.status,
          log.taken_at ? format(new Date(log.taken_at), 'HH:mm') : '',
          log.notes || '',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meditrack-history-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'taken':
        return <Check className="w-4 h-4" />;
      case 'missed':
        return <X className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
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

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">History</h1>
            <p className="text-muted-foreground text-lg">
              View your medicine tracking history
            </p>
          </div>
          <Button className="btn-elderly" variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-5 w-5" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <Card className="card-warm">
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Search by medicine name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12 text-lg"
                  />
                </div>
              </div>
              <div>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-10 h-12 text-lg"
                  />
                </div>
              </div>
              <div>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="pl-10 h-12 text-lg"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="card-warm">
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-success">
                {filteredLogs.filter((l) => l.status === 'taken').length}
              </p>
              <p className="text-muted-foreground">Taken</p>
            </CardContent>
          </Card>
          <Card className="card-warm">
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-destructive">
                {filteredLogs.filter((l) => l.status === 'missed').length}
              </p>
              <p className="text-muted-foreground">Missed</p>
            </CardContent>
          </Card>
          <Card className="card-warm">
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-warning">
                {filteredLogs.filter((l) => l.status === 'skipped').length}
              </p>
              <p className="text-muted-foreground">Skipped</p>
            </CardContent>
          </Card>
        </div>

        {/* History List */}
        {Object.keys(groupedLogs).length === 0 ? (
          <Card className="card-warm">
            <CardContent className="py-16 text-center">
              <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No history found
              </h3>
              <p className="text-muted-foreground">
                Dose logs will appear here once you start tracking your medicines.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedLogs).map(([date, dayLogs]) => (
              <Card key={date} className="card-warm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">
                    {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dayLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between p-4 bg-muted/50 rounded-xl"
                      >
                        <div className="flex items-center gap-4">
                          <Badge variant="secondary" className="text-base py-1 px-3">
                            {SESSION_INFO[log.session_type as SessionType]?.icon}{' '}
                            {SESSION_INFO[log.session_type as SessionType]?.label}
                          </Badge>
                          <div>
                            <p className="font-medium">{log.medicine?.name || 'Unknown Medicine'}</p>
                            <p className="text-sm text-muted-foreground">
                              {log.medicine?.dosage} {log.medicine?.dosage_unit}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {log.taken_at && (
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(log.taken_at), 'h:mm a')}
                            </span>
                          )}
                          <Badge
                            className={cn(
                              'text-base py-1 px-3',
                              log.status === 'taken' && 'status-taken',
                              log.status === 'missed' && 'status-missed',
                              log.status === 'pending' && 'status-pending',
                              log.status === 'skipped' && 'status-skipped'
                            )}
                          >
                            {getStatusIcon(log.status)}
                            <span className="ml-1 capitalize">{log.status}</span>
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
