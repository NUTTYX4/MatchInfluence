import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { matchAPI, type MatchResult } from '../api/client';
import './Creators.css';

interface CreatorsProps {
  campaignId: string | null;
}

const mockCreators: MatchResult[] = [
  {
    rank: 1,
    username: '@fit_jessica',
    platform: 'Instagram',
    follower_count: 850000,
    engagement_rate: 4.2,
    composite_score: 98,
    semantic_score: 96,
    authenticity_score: 99,
    cpe: 0.38,
    explanation: 'Matches your campaign’s high-protein focus with 94% semantic overlap in recent organic content. Exceptionally high audience overlap with your target Gen-Z demographic.'
  },
  {
    rank: 2,
    username: '@alex_lifts',
    platform: 'YouTube',
    follower_count: 1200000,
    engagement_rate: 5.1,
    composite_score: 94,
    semantic_score: 92,
    authenticity_score: 95,
    cpe: 0.42,
    explanation: 'Consistent viewer retention on supplement review Shorts and long-form dietary routines. Strong comment sentiment and zero bot activity detected.'
  },
  {
    rank: 3,
    username: '@macro_master',
    platform: 'TikTok',
    follower_count: 620000,
    engagement_rate: 6.8,
    composite_score: 91,
    semantic_score: 89,
    authenticity_score: 93,
    cpe: 0.29,
    explanation: 'High virality index among gym beginners. Offers extremely competitive cost-per-engagement and frequent spontaneous product placements.'
  },
  {
    rank: 4,
    username: '@sarah_wellness',
    platform: 'Instagram',
    follower_count: 450000,
    engagement_rate: 3.9,
    composite_score: 88,
    semantic_score: 85,
    authenticity_score: 91,
    cpe: 0.45,
    explanation: 'Holistic lifestyle creator with an highly engaged, mature wellness community. Ideal for building brand trust and long-term ambassador retention.'
  },
  {
    rank: 5,
    username: '@powerbuild_pro',
    platform: 'YouTube',
    follower_count: 940000,
    engagement_rate: 4.5,
    composite_score: 86,
    semantic_score: 88,
    authenticity_score: 84,
    cpe: 0.51,
    explanation: 'Specialized strength athlete with authoritative domain knowledge in workout supplements. Highly targeted male audience aged 22-35.'
  }
];

