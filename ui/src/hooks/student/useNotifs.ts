import { useState, useEffect, useCallback, useMemo } from 'react';
import { getNotifications, markNotificationRead as apiMarkRead, markAllRead as apiMarkAllRead } from '../../lib/api/notifications';
import type { Notification } from '../../lib/types/student';


export function useNotifs(studentId: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    setIsLoading(true);
    getNotifications(studentId)
      .then(setNotifications)
      .finally(() => setIsLoading(false));
  }, [studentId]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

  const markRead = useCallback(async (notificationId: string) => {
    await apiMarkRead(studentId, notificationId);
    setNotifications(prev => 
      prev.map(n => n.notificationId === notificationId ? { ...n, isRead: true } : n)
    );
  }, [studentId]);

  const markAllRead = useCallback(async () => {
    if (!studentId) return;
    await apiMarkAllRead(studentId);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, [studentId]);

  return { notifications, unreadCount, markRead, markAllRead, isLoading };
}
