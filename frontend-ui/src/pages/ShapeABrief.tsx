import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { campaignAPI, type BriefAnalysis } from '../api/client';
import './ShapeABrief.css';

interface ShapeABriefProps {
  onCampaignCreated: (id: string) => void;
}

// ─── Client-Side Fallback Analyzer ────────────────────────────────────────
// Runs when the backend LLM is unreachable (e.g. Vercel → no deployed backend)
function clientSideAnalyze(text: string): BriefAnalysis {
  const lower = text.toLowerCase();

  // Budget extraction: "40,000 INR", "₹40k", "$5000", "budget is 40000"
  let budget: number | null = null;
  const budgetPatterns = [
    /(?:budget|spend|spending|allocat\w*)\s*(?:is|of|:)?\s*[₹$]?\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(k|lakh|thousand|million)?/i,
    /[₹$]\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(k|lakh|thousand|million)?\s*(?:budget|total|inr|usd)?/i,
    /([0-9][0-9,]*(?:\.[0-9]+)?)\s*(k|lakh|thousand|million)?\s*(?:inr|usd|rupees?|dollars?)/i,
  ];
  for (const pat of budgetPatterns) {
    const m = text.match(pat);
    if (m) {
      let val = parseFloat(m[1].replace(/,/g, ''));
      const suffix = (m[2] || '').toLowerCase();
      if (suffix === 'k' || suffix === 'thousand') val *= 1000;
      else if (suffix === 'lakh') val *= 100000;
      else if (suffix === 'million') val *= 1000000;
      budget = val;
      break;
    }
  }

  // Target reach extraction: "2 million views", "targeting 500k", "500,000 impressions"
  let target_reach: number | null = null;
  const reachPatterns = [
    /([0-9][0-9,]*(?:\.[0-9]+)?)\s*(million|lakh|k|thousand)?\s*(?:views?|impressions?|reach|followers?)/i,
    /targeting\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(million|lakh|k|thousand)?/i,
    /reach\s*(?:of\s*)?([0-9][0-9,]*(?:\.[0-9]+)?)\s*(million|lakh|k|thousand)?/i,
  ];
  for (const pat of reachPatterns) {
    const m = text.match(pat);
    if (m) {
      let val = parseFloat(m[1].replace(/,/g, ''));
      const suffix = (m[2] || '').toLowerCase();
      if (suffix === 'million') val *= 1000000;
      else if (suffix === 'lakh') val *= 100000;
      else if (suffix === 'k' || suffix === 'thousand') val *= 1000;
      target_reach = Math.round(val);
      break;
    }
  }

  // Niche detection
  let niche: string | null = null;
  const nicheMap: [RegExp, string][] = [
    [/ai.{0,20}task|task.{0,20}track|productivity.{0,20}app|project.{0,20}manag/i, 'AI Productivity & Task Management'],
    [/fitness|gym|workout|health|wellness|nutrition|supplement/i, 'Fitness & Wellness'],
    [/tech|software|developer|coding|programming|saas|startup/i, 'Tech & Developer Tools'],
    [/finance|invest|trading|crypto|stock|money|fintech/i, 'Finance & Investment'],
    [/fashion|beauty|makeup|skincare|lifestyle/i, 'Fashion & Beauty'],
    [/food|cooking|recipe|restaurant|culinary/i, 'Food & Culinary'],
    [/gaming|esports|streamer|twitch|youtube.{0,10}gam/i, 'Gaming & Esports'],
    [/travel|adventure|tourism|explore|destination/i, 'Travel & Adventure'],
    [/education|learning|tutoring|course|skill/i, 'Education & Learning'],
    [/business|entrepreneurship|startup|founder/i, 'Business & Entrepreneurship'],
  ];
  for (const [pattern, label] of nicheMap) {
    if (pattern.test(lower)) { niche = label; break; }
  }

  // Audience detection
  let audience: string | null = null;
  const audienceMap: [RegExp, string][] = [
    [/startup.{0,20}founder|indie.{0,20}dev|independent.{0,20}dev/i, 'Startup Founders & Independent Developers'],
    [/developers?|programmers?|engineers?|coders?/i, 'Software Developers & Engineers'],
    [/men\s*\d{2}-\d{2}|male\s*\d{2}-\d{2}/i, 'Men ' + (text.match(/(\d{2}-\d{2})/)?.[1] || '18-35')],
    [/women\s*\d{2}-\d{2}|female\s*\d{2}-\d{2}/i, 'Women ' + (text.match(/(\d{2}-\d{2})/)?.[1] || '18-35')],
    [/gen.?z|young adult|teen|18-24/i, 'Gen Z Young Adults (18–24)'],
    [/millennial|25-35|professional/i, 'Millennials & Young Professionals (25–35)'],
    [/parent|mom|dad|family/i, 'Parents & Families'],
    [/entrepreneur|business owner|ceo|founder/i, 'Entrepreneurs & Business Owners'],
    [/fitness.{0,20}enthusiast|gym.{0,20}goer|athlete/i, 'Fitness Enthusiasts & Athletes'],
    [/gamer|streamer|esport/i, 'Gamers & Esports Enthusiasts'],
  ];
  for (const [pattern, label] of audienceMap) {
    if (pattern.test(lower)) { audience = label; break; }
  }

  // Build missing_fields list
  const missing_fields: string[] = [];
  if (!niche) missing_fields.push('niche');
  if (!audience) missing_fields.push('audience');
  if (budget === null) missing_fields.push('budget');
  if (target_reach === null) missing_fields.push('target_reach');

  // Dynamic co-pilot message
  let co_pilot_message = '';
  if (missing_fields.length === 0) {
    co_pilot_message = "Great! I extracted all 4 campaign parameters. Review the fields below and click Launch Brief when ready.";
  } else if (missing_fields.length <= 2) {
    co_pilot_message = `I extracted most of your campaign details, but still need: ${missing_fields.map(f => f.replace('_', ' ')).join(' and ')}. Please fill in the highlighted fields below.`;
  } else {
    co_pilot_message = `I found ${4 - missing_fields.length} of 4 parameters. Please fill in the remaining fields highlighted below to complete your campaign brief.`;
  }

  // Suggestion pills
  const suggestions: Record<string, string[]> = {};
  if (!niche) suggestions['niche'] = ['AI & Productivity Tools', 'Tech & Software', 'Business & Startup'];
  if (!audience) suggestions['audience'] = ['Startup Founders', 'Developers & Engineers', 'Young Professionals'];
  if (budget === null) suggestions['budget'] = ['25000', '50000', '100000'];
  if (target_reach === null) suggestions['target_reach'] = ['500000', '1000000', '2000000'];

  return {
    niche,
    audience,
    budget,
    target_reach,
    missing_fields,
    suggestions,
    is_complete: missing_fields.length === 0,
    co_pilot_message,
  };
}

