import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Authentication } from './pages/Authentication';
import { AppLayout } from './layouts/AppLayout';
import { ShapeABrief } from './pages/ShapeABrief';
import { Creators } from './pages/Creators';
import { MyBriefs } from './pages/MyBriefs';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);

  if (!isAuthenticated) {
    return <Authentication onLogin={() => setIsAuthenticated(true)} />;
  }

  const handleCampaignCreated = (id: string) => {
    setActiveCampaignId(id);
  };

  return (
    <AppLayout onLogout={() => setIsAuthenticated(false)}>
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
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

export default App;
