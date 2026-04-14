import type { Notification } from '../types/student';

const MOCK_DELAY = 300;

const readStateKey = (studentId: string): string => `student_notification_reads_${studentId}`;

const getReadIds = (studentId: string): string[] => {
  try {
    const raw = localStorage.getItem(readStateKey(studentId));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};

const setReadIds = (studentId: string, ids: string[]): void => {
  localStorage.setItem(readStateKey(studentId), JSON.stringify(ids));
};

const baseNotifications: Notification[] = [
  {
    notificationId: 'notif-101',
    type: 'session_open',
    title: 'Attendance Open',
    message: 'Attendance is open for your next class.',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    actionUrl: '/student/home',
  },
  {
    notificationId: 'notif-102',
    type: 'permission_update',
    title: 'Permission Update',
    message: 'One of your permission requests was reviewed.',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    actionUrl: '/student/permissions',
  },
  {
    notificationId: 'notif-103',
    type: 'announcement',
    title: 'Announcement',
    message: 'Welcome to the updated student dashboard.',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    actionUrl: null,
  },
];

/**
 * MOCK API: Fetches notifications for the logged-in student.
 */
export const getNotifications = (studentId: string): Promise<Notification[]> => {
  const readIds = new Set(getReadIds(studentId));
  const notifications = baseNotifications.map((notification) => ({
    ...notification,
    isRead: readIds.has(notification.notificationId) || notification.isRead,
  }));

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }, MOCK_DELAY);
  });
};

/**
 * Marks a specific notification as read in local read-state.
 */
export const markNotificationRead = (studentId: string, notificationId: string): Promise<void> => {
  const ids = new Set(getReadIds(studentId));
  ids.add(notificationId);
  setReadIds(studentId, Array.from(ids));
  return Promise.resolve();
};

/**
 * Marks all notifications as read for a student.
 */
export const markAllRead = (studentId: string): Promise<void> => {
  return getNotifications(studentId).then((notifications) => {
    const ids = notifications.map((notification) => notification.notificationId);
    setReadIds(studentId, ids);
  });
};
