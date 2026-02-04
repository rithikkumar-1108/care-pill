import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, LogIn, HeartHandshake, ArrowLeft } from 'lucide-react';

export default function CaregiverLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-background to-blue-50 dark:from-teal-950/20 dark:via-background dark:to-blue-950/20 p-4">
      <Card className="w-full max-w-md card-warm bg-card">
        <CardHeader className="text-center space-y-4">
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-4 top-4"
            onClick={() => navigate('/login')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Patient Login
          </Button>
          <div className="mx-auto w-20 h-20 bg-teal-500/10 rounded-full flex items-center justify-center">
            <HeartHandshake className="w-10 h-10 text-teal-600" />
          </div>
          <CardTitle className="text-3xl font-bold text-foreground">Caregiver Portal</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Sign in to monitor your patients
          </CardDescription>
        </CardHeader>
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
      </Card>
    </div>
  );
}
