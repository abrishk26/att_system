import { api } from '../../api';
import type { Notification } from '../types/student';

/**
 * Fetches notifications from the backend API.
 * This replaces the previous on-the-fly generation logic.
 */
export const getNotifications = async (user: { id: string, role: string }): Promise<Notification[]> => {
  if (!user || !user.id) return [];
  
  try {
    const backendNotifs = await api.getNotifications();
    
    // Sort by created_at descending
    return backendNotifs.sort((a, b) => {
      const dateA = new Date(a.created_at.replace(' ', 'T')).getTime();
      const dateB = new Date(b.created_at.replace(' ', 'T')).getTime();
      return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
    });
  } catch (err) {
    console.error('Failed to fetch notifications from backend:', err);
    return [];
  }
};

/**
 * Marks a specific notification as read in the backend.
 */
export const markNotificationRead = async (_userId: string, id: string): Promise<void> => {
  try {
    await api.markNotificationRead(id);
  } catch (err) {
    console.error('Failed to mark notification as read:', err);
  }
};

/**
 * Marks all notifications as read in the backend.
 */
export const markAllRead = async (_user: { id: string, role: string }): Promise<void> => {
  try {
    await api.markAllNotificationsRead();
  } catch (err) {
    console.error('Failed to mark all notifications as read:', err);
  }
};
