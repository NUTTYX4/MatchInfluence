export interface UserPreferences {
  defaultResults: number;
  currency: string;
  prefInstagram: boolean;
  prefYoutube: boolean;
  prefTiktok: boolean;
  density: 'Comfortable' | 'Compact';
}

const STORAGE_KEY = 'matchinfluence_preferences';

export const defaultPreferences: UserPreferences = {
  defaultResults: 15,
  currency: 'USD ($)',
  prefInstagram: true,
  prefYoutube: true,
  prefTiktok: true,
  density: 'Comfortable',
};

export function getPreferences(): UserPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultPreferences, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.warn('Failed to parse preferences from localStorage:', e);
  }
  return defaultPreferences;
}

export function savePreferences(prefs: UserPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    window.dispatchEvent(new CustomEvent('preferencesUpdated', { detail: prefs }));
  } catch (e) {
    console.warn('Failed to save preferences to localStorage:', e);
  }
}
