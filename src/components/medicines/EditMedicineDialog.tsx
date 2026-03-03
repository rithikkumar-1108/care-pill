import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Sun, Cloud, Moon, Clock } from 'lucide-react';
import type { SessionType, Medicine } from '@/types/database';

interface MedicineSessionWithTime {
  session_type: SessionType;
  custom_time: string | null;
}

interface MedicineWithSessions extends Medicine {
  sessions: SessionType[];
  sessionDetails?: MedicineSessionWithTime[];
}

interface EditMedicineDialogProps {
  medicine: MedicineWithSessions;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const dosageUnits = ['tablet', 'capsule', 'ml', 'mg', 'drops', 'puff', 'patch', 'injection'];

const sessionConfig: Record<SessionType, { label: string; icon: React.ReactNode; defaultTime: string }> = {
  morning: { label: 'Morning', icon: <Sun className="h-4 w-4" />, defaultTime: '08:00' },
  afternoon: { label: 'Afternoon', icon: <Cloud className="h-4 w-4" />, defaultTime: '14:00' },
  night: { label: 'Night', icon: <Moon className="h-4 w-4" />, defaultTime: '20:00' },
};

export function EditMedicineDialog({ medicine, open, onOpenChange, onSuccess }: EditMedicineDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [name, setName] = useState(medicine.name);
  const [dosage, setDosage] = useState(medicine.dosage);
  const [dosageUnit, setDosageUnit] = useState(medicine.dosage_unit);
  const [instructions, setInstructions] = useState(medicine.instructions || '');
  const [startDate, setStartDate] = useState(medicine.start_date);
  const [endDate, setEndDate] = useState(medicine.end_date || '');
  const [stockQuantity, setStockQuantity] = useState(medicine.stock_quantity.toString());
  const [lowStockThreshold, setLowStockThreshold] = useState(medicine.low_stock_threshold.toString());
  const [isActive, setIsActive] = useState(medicine.is_active);

  const [sessionEnabled, setSessionEnabled] = useState<Record<SessionType, boolean>>({
    morning: false,
    afternoon: false,
    night: false,
  });
  const [sessionTimes, setSessionTimes] = useState<Record<SessionType, string>>({
    morning: '08:00',
    afternoon: '14:00',
    night: '20:00',
  });

  useEffect(() => {
    setName(medicine.name);
    setDosage(medicine.dosage);
    setDosageUnit(medicine.dosage_unit);
    setInstructions(medicine.instructions || '');
    setStartDate(medicine.start_date);
    setEndDate(medicine.end_date || '');
    setStockQuantity(medicine.stock_quantity.toString());
    setLowStockThreshold(medicine.low_stock_threshold.toString());
    setIsActive(medicine.is_active);

    // Set session states from medicine data
    const enabled: Record<SessionType, boolean> = { morning: false, afternoon: false, night: false };
    const times: Record<SessionType, string> = { morning: '08:00', afternoon: '14:00', night: '20:00' };

    medicine.sessions.forEach((s) => {
      enabled[s] = true;
    });

    if (medicine.sessionDetails) {
      medicine.sessionDetails.forEach((sd) => {
        if (sd.custom_time) {
          times[sd.session_type] = sd.custom_time.slice(0, 5); // "HH:MM:SS" -> "HH:MM"
        }
      });
    }

    setSessionEnabled(enabled);
    setSessionTimes(times);
  }, [medicine]);

  const toggleSession = (session: SessionType) => {
    setSessionEnabled((prev) => ({ ...prev, [session]: !prev[session] }));
  };

  const updateTime = (session: SessionType, time: string) => {
    setSessionTimes((prev) => ({ ...prev, [session]: time }));
  };

  const enabledSessions = (Object.keys(sessionEnabled) as SessionType[]).filter((s) => sessionEnabled[s]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);

    try {
      const { error: medicineError } = await supabase
        .from('medicines')
        .update({
          name,
          dosage,
          dosage_unit: dosageUnit,
          instructions: instructions || null,
          start_date: startDate,
          end_date: endDate || null,
          stock_quantity: parseInt(stockQuantity),
          low_stock_threshold: parseInt(lowStockThreshold),
          is_active: isActive,
        })
        .eq('id', medicine.id);

      if (medicineError) throw medicineError;

      // Delete existing sessions and re-insert with custom times
      const { error: deleteError } = await supabase
        .from('medicine_sessions')
        .delete()
        .eq('medicine_id', medicine.id);

      if (deleteError) throw deleteError;

      if (enabledSessions.length > 0) {
        const sessionInserts = enabledSessions.map((session) => ({
          medicine_id: medicine.id,
          session_type: session,
          custom_time: sessionTimes[session] + ':00',
        }));

        const { error: sessionsError } = await supabase
          .from('medicine_sessions')
          .insert(sessionInserts);

        if (sessionsError) throw sessionsError;
      }

      toast({
        title: 'Medicine Updated! 💊',
        description: `${name} has been updated.`,
      });

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error updating medicine:', error);
      toast({
        title: 'Error',
        description: 'Failed to update medicine. Please try again.',
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Edit Medicine</DialogTitle>
          <DialogDescription className="text-base">
            Update the medicine details below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Active Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
            <div>
              <Label className="text-lg">Active</Label>
              <p className="text-sm text-muted-foreground">
                Inactive medicines won't appear in daily sessions
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          {/* Medicine Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-lg">Medicine Name *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Aspirin, Metformin" required className="h-12 text-lg" />
          </div>

          {/* Dosage */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dosage" className="text-lg">Dosage *</Label>
              <Input id="dosage" value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="e.g., 1, 500, 2.5" required className="h-12 text-lg" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit" className="text-lg">Unit</Label>
              <Select value={dosageUnit} onValueChange={setDosageUnit}>
                <SelectTrigger className="h-12 text-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {dosageUnits.map((unit) => (
                    <SelectItem key={unit} value={unit} className="text-lg">{unit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Session Schedule - Per Medicine */}
          <div className="space-y-3">
            <Label className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Reminder Schedule *
            </Label>
            <div className="space-y-3">
              {(Object.keys(sessionConfig) as SessionType[]).map((session) => (
                <div
                  key={session}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/50 transition-all"
                >
                  <Switch
                    checked={sessionEnabled[session]}
                    onCheckedChange={() => toggleSession(session)}
                  />
                  <div className="flex items-center gap-2 min-w-[100px]">
                    {sessionConfig[session].icon}
                    <span className="font-medium text-sm">{sessionConfig[session].label}</span>
                  </div>
                  {sessionEnabled[session] && (
                    <Input
                      type="time"
                      value={sessionTimes[session]}
                      onChange={(e) => updateTime(session, e.target.value)}
                      className="h-9 w-[130px] ml-auto text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <Label htmlFor="instructions" className="text-lg">Instructions</Label>
            <Textarea id="instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="e.g., Take after food, with water" className="text-lg min-h-[80px]" />
          </div>

          {/* Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="text-lg">Start Date *</Label>
              <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className="h-12 text-lg" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate" className="text-lg">End Date (Optional)</Label>
              <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-12 text-lg" />
            </div>
          </div>

          {/* Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock" className="text-lg">Stock Quantity</Label>
              <Input id="stock" type="number" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} min="0" className="h-12 text-lg" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="threshold" className="text-lg">Low Stock Alert At</Label>
              <Input id="threshold" type="number" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} min="0" className="h-12 text-lg" />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="btn-elderly">Cancel</Button>
            <Button type="submit" className="btn-elderly bg-primary" disabled={isLoading || enabledSessions.length === 0}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
