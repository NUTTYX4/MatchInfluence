import { useState, useEffect } from 'react';
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
  const [analysis, setAnalysis] = useState<BriefAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Editable fields inside the Co-Pilot card — start empty
  const [niche, setNiche] = useState('');
  const [audience, setAudience] = useState('');
  const [budget, setBudget] = useState<number>(5000);
  const [reach, setReach] = useState<number>(100000);

  // Sync fields from analysis whenever it updates
  useEffect(() => {
    if (analysis) {
      if (analysis.niche) setNiche(analysis.niche);
      if (analysis.audience) setAudience(analysis.audience);
      if (analysis.budget) setBudget(analysis.budget);
      if (analysis.target_reach) setReach(analysis.target_reach);
    }
  }, [analysis]);

  const handleSearch = async () => {
    if (!promptText.trim()) return;
    setAnalyzing(true);
    setError(null);
    try {
      const res = await campaignAPI.analyze(promptText);
      setAnalysis(res);
    } catch (e: any) {
      setError(e.message || 'Failed to analyze brief. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSuggestionClick = (pill: string) => {
    setPromptText(prev => prev ? `${prev} · Include ${pill}` : `Include ${pill}`);
    // If this suggestion resolves a missing field, remove it from missing_fields
    if (analysis) {
      const updatedMissing = analysis.missing_fields.filter(f => {
        if (f === 'niche' && pill.length > 0) return false;
        if (f === 'audience' && pill.length > 0) return false;
        return true;
      });
      setAnalysis({ ...analysis, missing_fields: updatedMissing });
    }
  };

  const handleLaunch = async () => {
    if (!niche.trim() || !audience.trim()) {
      setError('Please provide at least a Target Niche and Target Audience before launching.');
      return;
    }
    setLaunching(true);
    setError(null);
    try {
      const camp = await campaignAPI.create({
        niche: niche.trim(),
        audience: audience.trim(),
        budget,
        target_reach: reach,
      });
      onCampaignCreated(camp.id);
      navigate('/creators');
    } catch (e: any) {
      setError(e.message || 'Failed to create campaign. Please check your connection and try again.');
    } finally {
      setLaunching(false);
    }
  };

  // Determine if launch should be disabled
  const hasMissingCritical = !niche.trim() || !audience.trim();
  const hasIncompleteBrief = analysis !== null && !analysis.is_complete && analysis.missing_fields.length > 0;

  return (
    <div className="shape-brief-container animate-fade-in">
      <header className="page-header">
        <div>
          <h1 className="text-headline-lg">Shape a Brief <span className="accent-dot">●</span></h1>
          <p className="text-body-md text-muted">Input your campaign vision below or let our AI Co-Pilot refine your goals.</p>
        </div>
      </header>

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
          gap: '12px',
        }}>
          <span>⚠ {error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '1rem', lineHeight: 1 }}
          >✕</button>
        </div>
      )}

      <div className="brief-grid">
        {/* Left Column: AI Prompt Workspace */}
        <div className="prompt-workspace card">
          <label className="text-label workspace-label" htmlFor="brief-prompt">
            CAMPAIGN VISION &amp; PARAMETERS
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
            <span className="text-label-sm text-muted">Tip: Include objectives, platform target, and budget parameters.</span>
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
                Missing: {analysis.missing_fields.join(', ')}
              </span>
            )}
          </div>

          <p className="copilot-message">
            {analysis?.co_pilot_message || 'Enter your campaign vision above and click Search — the AI Co-Pilot will extract your campaign parameters automatically.'}
          </p>

          <div className="extracted-fields-group">
            <div className="field-row">
              <span className={`text-label${!niche.trim() && analysis !== null ? ' text-warning' : ''}`}>
                Target Niche {!niche.trim() && analysis !== null && <span style={{ color: 'var(--color-warning, #f59e0b)' }}>*</span>}
              </span>
              <input
                type="text"
                className={`input-field chip-input${!niche.trim() && analysis !== null ? ' input-error' : ''}`}
                placeholder="e.g. Fitness & Nutrition"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
              />
            </div>

            <div className="field-row">
              <span className={`text-label${!audience.trim() && analysis !== null ? ' text-warning' : ''}`}>
                Target Audience {!audience.trim() && analysis !== null && <span style={{ color: 'var(--color-warning, #f59e0b)' }}>*</span>}
              </span>
              <input
                type="text"
                className={`input-field chip-input${!audience.trim() && analysis !== null ? ' input-error' : ''}`}
                placeholder="e.g. Men 25-35, Gym Goers"
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

          {analysis && analysis.suggestions && Object.keys(analysis.suggestions).length > 0 && (
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

          {hasIncompleteBrief && (
            <p className="text-label-sm" style={{ color: 'var(--color-warning, #f59e0b)', marginBottom: '8px' }}>
              ⚠ Fill in the missing fields above before launching.
            </p>
          )}

          <button
            type="button"
            className="btn btn-primary btn-lg launch-btn"
            onClick={handleLaunch}
            disabled={launching || hasMissingCritical}
            title={hasMissingCritical ? 'Niche and Audience are required to launch' : undefined}
          >
            {launching ? <span className="spinner"></span> : <>Launch Brief</>}
          </button>
        </div>
      </div>
    </div>
  );
}
