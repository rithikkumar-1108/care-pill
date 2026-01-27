import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Pill,
  Calendar,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/medicines', label: 'Medicines', icon: Pill },
  { path: '/calendar', label: 'Calendar', icon: Calendar },
  { path: '/history', label: 'History', icon: History },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function AppLayout({ children }: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { profile, signOut, isCaregiver } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-20 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-12 w-12"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Pill className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground hidden sm:inline">
                MediTrack
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-12 w-12 relative">
              <Bell className="h-6 w-6" />
              <span className="absolute top-2 right-2 w-3 h-3 bg-destructive rounded-full" />
            </Button>
            <div className="hidden sm:flex items-center gap-3 ml-2 px-4 py-2 bg-muted rounded-xl">
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                <span className="text-primary font-semibold">
                  {profile?.full_name?.charAt(0) || 'U'}
                </span>
              </div>
              <span className="font-medium text-foreground">
                {profile?.full_name || 'User'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden md:flex w-64 min-h-[calc(100vh-5rem)] flex-col border-r bg-sidebar p-4">
          <nav className="flex flex-col gap-2 flex-1">
            {isCaregiver && (
              <Button
                variant={location.pathname === '/caregiver' ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start h-14 text-lg rounded-xl',
                  location.pathname === '/caregiver' && 'bg-accent'
                )}
                onClick={() => navigate('/caregiver')}
              >
                <Users className="mr-3 h-6 w-6" />
                Caregiver Portal
              </Button>
            )}
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Button
                  key={item.path}
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start h-14 text-lg rounded-xl',
                    isActive && 'bg-accent'
                  )}
                  onClick={() => navigate(item.path)}
                >
                  <Icon className="mr-3 h-6 w-6" />
                  {item.label}
                </Button>
              );
            })}
          </nav>
          <Button
            variant="ghost"
            className="w-full justify-start h-14 text-lg rounded-xl text-destructive hover:bg-destructive/10"
            onClick={handleSignOut}
          >
            <LogOut className="mr-3 h-6 w-6" />
            Sign Out
          </Button>
        </aside>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setMobileMenuOpen(false)}
            />
            <aside className="fixed left-0 top-20 bottom-0 w-72 bg-sidebar border-r p-4 overflow-y-auto">
              <nav className="flex flex-col gap-2">
                {isCaregiver && (
                  <Button
                    variant={location.pathname === '/caregiver' ? 'secondary' : 'ghost'}
                    className={cn(
                      'w-full justify-start h-14 text-lg rounded-xl',
                      location.pathname === '/caregiver' && 'bg-accent'
                    )}
                    onClick={() => {
                      navigate('/caregiver');
                      setMobileMenuOpen(false);
                    }}
                  >
                    <Users className="mr-3 h-6 w-6" />
                    Caregiver Portal
                  </Button>
                )}
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Button
                      key={item.path}
                      variant={isActive ? 'secondary' : 'ghost'}
                      className={cn(
                        'w-full justify-start h-14 text-lg rounded-xl',
                        isActive && 'bg-accent'
                      )}
                      onClick={() => {
                        navigate(item.path);
                        setMobileMenuOpen(false);
                      }}
                    >
                      <Icon className="mr-3 h-6 w-6" />
                      {item.label}
                    </Button>
                  );
                })}
                <Button
                  variant="ghost"
                  className="w-full justify-start h-14 text-lg rounded-xl text-destructive hover:bg-destructive/10 mt-4"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-3 h-6 w-6" />
                  Sign Out
                </Button>
              </nav>
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
