import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import { format } from 'date-fns';
import type { SessionType } from '@/types/database';
import { SESSION_INFO } from '@/types/database';

interface AddMedicineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const dosageUnits = ['tablet', 'capsule', 'ml', 'mg', 'drops', 'puff', 'patch', 'injection'];

export function AddMedicineDialog({ open, onOpenChange, onSuccess }: AddMedicineDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [dosageUnit, setDosageUnit] = useState('tablet');
  const [instructions, setInstructions] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState('');
  const [stockQuantity, setStockQuantity] = useState('30');
  const [lowStockThreshold, setLowStockThreshold] = useState('10');
  const [sessions, setSessions] = useState<SessionType[]>([]);

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
      // Insert medicine
      const { data: medicine, error: medicineError } = await supabase
        .from('medicines')
        .insert({
          user_id: user.id,
          name,
          dosage,
          dosage_unit: dosageUnit,
          instructions: instructions || null,
          start_date: startDate,
          end_date: endDate || null,
          stock_quantity: parseInt(stockQuantity),
          low_stock_threshold: parseInt(lowStockThreshold),
        })
        .select()
        .single();

      if (medicineError) throw medicineError;

      // Insert medicine sessions
      if (sessions.length > 0 && medicine) {
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
        title: 'Medicine Added! 💊',
        description: `${name} has been added to your list.`,
      });

      // Reset form
      setName('');
      setDosage('');
      setDosageUnit('tablet');
      setInstructions('');
      setStartDate(format(new Date(), 'yyyy-MM-dd'));
      setEndDate('');
      setStockQuantity('30');
      setLowStockThreshold('10');
      setSessions([]);

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error adding medicine:', error);
      toast({
        title: 'Error',
        description: 'Failed to add medicine. Please try again.',
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Add New Medicine</DialogTitle>
          <DialogDescription className="text-base">
            Fill in the details to add a medicine to your schedule.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
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
                <div
                  key={session}
                  className="flex items-center space-x-2"
                >
                  <Checkbox
                    id={session}
                    checked={sessions.includes(session)}
                    onCheckedChange={() => handleSessionToggle(session)}
                    className="w-6 h-6"
                  />
                  <Label htmlFor={session} className="text-lg cursor-pointer">
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
              {isLoading ? 'Adding...' : 'Add Medicine'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
