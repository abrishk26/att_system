import React, { useState } from 'react';
import type { PermissionSessionOption } from '../../../lib/api/permissions';

interface PermissionRequestFormProps {
  onSubmit: (formData: { sessionId: string; description: string; file?: File | null }) => Promise<void>;
  isLoading: boolean;
  sessionOptions: PermissionSessionOption[];
  isLoadingSessions: boolean;
}

export const PermissionRequestForm: React.FC<PermissionRequestFormProps> = ({
  onSubmit,
  isLoading,
  sessionOptions,
  isLoadingSessions,
}) => {
  const [sessionId, setSessionId] = useState('');
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || !sessionId) {
        setError('Session ID and reason are required.');
        return;
    }
    setError(null);
    await onSubmit({ sessionId, description: reason, file });
    // Reset form after submission
    setSessionId('');
    setReason('');
    setFile(null);
  };

  return (
    <form onSubmit={handleSubmit} className="panel-card">
        {error && <p className="mb-3 text-sm font-medium text-red-500">{error}</p>}
      <div className="mb-4">
        <label htmlFor="permission-session-id" className="mb-1 block text-sm font-medium text-[var(--aau-text)]">
          Session
        </label>
        <select
          id="permission-session-id"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          disabled={isLoadingSessions || sessionOptions.length === 0}
          className="w-full rounded-xl border border-[var(--aau-border)] p-2.5 shadow-sm focus:border-[var(--aau-accent)] focus:outline-none focus:ring-2 focus:ring-[rgba(0,168,232,0.25)]"
        >
          <option value="">{isLoadingSessions ? 'Loading sessions...' : 'Select a session'}</option>
          {sessionOptions.map((option) => (
            <option key={option.sessionId} value={option.sessionId}>
              {option.label}
            </option>
          ))}
        </select>
        {!isLoadingSessions && sessionOptions.length === 0 && (
          <p className="mt-2 text-xs text-[var(--aau-muted)]">No available sessions found for your account.</p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="permission-reason" className="mb-1 block text-sm font-medium text-[var(--aau-text)]">
          Reason for Absence
        </label>
        <textarea
          id="permission-reason"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full rounded-xl border border-[var(--aau-border)] p-2.5 shadow-sm focus:border-[var(--aau-accent)] focus:outline-none focus:ring-2 focus:ring-[rgba(0,168,232,0.25)]"
          placeholder="e.g., Doctor's appointment"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="permission-file" className="mb-1 block text-sm font-medium text-[var(--aau-text)]">
          Supporting File (optional)
        </label>
        <input
          type="file"
          id="permission-file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full rounded-xl border border-[var(--aau-border)] p-2.5 text-sm shadow-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--aau-primary)] file:px-3 file:py-1.5 file:text-white"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary w-full disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        {isLoading ? 'Submitting...' : 'Submit Request'}
      </button>
    </form>
  );
};
