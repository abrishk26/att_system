import { useOutletContext } from 'react-router-dom';
import { useNotifs } from '../../hooks/student/useNotifs';
import { NotificationListItem } from '../../components/student/home/NotificationListItem';
import { Bell, CheckCheck } from 'lucide-react';
import { PageHeader } from '@/components/instructor/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function NotificationsPage() {
  const { studentId } = useOutletContext<{ studentId: string }>();
  const { notifications, markAllRead, markRead, unreadCount, isLoading } = useNotifs({
    id: studentId,
    role: 'student',
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title="Notifications"
        description="Updates about attendance, permissions, and class sessions."
        icon={<Bell className="h-5 w-5" />}
        actions={
          unreadCount > 0 ? (
            <Button variant="outline" size="sm" onClick={() => markAllRead()}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark all read
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Bell className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium">You're all caught up</p>
            <p className="mt-1 text-sm text-muted-foreground">
              New notifications will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <NotificationListItem key={notif.id} notification={notif} onRead={markRead} />
          ))}
        </div>
      )}
    </div>
  );
}
