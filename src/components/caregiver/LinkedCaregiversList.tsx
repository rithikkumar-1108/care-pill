import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User, Trash2, Clock, Check, Loader2 } from 'lucide-react';
import type { Profile } from '@/types/database';

interface CaregiverLink {
  id: string;
  caregiver_id: string;
  status: string;
  invitation_token: string | null;
  created_at: string;
  accepted_at: string | null;
  caregiver_profile?: Profile;
}

export function LinkedCaregiversList() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [caregivers, setCaregivers] = useState<CaregiverLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCaregivers();
  }, [user]);

  const fetchCaregivers = async () => {
    if (!user) return;

    try {
      const { data: links, error } = await supabase
        .from('caregiver_links')
        .select('*')
        .eq('patient_id', user.id);

      if (error) throw error;

      if (links && links.length > 0) {
        // Fetch caregiver profiles for accepted links
        const acceptedLinks = links.filter(l => l.status === 'accepted');
        const caregiverIds = acceptedLinks.map(l => l.caregiver_id);

        if (caregiverIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('*')
            .in('user_id', caregiverIds);

          const linksWithProfiles = links.map(link => ({
            ...link,
            caregiver_profile: profiles?.find(p => p.user_id === link.caregiver_id) as Profile | undefined,
          }));

          setCaregivers(linksWithProfiles);
        } else {
          setCaregivers(links);
        }
      }
    } catch (error) {
      console.error('Error fetching caregivers:', error);
    }
    setIsLoading(false);
  };

  const handleRemove = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from('caregiver_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;

      setCaregivers(prev => prev.filter(c => c.id !== linkId));
      toast({
        title: 'Caregiver Removed',
        description: 'The caregiver has been unlinked from your account.',
      });
    } catch (error) {
      console.error('Error removing caregiver:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove caregiver.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (caregivers.length === 0) {
    return (
      <Card className="card-warm">
        <CardContent className="py-8 text-center">
          <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            No caregivers linked yet. Invite someone to help monitor your medications.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-warm">
      <CardHeader>
        <CardTitle className="text-xl">Your Caregivers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {caregivers.map((link) => (
          <div
            key={link.id}
            className="flex items-center justify-between p-4 bg-muted/30 rounded-xl"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                {link.status === 'accepted' ? (
                  <>
                    <p className="font-medium">
                      {link.caregiver_profile?.full_name || 'Caregiver'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Connected since {new Date(link.accepted_at!).toLocaleDateString()}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium">Pending Invitation</p>
                    <p className="text-sm text-muted-foreground">
                      Sent on {new Date(link.created_at).toLocaleDateString()}
                    </p>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={
                  link.status === 'accepted'
                    ? 'text-success border-success'
                    : 'text-warning border-warning'
                }
              >
                {link.status === 'accepted' ? (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Active
                  </>
                ) : (
                  <>
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </>
                )}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(link.id)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
