import { useState, useEffect, useCallback, useMemo } from 'react';
import { getNotifications, markNotificationRead as apiMarkRead, markAllRead as apiMarkAllRead } from '../../lib/api/notifications';
import type { Notification } from '../../lib/types/student';

export function useNotifs(user: { id: string, role: string } | null) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !user.id) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const fetchNotifs = () => {
      getNotifications(user)
        .then((data) => {
          if (isMounted) {
            setNotifications(data);
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        });
    };

    setIsLoading(true);
    fetchNotifs();

    // Poll every 10 seconds
    const interval = setInterval(fetchNotifs, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user?.id, user?.role]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.is_read).length;
  }, [notifications]);

  const markRead = useCallback(async (id: string) => {
    if (!user?.id) return;
    await apiMarkRead(user.id, id);
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
  }, [user?.id]);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    await apiMarkAllRead(user);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }, [user]);

  return { notifications, unreadCount, markRead, markAllRead, isLoading };
}
