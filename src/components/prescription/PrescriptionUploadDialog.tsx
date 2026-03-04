import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Upload, Camera, FileImage, FileText, Loader2, AlertTriangle,
  Check, ChevronDown, ChevronUp, Sun, Cloud, Moon, X, Pill,
} from 'lucide-react';
import type { SessionType } from '@/types/database';

interface PrescriptionUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMedicinesExtracted: (medicines: ExtractedMedicine[]) => void;
}

export interface ExtractedMedicine {
  name: string;
  dosage: string;
  dosage_unit: string;
  frequency: string;
  instructions: string;
  duration_days: number | null;
  morning_enabled: boolean;
  afternoon_enabled: boolean;
  night_enabled: boolean;
  morning_time: string;
  afternoon_time: string;
  night_time: string;
  confidence: 'high' | 'medium' | 'low';
}

type Step = 'upload' | 'processing' | 'review';

const sessionIcons: Record<SessionType, React.ReactNode> = {
  morning: <Sun className="h-3.5 w-3.5" />,
  afternoon: <Cloud className="h-3.5 w-3.5" />,
  night: <Moon className="h-3.5 w-3.5" />,
};

export function PrescriptionUploadDialog({
  open,
  onOpenChange,
  onMedicinesExtracted,
}: PrescriptionUploadDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [medicines, setMedicines] = useState<ExtractedMedicine[]>([]);
  const [rawText, setRawText] = useState('');
  const [showRawText, setShowRawText] = useState(false);
  const [parseError, setParseError] = useState(false);
  const [doctorName, setDoctorName] = useState('');
  const [prescriptionDate, setPrescriptionDate] = useState('');

  const reset = () => {
    setStep('upload');
    setFile(null);
    setPreview(null);
    setMedicines([]);
    setRawText('');
    setShowRawText(false);
    setParseError(false);
    setDoctorName('');
    setPrescriptionDate('');
  };

  const handleFileSelect = (selectedFile: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(selectedFile.type)) {
      toast({ title: 'Invalid file', description: 'Please upload JPG, PNG, or PDF', variant: 'destructive' });
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max file size is 10MB', variant: 'destructive' });
      return;
    }
    setFile(selectedFile);
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  const handleProcess = async () => {
    if (!file || !user) return;
    setStep('processing');
    setIsProcessing(true);

    try {
      // Upload file to storage
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('prescriptions')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Convert to base64 for AI
      const base64 = await fileToBase64(file);

      // Call edge function
      const { data, error } = await supabase.functions.invoke('parse-prescription', {
        body: { imageBase64: base64, mimeType: file.type },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      // Save prescription record
      const { data: { publicUrl } } = supabase.storage
        .from('prescriptions')
        .getPublicUrl(filePath);

      await supabase.from('prescriptions').insert({
        user_id: user.id,
        file_url: filePath,
        file_name: file.name,
        file_type: file.type,
        extracted_text: data.raw_text || '',
        extracted_medicines: data.medicines || [],
        status: data.parse_error ? 'error' : 'processed',
      });

      setRawText(data.raw_text || '');
      setDoctorName(data.doctor_name || '');
      setPrescriptionDate(data.date || '');
      setParseError(!!data.parse_error);

      if (data.medicines && data.medicines.length > 0) {
        setMedicines(
          data.medicines.map((m: any) => ({
            name: m.name || '',
            dosage: m.dosage || '',
            dosage_unit: m.dosage_unit || 'tablet',
            frequency: m.frequency || '',
            instructions: m.instructions || '',
            duration_days: m.duration_days || null,
            morning_enabled: !!m.morning_enabled,
            afternoon_enabled: !!m.afternoon_enabled,
            night_enabled: !!m.night_enabled,
            morning_time: m.morning_time || '08:00',
            afternoon_time: m.afternoon_time || '14:00',
            night_time: m.night_time || '20:00',
            confidence: m.confidence || 'medium',
          }))
        );
      }

      setStep('review');
    } catch (error: any) {
      console.error('Prescription processing error:', error);
      toast({
        title: 'Processing Failed',
        description: error.message || 'Could not extract prescription details. You can enter them manually.',
        variant: 'destructive',
      });
      setParseError(true);
      setStep('review');
    } finally {
      setIsProcessing(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const updateMedicine = (index: number, updates: Partial<ExtractedMedicine>) => {
    setMedicines((prev) =>
      prev.map((m, i) => (i === index ? { ...m, ...updates } : m))
    );
  };

  const removeMedicine = (index: number) => {
    setMedicines((prev) => prev.filter((_, i) => i !== index));
  };

  const addEmptyMedicine = () => {
    setMedicines((prev) => [
      ...prev,
      {
        name: '',
        dosage: '',
        dosage_unit: 'tablet',
        frequency: '',
        instructions: '',
        duration_days: null,
        morning_enabled: true,
        afternoon_enabled: false,
        night_enabled: false,
        morning_time: '08:00',
        afternoon_time: '14:00',
        night_time: '20:00',
        confidence: 'high',
      },
    ]);
  };

  const handleConfirm = () => {
    const validMedicines = medicines.filter((m) => m.name.trim());
    if (validMedicines.length === 0) {
      toast({ title: 'No medicines', description: 'Add at least one medicine name', variant: 'destructive' });
      return;
    }
    onMedicinesExtracted(validMedicines);
    onOpenChange(false);
    reset();
  };

  const confidenceBadge = (c: string) => {
    if (c === 'high') return <Badge className="bg-success/10 text-success border-success/20 text-xs">High</Badge>;
    if (c === 'medium') return <Badge className="bg-warning/10 text-warning border-warning/20 text-xs">Medium</Badge>;
    return <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs">Low</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-2xl">
            {step === 'upload' && '📋 Upload Prescription'}
            {step === 'processing' && '⏳ Processing...'}
            {step === 'review' && '✅ Review Extracted Medicines'}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Take a photo or upload your prescription to auto-fill medicines.'}
            {step === 'processing' && 'AI is reading your prescription...'}
            {step === 'review' && 'Review and edit the extracted details before adding.'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          {/* UPLOAD STEP */}
          {step === 'upload' && (
            <div className="space-y-4 pb-4">
              {/* Action buttons */}
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="h-6 w-6 text-primary" />
                  <span className="text-xs">Camera</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileImage className="h-6 w-6 text-primary" />
                  <span className="text-xs">Gallery</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = '.pdf';
                      fileInputRef.current.click();
                      fileInputRef.current.accept = 'image/jpeg,image/png,image/jpg,application/pdf';
                    }
                  }}
                >
                  <FileText className="h-6 w-6 text-primary" />
                  <span className="text-xs">PDF</span>
                </Button>
              </div>

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/jpg,application/pdf"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />

              {/* Preview */}
              {file && (
                <div className="space-y-3">
                  <div className="border rounded-xl overflow-hidden bg-muted/30">
                    {preview ? (
                      <img src={preview} alt="Prescription" className="w-full max-h-64 object-contain" />
                    ) : (
                      <div className="flex items-center gap-3 p-4">
                        <FileText className="h-8 w-8 text-primary" />
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <Button onClick={handleProcess} className="w-full h-12 text-lg bg-primary">
                    <Upload className="mr-2 h-5 w-5" />
                    Extract Medicines
                  </Button>
                </div>
              )}

              {!file && (
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center text-muted-foreground">
                  <Upload className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>Select a photo or PDF of your prescription</p>
                  <p className="text-sm mt-1">Supports JPG, PNG, PDF (max 10MB)</p>
                </div>
              )}
            </div>
          )}

          {/* PROCESSING STEP */}
          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <Pill className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-lg font-medium">Analyzing prescription...</p>
              <p className="text-sm text-muted-foreground">AI is extracting medicine details</p>
            </div>
          )}

          {/* REVIEW STEP */}
          {step === 'review' && (
            <div className="space-y-4 pb-4">
              {parseError && (
                <div className="flex items-start gap-3 p-3 bg-warning/10 rounded-xl border border-warning/20">
                  <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                  <div>
                    <p className="font-medium text-warning">Extraction may be incomplete</p>
                    <p className="text-sm text-muted-foreground">Please review and edit details manually.</p>
                  </div>
                </div>
              )}

              {/* Doctor info */}
              {(doctorName || prescriptionDate) && (
                <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                  {doctorName && <span>Dr: {doctorName} </span>}
                  {prescriptionDate && <span>• Date: {prescriptionDate}</span>}
                </div>
              )}

              {/* Raw text toggle */}
              {rawText && (
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-sm gap-1"
                    onClick={() => setShowRawText(!showRawText)}
                  >
                    {showRawText ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {showRawText ? 'Hide' : 'Show'} Raw Text
                  </Button>
                  {showRawText && (
                    <ScrollArea className="max-h-32 mt-2">
                      <pre className="text-xs bg-muted/50 p-3 rounded-lg whitespace-pre-wrap">{rawText}</pre>
                    </ScrollArea>
                  )}
                </div>
              )}

              {/* Medicine cards */}
              {medicines.map((med, idx) => (
                <div key={idx} className="border rounded-xl p-4 space-y-3 bg-card">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg">#{idx + 1}</span>
                      {confidenceBadge(med.confidence)}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeMedicine(idx)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label className="text-sm">Medicine Name *</Label>
                      <Input
                        value={med.name}
                        onChange={(e) => updateMedicine(idx, { name: e.target.value })}
                        placeholder="Medicine name"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Dosage</Label>
                      <Input
                        value={med.dosage}
                        onChange={(e) => updateMedicine(idx, { dosage: e.target.value })}
                        placeholder="e.g. 500"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Unit</Label>
                      <Input
                        value={med.dosage_unit}
                        onChange={(e) => updateMedicine(idx, { dosage_unit: e.target.value })}
                        placeholder="mg, tablet"
                        className="mt-1"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-sm">Instructions</Label>
                      <Input
                        value={med.instructions}
                        onChange={(e) => updateMedicine(idx, { instructions: e.target.value })}
                        placeholder="e.g. after food"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Session toggles */}
                  <div className="space-y-2">
                    <Label className="text-sm">Schedule</Label>
                    {(['morning', 'afternoon', 'night'] as SessionType[]).map((session) => {
                      const enabled = med[`${session}_enabled` as keyof ExtractedMedicine] as boolean;
                      const timeKey = `${session}_time` as keyof ExtractedMedicine;
                      return (
                        <div key={session} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                          <Switch
                            checked={enabled}
                            onCheckedChange={(v) => updateMedicine(idx, { [`${session}_enabled`]: v })}
                          />
                          <div className="flex items-center gap-1.5 min-w-[90px]">
                            {sessionIcons[session]}
                            <span className="text-sm capitalize">{session}</span>
                          </div>
                          {enabled && (
                            <Input
                              type="time"
                              value={med[timeKey] as string}
                              onChange={(e) => updateMedicine(idx, { [timeKey]: e.target.value })}
                              className="h-8 w-[120px] ml-auto text-sm"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {med.duration_days && (
                    <p className="text-xs text-muted-foreground">Duration: {med.duration_days} days</p>
                  )}
                </div>
              ))}

              <Button variant="outline" onClick={addEmptyMedicine} className="w-full">
                + Add Medicine Manually
              </Button>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="p-6 pt-4 border-t">
          {step === 'upload' && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          )}
          {step === 'review' && (
            <>
              <Button variant="outline" onClick={() => { reset(); }}>
                Start Over
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={medicines.filter((m) => m.name.trim()).length === 0}
                className="bg-primary"
              >
                <Check className="mr-2 h-4 w-4" />
                Add {medicines.filter((m) => m.name.trim()).length} Medicine(s)
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
