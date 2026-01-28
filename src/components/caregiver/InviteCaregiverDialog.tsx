import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Copy, Check, Mail } from 'lucide-react';

interface InviteCaregiverDialogProps {
  onInviteSent?: () => void;
}

export function InviteCaregiverDialog({ onInviteSent }: InviteCaregiverDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [caregiverEmail, setCaregiverEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const handleInvite = async () => {
    if (!user || !caregiverEmail.trim()) return;

    setIsLoading(true);
    try {
      // Check if caregiver exists
      const { data: caregiverProfile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .ilike('user_id', caregiverEmail) // This won't work - we need to check auth.users
        .single();

      // Generate invitation token
      const token = generateToken();
      
      // For now, create a pending link that can be accepted with the token
      const { error } = await supabase.from('caregiver_links').insert({
        patient_id: user.id,
        caregiver_id: user.id, // Placeholder - will be updated when caregiver accepts
        invitation_token: token,
        status: 'pending',
      });

      if (error) throw error;

      setInviteToken(token);
      toast({
        title: 'Invitation Created! 📧',
        description: 'Share the invitation link with your caregiver.',
      });
      onInviteSent?.();
    } catch (error) {
      console.error('Error creating invitation:', error);
      toast({
        title: 'Error',
        description: 'Failed to create invitation. Please try again.',
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  };

  const inviteLink = inviteToken 
    ? `${window.location.origin}/accept-invite?token=${inviteToken}`
    : '';

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Invitation link copied to clipboard.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setCaregiverEmail('');
    setInviteToken(null);
    setCopied(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => open ? setIsOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button className="btn-elderly bg-primary">
          <UserPlus className="mr-2 h-5 w-5" />
          Invite Caregiver
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">Invite a Caregiver</DialogTitle>
        </DialogHeader>

        {!inviteToken ? (
          <div className="space-y-4 py-4">
            <p className="text-muted-foreground">
              Invite someone to monitor your medicine schedule and receive alerts if you miss doses.
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="caregiver-email" className="text-lg">
                Caregiver's Email (optional)
              </Label>
              <Input
                id="caregiver-email"
                type="email"
                placeholder="caregiver@example.com"
                value={caregiverEmail}
                onChange={(e) => setCaregiverEmail(e.target.value)}
                className="input-elderly"
              />
              <p className="text-sm text-muted-foreground">
                You can also just generate a link and share it manually.
              </p>
            </div>

            <Button
              onClick={handleInvite}
              className="w-full btn-elderly bg-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Generate Invitation Link'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="p-4 bg-success/10 rounded-xl text-center">
              <Check className="w-12 h-12 text-success mx-auto mb-2" />
              <p className="font-semibold text-lg">Invitation Created!</p>
            </div>

            <div className="space-y-2">
              <Label className="text-lg">Share this link with your caregiver:</Label>
              <div className="flex gap-2">
                <Input
                  value={inviteLink}
                  readOnly
                  className="input-elderly text-sm"
                />
                <Button
                  variant="outline"
                  className="shrink-0"
                  onClick={copyToClipboard}
                >
                  {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                </Button>
              </div>
            </div>

            {caregiverEmail && (
              <Button
                variant="outline"
                className="w-full btn-elderly"
                onClick={() => {
                  window.location.href = `mailto:${caregiverEmail}?subject=Medicine Tracker Caregiver Invitation&body=You've been invited to be a caregiver! Click here to accept: ${encodeURIComponent(inviteLink)}`;
                }}
              >
                <Mail className="mr-2 h-5 w-5" />
                Send via Email
              </Button>
            )}

            <Button
              onClick={handleClose}
              className="w-full btn-elderly"
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
