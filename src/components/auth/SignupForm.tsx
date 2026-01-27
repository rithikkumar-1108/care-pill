import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, UserPlus, Pill } from 'lucide-react';

export function SignupForm() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: 'Passwords don\'t match',
        description: 'Please make sure your passwords match.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 6 characters.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    const { error } = await signUp(email, password, fullName);

    if (error) {
      toast({
        title: 'Sign Up Failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Welcome to MediTrack! 🎉',
        description: 'Your account has been created successfully.',
      });
      navigate('/dashboard');
    }

    setIsLoading(false);
  };

  return (
    <Card className="w-full max-w-md card-warm bg-card">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
          <Pill className="w-10 h-10 text-primary" />
        </div>
        <CardTitle className="text-3xl font-bold text-foreground">Create Account</CardTitle>
        <CardDescription className="text-lg text-muted-foreground">
          Start tracking your medicines today
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-lg font-medium">
              Full Name
            </Label>
            <Input
              id="fullName"
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="h-14 text-lg rounded-xl"
            />
          </div>
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
                placeholder="At least 6 characters"
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
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-lg font-medium">
              Confirm Password
            </Label>
            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="h-14 text-lg rounded-xl"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            className="w-full btn-elderly bg-primary hover:bg-primary/90"
            disabled={isLoading}
          >
            {isLoading ? (
              'Creating Account...'
            ) : (
              <>
                <UserPlus className="mr-2 h-5 w-5" />
                Create Account
              </>
            )}
          </Button>
          <p className="text-center text-muted-foreground">
            Already have an account?{' '}
            <Button
              variant="link"
              className="text-primary text-lg p-0 h-auto"
              onClick={() => navigate('/login')}
            >
              Sign in here
            </Button>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
