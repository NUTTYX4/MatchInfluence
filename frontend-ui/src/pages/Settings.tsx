import { useState } from 'react';
import './Settings.css';

export function Settings() {
  // Profile state
  const [displayName, setDisplayName] = useState('Jane Doe');
  const [profileMessage, setProfileMessage] = useState('');

  // API Config state
  const [llmKey, setLlmKey] = useState('sk-proj-891924892401809');
  const [geminiKey, setGeminiKey] = useState('AIzaSyD-98124982401824');
  const [youtubeKey, setYoutubeKey] = useState('AIzaSyB-8912984120941');
  const [apifyToken, setApifyToken] = useState('apify_api_901840182409');
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [apiMessage, setApiMessage] = useState('');
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [testSuccess, setTestSuccess] = useState<Record<string, boolean>>({});

  // Matching Preferences
  const [defaultResults, setDefaultResults] = useState<number>(15);
  const [prefInstagram, setPrefInstagram] = useState(true);
  const [prefYoutube, setPrefYoutube] = useState(true);
  const [prefTiktok, setPrefTiktok] = useState(true);
  const [currency, setCurrency] = useState('USD');
  const [prefMessage, setPrefMessage] = useState('');

  // Appearance
  const [theme, setTheme] = useState<'Light' | 'Dark'>('Light');
  const [density, setDensity] = useState<'Comfortable' | 'Compact'>('Comfortable');

  const toggleShowKey = (name: string) => {
    setShowKeys(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handleTestConnection = (service: string) => {
    setTestingConnection(service);
    setTimeout(() => {
      setTestingConnection(null);
      setTestSuccess(prev => ({ ...prev, [service]: true }));
    }, 1000);
  };

  const handleSaveProfile = () => {
    setProfileMessage('Profile settings saved successfully!');
    setTimeout(() => setProfileMessage(''), 3000);
  };

  const handleSaveAPI = () => {
    setApiMessage('API configuration securely updated and encrypted!');
    setTimeout(() => setApiMessage(''), 3000);
  };

  const handleSavePreferences = () => {
    setPrefMessage('Matching preferences saved as standard defaults!');
    setTimeout(() => setPrefMessage(''), 3000);
  };

  const handleDeleteAccount = () => {
    if (confirm('Are you absolutely sure? This action cannot be undone and will delete all your campaign briefs and matched creator data.')) {
      alert('Account deletion requested. Our team will process this within 24 hours.');
    }
  };

  return (
    <div className="settings-container animate-fade-in">
      <header className="page-header">
        <div>
          <h1 className="text-headline-lg">Settings <span className="accent-dot">●</span></h1>
          <p className="text-body-md text-muted">Configure your platform preferences, secure API tokens, and user profile.</p>
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
              <div className="user-avatar-lg">JD</div>
              <button className="btn btn-outline btn-sm avatar-overlay-btn" title="Change Avatar">📷 Change</button>
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
                <label htmlFor="email-read">Email Address (Read-Only)</label>
                <input
                  id="email-read"
                  type="email"
                  className="input-field disabled-input"
                  value="jane.doe@company.com"
                  disabled
                />
              </div>
            </div>
          </div>

          <div className="card-action-footer">
            {profileMessage && <span className="text-label text-success">{profileMessage}</span>}
            <button className="btn btn-primary" onClick={handleSaveProfile}>Save Profile Changes</button>
          </div>
        </section>

        {/* Card 2: API Configuration */}
        <section className="settings-card card animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="card-heading">
            <h2 className="text-headline-sm">2. AI & Data API Configuration</h2>
            <span className="text-label-sm text-muted">Connect LLM engines and scraping providers</span>
          </div>

          <div className="api-list-group">
            {/* Gemini API Key */}
            <div className="api-key-row">
              <div className="api-input-col">
                <label className="text-label-sm text-muted">GEMINI 3.1 PRO API KEY (CORE CO-PILOT)</label>
                <div className="masked-input-wrapper">
                  <input
                    type={showKeys['gemini'] ? 'text' : 'password'}
                    className="input-field"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                  />
                  <button type="button" className="btn-toggle-vis" onClick={() => toggleShowKey('gemini')}>
                    {showKeys['gemini'] ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <div className="api-btn-col">
                <button
                  className={`btn btn-sm ${testSuccess['gemini'] ? 'btn-secondary' : 'btn-outline'}`}
                  onClick={() => handleTestConnection('gemini')}
                  disabled={testingConnection === 'gemini'}
                >
                  {testingConnection === 'gemini' ? 'Testing...' : testSuccess['gemini'] ? '✦ Connected' : 'Test Connection'}
                </button>
              </div>
            </div>

            {/* LLM API Key */}
            <div className="api-key-row">
              <div className="api-input-col">
                <label className="text-label-sm text-muted">OPENAI / ANTHROPIC API KEY (SEMANTIC FALLBACK)</label>
                <div className="masked-input-wrapper">
                  <input
                    type={showKeys['llm'] ? 'text' : 'password'}
                    className="input-field"
                    value={llmKey}
                    onChange={(e) => setLlmKey(e.target.value)}
                  />
                  <button type="button" className="btn-toggle-vis" onClick={() => toggleShowKey('llm')}>
                    {showKeys['llm'] ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <div className="api-btn-col">
                <button
                  className={`btn btn-sm ${testSuccess['llm'] ? 'btn-secondary' : 'btn-outline'}`}
                  onClick={() => handleTestConnection('llm')}
                  disabled={testingConnection === 'llm'}
                >
                  {testingConnection === 'llm' ? 'Testing...' : testSuccess['llm'] ? '✦ Connected' : 'Test Connection'}
                </button>
              </div>
            </div>

            {/* YouTube API Key */}
            <div className="api-key-row">
              <div className="api-input-col">
                <label className="text-label-sm text-muted">YOUTUBE DATA API V3 KEY</label>
                <div className="masked-input-wrapper">
                  <input
                    type={showKeys['yt'] ? 'text' : 'password'}
                    className="input-field"
                    value={youtubeKey}
                    onChange={(e) => setYoutubeKey(e.target.value)}
                  />
                  <button type="button" className="btn-toggle-vis" onClick={() => toggleShowKey('yt')}>
                    {showKeys['yt'] ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <div className="api-btn-col">
                <button
                  className={`btn btn-sm ${testSuccess['yt'] ? 'btn-secondary' : 'btn-outline'}`}
                  onClick={() => handleTestConnection('yt')}
                  disabled={testingConnection === 'yt'}
                >
                  {testingConnection === 'yt' ? 'Testing...' : testSuccess['yt'] ? '✦ Connected' : 'Test Connection'}
                </button>
              </div>
            </div>

            {/* Apify Token */}
            <div className="api-key-row">
              <div className="api-input-col">
                <label className="text-label-sm text-muted">APIFY SCRAPER TOKEN (INSTAGRAM / TIKTOK INGESTION)</label>
                <div className="masked-input-wrapper">
                  <input
                    type={showKeys['apify'] ? 'text' : 'password'}
                    className="input-field"
                    value={apifyToken}
                    onChange={(e) => setApifyToken(e.target.value)}
                  />
                  <button type="button" className="btn-toggle-vis" onClick={() => toggleShowKey('apify')}>
                    {showKeys['apify'] ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <div className="api-btn-col">
                <button
                  className={`btn btn-sm ${testSuccess['apify'] ? 'btn-secondary' : 'btn-outline'}`}
                  onClick={() => handleTestConnection('apify')}
                  disabled={testingConnection === 'apify'}
                >
                  {testingConnection === 'apify' ? 'Testing...' : testSuccess['apify'] ? '✦ Connected' : 'Test Connection'}
                </button>
              </div>
            </div>
          </div>

          <div className="card-action-footer">
            {apiMessage && <span className="text-label text-success">{apiMessage}</span>}
            <button className="btn btn-primary" onClick={handleSaveAPI}>Save Encrypted Keys</button>
          </div>
        </section>

        {/* Card 3: Matching Preferences */}
        <section className="settings-card card animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="card-heading">
            <h2 className="text-headline-sm">3. Matching Preferences</h2>
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
              <label className="text-label">Default Currency</label>
              <select className="input-field" value={currency} onChange={(e) => setCurrency(e.target.value)}>
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
                <span className="text-body-sm">📸 Instagram</span>
              </label>
              <label className="checkbox-label">
                <input type="checkbox" checked={prefYoutube} onChange={(e) => setPrefYoutube(e.target.checked)} />
                <span className="text-body-sm">▶️ YouTube</span>
              </label>
              <label className="checkbox-label">
                <input type="checkbox" checked={prefTiktok} onChange={(e) => setPrefTiktok(e.target.checked)} />
                <span className="text-body-sm">🎵 TikTok</span>
              </label>
            </div>
          </div>

          <div className="card-action-footer">
            {prefMessage && <span className="text-label text-success">{prefMessage}</span>}
            <button className="btn btn-primary" onClick={handleSavePreferences}>Save Preferences</button>
          </div>
        </section>

        {/* Card 4: Appearance & Theme */}
        <section className="settings-card card animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="card-heading">
            <h2 className="text-headline-sm">4. Appearance & Theme</h2>
            <span className="text-label-sm text-muted">Interface density and color aesthetics</span>
          </div>

          <div className="appearance-options-row">
            <div className="appearance-group">
              <span className="text-label">Color Theme</span>
              <div className="toggle-btn-group">
                <button
                  type="button"
                  className={`btn ${theme === 'Light' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setTheme('Light')}
                >
                  ☀ Light (Oatmeal Lavender)
                </button>
                <button
                  type="button"
                  className={`btn ${theme === 'Dark' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => alert('Dark premium theme token switcher available in production build.')}
                >
                  🌙 Dark (Command Center)
                </button>
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

        {/* Card 5: Account Actions */}
        <section className="settings-card card border-danger-subtle animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <div className="card-heading">
            <h2 className="text-headline-sm text-danger">5. Account Actions & Data Governance</h2>
            <span className="text-label-sm text-muted">Export your campaign history or permanently delete your workspace</span>
          </div>

          <div className="account-actions-row">
            <div className="action-desc">
              <span className="text-body-md font-bold">Export Complete Data Archive</span>
              <p className="text-body-sm text-muted">Download a full JSON archive containing all your briefs, extracted candidates, and analytical reports.</p>
            </div>
            <button className="btn btn-secondary" onClick={() => alert('Exporting data archive. Check your downloads folder.')}>
              Export Data Archive ↓
            </button>
          </div>

          <div className="account-actions-row border-top-danger">
            <div className="action-desc">
              <span className="text-body-md font-bold text-danger">Delete MatchInfluence Workspace</span>
              <p className="text-body-sm text-muted">Permanently wipe your account, API tokens, and brief histories. This action is irrevocable.</p>
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
