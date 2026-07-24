import { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, User, Activity, DollarSign, BrainCircuit, CheckCircle2, RefreshCw, Quote, LogOut, PlusCircle } from 'lucide-react';

// Define Types
type Campaign = {
  id: string;
  niche: string;
  budget: number;
};

type Influencer = {
  username: string;
  platform: string;
  followers: number;
  price: number;
};

type MatchResult = {
  influencer: Influencer;
  metrics: { er: number; clr: number; ffr: number };
  scores: { semantic_match: number; authenticity: number; composite_fit: number };
  financials: { cpe: number };
  explanation: string;
};

type AnalysisData = {
  niche?: string | null;
  audience?: string | null;
  budget?: number | null;
  target_reach?: number | null;
  missing_fields: string[];
  suggestions: Record<string, string[]>;
  is_complete: boolean;
};

export default function App() {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Dashboard State
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [numResults, setNumResults] = useState(5);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MatchResult[]>([]);

  // Magic Search Box State
  const [magicPrompt, setMagicPrompt] = useState('');
  const [magicLoading, setMagicLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Create Campaign State
  const [newCampaignNiche, setNewCampaignNiche] = useState('');
  const [newCampaignAudience, setNewCampaignAudience] = useState('');
  const [newCampaignBudget, setNewCampaignBudget] = useState<number | ''>('');
  const [newCampaignTargetReach, setNewCampaignTargetReach] = useState<number | ''>('');
  const [creatingCampaign, setCreatingCampaign] = useState(false);

  // Auth Handlers
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email,
          password,
          recaptcha_token: 'dev_bypass'
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }
      
      if (authMode === 'login') {
        setIsAuthenticated(true);
        setAuthError('');
      } else {
        setAuthMode('login');
        setAuthError('Registration successful. Please log in.');
      }
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:8000/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      setIsAuthenticated(false);
      setCampaigns([]);
      setResults([]);
      setSelectedCampaignId('');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  // Fetch campaigns from backend
  const fetchCampaigns = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await fetch('http://localhost:8000/campaigns', {
        credentials: 'include'
      });
      if (response.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      if (!response.ok) throw new Error("Failed to fetch campaigns");
      const data: Campaign[] = await response.json();
      setCampaigns(data);
      if (data.length > 0 && !selectedCampaignId) {
        setSelectedCampaignId(data[0].id);
      }
    } catch (err) {
      console.error("Error loading campaigns:", err);
    }
  }, [selectedCampaignId, isAuthenticated]);

  // Load campaigns on startup when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchCampaigns();
    }
  }, [fetchCampaigns, isAuthenticated]);

  // Create a Campaign
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingCampaign(true);
    try {
      const response = await fetch('http://localhost:8000/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          niche: newCampaignNiche,
          audience: newCampaignAudience,
          budget: Number(newCampaignBudget),
          target_reach: Number(newCampaignTargetReach)
        })
      });
      if (response.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      if (!response.ok) {
        throw new Error("Failed to create campaign");
      }
      const data = await response.json();
      
      // Auto-select and refresh
      setSelectedCampaignId(data.id);
      await fetchCampaigns();
      
      // Clear form
      setNewCampaignNiche('');
      setNewCampaignAudience('');
      setNewCampaignBudget('');
      setNewCampaignTargetReach('');
    } catch (error) {
      console.error("Error creating campaign:", error);
    } finally {
      setCreatingCampaign(false);
    }
  };

  // Run the AI Match
  const runMatch = async () => {
    if (!selectedCampaignId) return;
    
    setLoading(true);
    setResults([]);
    try {
      const response = await fetch('http://localhost:8000/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          campaign_id: selectedCampaignId,
          num_results: numResults
        })
      });
      if (response.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error("Match failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeBrief = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!magicPrompt.trim()) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch('http://localhost:8000/campaigns/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prompt: magicPrompt })
      });
      if (response.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      if (!response.ok) throw new Error("Failed to analyze brief");
      
      const data = await response.json();
      setAnalysisData(data);
    } catch (err) {
      console.error("Analysis failed:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    const newPrompt = magicPrompt.trim() + " " + suggestion;
    setMagicPrompt(newPrompt);
    
    // Automatically re-analyze with the appended context
    handleReAnalyze(newPrompt);
  };
  
  const handleReAnalyze = async (promptText: string) => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('http://localhost:8000/campaigns/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prompt: promptText })
      });
      if (response.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      if (response.ok) {
        setAnalysisData(await response.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Magic Search Box Match
  const handleMagicMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!magicPrompt.trim()) return;

    setMagicLoading(true);
    try {
      // 1. Generate campaign from prompt
      const genResponse = await fetch('http://localhost:8000/campaigns/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          prompt: magicPrompt
        })
      });
      
      if (genResponse.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      
      if (!genResponse.ok) {
        throw new Error("Failed to generate campaign");
      }
      
      const genData = await genResponse.json();
      const newCampaignId = genData.id;
      
      // 2. Set selected campaign ID
      setSelectedCampaignId(newCampaignId);
      
      // 3. Fetch updated campaigns list
      await fetchCampaigns();

      // 4. Run match engine immediately with the new ID
      setLoading(true);
      setResults([]);
      const matchResponse = await fetch('http://localhost:8000/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          campaign_id: newCampaignId,
          num_results: numResults
        })
      });
      
      if (matchResponse.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      
      const matchData = await matchResponse.json();
      setResults(matchData.results || []);
      
    } catch (error) {
      console.error("Magic Match failed:", error);
    } finally {
      setMagicLoading(false);
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 w-full max-w-md">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="bg-blue-600 text-white p-2.5 rounded-xl shadow-sm">
              <BrainCircuit size={28} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">MatchInfluence</h1>
          </div>
          <h2 className="text-xl font-semibold mb-6 text-center text-slate-700">
            {authMode === 'login' ? 'Sign In' : 'Create Account'}
          </h2>
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {authError && (
              <div className={`p-3 rounded-lg text-sm ${authError.includes('successful') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {authError}
              </div>
            )}
            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {authLoading ? <Loader2 className="animate-spin" size={20} /> : (authMode === 'login' ? 'Sign In' : 'Sign Up')}
            </button>
          </form>
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setAuthError('');
              }}
              className="text-sm text-blue-600 hover:underline"
            >
              {authMode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 py-6 px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2.5 rounded-xl shadow-sm">
              <BrainCircuit size={24} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">
              MatchInfluence <span className="text-blue-600">AI</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200">
              System Online
            </span>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column: Create Campaign */}
          <div className="w-full lg:w-1/3 space-y-6">
            
            {/* Magic Search Box */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-2xl shadow-sm border border-indigo-100">
              <h2 className="text-xl font-bold flex items-center gap-2 text-indigo-900 mb-4">
                <BrainCircuit className="text-indigo-600" size={24} />
                Magic Search
              </h2>
              <form onSubmit={analysisData?.is_complete ? handleMagicMatch : handleAnalyzeBrief} className="space-y-4">
                <textarea
                  className="w-full bg-white border border-indigo-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none h-32 text-sm text-slate-800 placeholder-slate-400"
                  placeholder='e.g. "I need tech reviewers for a new keyboard launch, budget is 5k"'
                  value={magicPrompt}
                  onChange={(e) => {
                     setMagicPrompt(e.target.value);
                     if (analysisData?.is_complete) setAnalysisData(null);
                  }}
                  required
                />

                {/* AI Prompt Co-Pilot Checklist */}
                {analysisData && !analysisData.is_complete && (
                  <div className="bg-white/80 rounded-lg p-4 border border-indigo-100 shadow-sm text-sm space-y-3">
                    <h3 className="font-semibold text-indigo-900 mb-2">Parameter Extraction</h3>
                    
                    <ul className="space-y-2">
                      {['niche', 'audience', 'budget', 'target_reach'].map(field => {
                        const isMissing = analysisData.missing_fields.includes(field);
                        const val = (analysisData as any)[field];
                        
                        return (
                          <li key={field} className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                              {isMissing ? (
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                              ) : (
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              )}
                              <span className="capitalize font-medium text-slate-700">
                                {field.replace('_', ' ')}: 
                              </span>
                              <span className={isMissing ? "text-red-500 font-medium" : "text-slate-600"}>
                                {isMissing ? "Missing" : String(val)}
                              </span>
                            </div>
                            
                            {isMissing && analysisData.suggestions[field] && (
                              <div className="flex flex-wrap gap-2 pl-3.5 mt-1">
                                {analysisData.suggestions[field].map(sug => (
                                  <button
                                    key={sug}
                                    type="button"
                                    onClick={() => handleSuggestionClick(sug)}
                                    className="text-[11px] bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-2 py-1 rounded-full transition-colors border border-indigo-200/50"
                                  >
                                    + {sug}
                                  </button>
                                ))}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {(!analysisData || !analysisData.is_complete) ? (
                  <button
                    type="submit"
                    disabled={isAnalyzing || magicLoading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    {isAnalyzing ? <Loader2 className="animate-spin" size={20} /> : 'Analyze Brief'}
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={magicLoading}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-400 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                  >
                    {magicLoading ? <Loader2 className="animate-spin" size={20} /> : 'Search'}
                  </button>
                )}
              </form>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800 mb-6">
                <PlusCircle className="text-blue-600" size={24} />
                Shape a Brief
              </h2>
              <form onSubmit={handleCreateCampaign} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Niche / Brief</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Fitness Supplements"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={newCampaignNiche}
                    onChange={(e) => setNewCampaignNiche(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Target Audience</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Gym goers, 18-35"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={newCampaignAudience}
                    onChange={(e) => setNewCampaignAudience(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Budget ($)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 5000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={newCampaignBudget}
                    onChange={(e) => setNewCampaignBudget(e.target.value ? Number(e.target.value) : '')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Target Reach</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 100000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={newCampaignTargetReach}
                    onChange={(e) => setNewCampaignTargetReach(e.target.value ? Number(e.target.value) : '')}
                  />
                </div>
                <button
                  type="submit"
                  disabled={creatingCampaign}
                  className="w-full mt-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  {creatingCampaign ? <Loader2 className="animate-spin" size={20} /> : 'Search'}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: AI Semantic Matcher */}
          <div className="w-full lg:w-2/3">
            {/* Campaign Parameters Section */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                  <Search className="text-blue-600" size={24} />
                  Match Engine
                </h2>
              </div>
              
              <div className="flex flex-col lg:flex-row gap-6 items-end">
                <div className="flex-1 w-full relative">
                  <div className="flex justify-between mb-2">
                    <label className="block text-sm font-semibold text-slate-700">Select Campaign</label>
                    <button 
                      onClick={fetchCampaigns} 
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                    >
                      <RefreshCw size={14} /> Refresh Campaigns
                    </button>
                  </div>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-3.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm appearance-none cursor-pointer"
                    value={selectedCampaignId}
                    onChange={(e) => setSelectedCampaignId(e.target.value)}
                  >
                    {campaigns.length === 0 ? (
                      <option value="" disabled>No campaigns found...</option>
                    ) : (
                      campaigns.map(c => (
                        <option key={c.id} value={c.id}>
                          [{c.niche}] - Budget: ${c.budget.toLocaleString()}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                
                <div className="w-full lg:w-32">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Results</label>
                  <input 
                    type="number" 
                    min="1" max="20"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-3.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                    value={numResults}
                    onChange={(e) => setNumResults(Number(e.target.value))}
                  />
                </div>

                <button 
                  onClick={runMatch}
                  disabled={loading || !selectedCampaignId}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3.5 px-6 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 h-[54px] w-full lg:w-auto"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Processing...
                    </>
                  ) : (
                    "Search"
                  )}
                </button>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-24 text-slate-500">
                <Loader2 className="animate-spin text-blue-600 mb-6" size={56} />
                <p className="text-xl font-semibold text-slate-800 mb-2 animate-pulse">Analyzing Candidates &amp; Vectorizing Context...</p>
                <p className="text-slate-500">Evaluating multi-dimensional authenticity and composite fit scoring</p>
              </div>
            )}

            {/* Results Zone */}
            {!loading && results.length > 0 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                  <CheckCircle2 className="text-emerald-500" size={28} />
                  <h2 className="text-2xl font-bold text-slate-800">Top Creators Found</h2>
                  <span className="ml-auto bg-slate-100 text-slate-600 py-1 px-3 rounded-full text-sm font-bold">
                    {results.length} Results
                  </span>
                </div>
                
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {results.map((candidate, idx) => (
                    <div key={idx} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col">
                      {/* Card Header */}
                      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl shadow-inner flex items-center justify-center text-white font-bold text-2xl">
                            {candidate.influencer.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-slate-900 leading-tight">@{candidate.influencer.username}</h3>
                            <p className="text-sm font-medium text-slate-500 capitalize">{candidate.influencer.platform}</p>
                          </div>
                        </div>
                        {/* Composite Score Bubble */}
                        <div className="flex flex-col items-end">
                          <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-1.5 text-center shadow-sm">
                            <span className="block text-2xl font-black text-emerald-600">
                              {(candidate.scores.composite_fit * 100).toFixed(1)}%
                            </span>
                            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest">Fit Score</span>
                          </div>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 px-1">Alignment Index</p>
                      <div className="grid grid-cols-3 gap-px bg-slate-100">
                        <div className="bg-white p-5 text-center">
                          <User size={18} className="mx-auto text-blue-500 mb-2" />
                          <p className="text-base font-black text-slate-800">
                            {candidate.influencer.followers >= 1000000 
                              ? (candidate.influencer.followers / 1000000).toFixed(1) + 'M' 
                              : (candidate.influencer.followers / 1000).toFixed(1) + 'k'}
                          </p>
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Followers</p>
                        </div>
                        <div className="bg-white p-5 text-center">
                          <Activity size={18} className="mx-auto text-violet-500 mb-2" />
                          <p className="text-base font-black text-slate-800">{(candidate.scores.authenticity * 100).toFixed(1)}%</p>
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Authentic</p>
                        </div>
                        <div className="bg-white p-5 text-center">
                          <DollarSign size={18} className="mx-auto text-emerald-500 mb-2" />
                          <p className="text-base font-black text-slate-800">${candidate.financials.cpe.toFixed(2)}</p>
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Est. CPE</p>
                        </div>
                      </div>

                      {/* AI Explanation Quote Box */}
                      <div className="p-6 bg-gradient-to-b from-white to-blue-50/30 flex-1 flex flex-col justify-end">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">The Synapse</h4>
                        <div className="relative">
                          <Quote className="absolute -top-2 -left-2 text-blue-200/50 w-8 h-8" />
                          <p className="text-sm font-medium text-slate-700 leading-relaxed italic relative z-10 pl-2">
                            {candidate.explanation}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}