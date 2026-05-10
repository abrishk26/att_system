import React from 'react';
import type { Notification } from '../../../lib/types/student';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface NotificationListItemProps {
  notification: Notification;
  onRead?: (notificationId: string) => void;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'low_attendance':
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    case 'session_open':
      return <Clock className="h-5 w-5 text-blue-500" />;
    case 'permission_update':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'announcement':
      return <AlertCircle className="h-5 w-5 text-gray-400" />;
    default:
      return <AlertCircle className="h-5 w-5 text-gray-400" />;
  }
};

export const NotificationListItem: React.FC<NotificationListItemProps> = ({ notification, onRead }) => {
  const { id, message, created_at, is_read, notification_type } = notification;

  const handleItemClick = () => {
    if (onRead && !is_read) {
      onRead(id);
    }
  };

  return (
    <div 
      onClick={handleItemClick}
      className={`flex items-start rounded-xl border p-3 transition-colors ${!is_read ? 'cursor-pointer border-[#b9ddff] bg-[#edf6ff] hover:bg-[#dff0ff]' : 'border-[var(--aau-border)] bg-white'}`}>
      <div className="flex-shrink-0 mr-3 mt-1">
          {getNotificationIcon(notification_type)}
      </div>
      <div className="flex-grow">
        <p className={`text-sm ${is_read ? 'text-[var(--aau-muted)]' : 'font-medium text-[var(--aau-text)]'}`}>{message}</p>
        <p className="mt-1 text-xs text-gray-400">{new Date(created_at).toLocaleString()}</p>
      </div>
      {!is_read && (
        <div className="flex-shrink-0 ml-3 mt-1">
          <span className="block h-2.5 w-2.5 rounded-full bg-[var(--aau-accent)]"></span>
        </div>
      )}
    </div>
  );
};
