import React from 'react';
import type { ScheduledClass } from '../../../lib/types/student';
import { UpcomingClassCard } from '../home/UpcomingClassCard';

interface ScheduleDayViewProps {
  classes: ScheduledClass[];
  day: string;
}

export const ScheduleDayView: React.FC<ScheduleDayViewProps> = ({ classes, day }) => {
  return (
    <div className="space-y-3">
      {classes.length > 0 ? (
        classes.map(cls => <UpcomingClassCard key={cls.classId} classInfo={cls} />)
      ) : (
        <p className="panel-card py-8 text-center text-[var(--aau-muted)]">No classes scheduled for {day.charAt(0).toUpperCase() + day.slice(1)}.</p>
      )}
    </div>
  );
};
