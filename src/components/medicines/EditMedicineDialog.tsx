import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import type { SessionType, Medicine } from '@/types/database';
import { SESSION_INFO } from '@/types/database';

interface MedicineWithSessions extends Medicine {
  sessions: SessionType[];
}

interface EditMedicineDialogProps {
  medicine: MedicineWithSessions;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const dosageUnits = ['tablet', 'capsule', 'ml', 'mg', 'drops', 'puff', 'patch', 'injection'];

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
  const [sessions, setSessions] = useState<SessionType[]>(medicine.sessions);
  const [isActive, setIsActive] = useState(medicine.is_active);

  useEffect(() => {
    setName(medicine.name);
    setDosage(medicine.dosage);
    setDosageUnit(medicine.dosage_unit);
    setInstructions(medicine.instructions || '');
    setStartDate(medicine.start_date);
    setEndDate(medicine.end_date || '');
    setStockQuantity(medicine.stock_quantity.toString());
    setLowStockThreshold(medicine.low_stock_threshold.toString());
    setSessions(medicine.sessions);
    setIsActive(medicine.is_active);
  }, [medicine]);

  const handleSessionToggle = (session: SessionType) => {
    if (sessions.includes(session)) {
      setSessions(sessions.filter((s) => s !== session));
    } else {
      setSessions([...sessions, session]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);

    try {
      // Update medicine
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

      // Delete existing sessions and insert new ones
      const { error: deleteError } = await supabase
        .from('medicine_sessions')
        .delete()
        .eq('medicine_id', medicine.id);

      if (deleteError) throw deleteError;

      if (sessions.length > 0) {
        const sessionInserts = sessions.map((session) => ({
          medicine_id: medicine.id,
          session_type: session,
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
            <Label htmlFor="name" className="text-lg">
              Medicine Name *
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Aspirin, Metformin"
              required
              className="h-12 text-lg"
            />
          </div>

          {/* Dosage */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dosage" className="text-lg">
                Dosage *
              </Label>
              <Input
                id="dosage"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="e.g., 1, 500, 2.5"
                required
                className="h-12 text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit" className="text-lg">
                Unit
              </Label>
              <Select value={dosageUnit} onValueChange={setDosageUnit}>
                <SelectTrigger className="h-12 text-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dosageUnits.map((unit) => (
                    <SelectItem key={unit} value={unit} className="text-lg">
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sessions */}
          <div className="space-y-3">
            <Label className="text-lg">Assign to Sessions *</Label>
            <div className="flex flex-wrap gap-3">
              {(Object.keys(SESSION_INFO) as SessionType[]).map((session) => (
                <div key={session} className="flex items-center space-x-2">
                  <Checkbox
                    id={`edit-${session}`}
                    checked={sessions.includes(session)}
                    onCheckedChange={() => handleSessionToggle(session)}
                    className="w-6 h-6"
                  />
                  <Label htmlFor={`edit-${session}`} className="text-lg cursor-pointer">
                    {SESSION_INFO[session].icon} {SESSION_INFO[session].label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <Label htmlFor="instructions" className="text-lg">
              Instructions
            </Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g., Take after food, with water"
              className="text-lg min-h-[80px]"
            />
          </div>

          {/* Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="text-lg">
                Start Date *
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="h-12 text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate" className="text-lg">
                End Date (Optional)
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-12 text-lg"
              />
            </div>
          </div>

          {/* Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock" className="text-lg">
                Stock Quantity
              </Label>
              <Input
                id="stock"
                type="number"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                min="0"
                className="h-12 text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="threshold" className="text-lg">
                Low Stock Alert At
              </Label>
              <Input
                id="threshold"
                type="number"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                min="0"
                className="h-12 text-lg"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="btn-elderly"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="btn-elderly bg-primary"
              disabled={isLoading || sessions.length === 0}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
