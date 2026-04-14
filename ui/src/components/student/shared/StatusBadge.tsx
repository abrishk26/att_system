import React from 'react';
import type { AttendanceStatus } from '../../../lib/types/student';

interface StatusBadgeProps {
  status: AttendanceStatus | 'pending' | 'approved' | 'rejected';
}

type BadgeStatus = StatusBadgeProps['status'];

const statusStyles: Record<BadgeStatus, string> = {
  present: 'bg-[rgba(76,175,80,0.14)] text-[#2f7a33]',
  late: 'bg-[rgba(245,158,11,0.16)] text-[#9a5c00]',
  absent: 'bg-[rgba(239,68,68,0.14)] text-[#9f1f1f]',
  excused: 'bg-[rgba(0,168,232,0.14)] text-[#005f83]',
  pending: 'bg-gray-100 text-gray-700',
  approved: 'bg-[rgba(76,175,80,0.14)] text-[#2f7a33]',
  rejected: 'bg-[rgba(239,68,68,0.14)] text-[#9f1f1f]',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const statusText = status.charAt(0).toUpperCase() + status.slice(1);
  const style = statusStyles[status] || 'bg-gray-100 text-gray-800';

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}>
      {statusText}
    </span>
  );
};
