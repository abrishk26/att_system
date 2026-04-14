import React from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { usePermissions } from '../../hooks/student/usePermissions';
import { PermissionRequestForm } from '../../components/student/permissions/PermissionRequestForm';
import { PermissionStatusCard } from '../../components/student/permissions/PermissionStatusCard';
import { getPermissionSessionOptions, type PermissionSessionOption } from '../../lib/api/permissions';
import { ArrowLeft } from 'lucide-react';

const PermissionsPage: React.FC = () => {
  const { studentId } = useOutletContext<{ studentId: string }>();
  const { permissions, submit, isLoading } = usePermissions(studentId);
  const navigate = useNavigate();
  const [sessionOptions, setSessionOptions] = React.useState<PermissionSessionOption[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;
    setIsLoadingSessions(true);
    getPermissionSessionOptions(studentId)
      .then((options) => {
        if (isMounted) {
          setSessionOptions(options);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingSessions(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [studentId]);

  const handleSubmit = async (formData: { sessionId: string; description: string; file?: File | null }) => {
    await submit({
      sessionId: formData.sessionId,
      description: formData.description,
      file: formData.file,
    });
  };

  return (
    <div className="page-shell">
      <div className="section-shell">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="btn-secondary !p-2" title="Go back"><ArrowLeft size={20}/></button>
          <div>
            <h1 className="panel-title">Absence Permissions</h1>
            <p className="panel-subtitle">Request and track class absence approvals.</p>
          </div>
        </div>

      {/* Request Form */}
      <div className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-[var(--aau-text)]">Request a New Permission</h2>
        <PermissionRequestForm
          onSubmit={handleSubmit}
          isLoading={isLoading}
          sessionOptions={sessionOptions}
          isLoadingSessions={isLoadingSessions}
        />
      </div>

      {/* Past Requests */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-[var(--aau-text)]">My Past Requests</h2>
        {isLoading && permissions.length === 0 ? (
          <p className="panel-card text-center text-[var(--aau-muted)]">Loading requests...</p>
        ) : (
          <div className="space-y-3">
            {permissions.map(req => (
              <PermissionStatusCard key={req.permissionId} request={req} />
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default PermissionsPage;
