 import { useEffect, useState } from 'react';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { useAuth } from '@/contexts/AuthContext';
 import { supabase } from '@/integrations/supabase/client';
 import { useToast } from '@/hooks/use-toast';
 import { UserPlus, Check, X, Loader2, Clock } from 'lucide-react';
 import type { Profile } from '@/types/database';
 
 interface PendingRequest {
   id: string;
   caregiver_id: string;
   status: string;
   created_at: string;
   caregiver_profile?: Profile;
 }
 
 export function PendingCaregiverRequests() {
   const { user } = useAuth();
   const { toast } = useToast();
   const [requests, setRequests] = useState<PendingRequest[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [processingId, setProcessingId] = useState<string | null>(null);
 
   useEffect(() => {
     fetchPendingRequests();
   }, [user]);
 
   const fetchPendingRequests = async () => {
     if (!user) return;
 
     try {
       const { data: links, error } = await supabase
         .from('caregiver_links')
         .select('*')
         .eq('patient_id', user.id)
         .eq('status', 'pending');
 
       if (error) throw error;
 
       if (links && links.length > 0) {
         // Fetch caregiver profiles
         const caregiverIds = links.map(l => l.caregiver_id);
 
         const { data: profiles } = await supabase
           .from('profiles')
           .select('*')
           .in('user_id', caregiverIds);
 
         const linksWithProfiles = links.map(link => ({
           ...link,
           caregiver_profile: profiles?.find(p => p.user_id === link.caregiver_id) as Profile | undefined,
         }));
 
         setRequests(linksWithProfiles);
       } else {
         setRequests([]);
       }
     } catch (error) {
       console.error('Error fetching pending requests:', error);
     }
     setIsLoading(false);
   };
 
   const handleAccept = async (requestId: string) => {
     setProcessingId(requestId);
     try {
       const { error } = await supabase
         .from('caregiver_links')
         .update({
           status: 'accepted',
           accepted_at: new Date().toISOString(),
         })
         .eq('id', requestId);
 
       if (error) throw error;
 
       setRequests(prev => prev.filter(r => r.id !== requestId));
       toast({
         title: 'Request Accepted ✅',
         description: 'The caregiver can now view your medicine schedule.',
       });
     } catch (error) {
       console.error('Error accepting request:', error);
       toast({
         title: 'Error',
         description: 'Failed to accept request. Please try again.',
         variant: 'destructive',
       });
     }
     setProcessingId(null);
   };
 
   const handleReject = async (requestId: string) => {
     setProcessingId(requestId);
     try {
       const { error } = await supabase
         .from('caregiver_links')
         .delete()
         .eq('id', requestId);
 
       if (error) throw error;
 
       setRequests(prev => prev.filter(r => r.id !== requestId));
       toast({
         title: 'Request Rejected',
         description: 'The caregiver request has been declined.',
       });
     } catch (error) {
       console.error('Error rejecting request:', error);
       toast({
         title: 'Error',
         description: 'Failed to reject request. Please try again.',
         variant: 'destructive',
       });
     }
     setProcessingId(null);
   };
 
   if (isLoading) {
     return (
       <div className="flex items-center justify-center py-4">
         <Loader2 className="w-6 h-6 animate-spin text-primary" />
       </div>
     );
   }
 
   if (requests.length === 0) {
     return null;
   }
 
   return (
     <Card className="card-warm border-warning/30 bg-warning/5">
       <CardHeader className="pb-3">
         <div className="flex items-center gap-2">
           <Clock className="w-5 h-5 text-warning" />
           <CardTitle className="text-lg">Pending Connection Requests</CardTitle>
           <Badge variant="outline" className="ml-auto text-warning border-warning">
             {requests.length} pending
           </Badge>
         </div>
       </CardHeader>
       <CardContent className="space-y-3">
         {requests.map((request) => (
           <div
             key={request.id}
             className="flex items-center justify-between p-4 bg-background rounded-xl border"
           >
             <div className="flex items-center gap-3">
               <div className="p-2 bg-primary/10 rounded-full">
                 <UserPlus className="h-5 w-5 text-primary" />
               </div>
               <div>
                 <p className="font-medium">
                   {request.caregiver_profile?.full_name || 'Unknown Caregiver'}
                 </p>
                 <p className="text-sm text-muted-foreground">
                   Requested on {new Date(request.created_at).toLocaleDateString()}
                 </p>
               </div>
             </div>
             <div className="flex items-center gap-2">
               <Button
                 size="sm"
                 variant="outline"
                 onClick={() => handleReject(request.id)}
                 disabled={processingId === request.id}
                 className="text-destructive hover:text-destructive hover:bg-destructive/10"
               >
                 {processingId === request.id ? (
                   <Loader2 className="h-4 w-4 animate-spin" />
                 ) : (
                   <>
                     <X className="h-4 w-4 mr-1" />
                     Reject
                   </>
                 )}
               </Button>
               <Button
                 size="sm"
                 onClick={() => handleAccept(request.id)}
                 disabled={processingId === request.id}
                 className="bg-success hover:bg-success/90"
               >
                 {processingId === request.id ? (
                   <Loader2 className="h-4 w-4 animate-spin" />
                 ) : (
                   <>
                     <Check className="h-4 w-4 mr-1" />
                     Accept
                   </>
                 )}
               </Button>
             </div>
           </div>
         ))}
       </CardContent>
     </Card>
   );
 }