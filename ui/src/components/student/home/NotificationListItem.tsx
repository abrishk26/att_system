import type { Notification } from '../../../lib/types/student';
import { AlertCircle, CheckCircle, Clock, Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationListItemProps {
  notification: Notification;
  onRead?: (notificationId: string) => void;
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'low_attendance':
    case 'attendance_update':
      return <AlertCircle className="h-5 w-5 text-amber-500" />;
    case 'session_open':
      return <Clock className="h-5 w-5 text-sky-500" />;
    case 'permission_update':
      return <CheckCircle className="h-5 w-5 text-emerald-500" />;
    case 'announcement':
      return <Megaphone className="h-5 w-5 text-muted-foreground" />;
    default:
      return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
  }
}

export function NotificationListItem({ notification, onRead }: NotificationListItemProps) {
  const { id, title, message, created_at, is_read, notification_type } = notification;

  const handleItemClick = () => {
    if (onRead && !is_read) {
      onRead(id);
    }
  };

  return (
    <button
      type="button"
      onClick={handleItemClick}
      className={cn(
        'flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors',
        !is_read
          ? 'border-primary/20 bg-primary/5 hover:bg-primary/10'
          : 'border-border bg-card hover:bg-muted/50'
      )}
    >
      <div className="mt-0.5 shrink-0">{getNotificationIcon(notification_type)}</div>
      <div className="min-w-0 flex-1">
        {title && (
          <p className={cn('text-sm', !is_read ? 'font-semibold text-foreground' : 'font-medium text-foreground')}>
            {title}
          </p>
        )}
        <p className={cn('text-sm', !is_read ? 'text-foreground' : 'text-muted-foreground')}>
          {message}
        </p>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {new Date(created_at).toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </p>
      </div>
      {!is_read && (
        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
      )}
    </button>
  );
}
