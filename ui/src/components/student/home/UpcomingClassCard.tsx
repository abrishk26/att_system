import React from 'react';
import type { ScheduledClass } from '../../../lib/types/student';
import { MapPin, User, Clock } from 'lucide-react';

interface UpcomingClassCardProps {
  classInfo: ScheduledClass;
}

export const UpcomingClassCard: React.FC<UpcomingClassCardProps> = ({ classInfo }) => {
  const { courseName, startTime, endTime, room, instructorName } = classInfo;

  return (
    <div className="rounded-2xl border border-[var(--aau-border)] bg-white p-4 shadow-[var(--aau-shadow)] transition-shadow hover:shadow-md">
      <h3 className="font-bold text-[var(--aau-text)]">{courseName}</h3>
      <div className="mt-2 space-y-1.5 text-sm text-[var(--aau-muted)]">
        <div className="flex items-center">
          <Clock size={14} className="mr-2 text-[var(--aau-primary)]" />
          <span>{startTime} - {endTime}</span>
        </div>
        <div className="flex items-center">
          <MapPin size={14} className="mr-2 text-[var(--aau-primary)]" />
          <span>Room: {room}</span>
        </div>
        <div className="flex items-center">
          <User size={14} className="mr-2 text-[var(--aau-primary)]" />
          <span>{instructorName}</span>
        </div>
      </div>
    </div>
  );
};
