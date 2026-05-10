import React from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useNotifs } from '../../hooks/student/useNotifs';
import { NotificationListItem } from '../../components/student/home/NotificationListItem';
import { ArrowLeft, CheckCheck } from 'lucide-react';

const NotificationsPage: React.FC = () => {
  const { studentId } = useOutletContext<{ studentId: string }>();
  const { notifications, markAllRead, markRead, unreadCount, isLoading } = useNotifs({ id: studentId, role: 'student' });
  const navigate = useNavigate();

  const handleMarkAllRead = async () => {
    await markAllRead();
  };

  return (
    <div className="page-shell">
      <div className="section-shell">
      <div className="mb-1 flex items-center justify-between">
        <div className='flex items-center gap-2'>
            <button onClick={() => navigate(-1)} className="btn-secondary !p-2" title="Go back"><ArrowLeft size={20}/></button>
            <div>
              <h1 className="panel-title">Notifications</h1>
              <p className="panel-subtitle">Stay updated on attendance and session alerts.</p>
            </div>
        </div>
        {unreadCount > 0 && (
          <button 
            onClick={handleMarkAllRead}
            className="btn-secondary flex items-center gap-1 text-sm"
          >
            <CheckCheck size={16} />
            Mark all as read
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="panel-card text-center text-[var(--aau-muted)]">Loading notifications...</p>
      ) : notifications.length === 0 ? (
        <p className="panel-card py-8 text-center text-[var(--aau-muted)]">You have no notifications.</p>
      ) : (
        <div className="space-y-2">
          {notifications.map(notif => (
            <NotificationListItem key={notif.id} notification={notif} onRead={markRead} />
          ))}
        </div>
      )}
      </div>
    </div>
  );
};

export default NotificationsPage;
