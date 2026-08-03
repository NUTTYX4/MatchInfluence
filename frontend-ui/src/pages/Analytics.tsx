import { useState, useEffect } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, LineChart, Line
} from 'recharts';
import { analyticsAPI, type AnalyticsData } from '../api/client';
import './Analytics.css';

interface AnalyticsProps {
  campaignId: string | null;
}

const mockAnalyticsData: AnalyticsData = {
  campaign_id: 'demo-campaign-1',
  fit_authenticity_map: [
    { username: '@fit_jessica', platform: 'Instagram', x_authenticity: 99, y_composite_fit: 98, z_reach: 850 },
    { username: '@alex_lifts', platform: 'YouTube', x_authenticity: 95, y_composite_fit: 94, z_reach: 1200 },
    { username: '@macro_master', platform: 'TikTok', x_authenticity: 93, y_composite_fit: 91, z_reach: 620 },
    { username: '@sarah_wellness', platform: 'Instagram', x_authenticity: 91, y_composite_fit: 88, z_reach: 450 },
    { username: '@powerbuild_pro', platform: 'YouTube', x_authenticity: 84, y_composite_fit: 86, z_reach: 940 },
    { username: '@gym_guru', platform: 'TikTok', x_authenticity: 88, y_composite_fit: 82, z_reach: 310 },
    { username: '@nutrition_now', platform: 'Instagram', x_authenticity: 89, y_composite_fit: 85, z_reach: 530 },
  ],
  cpe_ranking: [
    { username: '@macro_master', platform: 'TikTok', cpe: 0.29, followers: 620000 },
    { username: '@gym_guru', platform: 'TikTok', cpe: 0.32, followers: 310000 },
    { username: '@fit_jessica', platform: 'Instagram', cpe: 0.38, followers: 850000 },
    { username: '@alex_lifts', platform: 'YouTube', cpe: 0.42, followers: 1200000 },
    { username: '@sarah_wellness', platform: 'Instagram', cpe: 0.45, followers: 450000 },
    { username: '@nutrition_now', platform: 'Instagram', cpe: 0.48, followers: 530000 },
    { username: '@powerbuild_pro', platform: 'YouTube', cpe: 0.51, followers: 940000 },
  ],
  history_logs: [
    { match_id: 'm-01', username: '@fit_jessica', platform: 'Instagram', rank: 1, composite_score: 98, authenticity_score: 99, semantic_score: 96, cpe: 0.38, created_at: 'Oct 14, 2026' },
    { match_id: 'm-02', username: '@alex_lifts', platform: 'YouTube', rank: 2, composite_score: 94, authenticity_score: 95, semantic_score: 92, cpe: 0.42, created_at: 'Oct 14, 2026' },
    { match_id: 'm-03', username: '@macro_master', platform: 'TikTok', rank: 3, composite_score: 91, authenticity_score: 93, semantic_score: 89, cpe: 0.29, created_at: 'Oct 14, 2026' },
    { match_id: 'm-04', username: '@sarah_wellness', platform: 'Instagram', rank: 4, composite_score: 88, authenticity_score: 91, semantic_score: 85, cpe: 0.45, created_at: 'Oct 13, 2026' },
    { match_id: 'm-05', username: '@powerbuild_pro', platform: 'YouTube', rank: 5, composite_score: 86, authenticity_score: 84, semantic_score: 88, cpe: 0.51, created_at: 'Oct 13, 2026' },
    { match_id: 'm-06', username: '@nutrition_now', platform: 'Instagram', rank: 6, composite_score: 85, authenticity_score: 89, semantic_score: 84, cpe: 0.48, created_at: 'Oct 12, 2026' },
    { match_id: 'm-07', username: '@gym_guru', platform: 'TikTok', rank: 7, composite_score: 82, authenticity_score: 88, semantic_score: 79, cpe: 0.32, created_at: 'Oct 12, 2026' },
  ]
};

const sparklineData = [
  { val: 65 }, { val: 72 }, { val: 68 }, { val: 84 }, { val: 78 }, { val: 92 }, { val: 88 }
];

export function Analytics({ campaignId }: AnalyticsProps) {
  const [data, setData] = useState<AnalyticsData>(mockAnalyticsData);
  const [selectedBrief, setSelectedBrief] = useState('Q4 Fitness & Wellness');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'rank' | 'composite_score' | 'authenticity_score' | 'cpe'>('rank');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    if (campaignId && campaignId !== 'demo-campaign-1') {
      analyticsAPI.get(campaignId)
        .then(res => {
          if (res && res.fit_authenticity_map) setData(res);
        })
        .catch(e => console.warn('Analytics fallback during dev:', e));
    }
  }, [campaignId]);

  const handleSort = (field: 'rank' | 'composite_score' | 'authenticity_score' | 'cpe') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'rank' || field === 'cpe' ? 'asc' : 'desc');
    }
  };

  const filteredHistory = data.history_logs
    .filter(item => item.username.toLowerCase().includes(searchTerm.toLowerCase()) || item.platform.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      const multiplier = sortOrder === 'asc' ? 1 : -1;
      return (a[sortField] - b[sortField]) * multiplier;
    });

  const handleExport = (type: 'CSV' | 'PDF') => {
    alert(`Exporting Q4 Fitness Campaign analytics as ${type}...`);
  };

  return (
    <div className="analytics-container animate-fade-in">
      <header className="page-header">
        <div className="header-left">
          <h1 className="text-headline-lg">Analytics <span className="accent-dot">●</span></h1>
          <div className="brief-selector-container">
            <span className="text-label-sm text-muted">BRIEF CAMPAIGN:</span>
            <select
              className="input-field brief-selector"
              value={selectedBrief}
              onChange={(e) => setSelectedBrief(e.target.value)}
            >
              <option value="Q4 Fitness & Wellness">Q4 Fitness & Wellness (Active)</option>
              <option value="Tech Wearable Unboxing">Tech Wearable Unboxing (Completed)</option>
              <option value="Sustainable Skincare">Sustainable Skincare (Active)</option>
            </select>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={() => handleExport('CSV')}>Export CSV ↓</button>
          <button className="btn btn-outline" onClick={() => handleExport('PDF')}>Export PDF ▤</button>
        </div>
      </header>

      {/* KPI Row */}
      <div className="kpi-grid">
        <div className="stat-card kpi-card">
          <div className="kpi-top">
            <span className="stat-label">TOTAL MATCHES</span>
            <span className="stat-value">142</span>
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
            <span className="stat-value">88%</span>
          </div>
          <div className="kpi-sparkline">
            <ResponsiveContainer width="100%" height={40}>
              <LineChart data={sparklineData.map(d => ({ val: d.val + 10 }))}>
                <Line type="monotone" dataKey="val" stroke="#16a34a" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="stat-card kpi-card">
          <div className="kpi-top">
            <span className="stat-label">BEST EST. CPE</span>
            <span className="stat-value">$0.29</span>
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
            <span className="stat-value">12.4M</span>
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
            <span className="text-label-sm text-muted">Bubble Size = Follower Count</span>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={320}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e1e3dd" />
                <XAxis type="number" dataKey="x_authenticity" name="Authenticity" unit="%" domain={[75, 100]} stroke="#797b76" />
                <YAxis type="number" dataKey="y_composite_fit" name="Fit Score" unit="%" domain={[75, 100]} stroke="#797b76" />
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
                <XAxis type="number" unit="$" stroke="#797b76" domain={[0, 0.6]} />
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
                  <td className="text-muted">{row.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
