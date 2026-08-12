import { useState, useEffect } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, LineChart, Line
} from 'recharts';
import { analyticsAPI, campaignAPI, type AnalyticsData } from '../api/client';
import './Analytics.css';

interface AnalyticsProps {
  campaignId: string | null;
}

export function Analytics({ campaignId }: AnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Array<{ id: string; niche: string; budget: number }>>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(campaignId);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'rank' | 'composite_score' | 'authenticity_score' | 'cpe'>('rank');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Fetch campaigns list for the selector dropdown
  useEffect(() => {
    campaignAPI.list()
      .then(res => setCampaigns(res as Array<{ id: string; niche: string; budget: number }>))
      .catch(() => {});
  }, []);

  // Keep selectedCampaignId in sync when parent campaignId changes
  useEffect(() => {
    if (campaignId) setSelectedCampaignId(campaignId);
  }, [campaignId]);

  // Fetch analytics when selected campaign changes
  useEffect(() => {
    if (!selectedCampaignId) return;
    setLoading(true);
    setError(null);
    analyticsAPI.get(selectedCampaignId)
      .then(res => {
        setData(res);
      })
      .catch((e: any) => {
        setError(e.message || 'Failed to load analytics data.');
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [selectedCampaignId]);

  const handleSort = (field: 'rank' | 'composite_score' | 'authenticity_score' | 'cpe') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'rank' || field === 'cpe' ? 'asc' : 'desc');
    }
  };

  const handleExport = (type: 'CSV' | 'PDF') => {
    alert(`Exporting analytics as ${type}...`);
  };

  // Derived KPIs from real data
  const totalMatches = data?.history_logs.length ?? 0;
  const avgFit = data && data.history_logs.length > 0
    ? Math.round(data.history_logs.reduce((acc, r) => acc + r.composite_score, 0) / data.history_logs.length)
    : 0;
  const bestCpe = data && data.cpe_ranking.length > 0
    ? Math.min(...data.cpe_ranking.map(r => r.cpe)).toFixed(2)
    : '—';
  const totalReach = data && data.cpe_ranking.length > 0
    ? (data.cpe_ranking.reduce((acc, r) => acc + r.followers, 0) / 1000000).toFixed(1)
    : '0';

  // Sparkline from history_logs composite scores (up to 7 points)
  const sparklineData = data && data.history_logs.length > 0
    ? data.history_logs.slice(0, 7).map(r => ({ val: r.composite_score }))
    : [{ val: 0 }];

  const filteredHistory = (data?.history_logs ?? [])
    .filter(item => item.username.toLowerCase().includes(searchTerm.toLowerCase()) || item.platform.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      const multiplier = sortOrder === 'asc' ? 1 : -1;
      return (a[sortField] - b[sortField]) * multiplier;
    });

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);

  return (
    <div className="analytics-container animate-fade-in">
      <header className="page-header">
        <div className="header-left">
          <h1 className="text-headline-lg">Analytics <span className="accent-dot">●</span></h1>
          <div className="brief-selector-container">
            <span className="text-label-sm text-muted">BRIEF CAMPAIGN:</span>
            {campaigns.length > 0 ? (
              <select
                className="input-field brief-selector"
                value={selectedCampaignId ?? ''}
                onChange={(e) => setSelectedCampaignId(e.target.value || null)}
              >
                <option value="">Select a campaign...</option>
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.niche} (${c.budget.toLocaleString()})
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-body-sm text-muted">
                {selectedCampaign ? `${selectedCampaign.niche}` : 'No campaigns found'}
              </span>
            )}
          </div>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={() => handleExport('CSV')}>Export CSV ↓</button>
          <button className="btn btn-outline" onClick={() => handleExport('PDF')}>Export PDF ▤</button>
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
        }}>
          ⚠ {error}
        </div>
      )}

      {/* No Campaign Selected */}
      {!selectedCampaignId && !loading && (
        <div className="card" style={{ padding: '64px', textAlign: 'center' }}>
          <p className="text-headline-sm" style={{ marginBottom: '8px' }}>No campaign selected.</p>
          <p className="text-body-md text-muted">Create a brief and run the matching engine first, then return here to view analytics.</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <div className="spinner spinner-lg" style={{ margin: '0 auto 16px' }}></div>
          <p className="text-body-md text-muted">Loading analytics data...</p>
        </div>
      )}

      {/* Empty State — campaign selected but no data */}
      {!loading && selectedCampaignId && !error && (!data || data.history_logs.length === 0) && (
        <div className="card" style={{ padding: '64px', textAlign: 'center' }}>
          <p className="text-headline-sm" style={{ marginBottom: '8px' }}>No analytics data yet.</p>
          <p className="text-body-md text-muted">
            Run the matching engine for this campaign first. Analytics will appear once creator matches have been processed.
          </p>
        </div>
      )}

      {/* Full Analytics UI — only when data is present */}
      {!loading && data && data.history_logs.length > 0 && (
        <>
          {/* KPI Row */}
          <div className="kpi-grid">
            <div className="stat-card kpi-card">
              <div className="kpi-top">
                <span className="stat-label">TOTAL MATCHES</span>
                <span className="stat-value">{totalMatches}</span>
              </div>
              <div className="kpi-sparkline">
                <ResponsiveContainer width="100%" height={40}>
                  <LineChart data={sparklineData}>
                    <Line type="monotone" dataKey="val" stroke="#847796" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="stat-card kpi-card">
              <div className="kpi-top">
                <span className="stat-label">AVG FIT SCORE</span>
                <span className="stat-value">{avgFit}%</span>
              </div>
              <div className="kpi-sparkline">
                <ResponsiveContainer width="100%" height={40}>
                  <LineChart data={sparklineData}>
                    <Line type="monotone" dataKey="val" stroke="#16a34a" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="stat-card kpi-card">
              <div className="kpi-top">
                <span className="stat-label">BEST EST. CPE</span>
                <span className="stat-value">{bestCpe !== '—' ? `$${bestCpe}` : '—'}</span>
              </div>
              <div className="kpi-sparkline">
                <ResponsiveContainer width="100%" height={40}>
                  <LineChart data={sparklineData.map(d => ({ val: 100 - d.val }))}>
                    <Line type="monotone" dataKey="val" stroke="#847796" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="stat-card kpi-card">
              <div className="kpi-top">
                <span className="stat-label">TOTAL REACH</span>
                <span className="stat-value">{totalReach}M+</span>
              </div>
              <div className="kpi-sparkline">
                <ResponsiveContainer width="100%" height={40}>
                  <LineChart data={sparklineData}>
                    <Line type="monotone" dataKey="val" stroke="#847796" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Two-Column Charts Grid */}
          <div className="charts-grid">
            <div className="chart-card card">
              <div className="chart-header">
                <h2 className="text-headline-sm">Fit vs Authenticity Matrix</h2>
                <span className="text-label-sm text-muted">Bubble = Creator</span>
              </div>
              <div className="chart-body">
                <ResponsiveContainer width="100%" height={320}>
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e1e3dd" />
                    <XAxis type="number" dataKey="x_authenticity" name="Authenticity" unit="%" domain={[0, 100]} stroke="#797b76" />
                    <YAxis type="number" dataKey="y_composite_fit" name="Fit Score" unit="%" domain={[0, 100]} stroke="#797b76" />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value, name) => [value + '%', name]} />
                    <Scatter name="Creators" data={data.fit_authenticity_map} fill="#847796" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-card card">
              <div className="chart-header">
                <h2 className="text-headline-sm">CPE Efficiency Ranking</h2>
                <span className="text-label-sm text-muted">Cost Per Engagement (USD)</span>
              </div>
              <div className="chart-body">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart layout="vertical" data={data.cpe_ranking} margin={{ top: 10, right: 30, left: 40, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e1e3dd" horizontal={false} />
                    <XAxis type="number" unit="$" stroke="#797b76" />
                    <YAxis type="category" dataKey="username" stroke="#252833" tick={{ fontSize: 13, fontWeight: 500 }} />
                    <Tooltip formatter={(val) => [`$${val}`, 'CPE']} />
                    <Bar dataKey="cpe" fill="#847796" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Full-width Bottom Table */}
          <div className="history-section card">
            <div className="table-header">
              <h2 className="text-headline-sm">Performance History</h2>
              <div className="table-search">
                <input
                  type="text"
                  className="input-field"
                  placeholder="Search by creator or platform..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="table-responsive">
              <table className="data-table analytics-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('rank')}>Rank {sortField === 'rank' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                    <th>Username</th>
                    <th>Platform</th>
                    <th onClick={() => handleSort('composite_score')}>Fit Score {sortField === 'composite_score' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                    <th>Semantic Overlap</th>
                    <th onClick={() => handleSort('authenticity_score')}>Authenticity {sortField === 'authenticity_score' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                    <th onClick={() => handleSort('cpe')}>Est. CPE {sortField === 'cpe' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                    <th>Date Analyzed</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((row, idx) => (
                    <tr key={idx} className="alternating-row">
                      <td className="font-bold">#{row.rank}</td>
                      <td className="font-bold text-primary">{row.username}</td>
                      <td><span className="badge badge-primary">{row.platform}</span></td>
                      <td>
                        <div className="score-cell">
                          <span className="font-bold">{row.composite_score}%</span>
                          <div className="progress-bar mini-progress">
                            <div className="progress-bar-fill" style={{ width: `${row.composite_score}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td>{row.semantic_score}%</td>
                      <td>{row.authenticity_score}%</td>
                      <td className="font-bold">${row.cpe}</td>
                      <td className="text-muted">{row.created_at ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
