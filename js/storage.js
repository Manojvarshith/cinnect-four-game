

const DEFAULT_PREFERENCES = {
  theme: 'system', 
  sound: 'on',     
  volume: 0.5,
  speed: 'normal', 
  particles: 'on', 
  boardColor: '#1e293b', 
  p1Color: '#ff3e6c',    
  p2Color: '#00f0ff'     
};

const DEFAULT_PROFILE = {
  avatar: 'rocket',
  xp: 0,
  level: 1,
  rank: 'Bronze Cadet',
  badges: []
};

const DEFAULT_STATS = {
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  currentStreak: 0,
  longestStreak: 0,
  totalMatchTime: 0, 
  fastestWin: null,  
  openingCols: [0, 0, 0, 0, 0, 0, 0], 
  dailyStreak: {
    lastPlayedDate: null,
    streakCount: 0
  }
};

class StorageManager {
  constructor() {
    this.keys = {
      prefs: 'c4_pro_prefs',
      profile: 'c4_pro_profile',
      stats: 'c4_pro_stats',
      history: 'c4_pro_history',
      achievements: 'c4_pro_achievements'
    };
  }

  _get(key, defaultValue) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.error(`Error reading key ${key} from LocalStorage:`, e);
      return defaultValue;
    }
  }

  _set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error writing key ${key} to LocalStorage:`, e);
    }
  }

  getPreferences() {
    return this._get(this.keys.prefs, { ...DEFAULT_PREFERENCES });
  }

  savePreferences(prefs) {
    const current = this.getPreferences();
    this._set(this.keys.prefs, { ...current, ...prefs });
  }

  getProfile() {
    return this._get(this.keys.profile, { ...DEFAULT_PROFILE });
  }

  saveProfile(profile) {
    const current = this.getProfile();
    this._set(this.keys.profile, { ...current, ...profile });
  }

  getStats() {
    return this._get(this.keys.stats, { ...DEFAULT_STATS });
  }

  saveStats(stats) {
    const current = this.getStats();
    this._set(this.keys.stats, { ...current, ...stats });
  }

  getHistory() {
    return this._get(this.keys.history, []);
  }

  saveHistory(history) {
    this._set(this.keys.history, history);
  }

  getAchievements() {
    return this._get(this.keys.achievements, []);
  }

  saveAchievements(achievements) {
    this._set(this.keys.achievements, achievements);
  }

  resetAll() {
    localStorage.removeItem(this.keys.prefs);
    localStorage.removeItem(this.keys.profile);
    localStorage.removeItem(this.keys.stats);
    localStorage.removeItem(this.keys.history);
    localStorage.removeItem(this.keys.achievements);

    window.location.reload();
  }
}

export const storage = new StorageManager();
export { DEFAULT_PREFERENCES, DEFAULT_PROFILE, DEFAULT_STATS };
