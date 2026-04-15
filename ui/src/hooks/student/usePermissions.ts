import { useState, useEffect, useCallback } from 'react';
import { getMyPermissions, submitPermission as apiSubmitPermission } from '../../lib/api/permissions';
import type { PermissionRequest } from '../../lib/types/student';

type SubmitPayload = {
  sessionId: string;
  description: string;
  file?: File | null;
};

export function usePermissions(studentId: string) {
  const [permissions, setPermissions] = useState<PermissionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    setIsLoading(true);
    getMyPermissions(studentId)
      .then(setPermissions)
      .finally(() => setIsLoading(false));
  }, [studentId]);

  const submit = useCallback(async (payload: SubmitPayload) => {
    setIsLoading(true);
    try {
      const newPermission = await apiSubmitPermission(payload);
      setPermissions(prev => [newPermission, ...prev]);
      return newPermission;
    } catch (error) {
      console.error("Failed to submit permission:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { permissions, submit, isLoading };
}
