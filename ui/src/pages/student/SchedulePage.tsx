import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useSchedule } from '../../hooks/student/useSchedule';
import { ScheduleDayView } from '../../components/student/schedule/ScheduleDayView';

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

const weekDays: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

const getTodayDayOfWeek = (): DayOfWeek => {
    const dayIndex = new Date().getDay(); // Sunday = 0, Monday = 1, ...
    // Default to Monday for Saturday (6) and Sunday (0)
    if (dayIndex === 0 || dayIndex === 6) return 'monday';
    return weekDays[dayIndex - 1];
};


const SchedulePage: React.FC = () => {
  const { studentId } = useOutletContext<{ studentId: string }>();
  const { getByDay, isLoading, error } = useSchedule(studentId);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(getTodayDayOfWeek());

  const activeTabStyle = 'bg-[var(--aau-primary)] text-white shadow-sm';
  //const inactiveTabStyle = 'bg-gray-200 text-gray-700';

  return (
    <div className="page-shell">
      <div className="section-shell">
      <div>
        <h1 className="panel-title">My Schedule</h1>
        <p className="panel-subtitle">View your weekly classes and room assignments.</p>
      </div>

      {/* Day Selector Tabs */}
      <div className="panel-card mb-0 flex items-center justify-between gap-1 rounded-xl bg-[#eaf0ff] p-1.5">
        {weekDays.map(day => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`flex-1 rounded-lg py-2 text-center text-sm font-medium transition-colors duration-200 ${selectedDay === day ? activeTabStyle : 'text-[var(--aau-muted)]'}`}>
            {day.charAt(0).toUpperCase() + day.slice(1, 3)}
          </button>
        ))}
      </div>

      {/* Schedule View */}
      <div className="mt-4">
        {isLoading ? (
          <p className="panel-card text-center text-[var(--aau-muted)]">Loading schedule...</p>
        ) : error ? (
          <p className="panel-card text-center text-red-500">Error loading schedule.</p>
        ) : (
          <ScheduleDayView classes={getByDay(selectedDay)} day={selectedDay} />
        )}
      </div>
      </div>
    </div>
  );
};

export default SchedulePage;