export function Creators({ campaignId }: CreatorsProps) {
  const navigate = useNavigate();
  const [creators, setCreators] = useState<MatchResult[]>(mockCreators);
  const [loading, setLoading] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'fit' | 'cpe' | 'followers' | 'authenticity'>('fit');
  const [platformFilter, setPlatformFilter] = useState<'All' | 'Instagram' | 'YouTube' | 'TikTok'>('All');

  useEffect(() => {
    if (campaignId && campaignId !== 'demo-campaign-1') {
      setLoading(true);
      matchAPI.run(campaignId)
        .then((res) => {
          if (res.results && res.results.length > 0) {
            setCreators(res.results);
          }
        })
        .catch((e) => console.warn('Match run fallback during dev:', e))
        .finally(() => setLoading(false));
    }
  }, [campaignId]);

  const sortedCreators = [...creators]
    .filter(c => platformFilter === 'All' || c.platform === platformFilter)
    .sort((a, b) => {
      if (sortBy === 'fit') return b.composite_score - a.composite_score;
      if (sortBy === 'cpe') return a.cpe - b.cpe;
      if (sortBy === 'followers') return b.follower_count - a.follower_count;
      if (sortBy === 'authenticity') return b.authenticity_score - a.authenticity_score;
      return 0;
    });

  const avgFit = Math.round(creators.reduce((acc, curr) => acc + curr.composite_score, 0) / creators.length || 0);
  const avgCpe = (creators.reduce((acc, curr) => acc + curr.cpe, 0) / creators.length || 0).toFixed(2);
  const totalReach = (creators.reduce((acc, curr) => acc + curr.follower_count, 0) / 1000000).toFixed(1);

  return (
    <div className="creators-container animate-fade-in">
      <header className="page-header">
        <div className="header-titles">
          <div className="badge badge-primary header-badge">Q4 Fitness & Wellness</div>
          <h1 className="text-headline-lg">Creators <span className="text-body-md text-muted font-normal">({creators.length} creators matched)</span></h1>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={() => navigate('/')}>← Edit Brief</button>
          <button className="btn btn-primary" onClick={() => setLoading(true)}>Run New Match ✦</button>
        </div>
      </header>

      {/* Summary Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">TOTAL MATCHES</span>
          <span className="stat-value">{creators.length}</span>
          <span className="stat-trend text-label-sm text-success">✦ 100% Verified Candidates</span>
        </div>
        <div className="stat-card stat-card-flex">
          <div>
            <span className="stat-label">AVG FIT SCORE</span>
            <span className="stat-value">{avgFit}%</span>
            <span className="stat-trend text-label-sm text-muted">Optimal Alignment</span>
          </div>
          <div className="score-ring-mini">
            <svg viewBox="0 0 36 36" className="circular-chart">
              <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path className="circle-fill" strokeDasharray={`${avgFit}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <span className="ring-text">{avgFit}</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-label">EST. AVG CPE</span>
          <span className="stat-value">${avgCpe}</span>
          <span className="stat-trend text-label-sm text-muted">Cost Per Engagement</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">TOTAL REACH</span>
          <span className="stat-value">{totalReach}M+</span>
          <span className="stat-trend text-label-sm text-success">▲ High Organic Volume</span>
        </div>
      </div>

      {/* Sort & Filter Controls Bar */}
      <div className="controls-bar card">
        <div className="filter-group">
          <span className="text-label-sm text-muted">PLATFORM:</span>
          {(['All', 'Instagram', 'YouTube', 'TikTok'] as const).map((plat) => (
            <button
              key={plat}
              className={`chip ${platformFilter === plat ? 'chip-primary' : ''}`}
              onClick={() => setPlatformFilter(plat)}
            >
              {plat === 'Instagram' && '📸 '}
              {plat === 'YouTube' && '▶️ '}
              {plat === 'TikTok' && '🎵 '}
              {plat}
            </button>
          ))}
        </div>

        <div className="sort-group">
          <span className="text-label-sm text-muted">SORT BY:</span>
          <select
            className="input-field sort-select"
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
          >
            <option value="fit">Fit Score (High to Low)</option>
            <option value="cpe">CPE (Low to High)</option>
            <option value="followers">Followers (High to Low)</option>
            <option value="authenticity">Authenticity (High to Low)</option>
          </select>
        </div>
      </div>

      {/* Creators Match Grid */}
      {loading ? (
        <div className="loading-container card">
          <div className="spinner spinner-lg"></div>
          <p className="text-headline-sm">Analyzing Candidates...</p>
          <p className="text-body-sm text-muted">Our AI is computing Fit Scores and testing semantic overlaps.</p>
        </div>
      ) : (
        <div className="creators-grid">
          {sortedCreators.map((creator, idx) => {
            const rankBadgeClass = creator.rank === 1 ? 'gold' : creator.rank === 2 ? 'silver' : creator.rank === 3 ? 'bronze' : '';
            return (
              <div key={creator.username} className="creator-card card animate-slide-up" style={{ animationDelay: `${idx * 0.08}s` }}>
                <div className="creator-card-header">
                  <div className="creator-profile-info">
                    <div className={`badge-rank ${rankBadgeClass}` || 'badge-rank'}>
                      #{creator.rank}
                    </div>
                    <div className="creator-avatar">
                      {creator.username.charAt(1).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-headline-sm creator-name">{creator.username}</h3>
                      <span className="badge badge-primary platform-badge">
                        {creator.platform}
                      </span>
                    </div>
                  </div>

                  {/* Fit Score Circular Gauge */}
                  <div className="fit-score-container">
                    <div className="score-ring">
                      <svg viewBox="0 0 36 36" className="circular-chart-lg">
                        <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path className="circle-fill" strokeDasharray={`${creator.composite_score}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      </svg>
                      <div className="score-value-group">
                        <span className="score-number">{creator.composite_score}</span>
                        <span className="score-unit">FIT</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Alignment Index Section */}
                <div className="alignment-index-section">
                  <div className="alignment-header">
                    <span className="text-label-sm text-muted">ALIGNMENT INDEX</span>
                  </div>
                  <div className="progress-item">
                    <div className="progress-label-row">
                      <span className="text-label-sm">Semantic Overlap</span>
                      <span className="text-label-sm font-bold">{creator.semantic_score}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-bar-fill" style={{ width: `${creator.semantic_score}%` }}></div>
                    </div>
                  </div>
                  <div className="progress-item">
                    <div className="progress-label-row">
                      <span className="text-label-sm">Audience Authenticity</span>
                      <span className="text-label-sm font-bold">{creator.authenticity_score}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-bar-fill" style={{ width: `${creator.authenticity_score}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* Key Metrics Row */}
                <div className="metrics-row">
                  <div className="metric-box">
                    <span className="text-label-sm text-muted">FOLLOWERS</span>
                    <span className="metric-num">{(creator.follower_count / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="metric-box">
                    <span className="text-label-sm text-muted">ENG. RATE</span>
                    <span className="metric-num">{creator.engagement_rate}%</span>
                  </div>
                  <div className="metric-box">
                    <span className="text-label-sm text-muted">EST. CPE</span>
                    <span className="metric-num">${creator.cpe}</span>
                  </div>
                </div>

                {/* The Synapse (AI Explanation Card) */}
                <div className="synapse-card">
                  <div className="synapse-header-row">
                    <span className="synapse-label">❖ THE SYNAPSE (AI REASONING)</span>
                  </div>
                  <p className="synapse-text">{creator.explanation}</p>
                </div>

                <div className="creator-card-actions">
                  <button className="btn btn-secondary btn-full">View Full Profile ↗</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
