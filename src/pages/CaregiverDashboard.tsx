import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { 
  Loader2, User, Pill, CheckCircle, XCircle, Clock, AlertTriangle, 
  Package, Activity, Calendar, TrendingUp, Heart 
} from 'lucide-react';
import type { SessionType, Medicine, DoseLogWithMedicine, Profile } from '@/types/database';

interface LinkedPatient {
  id: string;
  patient_id: string;
  profile: Profile;
}

interface PatientDashboardData {
  medicines: Medicine[];
  doseLogs: DoseLogWithMedicine[];
  todayStats: {
    taken: number;
    pending: number;
    missed: number;
    skipped: number;
    total: number;
  };
  weeklyAdherence: number;
  lowStockMedicines: Medicine[];
}

type PatientStatus = 'excellent' | 'good' | 'needs_attention' | 'critical';

function getPatientStatus(adherence: number, missedToday: number): PatientStatus {
  if (adherence >= 90 && missedToday === 0) return 'excellent';
  if (adherence >= 70 && missedToday <= 1) return 'good';
  if (adherence >= 50) return 'needs_attention';
  return 'critical';
}

function getStatusInfo(status: PatientStatus) {
  switch (status) {
    case 'excellent':
      return { 
        label: 'Excellent', 
        color: 'text-success border-success bg-success/10',
        icon: Heart,
        message: 'Taking all medications on time'
      };
    case 'good':
      return { 
        label: 'Good', 
        color: 'text-primary border-primary bg-primary/10',
        icon: TrendingUp,
        message: 'Mostly following the schedule'
      };
    case 'needs_attention':
      return { 
        label: 'Needs Attention', 
        color: 'text-warning border-warning bg-warning/10',
        icon: AlertTriangle,
        message: 'Some doses being missed'
      };
    case 'critical':
      return { 
        label: 'Critical', 
        color: 'text-destructive border-destructive bg-destructive/10',
        icon: XCircle,
        message: 'Many doses missed - please check in'
      };
  }
}

