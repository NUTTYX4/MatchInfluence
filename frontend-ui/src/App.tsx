import { useState, useEffect } from 'react';
import { Search, Loader2, User, Activity, DollarSign, BrainCircuit, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [numResults, setNumResults] = useState(5);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  // Load campaigns on startup
  useEffect(() => {
    fetch('http://127.0.0.1:8000/campaigns')
      .then(res => res.json())
      .then(data => {
        setCampaigns(data);
        if (data.length > 0) setSelectedCampaign(data[0].id);
      })
      .catch(err => console.error("Error loading campaigns:", err));
  }, []);

  const runMatch = async () => {
    setLoading(true);
    setResults([]);
    try {
      const response = await fetch('http://127.0.0.1:8000/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: selectedCampaign,
          num_results: numResults
        })
      });
      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error("Match failed:", error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 py-6 px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-lg"><BrainCircuit size={24} /></div>
            <h1 className="text-2xl font-bold tracking-tight">MatchInfluence <span className="text-blue-600">V3</span></h1>
          </div>
          <span className="text-sm font-medium bg-gray-100 text-gray-600 px-3 py-1 rounded-full">System: Online</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-8">
        {/* The Input Zone */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Search className="text-gray-400" size={20} />
            Campaign Parameters
          </h2>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Campaign Brief</label>
              <select 
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={selectedCampaign}
                onChange={(e) => setSelectedCampaign(e.target.value)}
              >
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>
                    Niche: {c.niche} | Budget: ${c.budget}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="w-full md:w-48">
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Candidates</label>
              <input 
                type="number" 
                min="1" max="20"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={numResults}
                onChange={(e) => setNumResults(Number(e.target.value))}
              />
            </div>

            <button 
              onClick={runMatch}
              disabled={loading || !selectedCampaign}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 px-8 rounded-lg transition-all flex items-center gap-2 h-[50px]"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : "Run AI Engine"}
            </button>
          </div>
        </div>

        {/* Transition / Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
            <p className="text-lg font-medium animate-pulse">Running semantic vector search...</p>
            <p className="text-sm text-gray-400">Calculating composite authenticity metrics & generating LLM rationale</p>
          </div>
        )}

        {/* The Results Zone */}
        {!loading && results.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="text-green-500" size={24} />
              <h2 className="text-2xl font-bold">Matched Candidates</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((candidate, idx) => (
                <div key={idx} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                  {/* Card Header */}
                  <div className="p-6 border-b border-gray-50 flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl">
                        {candidate.influencer.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg leading-tight">@{candidate.influencer.username}</h3>
                        <p className="text-sm text-gray-500 capitalize">{candidate.influencer.platform}</p>
                      </div>
                    </div>
                    {/* The Big Score */}
                    <div className="text-right">
                      <span className="block text-2xl font-black text-green-500">
                        {(candidate.scores.composite_fit * 100).toFixed(1)}%
                      </span>
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Fit Score</span>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-px bg-gray-50">
                    <div className="bg-white p-4 text-center">
                      <User size={16} className="mx-auto text-gray-400 mb-1" />
                      <p className="text-sm font-bold text-gray-800">{(candidate.influencer.followers / 1000).toFixed(1)}k</p>
                      <p className="text-[10px] text-gray-500 uppercase">Followers</p>
                    </div>
                    <div className="bg-white p-4 text-center">
                      <Activity size={16} className="mx-auto text-gray-400 mb-1" />
                      <p className="text-sm font-bold text-gray-800">{(candidate.scores.authenticity * 100).toFixed(0)}%</p>
                      <p className="text-[10px] text-gray-500 uppercase">Authentic</p>
                    </div>
                    <div className="bg-white p-4 text-center">
                      <DollarSign size={16} className="mx-auto text-gray-400 mb-1" />
                      <p className="text-sm font-bold text-gray-800">${candidate.financials.cpe.toFixed(2)}</p>
                      <p className="text-[10px] text-gray-500 uppercase">Est. CPE</p>
                    </div>
                  </div>

                  {/* AI Explanation */}
                  <div className="p-6 bg-blue-50/50">
                    <p className="text-sm text-gray-700 leading-relaxed italic">
                      "{candidate.explanation}"
                    </p>
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
