import { Card, CardContent } from '@/components/ui/card';
import { Pill, CheckCircle, Clock, XCircle } from 'lucide-react';

interface QuickStatsProps {
  totalMedicines: number;
  takenToday: number;
  pendingToday: number;
  missedToday: number;
  skippedToday: number;
}

export function QuickStats({ totalMedicines, takenToday, pendingToday, missedToday, skippedToday }: QuickStatsProps) {
  const stats = [
    {
      label: 'Active Medicines',
      value: totalMedicines,
      icon: Pill,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Taken Today',
      value: takenToday,
      icon: CheckCircle,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      label: 'Pending',
      value: pendingToday,
      icon: Clock,
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
    {
      label: 'Skipped',
      value: skippedToday,
      icon: XCircle,
      color: 'text-muted-foreground',
      bg: 'bg-muted/50',
    },
    {
      label: 'Missed',
      value: missedToday,
      icon: XCircle,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="card-warm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${stat.bg}`}>
                  <Icon className={`w-7 h-7 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
