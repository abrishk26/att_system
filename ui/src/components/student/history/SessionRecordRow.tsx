import React from 'react';
import type { SessionRecord } from '../../../lib/types/student';
import { Check, X, Clock, FileText } from 'lucide-react';

interface SessionRecordRowProps {
  session: SessionRecord;
}

const getStatusIcon = (status: SessionRecord['status']) => {
  switch (status) {
    case 'present':
      return <Check className="h-5 w-5 text-green-600 bg-green-100 rounded-full p-0.5" />;
    case 'absent':
      return <X className="h-5 w-5 text-red-600 bg-red-100 rounded-full p-0.5" />;
    case 'late':
      return <Clock className="h-5 w-5 text-yellow-600 bg-yellow-100 rounded-full p-0.5" />;
    case 'excused':
        return <FileText className="h-5 w-5 text-blue-600 bg-blue-100 rounded-full p-0.5" />;
    default:
      return null;
  }
};

export const SessionRecordRow: React.FC<SessionRecordRowProps> = ({ session }) => {
  const { date, status } = session;

  return (
    <div className="flex items-center justify-between rounded-2xl border border-[var(--aau-border)] bg-white p-4 shadow-[var(--aau-shadow)]">
        <div>
        <p className="font-medium text-[var(--aau-text)]">Session Date</p>
        <p className="text-sm text-[var(--aau-muted)]">{new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex items-center space-x-2">
            {getStatusIcon(status)}
        <span className="text-sm font-semibold capitalize text-[var(--aau-text)]">{status}</span>
        </div>
    </div>
  );
};
