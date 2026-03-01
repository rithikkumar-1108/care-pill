import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Bell, BellOff, BellRing, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  requestNotificationPermission,
  getNotificationPermissionStatus,
} from '@/services/notificationService';
import { useToast } from '@/hooks/use-toast';

interface ReminderSettingsProps {
  remindersEnabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export function ReminderSettings({ remindersEnabled, onToggle }: ReminderSettingsProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const permissionStatus = getNotificationPermissionStatus();

  const handleEnable = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      onToggle(true);
      toast({ title: 'Reminders Enabled! 🔔', description: 'You will receive local notifications for your medicines.' });
    } else {
      toast({
        title: 'Permission Denied',
        description: 'Please enable notifications in your browser settings.',
        variant: 'destructive',
      });
    }
  };

  const handleToggle = (checked: boolean) => {
    if (checked) {
      handleEnable();
    } else {
      onToggle(false);
      toast({ title: 'Reminders Disabled', description: 'You will no longer receive notifications.' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="gap-2">
          {remindersEnabled ? (
            <BellRing className="h-5 w-5 text-primary" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
          Reminders
          {remindersEnabled && (
            <Badge variant="secondary" className="ml-1 text-xs">ON</Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" /> Medicine Reminders
          </DialogTitle>
          <DialogDescription className="text-base">
            Get local notifications to never miss a dose. Works completely offline.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Enable/Disable Toggle */}
          <Card className="border-2">
            <CardContent className="flex items-center justify-between p-4">
              <div className="space-y-1">
                <p className="font-semibold text-lg">Enable Reminders</p>
                <p className="text-sm text-muted-foreground">
                  {permissionStatus === 'unsupported'
                    ? 'Your browser does not support notifications'
                    : permissionStatus === 'denied'
                    ? 'Notifications blocked — update browser settings'
                    : 'Receive alerts for each scheduled dose'}
                </p>
              </div>
              <Switch
                checked={remindersEnabled}
                onCheckedChange={handleToggle}
                disabled={permissionStatus === 'unsupported' || permissionStatus === 'denied'}
              />
            </CardContent>
          </Card>

          {/* How it works */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="h-5 w-5 text-muted-foreground" /> How It Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <span className="text-lg">📢</span>
                <p><strong>5 notifications</strong> per dose: 2 min before, 1 min before, on time, 1 min after, 2 min after</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-lg">✅</span>
                <p>Tap the notification or use the <strong>"Take Medicine"</strong> button to mark as taken</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-lg">⏭️</span>
                <p>Use <strong>"Skip"</strong> to skip a dose — remaining reminders are cancelled</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-lg">❌</span>
                <p>No action within <strong>5 minutes</strong>? Dose is auto-marked as <strong>Missed</strong></p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-lg">📴</span>
                <p>Works <strong>100% offline</strong> — no internet needed</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