export default function CaregiverDashboardPage() {
  const { user, isCaregiver } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [linkedPatients, setLinkedPatients] = useState<LinkedPatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<LinkedPatient | null>(null);
  const [patientData, setPatientData] = useState<PatientDashboardData | null>(null);

  const today = format(new Date(), 'yyyy-MM-dd');
  const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');

  useEffect(() => {
    fetchLinkedPatients();
  }, [user]);

  const fetchLinkedPatients = async () => {
    if (!user) return;

    try {
      const { data: links, error } = await supabase
        .from('caregiver_links')
        .select('id, patient_id')
        .eq('caregiver_id', user.id)
        .eq('status', 'accepted');

      if (error) throw error;

      if (links && links.length > 0) {
        const patientIds = links.map(l => l.patient_id);
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', patientIds);

        if (profileError) throw profileError;

        const linkedPatientsWithProfiles = links.map(link => ({
          ...link,
          profile: profiles?.find(p => p.user_id === link.patient_id) as Profile,
        }));

        setLinkedPatients(linkedPatientsWithProfiles);
        
        if (linkedPatientsWithProfiles.length > 0) {
          setSelectedPatient(linkedPatientsWithProfiles[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching linked patients:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (selectedPatient) {
      fetchPatientData(selectedPatient.patient_id);
    }
  }, [selectedPatient]);

  const fetchPatientData = async (patientId: string) => {
    try {
      const [medicinesRes, logsRes, weeklyLogsRes] = await Promise.all([
        supabase
          .from('medicines')
          .select('*')
          .eq('user_id', patientId)
          .eq('is_active', true),
        supabase
          .from('dose_logs')
          .select('*, medicine:medicines(*)')
          .eq('user_id', patientId)
          .eq('scheduled_date', today),
        supabase
          .from('dose_logs')
          .select('status')
          .eq('user_id', patientId)
          .gte('scheduled_date', weekAgo)
          .lte('scheduled_date', today),
      ]);

      const medicines = (medicinesRes.data || []) as Medicine[];
      const doseLogs = (logsRes.data || []) as DoseLogWithMedicine[];
      const weeklyLogs = weeklyLogsRes.data || [];

      const takenCount = doseLogs.filter(l => l.status === 'taken').length;
      const pendingCount = doseLogs.filter(l => l.status === 'pending').length;
      const missedCount = doseLogs.filter(l => l.status === 'missed').length;
      const skippedCount = doseLogs.filter(l => l.status === 'skipped').length;

      const todayStats = {
        taken: takenCount,
        pending: pendingCount,
        missed: missedCount,
        skipped: skippedCount,
        total: doseLogs.length,
      };

      // Calculate weekly adherence
      const weeklyTaken = weeklyLogs.filter(l => l.status === 'taken').length;
      const weeklyTotal = weeklyLogs.length;
      const weeklyAdherence = weeklyTotal > 0 ? Math.round((weeklyTaken / weeklyTotal) * 100) : 100;

      const lowStockMedicines = medicines.filter(m => m.stock_quantity <= m.low_stock_threshold);

      setPatientData({
        medicines,
        doseLogs,
        todayStats,
        weeklyAdherence,
        lowStockMedicines,
      });
    } catch (error) {
      console.error('Error fetching patient data:', error);
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

  if (linkedPatients.length === 0) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
          <User className="w-16 h-16 text-muted-foreground" />
          <h2 className="text-2xl font-bold">No Linked Patients</h2>
          <p className="text-muted-foreground text-lg max-w-md">
            You don't have any patients linked to your account yet. 
            Ask your patient to send you an invitation from their Settings page.
          </p>
        </div>
      </AppLayout>
    );
  }

  const patientStatus = patientData 
    ? getPatientStatus(patientData.weeklyAdherence, patientData.todayStats.missed)
    : 'good';
  const statusInfo = getStatusInfo(patientStatus);
  const StatusIcon = statusInfo.icon;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Caregiver Dashboard 👨‍⚕️</h1>
          <p className="text-lg text-muted-foreground">
            Monitor your patients' medicine adherence and health status
          </p>
        </div>

        {/* Patient Selector */}
        {linkedPatients.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {linkedPatients.map((patient) => (
              <Button
                key={patient.id}
                variant={selectedPatient?.id === patient.id ? 'default' : 'outline'}
                className="btn-elderly"
                onClick={() => setSelectedPatient(patient)}
              >
                <User className="mr-2 h-5 w-5" />
                {patient.profile?.full_name || 'Patient'}
              </Button>
            ))}
          </div>
        )}

        {selectedPatient && patientData && (
          <>
            {/* Patient Info Card with Status */}
            <Card className="card-warm overflow-hidden">
              <div className={`h-2 ${patientStatus === 'excellent' ? 'bg-success' : patientStatus === 'good' ? 'bg-primary' : patientStatus === 'needs_attention' ? 'bg-warning' : 'bg-destructive'}`} />
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">{selectedPatient.profile?.full_name}</CardTitle>
                      <CardDescription className="text-base">
                        {selectedPatient.profile?.age && `${selectedPatient.profile.age} years old`}
                        {selectedPatient.profile?.age && selectedPatient.profile?.gender && ' • '}
                        {selectedPatient.profile?.gender && `${selectedPatient.profile.gender}`}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={`${statusInfo.color} text-lg px-4 py-2 flex items-center gap-2`}>
                    <StatusIcon className="h-5 w-5" />
                    {statusInfo.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  {statusInfo.message}
                </p>
                {selectedPatient.profile?.health_condition && (
                  <div className="p-3 bg-muted/30 rounded-xl">
                    <p className="text-sm text-muted-foreground">Health Condition</p>
                    <p className="font-medium">{selectedPatient.profile.health_condition}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Weekly Adherence */}
            <Card className="card-warm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Calendar className="h-5 w-5 text-primary" />
                  Weekly Adherence
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Last 7 days</span>
                  <span className="text-2xl font-bold">{patientData.weeklyAdherence}%</span>
                </div>
                <Progress value={patientData.weeklyAdherence} className="h-3" />
                <p className="text-sm text-muted-foreground">
                  {patientData.weeklyAdherence >= 80 
                    ? 'Great adherence! Keep up the good work.'
                    : patientData.weeklyAdherence >= 60
                    ? 'Room for improvement. Consider setting reminders.'
                    : 'Low adherence. Please check in with your patient.'}
                </p>
              </CardContent>
            </Card>

            {/* Today's Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="card-warm">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-success/10">
                      <CheckCircle className="w-7 h-7 text-success" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold">{patientData.todayStats.taken}</p>
                      <p className="text-sm text-muted-foreground">Taken Today</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-warm">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-warning/10">
                      <Clock className="w-7 h-7 text-warning" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold">{patientData.todayStats.pending}</p>
                      <p className="text-sm text-muted-foreground">Pending</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-warm">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-muted/50">
                      <XCircle className="w-7 h-7 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold">{patientData.todayStats.skipped}</p>
                      <p className="text-sm text-muted-foreground">Skipped</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-warm">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-destructive/10">
                      <XCircle className="w-7 h-7 text-destructive" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold">{patientData.todayStats.missed}</p>
                      <p className="text-sm text-muted-foreground">Missed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Low Stock Alerts */}
            {patientData.lowStockMedicines.length > 0 && (
              <Card className="card-warm border-warning">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-warning">
                    <AlertTriangle className="h-6 w-6" />
                    Low Stock Alert
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {patientData.lowStockMedicines.map((med) => (
                      <div
                        key={med.id}
                        className="flex items-center justify-between p-3 bg-warning/10 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <Package className="h-5 w-5 text-warning" />
                          <span className="font-medium">{med.name}</span>
                        </div>
                        <Badge variant="outline" className="text-warning border-warning">
                          {med.stock_quantity} left
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Today's Dose Log */}
            <Card className="card-warm">
              <CardHeader>
                <CardTitle className="text-xl">Today's Medicine Schedule</CardTitle>
                <CardDescription>
                  {patientData.todayStats.total > 0 
                    ? `${patientData.todayStats.taken} of ${patientData.todayStats.total} doses completed`
                    : 'No doses scheduled for today'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {patientData.doseLogs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-6">
                    No medicines scheduled for today.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {patientData.doseLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between p-4 bg-muted/30 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${
                            log.status === 'taken' ? 'bg-success/10' :
                            log.status === 'missed' ? 'bg-destructive/10' :
                            log.status === 'skipped' ? 'bg-muted' :
                            'bg-warning/10'
                          }`}>
                            {log.status === 'taken' ? (
                              <CheckCircle className="h-5 w-5 text-success" />
                            ) : log.status === 'missed' ? (
                              <XCircle className="h-5 w-5 text-destructive" />
                            ) : log.status === 'skipped' ? (
                              <XCircle className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <Clock className="h-5 w-5 text-warning" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{log.medicine?.name}</p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {log.session_type} • {log.medicine?.dosage} {log.medicine?.dosage_unit}
                            </p>
                          </div>
                        </div>
                        <Badge
                          className={
                            log.status === 'taken'
                              ? 'status-taken'
                              : log.status === 'missed'
                              ? 'status-missed'
                              : log.status === 'skipped'
                              ? 'status-skipped'
                              : 'status-pending'
                          }
                        >
                          {log.status === 'taken' && log.taken_at 
                            ? `Taken at ${format(new Date(log.taken_at), 'h:mm a')}`
                            : log.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active Medicines */}
            <Card className="card-warm">
              <CardHeader>
                <CardTitle className="text-xl">Active Medicines</CardTitle>
                <CardDescription>
                  {patientData.medicines.length} medicine{patientData.medicines.length !== 1 ? 's' : ''} being tracked
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {patientData.medicines.map((med) => (
                    <div
                      key={med.id}
                      className="flex items-center justify-between p-4 bg-muted/30 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-primary/10">
                          <Pill className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{med.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {med.dosage} {med.dosage_unit}
                          </p>
                          {med.instructions && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {med.instructions}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant="outline"
                          className={
                            med.stock_quantity <= med.low_stock_threshold
                              ? 'text-warning border-warning'
                              : 'text-success border-success'
                          }
                        >
                          Stock: {med.stock_quantity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
