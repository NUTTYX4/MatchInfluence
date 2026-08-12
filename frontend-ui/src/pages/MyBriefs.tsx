import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { campaignAPI, type Campaign } from '../api/client';
import './MyBriefs.css';

interface MyBriefsProps {
  onSelect: (id: string) => void;
}

export function MyBriefs({ onSelect }: MyBriefsProps) {
  const navigate = useNavigate();
  const [briefs, setBriefs] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(null);
    campaignAPI.list()
      .then((res) => {
        setBriefs(res as Campaign[]);
      })
      .catch((e: any) => {
        setError(e.message || 'Failed to load your briefs. Please try again.');
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredBriefs = briefs.filter(b => {
    const query = searchQuery.toLowerCase();
    return (
      (b.niche ?? '').toLowerCase().includes(query) ||
      (b.audience ?? '').toLowerCase().includes(query)
    );
  });

  const handleSelectBrief = (id: string) => {
    onSelect(id);
    navigate('/creators');
  };

  return (
    <div className="my-briefs-container animate-fade-in">
      <header className="page-header">
        <div>
          <h1 className="text-headline-lg">My Briefs <span className="accent-dot">●</span></h1>
          <p className="text-body-md text-muted">Manage your saved campaign visions, examine matched creators, and analyze campaign performance.</p>
        </div>
        <div>
          <button className="btn btn-primary" onClick={() => navigate('/')}>+ Shape a New Brief</button>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="card" style={{
          background: 'var(--color-error-container, #fef2f2)',
          border: '1px solid var(--color-error, #dc2626)',
          borderRadius: '12px',
          padding: '12px 16px',
          marginBottom: '16px',
          color: 'var(--color-error, #dc2626)',
          fontSize: '0.875rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>⚠ {error}</span>
          <button type="button" onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
        </div>
      )}

      <div className="briefs-toolbar card">
        <div className="brief-search" style={{ width: '100%' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Search briefs by niche or audience..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="briefs-list-grid">
          {[1, 2, 3].map(i => (
            <div key={i} className="brief-full-card card" style={{ opacity: 0.5, animation: 'pulse 1.5s infinite' }}>
              <div className="brief-card-left">
                <div style={{ height: '20px', background: 'var(--color-surface-container-high)', borderRadius: '4px', width: '60%', marginBottom: '12px' }}></div>
                <div style={{ height: '28px', background: 'var(--color-surface-container)', borderRadius: '4px', width: '90%', marginBottom: '8px' }}></div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ height: '24px', background: 'var(--color-surface-container-high)', borderRadius: '20px', width: '100px' }}></div>
                  <div style={{ height: '24px', background: 'var(--color-surface-container-high)', borderRadius: '20px', width: '140px' }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredBriefs.length === 0 && (
        <div className="empty-state card" style={{ padding: '64px', textAlign: 'center' }}>
          {briefs.length === 0 ? (
            <>
              <p className="text-headline-sm" style={{ marginBottom: '8px' }}>No campaigns yet.</p>
              <p className="text-body-md text-muted" style={{ marginBottom: '20px' }}>Shape your first brief to start matching with creators.</p>
              <button className="btn btn-primary" onClick={() => navigate('/')}>+ Shape a New Brief</button>
            </>
          ) : (
            <>
              <p className="text-headline-sm">No briefs match your search.</p>
              <button className="btn btn-primary btn-sm" style={{ marginTop: '16px' }} onClick={() => setSearchQuery('')}>Clear Search</button>
            </>
          )}
        </div>
      )}

      {/* Briefs List */}
      {!loading && filteredBriefs.length > 0 && (
        <div className="briefs-list-grid">
          {filteredBriefs.map((brief, idx) => (
            <div
              key={brief.id}
              className="brief-full-card card animate-slide-up"
              style={{ animationDelay: `${idx * 0.08}s` }}
            >
              <div className="brief-card-left">
                <div className="brief-status-row">
                  <span className="badge badge-primary">Active</span>
                  <span className="text-label-sm text-muted">ID: {brief.id.slice(0, 8)}...</span>
                </div>

                <h2 className="text-headline-md brief-main-title">{brief.niche || 'Untitled Campaign'}</h2>

                <div className="brief-tags-row">
                  {brief.audience && <span className="chip text-label-sm">Audience: {brief.audience}</span>}
                  {brief.brief_text && <span className="chip text-label-sm">{brief.brief_text.slice(0, 40)}...</span>}
                </div>
              </div>

              <div className="brief-card-right">
                <div className="brief-stat-block">
                  <span className="text-label-sm text-muted">BUDGET</span>
                  <span className="stat-value-sm">${(brief.budget ?? 0).toLocaleString()}</span>
                </div>
                <div className="brief-stat-block">
                  <span className="text-label-sm text-muted">TARGET REACH</span>
                  <span className="stat-value-sm">{brief.target_reach ? `${(brief.target_reach / 1000).toFixed(0)}K` : '—'}</span>
                </div>
                <div className="brief-stat-block">
                  <span className="text-label-sm text-muted">CREATORS</span>
                  <span className="stat-value-sm">—</span>
                </div>

                <div className="brief-card-buttons">
                  <button
                    className="btn btn-secondary"
                    onClick={() => { onSelect(brief.id); navigate('/analytics'); }}
                  >
                    Analytics ◔
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleSelectBrief(brief.id)}
                  >
                    Creators ↗
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