export function ShapeABrief({ onCampaignCreated }: ShapeABriefProps) {
  const navigate = useNavigate();
  const [promptText, setPromptText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [analysis, setAnalysis] = useState<BriefAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);

  // Editable fields — start empty so user knows they need filling
  const [niche, setNiche] = useState('');
  const [audience, setAudience] = useState('');
  const [budget, setBudget] = useState<number>(5000);
  const [reach, setReach] = useState<number>(500000);

  // Sync fields from analysis whenever it changes
  // Use != null (not truthiness) so "0" and "" don't block the update
  useEffect(() => {
    if (!analysis) return;
    if (analysis.niche != null && analysis.niche !== '') setNiche(analysis.niche);
    if (analysis.audience != null && analysis.audience !== '') setAudience(analysis.audience);
    if (analysis.budget != null && analysis.budget > 0) setBudget(Math.min(analysis.budget, 200000));
    if (analysis.target_reach != null && analysis.target_reach > 0) setReach(Math.min(analysis.target_reach, 10000000));
  }, [analysis]);

  const handleSearch = async () => {
    if (!promptText.trim()) return;
    setAnalyzing(true);
    setError(null);
    setUsedFallback(false);

    try {
      // Try the backend LLM first
      const res = await campaignAPI.analyze(promptText);
      setAnalysis(res);
    } catch {
      // Backend unreachable or failed — run client-side extraction
      console.warn('Backend analyze failed, running client-side extraction.');
      const localResult = clientSideAnalyze(promptText);
      setAnalysis(localResult);
      setUsedFallback(true);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleSuggestionClick = (field: string, value: string) => {
    if (field === 'niche') {
      setNiche(value);
    } else if (field === 'audience') {
      setAudience(value);
    } else if (field === 'budget') {
      setBudget(Number(value));
    } else if (field === 'target_reach') {
      setReach(Number(value));
    }
    // Remove from missing_fields
    if (analysis) {
      setAnalysis({
        ...analysis,
        missing_fields: analysis.missing_fields.filter(f => f !== field),
        is_complete: analysis.missing_fields.filter(f => f !== field).length === 0,
      });
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

  const hasMissingCritical = !niche.trim() || !audience.trim();
  const hasIncompleteBrief = analysis !== null && analysis.missing_fields.length > 0;
  const fieldIsMissing = (field: string) => analysis !== null && analysis.missing_fields.includes(field);

  return (
    <div className="shape-brief-container animate-fade-in">
      <header className="page-header">
        <div>
          <h1 className="text-headline-lg">Shape a Brief <span className="accent-dot">●</span></h1>
          <p className="text-body-md text-muted">Describe your campaign and let our AI Co-Pilot extract the parameters — or fill them in manually.</p>
        </div>
      </header>

      {error && (
        <div className="card" style={{
          background: 'rgba(220,38,38,0.08)',
          border: '1px solid #dc2626',
          borderRadius: '12px',
          padding: '12px 16px',
          marginBottom: '16px',
          color: '#dc2626',
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
            placeholder="Describe your ideal campaign... e.g., We're launching a fitness app for men 25–35. Budget is ₹40,000, targeting 2 million views on Instagram and YouTube."
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={8}
          />

          <div className="workspace-actions">
            <span className="text-label-sm text-muted">Tip: Include product, audience, budget, and target views. Press Ctrl+Enter to analyze.</span>
            <button
              type="button"
              className="btn btn-primary btn-lg search-btn"
              onClick={handleSearch}
              disabled={analyzing || !promptText.trim()}
            >
              {analyzing ? <span className="spinner"></span> : <>AI Analyze <span className="icon-arrow">→</span></>}
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
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              {analysis && analysis.missing_fields.length === 0 && (
                <span className="badge badge-success" style={{ background: 'rgba(22,163,74,0.15)', color: '#16a34a', border: '1px solid #16a34a' }}>
                  ✓ Complete
                </span>
              )}
              {analysis && analysis.missing_fields.length > 0 && (
                <span className="badge badge-warning">
                  ⚠ Missing: {analysis.missing_fields.map(f => f.replace('_', ' ')).join(', ')}
                </span>
              )}
              {usedFallback && (
                <span className="badge" style={{ background: 'rgba(132,119,150,0.15)', color: '#847796', border: '1px solid #847796', fontSize: '0.7rem' }}>
                  Local Mode
                </span>
              )}
            </div>
          </div>

          <p className="copilot-message" style={{ fontStyle: 'italic' }}>
            {analysis?.co_pilot_message || 'Enter your campaign vision above and click "AI Analyze" — parameters will be extracted and filled automatically.'}
          </p>

          <div className="extracted-fields-group">
            {/* Target Niche */}
            <div className="field-row">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={`text-label${fieldIsMissing('niche') ? ' text-warning' : analysis && niche ? ' text-success' : ''}`}>
                  Target Niche
                  {fieldIsMissing('niche') && <span style={{ color: 'var(--color-warning, #f59e0b)', marginLeft: '4px' }}>* required</span>}
                  {analysis && niche && !fieldIsMissing('niche') && <span style={{ color: '#16a34a', marginLeft: '4px' }}>✓</span>}
                </span>
              </div>
              <input
                type="text"
                className={`input-field chip-input${fieldIsMissing('niche') ? ' input-error' : ''}`}
                placeholder="e.g. AI Productivity Tools"
                value={niche}
                onChange={(e) => {
                  setNiche(e.target.value);
                  if (analysis && e.target.value.trim()) {
                    setAnalysis({ ...analysis, missing_fields: analysis.missing_fields.filter(f => f !== 'niche') });
                  }
                }}
              />
              {/* Suggestion pills for niche */}
              {fieldIsMissing('niche') && analysis?.suggestions?.['niche'] && (
                <div className="suggestions-chips" style={{ marginTop: '6px' }}>
                  {analysis.suggestions['niche'].map((s, i) => (
                    <button key={i} type="button" className="chip chip-sm" onClick={() => handleSuggestionClick('niche', s)}>
                      + {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Target Audience */}
            <div className="field-row">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={`text-label${fieldIsMissing('audience') ? ' text-warning' : analysis && audience ? ' text-success' : ''}`}>
                  Target Audience
                  {fieldIsMissing('audience') && <span style={{ color: 'var(--color-warning, #f59e0b)', marginLeft: '4px' }}>* required</span>}
                  {analysis && audience && !fieldIsMissing('audience') && <span style={{ color: '#16a34a', marginLeft: '4px' }}>✓</span>}
                </span>
              </div>
              <input
                type="text"
                className={`input-field chip-input${fieldIsMissing('audience') ? ' input-error' : ''}`}
                placeholder="e.g. Startup Founders, Men 25–35"
                value={audience}
                onChange={(e) => {
                  setAudience(e.target.value);
                  if (analysis && e.target.value.trim()) {
                    setAnalysis({ ...analysis, missing_fields: analysis.missing_fields.filter(f => f !== 'audience') });
                  }
                }}
              />
              {fieldIsMissing('audience') && analysis?.suggestions?.['audience'] && (
                <div className="suggestions-chips" style={{ marginTop: '6px' }}>
                  {analysis.suggestions['audience'].map((s, i) => (
                    <button key={i} type="button" className="chip chip-sm" onClick={() => handleSuggestionClick('audience', s)}>
                      + {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Budget Slider */}
            <div className="field-row">
              <div className="slider-header">
                <span className={`text-label${fieldIsMissing('budget') ? ' text-warning' : analysis && !fieldIsMissing('budget') ? ' text-success' : ''}`}>
                  Budget (INR)
                  {fieldIsMissing('budget') && <span style={{ color: 'var(--color-warning, #f59e0b)', marginLeft: '4px' }}>* missing</span>}
                </span>
                <span className="value-display">₹{budget.toLocaleString('en-IN')}</span>
              </div>
              <div className="slider-container">
                <input
                  type="range"
                  min="500"
                  max="200000"
                  step="500"
                  value={budget}
                  className={fieldIsMissing('budget') ? 'slider-warning' : ''}
                  onChange={(e) => {
                    setBudget(Number(e.target.value));
                    if (analysis) setAnalysis({ ...analysis, missing_fields: analysis.missing_fields.filter(f => f !== 'budget') });
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                {[10000, 25000, 40000, 75000, 100000].map(v => (
                  <button key={v} type="button" className={`chip chip-xs${budget === v ? ' chip-primary' : ''}`}
                    onClick={() => { setBudget(v); if (analysis) setAnalysis({ ...analysis, missing_fields: analysis.missing_fields.filter(f => f !== 'budget') }); }}>
                    ₹{(v / 1000).toFixed(0)}K
                  </button>
                ))}
              </div>
            </div>

            {/* Target Reach Slider */}
            <div className="field-row">
              <div className="slider-header">
                <span className={`text-label${fieldIsMissing('target_reach') ? ' text-warning' : analysis && !fieldIsMissing('target_reach') ? ' text-success' : ''}`}>
                  Target Reach
                  {fieldIsMissing('target_reach') && <span style={{ color: 'var(--color-warning, #f59e0b)', marginLeft: '4px' }}>* missing</span>}
                </span>
                <span className="value-display">
                  {reach >= 1000000 ? `${(reach / 1000000).toFixed(1)}M` : `${(reach / 1000).toFixed(0)}K`}+ Impressions
                </span>
              </div>
              <div className="slider-container">
                <input
                  type="range"
                  min="50000"
                  max="10000000"
                  step="50000"
                  value={reach}
                  className={fieldIsMissing('target_reach') ? 'slider-warning' : ''}
                  onChange={(e) => {
                    setReach(Number(e.target.value));
                    if (analysis) setAnalysis({ ...analysis, missing_fields: analysis.missing_fields.filter(f => f !== 'target_reach') });
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                {[500000, 1000000, 2000000, 5000000].map(v => (
                  <button key={v} type="button" className={`chip chip-xs${reach === v ? ' chip-primary' : ''}`}
                    onClick={() => { setReach(v); if (analysis) setAnalysis({ ...analysis, missing_fields: analysis.missing_fields.filter(f => f !== 'target_reach') }); }}>
                    {v >= 1000000 ? `${v / 1000000}M` : `${v / 1000}K`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Completion status bar */}
          {analysis && (
            <div style={{ marginTop: '12px', marginBottom: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span className="text-label-sm text-muted">Brief Completeness</span>
                <span className="text-label-sm" style={{ color: analysis.missing_fields.length === 0 ? '#16a34a' : '#f59e0b' }}>
                  {4 - analysis.missing_fields.length}/4 fields
                </span>
              </div>
              <div className="progress-bar" style={{ height: '6px' }}>
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${((4 - analysis.missing_fields.length) / 4) * 100}%`,
                    background: analysis.missing_fields.length === 0 ? '#16a34a' : 'var(--color-primary)',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>
          )}

          {hasIncompleteBrief && (
            <p className="text-label-sm" style={{ color: '#f59e0b', margin: '8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>⚠</span> Fill in the highlighted fields above, or click the suggestion pills to auto-fill them.
            </p>
          )}

          <button
            type="button"
            className="btn btn-primary btn-lg launch-btn"
            onClick={handleLaunch}
            disabled={launching || hasMissingCritical}
            title={hasMissingCritical ? 'Niche and Audience are required to launch' : 'Launch your campaign brief'}
          >
            {launching ? <span className="spinner"></span> : <>Launch Brief →</>}
          </button>

          {hasMissingCritical && analysis && (
            <p className="text-label-sm text-muted" style={{ textAlign: 'center', marginTop: '6px' }}>
              Niche and Audience must be filled to launch.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
