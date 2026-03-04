import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Edit, Trash2, Pill, Loader2, Clock, Upload } from 'lucide-react';
import type { Medicine, MedicineSession, SessionType } from '@/types/database';
import { getStockStatus, SESSION_INFO } from '@/types/database';
import { AddMedicineDialog } from '@/components/medicines/AddMedicineDialog';
import { EditMedicineDialog } from '@/components/medicines/EditMedicineDialog';
import { PrescriptionUploadDialog } from '@/components/prescription/PrescriptionUploadDialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface MedicineSessionWithTime {
  session_type: SessionType;
  custom_time: string | null;
}

interface MedicineWithSessions extends Medicine {
  sessions: SessionType[];
  sessionDetails?: MedicineSessionWithTime[];
}

export default function MedicinesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [medicines, setMedicines] = useState<MedicineWithSessions[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<MedicineWithSessions | null>(null);

  const handleAddSuccess = () => {
    fetchMedicines();
  };

  const handleBulkSaveComplete = () => {
    fetchMedicines();
  };

  const fetchMedicines = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data: medicinesData, error: medicinesError } = await supabase
        .from('medicines')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (medicinesError) throw medicinesError;

      const { data: sessionsData, error: sessionsError } = await supabase
        .from('medicine_sessions')
        .select('*');

      if (sessionsError) throw sessionsError;

      const medicinesWithSessions = (medicinesData as Medicine[]).map((medicine) => {
        const medSessions = (sessionsData as any[]).filter((s) => s.medicine_id === medicine.id);
        return {
          ...medicine,
          sessions: medSessions.map((s) => s.session_type as SessionType),
          sessionDetails: medSessions.map((s) => ({
            session_type: s.session_type as SessionType,
            custom_time: s.custom_time as string | null,
          })),
        };
      });

      setMedicines(medicinesWithSessions);
    } catch (error) {
      console.error('Error fetching medicines:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchMedicines();
  }, [user]);

  const handleDelete = async (medicineId: string) => {
    if (!confirm('Are you sure you want to delete this medicine?')) return;

    try {
      const { error } = await supabase
        .from('medicines')
        .delete()
        .eq('id', medicineId);

      if (error) throw error;

      toast({
        title: 'Medicine Deleted',
        description: 'The medicine has been removed from your list.',
      });

      fetchMedicines();
    } catch (error) {
      console.error('Error deleting medicine:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete medicine',
        variant: 'destructive',
      });
    }
  };

  const getStockBadge = (quantity: number, threshold: number) => {
    const status = getStockStatus(quantity, threshold);
    switch (status) {
      case 'critical':
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/20">
            Critical: {quantity} left
          </Badge>
        );
      case 'low':
        return (
          <Badge className="bg-warning/10 text-warning border-warning/20">
            Low: {quantity} left
          </Badge>
        );
      default:
        return (
          <Badge className="bg-success/10 text-success border-success/20">
            {quantity} in stock
          </Badge>
        );
    }
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return null;
    try {
      return format(new Date(`2000-01-01T${timeStr}`), 'h:mm a');
    } catch {
      return null;
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
            <h1 className="text-3xl font-bold text-foreground">My Medicines</h1>
            <p className="text-muted-foreground text-lg">
              Manage your medicine schedule and stock
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="btn-elderly" onClick={() => setIsUploadOpen(true)}>
              <Upload className="mr-2 h-5 w-5" />
              Upload Prescription
            </Button>
            <Button className="btn-elderly bg-primary" onClick={() => setIsAddOpen(true)}>
              <Plus className="mr-2 h-5 w-5" />
              Add Medicine
            </Button>
          </div>
        </div>

        {/* Medicine List */}
        {medicines.length === 0 ? (
          <Card className="card-warm">
            <CardContent className="py-16 text-center">
              <Pill className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No medicines added yet</h3>
              <p className="text-muted-foreground mb-6">Start by adding your first medicine to track</p>
              <Button className="btn-elderly bg-primary" onClick={() => setIsAddOpen(true)}>
                <Plus className="mr-2 h-5 w-5" />
                Add Your First Medicine
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {medicines.map((medicine) => (
              <Card key={medicine.id} className={cn('card-warm', !medicine.is_active && 'opacity-60')}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                        <Pill className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{medicine.name}</CardTitle>
                        <p className="text-muted-foreground">
                          {medicine.dosage} {medicine.dosage_unit}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setEditingMedicine(medicine)}>
                        <Edit className="h-5 w-5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:text-destructive" onClick={() => handleDelete(medicine.id)}>
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Sessions with custom times */}
                  <div className="flex flex-wrap gap-2">
                    {medicine.sessionDetails && medicine.sessionDetails.length > 0 ? (
                      medicine.sessionDetails.map((sd) => {
                        const timeDisplay = formatTime(sd.custom_time);
                        return (
                          <Badge key={sd.session_type} variant="secondary" className="text-sm py-1 px-3 gap-1.5">
                            {SESSION_INFO[sd.session_type].icon} {SESSION_INFO[sd.session_type].label}
                            {timeDisplay && (
                              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                <Clock className="w-3 h-3" /> {timeDisplay}
                              </span>
                            )}
                          </Badge>
                        );
                      })
                    ) : medicine.sessions.length > 0 ? (
                      medicine.sessions.map((session) => (
                        <Badge key={session} variant="secondary" className="text-base py-1 px-3">
                          {SESSION_INFO[session].icon} {SESSION_INFO[session].label}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-sm">No sessions assigned</span>
                    )}
                  </div>

                  {medicine.instructions && (
                    <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                      {medicine.instructions}
                    </p>
                  )}

                  <div className="text-sm text-muted-foreground">
                    <span>{format(new Date(medicine.start_date), 'MMM d, yyyy')}</span>
                    {medicine.end_date && (
                      <span> → {format(new Date(medicine.end_date), 'MMM d, yyyy')}</span>
                    )}
                  </div>

                  {getStockBadge(medicine.stock_quantity, medicine.low_stock_threshold)}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <AddMedicineDialog
          open={isAddOpen}
          onOpenChange={setIsAddOpen}
          onSuccess={handleAddSuccess}
        />

        <PrescriptionUploadDialog
          open={isUploadOpen}
          onOpenChange={setIsUploadOpen}
          onBulkSaveComplete={handleBulkSaveComplete}
        />

        {editingMedicine && (
          <EditMedicineDialog
            medicine={editingMedicine}
            open={!!editingMedicine}
            onOpenChange={() => setEditingMedicine(null)}
            onSuccess={fetchMedicines}
          />
        )}
      </div>
    </AppLayout>
  );
}
