import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, CheckCircle, Smartphone, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-foreground">Install MediTrack</CardTitle>
          <CardDescription>Get medicine reminders even when the browser is closed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isInstalled ? (
            <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-secondary mx-auto" />
              <p className="text-lg font-medium text-foreground">MediTrack is installed!</p>
              <p className="text-muted-foreground text-sm">You'll receive medicine reminders as push notifications.</p>
              <Button onClick={() => navigate('/dashboard')} className="w-full">Go to Dashboard</Button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">Background Reminders</p>
                    <p className="text-sm text-muted-foreground">Get notified at the exact scheduled time with Taken & Snooze options.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Smartphone className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">Works Like a Native App</p>
                    <p className="text-sm text-muted-foreground">Full-screen experience, works offline, launches from home screen.</p>
                  </div>
                </div>
              </div>

              {deferredPrompt ? (
                <Button onClick={handleInstall} className="w-full" size="lg">
                  <Download className="w-5 h-5 mr-2" />
                  Install MediTrack
                </Button>
              ) : (
                <div className="text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    To install, tap the <strong>Share</strong> button in your browser and select <strong>"Add to Home Screen"</strong>.
                  </p>
                  <p className="text-xs text-muted-foreground">On Android, look for the install icon in the address bar.</p>
                </div>
              )}

              <Button variant="outline" onClick={() => navigate('/dashboard')} className="w-full">
                Skip for now
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
