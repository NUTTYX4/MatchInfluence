import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './MyBriefs.css';

interface MyBriefsProps {
  onSelect: (id: string) => void;
}

interface BriefItem {
  id: string;
  title: string;
  niche: string;
  targetAudience: string;
  budget: number;
  creatorsCount: number;
  status: 'Active' | 'Completed' | 'Draft';
  createdAt: string;
  avgFitScore: number;
}

const initialBriefs: BriefItem[] = [
  {
    id: 'brief-1',
    title: 'Q4 Protein Supplement Launch',
    niche: 'Fitness & Wellness',
    targetAudience: 'Men 25-35, Gym Goers',
    budget: 5000,
    creatorsCount: 42,
    status: 'Active',
    createdAt: 'Oct 14, 2026',
    avgFitScore: 88,
  },
  {
    id: 'brief-2',
    title: 'Tech Wearable Smart Ring Unboxing',
    niche: 'Consumer Gadgets & Tech',
    targetAudience: 'Early adopters, Gen Z & Millennial',
    budget: 12000,
    creatorsCount: 18,
    status: 'Completed',
    createdAt: 'Sep 28, 2026',
    avgFitScore: 92,
  },
  {
    id: 'brief-3',
    title: 'Sustainable Skincare Glow Routine',
    niche: 'Beauty & Lifestyle',
    targetAudience: 'Women 18-30, Eco-conscious',
    budget: 8500,
    creatorsCount: 29,
    status: 'Active',
    createdAt: 'Oct 02, 2026',
    avgFitScore: 85,
  },
  {
    id: 'brief-4',
    title: 'Holiday Specialty Coffee Subscription',
    niche: 'Food & Beverage',
    targetAudience: 'Coffee enthusiasts, Urban professionals',
    budget: 3500,
    creatorsCount: 12,
    status: 'Draft',
    createdAt: 'Aug 15, 2026',
    avgFitScore: 81,
  }
];

export function MyBriefs({ onSelect }: MyBriefsProps) {
  const navigate = useNavigate();
  const [briefs] = useState<BriefItem[]>(initialBriefs);
  const [filter, setFilter] = useState<'All' | 'Active' | 'Completed' | 'Draft'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBriefs = briefs.filter(b => {
    const matchesFilter = filter === 'All' || b.status === filter;
    const matchesSearch = b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          b.niche.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
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

      <div className="briefs-toolbar card">
        <div className="brief-tabs">
          {(['All', 'Active', 'Completed', 'Draft'] as const).map((tab) => (
            <button
              key={tab}
              className={`chip ${filter === tab ? 'chip-primary' : ''}`}
              onClick={() => setFilter(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="brief-search">
          <input
            type="text"
            className="input-field"
            placeholder="Search briefs by title or niche..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="briefs-list-grid">
        {filteredBriefs.length === 0 ? (
          <div className="empty-state card">
            <p className="text-headline-sm">No briefs found matching your search.</p>
            <button className="btn btn-primary btn-sm mt-4" onClick={() => { setFilter('All'); setSearchQuery(''); }}>Reset Filters</button>
          </div>
        ) : (
          filteredBriefs.map((brief, idx) => (
            <div
              key={brief.id}
              className="brief-full-card card animate-slide-up"
              style={{ animationDelay: `${idx * 0.08}s` }}
            >
              <div className="brief-card-left">
                <div className="brief-status-row">
                  <span className={`badge ${brief.status === 'Active' ? 'badge-primary' : brief.status === 'Completed' ? 'badge-success' : 'badge-warning'}`}>
                    {brief.status}
                  </span>
                  <span className="text-label-sm text-muted">Created {brief.createdAt}</span>
                </div>

                <h2 className="text-headline-md brief-main-title">{brief.title}</h2>
                
                <div className="brief-tags-row">
                  <span className="chip text-label-sm">🎯 {brief.niche}</span>
                  <span className="chip text-label-sm">👥 {brief.targetAudience}</span>
                </div>
              </div>

              <div className="brief-card-right">
                <div className="brief-stat-block">
                  <span className="text-label-sm text-muted">BUDGET</span>
                  <span className="stat-value-sm">${brief.budget.toLocaleString()}</span>
                </div>
                <div className="brief-stat-block">
                  <span className="text-label-sm text-muted">CREATORS</span>
                  <span className="stat-value-sm">{brief.creatorsCount} Matched</span>
                </div>
                <div className="brief-stat-block">
                  <span className="text-label-sm text-muted">AVG FIT</span>
                  <span className="stat-value-sm text-primary">{brief.avgFitScore}%</span>
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
          ))
        )}
      </div>
    </div>
  );
}
