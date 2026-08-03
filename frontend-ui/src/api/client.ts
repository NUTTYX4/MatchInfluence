const API_BASE = 'http://localhost:8000';

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const config: RequestInit = {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Network error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// Auth
export const authAPI = {
  register: (email: string, password: string) =>
    request('/auth/register', {
      method: 'POST',
      body: { email, password, recaptcha_token: 'dev_bypass' },
    }),

  login: (email: string, password: string) =>
    request('/auth/login', {
      method: 'POST',
      body: { email, password, recaptcha_token: 'dev_bypass' },
    }),

  logout: () =>
    request('/auth/logout', { method: 'POST' }),
};

// Campaigns / Briefs
export interface Campaign {
  id: string;
  niche: string;
  audience: string;
  budget: number;
  target_reach: number;
  brief_text: string | null;
}

export interface BriefAnalysis {
  niche: string | null;
  audience: string | null;
  budget: number | null;
  target_reach: number | null;
  missing_fields: string[];
  suggestions: Record<string, string[]>;
  is_complete: boolean;
  co_pilot_message: string;
}

export const campaignAPI = {
  create: (data: { niche: string; audience: string; budget: number; target_reach: number }) =>
    request<Campaign>('/campaigns', { method: 'POST', body: data }),

  list: () =>
    request<Array<{ id: string; niche: string; budget: number }>>('/campaigns'),

  analyze: (prompt: string) =>
    request<BriefAnalysis>('/campaigns/analyze', { method: 'POST', body: { prompt } }),

  generate: (prompt: string) =>
    request<Campaign>('/campaigns/generate', { method: 'POST', body: { prompt } }),
};

// Matching
export interface MatchResult {
  rank: number;
  username: string;
  platform: string;
  follower_count: number;
  engagement_rate: number;
  composite_score: number;
  semantic_score: number;
  authenticity_score: number;
  cpe: number;
  explanation: string;
}

export interface MatchResponse {
  campaign_id: string;
  matches_found: number;
  results: MatchResult[];
}

export const matchAPI = {
  run: (campaignId: string, numResults: number = 10) =>
    request<MatchResponse>('/match', {
      method: 'POST',
      body: { campaign_id: campaignId, num_results: numResults },
    }),
};

// Analytics
export interface AnalyticsData {
  campaign_id: string;
  fit_authenticity_map: Array<{
    username: string;
    platform: string;
    x_authenticity: number;
    y_composite_fit: number;
    z_reach: number;
  }>;
  cpe_ranking: Array<{
    username: string;
    platform: string;
    cpe: number;
    followers: number;
  }>;
  history_logs: Array<{
    match_id: string;
    username: string;
    platform: string;
    rank: number;
    composite_score: number;
    authenticity_score: number;
    semantic_score: number;
    cpe: number;
    created_at: string | null;
  }>;
}

export const analyticsAPI = {
  get: (campaignId: string) =>
    request<AnalyticsData>(`/campaigns/${campaignId}/analytics`),
};

// Influencers
export const influencerAPI = {
  list: () => request<unknown[]>('/influencers'),
  ingest: (targetId: string, platform: string) =>
    request('/influencers/ingest', {
      method: 'POST',
      body: { target_id: targetId, platform },
    }),
};
