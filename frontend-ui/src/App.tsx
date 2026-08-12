import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Authentication } from './pages/Authentication';
import { AppLayout } from './layouts/AppLayout';
import { ShapeABrief } from './pages/ShapeABrief';
import { Creators } from './pages/Creators';
import { MyBriefs } from './pages/MyBriefs';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';
import { authAPI, type UserProfile } from './api/client';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);

  const handleLogin = (profile?: UserProfile) => {
    setIsAuthenticated(true);
    if (profile) {
      setUserProfile(profile);
    } else {
      authAPI.getProfile().then(setUserProfile).catch(() => {
        setUserProfile({
          id: "default-user",
          email: "guest@example.com",
          full_name: "Guest User",
          company_or_agency: "MatchInfluence Enterprise",
        });
      });
    }
  };

  if (!isAuthenticated) {
    return <Authentication onLogin={handleLogin} />;
  }

  const handleCampaignCreated = (id: string) => {
    setActiveCampaignId(id);
  };

  return (
    <AppLayout onLogout={() => { setIsAuthenticated(false); setUserProfile(null); }} userProfile={userProfile}>
      <Routes>
        <Route
          path="/"
          element={<ShapeABrief onCampaignCreated={handleCampaignCreated} />}
        />
        <Route
          path="/creators"
          element={<Creators campaignId={activeCampaignId} />}
        />
        <Route path="/briefs" element={<MyBriefs onSelect={setActiveCampaignId} />} />
        <Route
          path="/analytics"
          element={<Analytics campaignId={activeCampaignId} />}
        />
        <Route path="/settings" element={<Settings userProfile={userProfile} onUpdateProfile={setUserProfile} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

export default App;
