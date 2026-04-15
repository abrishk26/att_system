import { useMemo, useState } from 'react';
import { useAuth } from '../../AuthContext';
import './Settings.css';

type TabKey = 'profile' | 'notifications' | 'department' | 'security';

function fieldValueOrDash(v: string | undefined | null) {
  return v && v.trim().length > 0 ? v : '—';
}

export default function Settings() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('profile');

  // Keep this UI read-only for now because the Rust API doesn't provide update endpoints.
  const profile = useMemo(() => user, [user]);

  const onLogout = () => logout();

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div>
          <h2>Settings</h2>
          <p className="page-sub">Manage your account and system preferences</p>
        </div>
        <button className="logout-btn" type="button" onClick={onLogout}>
          Logout
        </button>
      </div>

      <div className="settings-card">
        <div className="tabs" role="tablist" aria-label="Settings tabs">
          <TabButton label="Profile" icon="👤" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
          <TabButton label="Notifications" icon="🔔" active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} />
          <TabButton label="Department" icon="🏢" active={activeTab === 'department'} onClick={() => setActiveTab('department')} />
          <TabButton label="Security" icon="🛡️" active={activeTab === 'security'} onClick={() => setActiveTab('security')} />
        </div>

        <div className="tab-body">
          {activeTab === 'profile' && (
            <div className="tab-section">
              <div className="section-title">Profile Information</div>
              <div className="profile-top">
                <div className="profile-avatar">
                  {profile?.img_url ? (
                    // Note: img_url is provided by the backend; if it's not publicly served, the image will fail and fallback will be shown.
                    <img className="avatar-img" src={profile.img_url} alt="Profile" onError={(e) => {
                      const el = e.currentTarget;
                      el.style.display = 'none';
                    }} />
                  ) : null}
                  <span className="avatar-fallback">
                    {(profile?.first_name?.[0] ?? 'U').toUpperCase()}
                  </span>
                </div>
                <button className="primary-btn" type="button" disabled>
                  Change Photo
                </button>
              </div>

              <div className="form-grid">
                <label className="field">
                  <span className="field-label">Full Name</span>
                  <input className="field-control" value={`${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim()} disabled />
                </label>

                <label className="field">
                  <span className="field-label">Email Address</span>
                  <input className="field-control" value={profile?.username ?? ''} disabled />
                </label>

                <label className="field">
                  <span className="field-label">Phone Number</span>
                  <input className="field-control" value={fieldValueOrDash(undefined)} disabled />
                </label>

                <label className="field">
                  <span className="field-label">Employee ID</span>
                  <input className="field-control" value={profile?.id ?? fieldValueOrDash(undefined)} disabled />
                </label>

                <label className="field">
                  <span className="field-label">Role</span>
                  <input className="field-control" value={profile?.role ?? '—'} disabled />
                </label>

                <label className="field">
                  <span className="field-label">Department</span>
                  <input className="field-control" value={'—'} disabled />
                </label>
              </div>

              <button className="primary-btn" type="button" disabled>
                Save Changes
              </button>

              <div className="note">
                Update actions are disabled because the current backend doesn&apos;t expose profile/password/setting update endpoints.
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="tab-section">
              <div className="section-title">Notification Preferences</div>
              <p className="section-sub">Choose how you want to be notified about important updates</p>

              <ToggleRow label="Email Notifications" description="Receive notifications via email" />
              <ToggleRow label="Push Notifications" description="Receive push notifications in your browser" />
              <ToggleRow label="Weekly Reports" description="Receive weekly attendance summary reports" />
              <ToggleRow label="Low Attendance Alerts" description="Get notified when attendance drops below threshold" />

              <button className="primary-btn" type="button" disabled>
                Save Preferences
              </button>
            </div>
          )}

          {activeTab === 'department' && (
            <div className="tab-section">
              <div className="section-title">Department Settings</div>

              <div className="form-grid">
                <label className="field">
                  <span className="field-label">Department Name</span>
                  <input className="field-control" value={'—'} disabled />
                </label>
                <label className="field">
                  <span className="field-label">Department Code</span>
                  <input className="field-control" value={'—'} disabled />
                </label>
                <label className="field">
                  <span className="field-label">Attendance Threshold (%)</span>
                  <input className="field-control" value={'—'} disabled />
                </label>
                <label className="field">
                  <span className="field-label">Default Class Duration (minutes)</span>
                  <input className="field-control" value={'—'} disabled />
                </label>
              </div>

              <button className="primary-btn" type="button" disabled>
                Update Department Settings
              </button>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="tab-section">
              <div className="section-title">Security Settings</div>

              <div className="form-grid">
                <label className="field">
                  <span className="field-label">Current Password</span>
                  <input className="field-control" value={''} placeholder="Enter current password" disabled />
                </label>

                <label className="field">
                  <span className="field-label">New Password</span>
                  <input className="field-control" value={''} placeholder="Enter new password" disabled />
                </label>

                <label className="field">
                  <span className="field-label">Confirm New Password</span>
                  <input className="field-control" value={''} placeholder="Confirm new password" disabled />
                </label>
              </div>

              <button className="primary-btn" type="button" disabled>
                Update Password
              </button>

              <div className="note">Password changes are disabled because the current backend doesn&apos;t expose a password update endpoint.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className={active ? 'tab-btn active' : 'tab-btn'} onClick={onClick}>
      <span className="tab-icon">{icon}</span>
      {label}
    </button>
  );
}

function ToggleRow({ label, description }: { label: string; description: string }) {
  return (
    <div className="toggle-row">
      <div>
        <div className="toggle-label">{label}</div>
        <div className="toggle-desc">{description}</div>
      </div>
      <input type="checkbox" checked={false} disabled />
    </div>
  );
}

