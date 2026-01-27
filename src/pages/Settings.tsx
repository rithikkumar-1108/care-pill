import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Clock, Users, Save } from 'lucide-react';
import type { SessionSchedule, SessionType } from '@/types/database';
import { SESSION_INFO } from '@/types/database';

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Profile fields
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [healthCondition, setHealthCondition] = useState('');
  const [caregiverName, setCaregiverName] = useState('');
  const [caregiverEmail, setCaregiverEmail] = useState('');
  const [caregiverPhone, setCaregiverPhone] = useState('');

  // Session schedules
  const [schedules, setSchedules] = useState<SessionSchedule[]>([]);
  const [morningTime, setMorningTime] = useState('08:00');
  const [afternoonTime, setAfternoonTime] = useState('14:00');
  const [nightTime, setNightTime] = useState('20:00');

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setAge(profile.age?.toString() || '');
      setGender(profile.gender || '');
      setHealthCondition(profile.health_condition || '');
      setCaregiverName(profile.caregiver_name || '');
      setCaregiverEmail(profile.caregiver_email || '');
      setCaregiverPhone(profile.caregiver_phone || '');
    }
  }, [profile]);

  const fetchSchedules = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('session_schedules')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      setSchedules(data as SessionSchedule[]);

      const morning = data.find((s: SessionSchedule) => s.session_type === 'morning');
      const afternoon = data.find((s: SessionSchedule) => s.session_type === 'afternoon');
      const night = data.find((s: SessionSchedule) => s.session_type === 'night');

      if (morning) setMorningTime(morning.scheduled_time.slice(0, 5));
      if (afternoon) setAfternoonTime(afternoon.scheduled_time.slice(0, 5));
      if (night) setNightTime(night.scheduled_time.slice(0, 5));
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSchedules();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          age: age ? parseInt(age) : null,
          gender: gender || null,
          health_condition: healthCondition || null,
          caregiver_name: caregiverName || null,
          caregiver_email: caregiverEmail || null,
          caregiver_phone: caregiverPhone || null,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await refreshProfile();

      toast({
        title: 'Profile Updated! ✅',
        description: 'Your profile has been saved successfully.',
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to save profile. Please try again.',
        variant: 'destructive',
      });
    }
    setIsSaving(false);
  };

  const handleSaveSchedules = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const updates = [
        { session_type: 'morning' as SessionType, scheduled_time: `${morningTime}:00` },
        { session_type: 'afternoon' as SessionType, scheduled_time: `${afternoonTime}:00` },
        { session_type: 'night' as SessionType, scheduled_time: `${nightTime}:00` },
      ];

      for (const update of updates) {
        const existing = schedules.find((s) => s.session_type === update.session_type);
        if (existing) {
          const { error } = await supabase
            .from('session_schedules')
            .update({ scheduled_time: update.scheduled_time, is_default: false })
            .eq('id', existing.id);
          if (error) throw error;
        }
      }

      toast({
        title: 'Schedule Updated! ⏰',
        description: 'Your session times have been saved.',
      });

      fetchSchedules();
    } catch (error) {
      console.error('Error saving schedules:', error);
      toast({
        title: 'Error',
        description: 'Failed to save schedule. Please try again.',
        variant: 'destructive',
      });
    }
    setIsSaving(false);
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
      <div className="space-y-6 max-w-3xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground text-lg">
            Manage your profile and preferences
          </p>
        </div>

        {/* Profile Settings */}
        <Card className="card-warm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Profile Information</CardTitle>
                <CardDescription>Update your personal details</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-lg">
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-12 text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age" className="text-lg">
                  Age
                </Label>
                <Input
                  id="age"
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="h-12 text-lg"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender" className="text-lg">
                Gender
              </Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className="h-12 text-lg">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male" className="text-lg">Male</SelectItem>
                  <SelectItem value="female" className="text-lg">Female</SelectItem>
                  <SelectItem value="other" className="text-lg">Other</SelectItem>
                  <SelectItem value="prefer-not-to-say" className="text-lg">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="health" className="text-lg">
                Health Condition (Optional)
              </Label>
              <Textarea
                id="health"
                value={healthCondition}
                onChange={(e) => setHealthCondition(e.target.value)}
                placeholder="e.g., Diabetes Type 2, Hypertension"
                className="text-lg min-h-[80px]"
              />
            </div>
            <Button
              className="btn-elderly bg-primary"
              onClick={handleSaveProfile}
              disabled={isSaving}
            >
              <Save className="mr-2 h-5 w-5" />
              {isSaving ? 'Saving...' : 'Save Profile'}
            </Button>
          </CardContent>
        </Card>

        {/* Session Schedules */}
        <Card className="card-warm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary/10 rounded-xl">
                <Clock className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <CardTitle className="text-xl">Session Times</CardTitle>
                <CardDescription>Customize when you take your medicines</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-lg">
                  {SESSION_INFO.morning.icon} Morning
                </Label>
                <Input
                  type="time"
                  value={morningTime}
                  onChange={(e) => setMorningTime(e.target.value)}
                  className="h-12 text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-lg">
                  {SESSION_INFO.afternoon.icon} Afternoon
                </Label>
                <Input
                  type="time"
                  value={afternoonTime}
                  onChange={(e) => setAfternoonTime(e.target.value)}
                  className="h-12 text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-lg">
                  {SESSION_INFO.night.icon} Night
                </Label>
                <Input
                  type="time"
                  value={nightTime}
                  onChange={(e) => setNightTime(e.target.value)}
                  className="h-12 text-lg"
                />
              </div>
            </div>
            <Button
              className="btn-elderly bg-secondary"
              onClick={handleSaveSchedules}
              disabled={isSaving}
            >
              <Save className="mr-2 h-5 w-5" />
              {isSaving ? 'Saving...' : 'Save Times'}
            </Button>
          </CardContent>
        </Card>

        {/* Caregiver Settings */}
        <Card className="card-warm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent rounded-xl">
                <Users className="w-6 h-6 text-accent-foreground" />
              </div>
              <div>
                <CardTitle className="text-xl">Caregiver Contact</CardTitle>
                <CardDescription>Who should be notified about missed doses?</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="caregiverName" className="text-lg">
                Caregiver Name
              </Label>
              <Input
                id="caregiverName"
                value={caregiverName}
                onChange={(e) => setCaregiverName(e.target.value)}
                placeholder="e.g., John (Son)"
                className="h-12 text-lg"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="caregiverEmail" className="text-lg">
                  Email Address
                </Label>
                <Input
                  id="caregiverEmail"
                  type="email"
                  value={caregiverEmail}
                  onChange={(e) => setCaregiverEmail(e.target.value)}
                  placeholder="caregiver@example.com"
                  className="h-12 text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="caregiverPhone" className="text-lg">
                  Phone Number
                </Label>
                <Input
                  id="caregiverPhone"
                  type="tel"
                  value={caregiverPhone}
                  onChange={(e) => setCaregiverPhone(e.target.value)}
                  placeholder="+1 234 567 8900"
                  className="h-12 text-lg"
                />
              </div>
            </div>
            <Button
              className="btn-elderly bg-primary"
              onClick={handleSaveProfile}
              disabled={isSaving}
            >
              <Save className="mr-2 h-5 w-5" />
              {isSaving ? 'Saving...' : 'Save Caregiver Info'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
