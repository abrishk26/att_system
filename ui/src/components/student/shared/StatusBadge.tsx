import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AttendanceStatus } from '@/lib/types/student';

type BadgeStatus = AttendanceStatus | 'pending' | 'accepted' | 'rejected' | 'approved';

const statusConfig: Record<
  BadgeStatus,
  { label: string; className: string; variant?: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  present: {
    label: 'Present',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  },
  late: {
    label: 'Late',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  },
  absent: {
    label: 'Absent',
    className: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
  },
  excused: {
    label: 'Excused',
    className: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
  },
  pending: { label: 'Pending', variant: 'outline', className: '' },
  accepted: { label: 'Approved', variant: 'default', className: '' },
  approved: { label: 'Approved', variant: 'default', className: '' },
  rejected: { label: 'Rejected', variant: 'destructive', className: '' },
};

interface StatusBadgeProps {
  status: BadgeStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    variant: 'secondary' as const,
    className: '',
  };

  return (
    <Badge
      variant={config.variant ?? 'secondary'}
      className={cn('capitalize', config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
