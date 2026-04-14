import { useState, useEffect, useCallback } from 'react';
import { getAttendanceHistory, getCourseDetail } from '../../lib/api/attendance';
import type { CourseAttendance, SessionRecord } from '../../lib/types/student';

interface UseAttendanceReturn {
  history: CourseAttendance[];
  getCourseDetail: (courseId: string) => Promise<SessionRecord[]>;
  isLoading: boolean;
  error: Error | null;
}

export function useAttendance(studentId: string): UseAttendanceReturn {
  const [history, setHistory] = useState<CourseAttendance[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!studentId) return;

    const fetchHistory = async () => {
      try {
        setIsLoading(true);
        const data = await getAttendanceHistory(studentId);
        setHistory(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [studentId]);

  const handleGetCourseDetail = useCallback(async (courseId: string): Promise<SessionRecord[]> => {
    try {
      return await getCourseDetail(studentId, courseId);
    } catch (err) {
      setError(err as Error);
      return []; // Return empty array on error
    }
  }, [studentId]);

  return { history, getCourseDetail: handleGetCourseDetail, isLoading, error };
}
