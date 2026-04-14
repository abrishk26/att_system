import { useState, useEffect, useMemo } from 'react';
import { getSchedule } from '../../lib/api/schedule';
import type { ScheduledClass } from '../../lib/types/student';

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

interface UseScheduleReturn {
  schedule: ScheduledClass[];
  todayClasses: ScheduledClass[];
  getByDay: (day: DayOfWeek) => ScheduledClass[];
  isLoading: boolean;
  error: Error | null;
}

const getTodayDayOfWeek = (): DayOfWeek => {
  const dayIndex = new Date().getDay(); // Sunday = 0, Monday = 1, ...
  const days: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  // Adjust for Sunday, or default to Monday for weekend
  return days[dayIndex - 1] || 'monday'; 
};

export function useSchedule(studentId: string): UseScheduleReturn {
  const [schedule, setSchedule] = useState<ScheduledClass[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!studentId) return;

    const fetchSchedule = async () => {
      try {
        setIsLoading(true);
        const data = await getSchedule(studentId);
        setSchedule(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchedule();
  }, [studentId]);

  const getByDay = (day: DayOfWeek): ScheduledClass[] => {
    return schedule
      .filter(c => c.dayOfWeek.toLowerCase() === day.toLowerCase())
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };
  
  const todayClasses = useMemo(() => {
    const today = getTodayDayOfWeek();
    return getByDay(today)
  }, [schedule]);


  return { schedule, todayClasses, getByDay, isLoading, error };
}
