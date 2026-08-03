import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { campaignAPI, type BriefAnalysis } from '../api/client';
import './ShapeABrief.css';

interface ShapeABriefProps {
  onCampaignCreated: (id: string) => void;
}

export function ShapeABrief({ onCampaignCreated }: ShapeABriefProps) {
  const navigate = useNavigate();
  const [promptText, setPromptText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [analysis, setAnalysis] = useState<BriefAnalysis | null>({
    niche: 'Fitness & Nutrition',
    audience: 'Men 25-35, Gym Goers',
    budget: 5000,
    target_reach: 500000,
    missing_fields: ['Primary Platform'],
    suggestions: {
      platforms: ['Instagram Reels', 'YouTube Shorts', 'TikTok'],
      demographic_focus: ['Focus on Gen Z', 'Micro-influencers Tier'],
      content_style: ['High-protein lifestyle', 'Supplement reviews']
    },
    is_complete: true,
    co_pilot_message: 'Your brief is taking great shape! We recommend specifying at least one social platform to refine creator recommendations.'
  });

  // Editable fields inside the Co-Pilot card
  const [niche, setNiche] = useState('Fitness & Nutrition');
  const [audience, setAudience] = useState('Men 25-35, Gym Goers');
  const [budget, setBudget] = useState<number>(5000);
  const [reach, setReach] = useState<number>(500000);

  const handleSearch = async () => {
    if (!promptText.trim()) return;
    setAnalyzing(true);
    try {
      const res = await campaignAPI.analyze(promptText);
      setAnalysis(res);
      if (res.niche) setNiche(res.niche);
      if (res.audience) setAudience(res.audience);
      if (res.budget) setBudget(res.budget);
      if (res.target_reach) setReach(res.target_reach);
    } catch (e) {
      console.warn('Backend analyze check fallback during dev:', e);
      // Keep mock analysis updated with user text
      setAnalysis(prev => prev ? ({ ...prev, niche: promptText.slice(0, 20), co_pilot_message: 'Parameters extracted from your brief vision.' }) : null);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSuggestionClick = (pill: string) => {
    setPromptText(prev => prev ? `${prev} · Include ${pill}` : `Include ${pill}`);
    if (analysis && analysis.missing_fields.includes('Primary Platform') && ['Instagram Reels', 'YouTube Shorts', 'TikTok'].includes(pill)) {
      setAnalysis({
        ...analysis,
        missing_fields: analysis.missing_fields.filter(f => f !== 'Primary Platform')
      });
    }
  };

  const handleLaunch = async () => {
    setLaunching(true);
    try {
      const camp = await campaignAPI.create({
        niche,
        audience,
        budget,
        target_reach: reach
      });
      onCampaignCreated(camp.id);
      navigate('/creators');
    } catch (e) {
      console.warn('Backend create fallback during dev:', e);
      onCampaignCreated('demo-campaign-1');
      navigate('/creators');
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="shape-brief-container animate-fade-in">
      <header className="page-header">
        <div>
          <h1 className="text-headline-lg">Shape a Brief <span className="accent-dot">●</span></h1>
          <p className="text-body-md text-muted">Input your campaign vision below or let our AI Co-Pilot refine your goals.</p>
        </div>
      </header>

      <div className="brief-grid">
        {/* Left Column: AI Prompt Workspace */}
        <div className="prompt-workspace card">
          <label className="text-label workspace-label" htmlFor="brief-prompt">
            CAMPAIGN VISION & PARAMETERS
          </label>
          <textarea
            id="brief-prompt"
            className="textarea brief-textarea"
            placeholder="Describe your ideal campaign... e.g., I need fitness creators for a protein supplement launch targeting men 25-35 with a $5000 budget on Instagram."
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            rows={8}
          />

          <div className="workspace-actions">
            <span className="text-label-sm text-muted">💡 Tip: Include goals, platform preferences, and budget.</span>
            <button
              type="button"
              className="btn btn-primary btn-lg search-btn"
              onClick={handleSearch}
              disabled={analyzing || !promptText.trim()}
            >
              {analyzing ? <span className="spinner"></span> : <>Search <span className="icon-arrow">→</span></>}
            </button>
          </div>
        </div>

        {/* Right Column: AI Co-Pilot Extracted Parameters Card */}
        <div className="copilot-workspace card card-elevated">
          <div className="copilot-header">
            <div className="copilot-title-group">
              <span className="copilot-badge">AI CO-PILOT</span>
              <h2 className="text-headline-sm">Extracted Parameters</h2>
            </div>
            {analysis?.missing_fields && analysis.missing_fields.length > 0 && (
              <span className="badge badge-warning">
                ⚠️ Missing: {analysis.missing_fields.join(', ')}
              </span>
            )}
          </div>

          <p className="copilot-message">
            {analysis?.co_pilot_message || 'Enter your prompt and click Search to let the Co-Pilot extract campaign variables.'}
          </p>

          <div className="extracted-fields-group">
            <div className="field-row">
              <span className="text-label">Target Niche</span>
              <input
                type="text"
                className="input-field chip-input"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
              />
            </div>

            <div className="field-row">
              <span className="text-label">Target Audience</span>
              <input
                type="text"
                className="input-field chip-input"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
              />
            </div>

            <div className="field-row">
              <div className="slider-header">
                <span className="text-label">Budget</span>
                <span className="value-display">${budget.toLocaleString()}</span>
              </div>
              <div className="slider-container">
                <input
                  type="range"
                  min="500"
                  max="50000"
                  step="500"
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="field-row">
              <div className="slider-header">
                <span className="text-label">Target Reach</span>
                <span className="value-display">{(reach / 1000).toLocaleString()}K+ Impressions</span>
              </div>
              <div className="slider-container">
                <input
                  type="range"
                  min="50000"
                  max="5000000"
                  step="50000"
                  value={reach}
                  onChange={(e) => setReach(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          {analysis && analysis.suggestions && (
            <div className="copilot-suggestions">
              <span className="text-label-sm text-muted">SUGGESTED ENHANCEMENTS</span>
              <div className="suggestions-chips">
                {Object.values(analysis.suggestions).flat().map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="chip"
                    onClick={() => handleSuggestionClick(item)}
                  >
                    + {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            className="btn btn-primary btn-lg launch-btn"
            onClick={handleLaunch}
            disabled={launching}
          >
            {launching ? <span className="spinner"></span> : <>Launch Brief 🚀</>}
          </button>
        </div>
      </div>

      {/* Bottom Section: My Briefs Preview */}
      <section className="recent-briefs-section">
        <div className="section-header">
          <h2 className="text-headline-sm">Recent Briefs</h2>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/briefs')}>View My Briefs →</button>
        </div>

        <div className="briefs-preview-grid">
          <div className="brief-preview-card card" onClick={() => navigate('/creators')}>
            <div className="brief-card-header">
              <span className="badge badge-primary">Active</span>
              <span className="text-label-sm text-muted">Oct 14, 2026</span>
            </div>
            <h3 className="text-headline-sm brief-title">Q4 Protein Supplement Launch</h3>
            <p className="text-body-sm text-muted">Targeting Gen Z Fitness enthusiasts across Instagram and YouTube Shorts.</p>
            <div className="brief-card-footer">
              <span className="brief-meta">💰 $5,000 Budget</span>
              <span className="brief-meta">👥 42 Creators</span>
            </div>
          </div>

          <div className="brief-preview-card card" onClick={() => navigate('/creators')}>
            <div className="brief-card-header">
              <span className="badge badge-success">Completed</span>
              <span className="text-label-sm text-muted">Sep 28, 2026</span>
            </div>
            <h3 className="text-headline-sm brief-title">Tech Wearable Unboxing</h3>
            <p className="text-body-sm text-muted">High-authenticity micro-creators in the consumer gadgets niche.</p>
            <div className="brief-card-footer">
              <span className="brief-meta">💰 $12,000 Budget</span>
              <span className="brief-meta">👥 18 Creators</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
