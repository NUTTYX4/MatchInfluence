import { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, User, Activity, DollarSign, BrainCircuit, CheckCircle2, RefreshCw, Quote } from 'lucide-react';

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

export default function App() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [numResults, setNumResults] = useState(5);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MatchResult[]>([]);

  // Fetch campaigns from backend
  const fetchCampaigns = useCallback(async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/campaigns');
      const data: Campaign[] = await response.json();
      setCampaigns(data);
      if (data.length > 0 && !selectedCampaignId) {
        setSelectedCampaignId(data[0].id);
      }
    } catch (err) {
      console.error("Error loading campaigns:", err);
    }
  }, [selectedCampaignId]);

  // Load campaigns on startup
  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Run the AI Match
  const runMatch = async () => {
    if (!selectedCampaignId) return;
    
    setLoading(true);
    setResults([]);
    try {
      const response = await fetch('http://127.0.0.1:8000/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: selectedCampaignId,
          num_results: numResults
        })
      });
      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error("Match failed:", error);
    } finally {
      setLoading(false);
    }
  };

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
          <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200">
            System Online
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8">
        {/* Campaign Parameters Section */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
              <Search className="text-blue-600" size={24} />
              Campaign Configuration
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
            
            <div className="w-full lg:w-48">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Max Results</label>
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
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3.5 px-8 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 h-[54px] w-full lg:w-auto min-w-[200px]"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Processing...
                </>
              ) : (
                "Run Semantic Match"
              )}
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500">
            <Loader2 className="animate-spin text-blue-600 mb-6" size={56} />
            <p className="text-xl font-semibold text-slate-800 mb-2 animate-pulse">Running AI Semantic Match...</p>
            <p className="text-slate-500">Evaluating multi-dimensional authenticity and composite fit scoring</p>
          </div>
        )}

        {/* Results Zone */}
        {!loading && results.length > 0 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
              <CheckCircle2 className="text-emerald-500" size={28} />
              <h2 className="text-3xl font-bold text-slate-800">Top Candidates Found</h2>
              <span className="ml-auto bg-slate-100 text-slate-600 py-1 px-3 rounded-full text-sm font-bold">
                {results.length} Results
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
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
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest">Fit</span>
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
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
      </main>
    </div>
  );
}