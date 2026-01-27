import { SignupForm } from '@/components/auth/SignupForm';

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-background to-teal-50 dark:from-orange-950/20 dark:via-background dark:to-teal-950/20 p-4">
      <SignupForm />
    </div>
  );
}
