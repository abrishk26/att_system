import React from 'react';
import type { PermissionRequest } from '../../../lib/types/student';
import { CheckCircle, Clock, XCircle } from 'lucide-react';

interface PermissionStatusCardProps {
  request: PermissionRequest;
}

const getStatusVisuals = (status: PermissionRequest['status']) => {
  switch (status) {
    case 'accepted':
      return {
        icon: <CheckCircle className="h-5 w-5 text-green-500" />,
        textClass: 'text-green-700',
        bgClass: 'bg-green-100',
      };
    case 'pending':
      return {
        icon: <Clock className="h-5 w-5 text-yellow-500" />,
        textClass: 'text-yellow-700',
        bgClass: 'bg-yellow-100',
      };
    case 'rejected':
      return {
        icon: <XCircle className="h-5 w-5 text-red-500" />,
        textClass: 'text-red-700',
        bgClass: 'bg-red-100',
      };
    default:
      return {
        icon: null,
        textClass: 'text-gray-700',
        bgClass: 'bg-gray-100',
      };
  }
};

export const PermissionStatusCard: React.FC<PermissionStatusCardProps> = ({ request }) => {
  const { sessionId, description, status, imgUrl } = request;
  const { icon, textClass, bgClass } = getStatusVisuals(status);

  return (
    <div className={`rounded-2xl border p-4 shadow-[var(--aau-shadow)] ${bgClass}`}>
      <div className="flex justify-between items-start">
        <div className="flex-grow">
          <p className="font-semibold text-[var(--aau-text)]">
            Session: {sessionId}
          </p>
          <p className="mt-1 text-sm text-[var(--aau-muted)]">{description}</p>
          <p className="mt-1 text-xs text-[var(--aau-muted)]">Attachment: {imgUrl ? 'Provided' : 'None'}</p>
        </div>
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${bgClass} ${textClass}`}>
          {icon}
          <span className="capitalize">{status}</span>
        </div>
      </div>
    </div>
  );
};
