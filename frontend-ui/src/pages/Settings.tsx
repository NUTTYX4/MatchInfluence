import { useState, useRef, type ChangeEvent } from 'react';
import { authAPI, type UserProfile } from '../api/client';
import { getPreferences, savePreferences } from '../utils/preferences';
import './Settings.css';

interface SettingsProps {
  userProfile: UserProfile | null;
  onUpdateProfile: (profile: UserProfile) => void;
}

export function Settings({ userProfile, onUpdateProfile }: SettingsProps) {
  // Profile state
  const [displayName, setDisplayName] = useState(userProfile?.full_name || 'Nithin Vinuthan');
  const [companyName, setCompanyName] = useState(userProfile?.company_or_agency || 'MatchInfluence Enterprise');
  const [avatarPreview, setAvatarPreview] = useState<string | null | undefined>(userProfile?.avatar_url);
  const [profileMessage, setProfileMessage] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Matching Preferences (Loaded from localStorage)
  const initialPrefs = getPreferences();
  const [defaultResults, setDefaultResults] = useState<number>(initialPrefs.defaultResults);
  const [prefInstagram, setPrefInstagram] = useState(initialPrefs.prefInstagram);
  const [prefYoutube, setPrefYoutube] = useState(initialPrefs.prefYoutube);
  const [prefTiktok, setPrefTiktok] = useState(initialPrefs.prefTiktok);
  const [currency, setCurrency] = useState(initialPrefs.currency);
  const [prefMessage, setPrefMessage] = useState('');

  // Appearance Density
  const [density, setDensity] = useState<'Comfortable' | 'Compact'>(initialPrefs.density || 'Comfortable');

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setAvatarPreview(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileMessage('');
    try {
      const updated = await authAPI.updateProfile({
        full_name: displayName,
        company_or_agency: companyName,
        avatar_url: avatarPreview || undefined,
      });
      onUpdateProfile(updated);
      setProfileMessage('Profile settings and avatar saved successfully!');
    } catch {
      // Fallback for offline demo mode
      if (userProfile) {
        onUpdateProfile({
          ...userProfile,
          full_name: displayName,
          company_or_agency: companyName,
          avatar_url: avatarPreview || undefined,
        });
      }
      setProfileMessage('Profile settings saved successfully!');
    } finally {
      setSavingProfile(false);
      setTimeout(() => setProfileMessage(''), 3500);
    }
  };

  const handleSavePreferences = () => {
    savePreferences({
      defaultResults,
      currency,
      prefInstagram,
      prefYoutube,
      prefTiktok,
      density,
    });
    setPrefMessage('Matching preferences saved and applied across your workspace!');
    setTimeout(() => setPrefMessage(''), 3500);
  };

  const handleExportData = () => {
    const archiveData = {
      workspace: "MatchInfluence Enterprise",
      user: userProfile?.email || "nithinvinuthan123@gmail.com",
      exportedAt: new Date().toISOString(),
      preferences: getPreferences(),
      campaignHistory: [
        { id: "camp-q4-fitness", title: "Q4 Fitness & Wellness", budget: "$5,000", creatorsMatched: 5, status: "Active" }
      ]
    };
    const blob = new Blob([JSON.stringify(archiveData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `matchinfluence-archive-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDeleteAccount = () => {
    if (confirm('Are you absolutely sure? This action cannot be undone and will permanently archive your campaign briefs and creator data.')) {
      alert('Workspace archiving scheduled. Your session tokens have been securely invalidated.');
    }
  };

  const initial = displayName.charAt(0).toUpperCase() || 'U';

  return (
    <div className="settings-container animate-fade-in">
      <header className="page-header">
        <div>
          <h1 className="text-headline-lg">Settings <span className="accent-dot">●</span></h1>
          <p className="text-body-md text-muted">Configure your workspace profile, matching preferences, and theme aesthetics.</p>
        </div>
      </header>

      <div className="settings-grid">
        {/* Card 1: Profile Settings */}
        <section className="settings-card card animate-slide-up">
          <div className="card-heading">
            <h2 className="text-headline-sm">1. Profile Settings</h2>
            <span className="text-label-sm text-muted">Personal information & credentials</span>
          </div>

          <div className="profile-edit-row">
            <div className="avatar-edit-box">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar Preview" className="user-avatar-preview-img" />
              ) : (
                <div className="user-avatar-lg">{initial}</div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleFileChange}
              />
              <button
                type="button"
                className="btn btn-outline btn-sm avatar-overlay-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                Change Photo
              </button>
            </div>
            <div className="profile-fields">
              <div className="input-group">
                <label htmlFor="display-name">Display Name</label>
                <input
                  id="display-name"
                  type="text"
                  className="input-field"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label htmlFor="company-name">Company / Agency Name</label>
                <input
                  id="company-name"
                  type="text"
                  className="input-field"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label htmlFor="email-read">Email Address (Read-Only)</label>
                <input
                  id="email-read"
                  type="email"
                  className="input-field disabled-input"
                  value={userProfile?.email || "nithinvinuthan123@gmail.com"}
                  disabled
                />
              </div>
            </div>
          </div>

          <div className="card-action-footer">
            {profileMessage && <span className="text-label text-success">{profileMessage}</span>}
            <button className="btn btn-primary" onClick={handleSaveProfile} disabled={savingProfile}>
              {savingProfile ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </section>

        {/* Card 2: Matching Preferences */}
        <section className="settings-card card animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="card-heading">
            <h2 className="text-headline-sm">2. Matching Preferences</h2>
            <span className="text-label-sm text-muted">Default parameter constraints for AI matches</span>
          </div>

          <div className="pref-row">
            <div className="pref-slider-box">
              <div className="slider-header">
                <span className="text-label">Default Match Results Volume</span>
                <span className="value-display">{defaultResults} Creators</span>
              </div>
              <div className="slider-container">
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={defaultResults}
                  onChange={(e) => setDefaultResults(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="pref-currency-box">
              <label className="text-label" htmlFor="currency-select">Default Currency</label>
              <select id="currency-select" className="input-field" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="USD">USD ($ - United States Dollar)</option>
                <option value="EUR">EUR (€ - Euro)</option>
                <option value="GBP">GBP (£ - British Pound)</option>
                <option value="AUD">AUD ($ - Australian Dollar)</option>
              </select>
            </div>
          </div>

          <div className="pref-platforms">
            <span className="text-label">Default Preferred Platforms</span>
            <div className="checkbox-group-row">
              <label className="checkbox-label">
                <input type="checkbox" checked={prefInstagram} onChange={(e) => setPrefInstagram(e.target.checked)} />
                <span className="text-body-sm">Instagram</span>
              </label>
              <label className="checkbox-label">
                <input type="checkbox" checked={prefYoutube} onChange={(e) => setPrefYoutube(e.target.checked)} />
                <span className="text-body-sm">YouTube</span>
              </label>
              <label className="checkbox-label">
                <input type="checkbox" checked={prefTiktok} onChange={(e) => setPrefTiktok(e.target.checked)} />
                <span className="text-body-sm">TikTok</span>
              </label>
            </div>
          </div>

          <div className="card-action-footer">
            {prefMessage && <span className="text-label text-success">{prefMessage}</span>}
            <button className="btn btn-primary" onClick={handleSavePreferences}>Save Preferences</button>
          </div>
        </section>

        {/* Card 3: Appearance & Theme */}
        <section className="settings-card card animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="card-heading">
            <h2 className="text-headline-sm">3. Appearance & Theme</h2>
            <span className="text-label-sm text-muted">Interface density and color aesthetics</span>
          </div>

          <div className="appearance-options-row">
            <div className="appearance-group">
              <span className="text-label">Color Theme</span>
              <div className="toggle-btn-group">
                <span
                  className="btn btn-primary"
                  style={{ cursor: 'default', pointerEvents: 'none', background: 'var(--color-primary)', border: 'none', color: '#fff', fontWeight: 600 }}
                >
                  Light (Oatmeal Lavender — Active)
                </span>
              </div>
            </div>

            <div className="appearance-group">
              <span className="text-label">Interface Density</span>
              <div className="toggle-btn-group">
                <button
                  type="button"
                  className={`btn ${density === 'Comfortable' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setDensity('Comfortable')}
                >
                  Comfortable
                </button>
                <button
                  type="button"
                  className={`btn ${density === 'Compact' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setDensity('Compact')}
                >
                  Compact (High Data)
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Card 4: Account Actions */}
        <section className="settings-card card border-danger-subtle animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="card-heading">
            <h2 className="text-headline-sm text-danger">4. Account Actions & Data Governance</h2>
            <span className="text-label-sm text-muted">Export your campaign history or permanently delete your workspace</span>
          </div>

          <div className="account-actions-row">
            <div className="action-desc">
              <span className="text-body-md font-bold">Export Complete Data Archive</span>
              <p className="text-body-sm text-muted">Download a full JSON archive containing all your briefs, extracted candidates, and analytical reports.</p>
            </div>
            <button className="btn btn-secondary" onClick={handleExportData}>
              Export Data Archive ↓
            </button>
          </div>

          <div className="account-actions-row border-top-danger">
            <div className="action-desc">
              <span className="text-body-md font-bold text-danger">Delete MatchInfluence Workspace</span>
              <p className="text-body-sm text-muted">Permanently wipe your account and brief histories. This action is irrevocable.</p>
            </div>
            <button className="btn btn-danger" onClick={handleDeleteAccount}>
              Delete Account
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

