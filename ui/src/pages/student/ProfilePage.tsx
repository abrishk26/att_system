import React from 'react';
import { useNavigate } from 'react-router-dom';
import { fetcher } from '../../lib/api/fetcher';

interface BackendProfile {
  id: string;
  username: string;
  first_name: string;
  last_name: string | null;
  role: string;
  img_url: string | null;
}

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [studentProfile, setStudentProfile] = React.useState<BackendProfile | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true);
        const data = await fetcher<BackendProfile>('/profile');
        setStudentProfile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleLogout = () => {
    // Implement actual logout logic here (e.g., clear token, call API)
    console.log('Logging out...');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    navigate('/login');
  };

  if (isLoading) {
    return <div className="page-shell"><div className="section-shell"><p className="panel-card text-center text-[var(--aau-muted)]">Loading profile...</p></div></div>;
  }

  if (error || !studentProfile) {
    return <div className="page-shell"><div className="section-shell"><p className="panel-card text-center text-red-500">{error || 'Profile not available'}</p></div></div>;
  }

  const fullName = `${studentProfile.first_name}${studentProfile.last_name ? ` ${studentProfile.last_name}` : ''}`;

  return (
    <div className="page-shell">
      <div className="section-shell">
      <h1 className="panel-title">My Profile</h1>

      <div className="panel-card">
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--aau-primary)] text-2xl font-bold text-white">
            {fullName.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--aau-text)]">{fullName}</h2>
            <p className="text-sm text-[var(--aau-muted)]">{studentProfile.id}</p>
          </div>
        </div>

        <div className="space-y-4 text-sm">
          <div className="flex justify-between">
            <span className="font-medium text-[var(--aau-muted)]">Email:</span>
            <span className="text-[var(--aau-text)]">{studentProfile.username}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-[var(--aau-muted)]">Role:</span>
            <span className="capitalize text-[var(--aau-text)]">{studentProfile.role}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-[var(--aau-muted)]">Avatar:</span>
            <span className="text-[var(--aau-text)]">{studentProfile.img_url ? 'Available' : 'Not set'}</span>
          </div>
        </div>
      </div>

      <div className="panel-card mt-0">
        <h3 className="mb-4 text-lg font-bold text-[var(--aau-text)]">NFC Card Details</h3>
        <div className="space-y-4 text-sm">
            <div className="flex justify-between">
            <span className="font-medium text-[var(--aau-muted)]">Account:</span>
            <span className="text-xs text-[var(--aau-text)]">{studentProfile.username}</span>
            </div>
            <div className="flex justify-between items-center">
                <span className="font-medium text-[var(--aau-muted)]">Status:</span>
            <span className="status-pill success">
            Active
                </span>
            </div>
        </div>
      </div>

      <div className="mt-8">
        <button 
          onClick={handleLogout}
          className="w-full rounded-lg bg-red-500 px-4 py-2.5 font-bold text-white transition-colors duration-200 hover:bg-red-600"
        >
          Logout
        </button>
      </div>
      </div>
    </div>
  );
};

export default ProfilePage;
