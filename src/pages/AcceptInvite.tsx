import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, Check, X, LogIn } from 'lucide-react';

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [inviteDetails, setInviteDetails] = useState<{
    id: string;
    patient_name: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      setIsLoading(false);
      return;
    }

    fetchInviteDetails();
  }, [token]);

  const fetchInviteDetails = async () => {
    try {
      // Find the invitation by token
      const { data: invite, error: inviteError } = await supabase
        .from('caregiver_links')
        .select('id, patient_id, status')
        .eq('invitation_token', token)
        .single();

      if (inviteError || !invite) {
        setError('Invitation not found or has expired');
        setIsLoading(false);
        return;
      }

      if (invite.status === 'accepted') {
        setError('This invitation has already been accepted');
        setIsLoading(false);
        return;
      }

      // Fetch patient profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', invite.patient_id)
        .single();

      if (profileError) throw profileError;

      setInviteDetails({
        id: invite.id,
        patient_name: profile?.full_name || 'A patient',
      });
    } catch (error) {
      console.error('Error fetching invite:', error);
      setError('Failed to load invitation details');
    }
    setIsLoading(false);
  };

  const handleAccept = async () => {
    if (!user || !inviteDetails) return;

    setIsAccepting(true);
    try {
      // Update the caregiver link with the current user
      const { error: updateError } = await supabase
        .from('caregiver_links')
        .update({
          caregiver_id: user.id,
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          invitation_token: null, // Clear the token after use
        })
        .eq('id', inviteDetails.id);

      if (updateError) throw updateError;

      // Add caregiver role to user
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: user.id,
          role: 'caregiver',
        }, {
          onConflict: 'user_id,role',
        });

      if (roleError) console.error('Error adding role:', roleError);

      toast({
        title: 'Invitation Accepted! 🎉',
        description: `You are now a caregiver for ${inviteDetails.patient_name}.`,
      });

      navigate('/caregiver');
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept invitation. Please try again.',
        variant: 'destructive',
      });
    }
    setIsAccepting(false);
  };

  const handleDecline = () => {
    navigate('/dashboard');
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full card-warm">
          <CardContent className="pt-6 text-center space-y-4">
            <X className="w-16 h-16 text-destructive mx-auto" />
            <h2 className="text-2xl font-bold">Invalid Invitation</h2>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => navigate('/dashboard')} className="btn-elderly">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full card-warm">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Caregiver Invitation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <UserPlus className="w-16 h-16 text-primary mx-auto" />
            <p className="text-lg">
              <strong>{inviteDetails?.patient_name}</strong> has invited you to be their caregiver.
            </p>
            <p className="text-muted-foreground">
              Please log in or create an account to accept this invitation.
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => navigate(`/login?redirect=/accept-invite?token=${token}`)}
                className="w-full btn-elderly bg-primary"
              >
                <LogIn className="mr-2 h-5 w-5" />
                Log In
              </Button>
              <Button
                onClick={() => navigate(`/signup?redirect=/accept-invite?token=${token}`)}
                variant="outline"
                className="w-full btn-elderly"
              >
                Create Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full card-warm">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Accept Caregiver Role</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <UserPlus className="w-16 h-16 text-primary mx-auto" />
          <p className="text-lg">
            <strong>{inviteDetails?.patient_name}</strong> has invited you to be their caregiver.
          </p>
          <p className="text-muted-foreground">
            As a caregiver, you'll be able to:
          </p>
          <ul className="text-left space-y-2 text-muted-foreground">
            <li className="flex items-center gap-2">
              <Check className="h-5 w-5 text-success" />
              View their medicine schedule
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-5 w-5 text-success" />
              Monitor dose adherence
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-5 w-5 text-success" />
              Receive alerts for missed doses
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-5 w-5 text-success" />
              Check medicine stock levels
            </li>
          </ul>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleDecline}
              className="flex-1 btn-elderly"
              disabled={isAccepting}
            >
              Decline
            </Button>
            <Button
              onClick={handleAccept}
              className="flex-1 btn-elderly bg-success hover:bg-success/90"
              disabled={isAccepting}
            >
              {isAccepting ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Check className="mr-2 h-5 w-5" />
              )}
              Accept
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
