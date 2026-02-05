 import { useState } from 'react';
 import { useNavigate } from 'react-router-dom';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
 import { useAuth } from '@/contexts/AuthContext';
 import { useToast } from '@/hooks/use-toast';
 import { supabase } from '@/integrations/supabase/client';
 import { Eye, EyeOff, LogIn, HeartHandshake, ArrowLeft, Search, UserCheck, Loader2 } from 'lucide-react';
 
 interface PatientResult {
   user_id: string;
   full_name: string;
 }
 
 export default function CaregiverLoginPage() {
   const [email, setEmail] = useState('');
   const [password, setPassword] = useState('');
   const [showPassword, setShowPassword] = useState(false);
   const [isLoading, setIsLoading] = useState(false);
   const [step, setStep] = useState<'login' | 'search'>('login');
   const [patientSearch, setPatientSearch] = useState('');
   const [searchResults, setSearchResults] = useState<PatientResult[]>([]);
   const [selectedPatient, setSelectedPatient] = useState<PatientResult | null>(null);
   const [isSearching, setIsSearching] = useState(false);
   const { signIn } = useAuth();
   const { toast } = useToast();
   const navigate = useNavigate();
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     setIsLoading(true);
 
     const { error } = await signIn(email, password);
 
     if (error) {
       toast({
         title: 'Login Failed',
         description: error.message,
         variant: 'destructive',
       });
     } else {
       toast({
         title: 'Welcome, Caregiver! 👨‍⚕️',
         description: 'You have successfully logged in.',
       });
       navigate('/caregiver');
     }
     setIsLoading(false);
   };
 
   const handlePatientSearch = async () => {
     if (!patientSearch.trim()) return;
 
     setIsSearching(true);
     try {
       const { data, error } = await supabase
         .from('profiles')
         .select('user_id, full_name')
         .ilike('full_name', `%${patientSearch}%`)
         .limit(10);
 
       if (error) throw error;
       setSearchResults(data || []);
     } catch (error) {
       console.error('Error searching patients:', error);
       toast({
         title: 'Search Failed',
         description: 'Could not search for patients',
         variant: 'destructive',
       });
     }
     setIsSearching(false);
   };
 
   const handleLinkPatient = async () => {
     if (!selectedPatient || !email || !password) {
       toast({
         title: 'Missing Information',
         description: 'Please select a patient and enter your credentials',
         variant: 'destructive',
       });
       return;
     }
 
     setIsLoading(true);
 
     // First sign in
     const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
       email,
       password,
     });
 
     if (authError) {
       toast({
         title: 'Login Failed',
         description: authError.message,
         variant: 'destructive',
       });
       setIsLoading(false);
       return;
     }
 
     // Check if already linked
     const { data: existingLink } = await supabase
       .from('caregiver_links')
       .select('id, status')
       .eq('caregiver_id', authData.user.id)
       .eq('patient_id', selectedPatient.user_id)
       .single();
 
     if (existingLink) {
       if (existingLink.status === 'accepted') {
         toast({
           title: 'Already Linked! 🔗',
           description: `You are already connected to ${selectedPatient.full_name}`,
         });
       } else {
         toast({
           title: 'Link Pending',
           description: 'Your connection request is pending approval',
         });
       }
     } else {
       // Create a new caregiver link (patient needs to accept)
       const { error: linkError } = await supabase
         .from('caregiver_links')
         .insert({
           caregiver_id: authData.user.id,
           patient_id: selectedPatient.user_id,
           status: 'pending',
         });
 
       if (linkError) {
         console.error('Link error:', linkError);
         toast({
           title: 'Connection Request Sent',
           description: `Waiting for ${selectedPatient.full_name} to accept`,
         });
       } else {
         toast({
           title: 'Request Sent! 📨',
           description: `Waiting for ${selectedPatient.full_name} to accept your request`,
         });
       }
     }
 
     navigate('/caregiver');
     setIsLoading(false);
   };
 
   return (
     <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-background to-blue-50 dark:from-teal-950/20 dark:via-background dark:to-blue-950/20 p-4">
       <Card className="w-full max-w-md card-warm bg-card relative">
         <CardHeader className="text-center space-y-4">
           {step === 'login' ? (
             <Button
               variant="ghost"
               size="sm"
               className="absolute left-4 top-4"
               onClick={() => navigate('/login')}
             >
               <ArrowLeft className="h-4 w-4 mr-2" />
               Patient Login
             </Button>
           ) : (
             <Button
               variant="ghost"
               size="sm"
               className="absolute left-4 top-4"
               onClick={() => setStep('login')}
             >
               <ArrowLeft className="h-4 w-4 mr-2" />
               Back
             </Button>
           )}
           <div className="mx-auto w-20 h-20 bg-teal-500/10 rounded-full flex items-center justify-center mt-8">
             <HeartHandshake className="w-10 h-10 text-teal-600" />
           </div>
           <CardTitle className="text-3xl font-bold text-foreground">Caregiver Portal</CardTitle>
           <CardDescription className="text-lg text-muted-foreground">
             {step === 'login' 
               ? 'Sign in to monitor your patients' 
               : 'Search and connect to a patient'}
           </CardDescription>
         </CardHeader>
 
         {step === 'login' ? (
           <form onSubmit={handleSubmit}>
             <CardContent className="space-y-6">
               <div className="space-y-2">
                 <Label htmlFor="email" className="text-lg font-medium">
                   Email Address
                 </Label>
                 <Input
                   id="email"
                   type="email"
                   placeholder="you@example.com"
                   value={email}
                   onChange={(e) => setEmail(e.target.value)}
                   required
                   className="h-14 text-lg rounded-xl"
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="password" className="text-lg font-medium">
                   Password
                 </Label>
                 <div className="relative">
                   <Input
                     id="password"
                     type={showPassword ? 'text' : 'password'}
                     placeholder="Enter your password"
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     required
                     className="h-14 text-lg rounded-xl pr-12"
                   />
                   <Button
                     type="button"
                     variant="ghost"
                     size="icon"
                     className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10"
                     onClick={() => setShowPassword(!showPassword)}
                   >
                     {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                   </Button>
                 </div>
               </div>
             </CardContent>
             <CardFooter className="flex flex-col space-y-4">
               <Button
                 type="submit"
                 className="w-full btn-elderly bg-teal-600 hover:bg-teal-700"
                 disabled={isLoading}
               >
                 {isLoading ? (
                   'Signing in...'
                 ) : (
                   <>
                     <LogIn className="mr-2 h-5 w-5" />
                     Sign In as Caregiver
                   </>
                 )}
               </Button>
               
               <div className="relative w-full">
                 <div className="absolute inset-0 flex items-center">
                   <span className="w-full border-t" />
                 </div>
                 <div className="relative flex justify-center text-sm uppercase">
                   <span className="bg-card px-2 text-muted-foreground">Or</span>
                 </div>
               </div>
 
               <Button
                 type="button"
                 variant="outline"
                 className="w-full btn-elderly"
                 onClick={() => setStep('search')}
               >
                 <Search className="mr-2 h-5 w-5" />
                 Link to a New Patient
               </Button>
 
               <p className="text-center text-muted-foreground">
                 Don't have an account?{' '}
                 <Button
                   variant="link"
                   className="text-teal-600 text-lg p-0 h-auto"
                   onClick={() => navigate('/signup')}
                 >
                   Sign up here
                 </Button>
               </p>
             </CardFooter>
           </form>
         ) : (
           <>
             <CardContent className="space-y-6">
               <div className="space-y-2">
                 <Label className="text-lg font-medium">Search Patient by Name</Label>
                 <div className="flex gap-2">
                   <Input
                     placeholder="Enter patient name..."
                     value={patientSearch}
                     onChange={(e) => setPatientSearch(e.target.value)}
                     className="h-14 text-lg rounded-xl"
                     onKeyDown={(e) => e.key === 'Enter' && handlePatientSearch()}
                   />
                   <Button
                     type="button"
                     onClick={handlePatientSearch}
                     className="h-14 px-6 bg-teal-600 hover:bg-teal-700"
                     disabled={isSearching}
                   >
                     {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                   </Button>
                 </div>
               </div>
 
               {searchResults.length > 0 && (
                 <div className="space-y-2">
                   <Label className="text-lg font-medium">Select Patient</Label>
                   <div className="space-y-2 max-h-48 overflow-y-auto">
                     {searchResults.map((patient) => (
                       <div
                         key={patient.user_id}
                         onClick={() => setSelectedPatient(patient)}
                         className={`p-4 rounded-xl cursor-pointer transition-all flex items-center gap-3 ${
                           selectedPatient?.user_id === patient.user_id
                             ? 'bg-teal-500/20 border-2 border-teal-500'
                             : 'bg-muted/50 hover:bg-muted border-2 border-transparent'
                         }`}
                       >
                         <UserCheck className={`h-5 w-5 ${
                           selectedPatient?.user_id === patient.user_id ? 'text-teal-600' : 'text-muted-foreground'
                         }`} />
                         <span className="font-medium">{patient.full_name}</span>
                       </div>
                     ))}
                   </div>
                 </div>
               )}
 
               {searchResults.length === 0 && patientSearch && !isSearching && (
                 <p className="text-muted-foreground text-center py-4">
                   No patients found with that name
                 </p>
               )}
 
               {selectedPatient && (
                 <>
                   <div className="p-4 bg-teal-500/10 rounded-xl">
                     <p className="text-sm text-muted-foreground">Selected Patient</p>
                     <p className="font-bold text-lg">{selectedPatient.full_name}</p>
                   </div>
 
                   <div className="space-y-2">
                     <Label htmlFor="link-email" className="text-lg font-medium">
                       Your Email
                     </Label>
                     <Input
                       id="link-email"
                       type="email"
                       placeholder="you@example.com"
                       value={email}
                       onChange={(e) => setEmail(e.target.value)}
                       className="h-14 text-lg rounded-xl"
                     />
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="link-password" className="text-lg font-medium">
                       Your Password
                     </Label>
                     <div className="relative">
                       <Input
                         id="link-password"
                         type={showPassword ? 'text' : 'password'}
                         placeholder="Enter your password"
                         value={password}
                         onChange={(e) => setPassword(e.target.value)}
                         className="h-14 text-lg rounded-xl pr-12"
                       />
                       <Button
                         type="button"
                         variant="ghost"
                         size="icon"
                         className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10"
                         onClick={() => setShowPassword(!showPassword)}
                       >
                         {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                       </Button>
                     </div>
                   </div>
                 </>
               )}
             </CardContent>
             <CardFooter>
               <Button
                 onClick={handleLinkPatient}
                 className="w-full btn-elderly bg-teal-600 hover:bg-teal-700"
                 disabled={!selectedPatient || !email || !password || isLoading}
               >
                 {isLoading ? (
                   <>
                     <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                     Connecting...
                   </>
                 ) : (
                   <>
                     <UserCheck className="mr-2 h-5 w-5" />
                     Connect to Patient
                   </>
                 )}
               </Button>
             </CardFooter>
           </>
         )}
       </Card>
     </div>
   );
 }
