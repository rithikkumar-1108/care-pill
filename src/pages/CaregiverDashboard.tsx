import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Loader2, User, Pill, CheckCircle, XCircle, Clock, AlertTriangle, Package } from 'lucide-react';
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
  };
  lowStockMedicines: Medicine[];
}

export default function CaregiverDashboardPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [linkedPatients, setLinkedPatients] = useState<LinkedPatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<LinkedPatient | null>(null);
  const [patientData, setPatientData] = useState<PatientDashboardData | null>(null);

  const today = format(new Date(), 'yyyy-MM-dd');

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
        // Fetch profiles for each patient
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
      const [medicinesRes, logsRes] = await Promise.all([
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
      ]);

      const medicines = (medicinesRes.data || []) as Medicine[];
      const doseLogs = (logsRes.data || []) as DoseLogWithMedicine[];

      const todayStats = {
        taken: doseLogs.filter(l => l.status === 'taken').length,
        pending: doseLogs.filter(l => l.status === 'pending').length,
        missed: doseLogs.filter(l => l.status === 'missed').length,
        skipped: doseLogs.filter(l => l.status === 'skipped').length,
      };

      const lowStockMedicines = medicines.filter(m => m.stock_quantity <= m.low_stock_threshold);

      setPatientData({
        medicines,
        doseLogs,
        todayStats,
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

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Caregiver Dashboard 👨‍⚕️</h1>
          <p className="text-lg text-muted-foreground">
            Monitor your patients' medicine adherence
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
            {/* Patient Info Card */}
            <Card className="card-warm">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <User className="h-8 w-8 text-primary" />
                  {selectedPatient.profile?.full_name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {selectedPatient.profile?.age && (
                  <p className="text-muted-foreground">Age: {selectedPatient.profile.age}</p>
                )}
                {selectedPatient.profile?.health_condition && (
                  <p className="text-muted-foreground">
                    Health Condition: {selectedPatient.profile.health_condition}
                  </p>
                )}
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
                <CardTitle className="text-xl">Today's Dose Log</CardTitle>
              </CardHeader>
              <CardContent>
                {patientData.doseLogs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-6">
                    No dose logs for today yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {patientData.doseLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between p-4 bg-muted/30 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <Pill className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium">{log.medicine?.name}</p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {log.session_type} session
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
                          {log.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Medicine List */}
            <Card className="card-warm">
              <CardHeader>
                <CardTitle className="text-xl">Active Medicines</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {patientData.medicines.map((med) => (
                    <div
                      key={med.id}
                      className="flex items-center justify-between p-4 bg-muted/30 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <Pill className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">{med.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {med.dosage} {med.dosage_unit}
                          </p>
                        </div>
                      </div>
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
