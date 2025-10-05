// Favorites Session Management
// Uses localStorage for demo - in production, use a database

export interface FavoriteSession {
  id: string;
  name: string;
  description?: string;
  albumKeys: string[];
  createdAt: string;
  expiresAt?: string;
  theme?: 'purple' | 'blue' | 'green' | 'red' | 'orange' | 'pink' | 'dark';
  showBuyButton?: boolean;
  logoUrl?: string;
  customerFavorites: {
    [customerEmail: string]: {
      photoKeys: string[];
      selectedAt: string;
      customerName?: string;
    };
  };
}

const STORAGE_KEY = 'smugmug_favorite_sessions';

export const favoritesStorage = {
  // Get all sessions
  getAllSessions(): FavoriteSession[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  // Get session by ID
  getSession(id: string): FavoriteSession | null {
    const sessions = this.getAllSessions();
    return sessions.find(s => s.id === id) || null;
  },

  // Create new session
  createSession(session: Omit<FavoriteSession, 'id' | 'createdAt' | 'customerFavorites'>): FavoriteSession {
    const newSession: FavoriteSession = {
      ...session,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      customerFavorites: {},
    };

    const sessions = this.getAllSessions();
    sessions.push(newSession);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    return newSession;
  },

  // Add customer favorites to session
  addCustomerFavorites(
    sessionId: string,
    customerEmail: string,
    photoKeys: string[],
    customerName?: string
  ): void {
    const sessions = this.getAllSessions();
    const session = sessions.find(s => s.id === sessionId);

    if (session) {
      session.customerFavorites[customerEmail] = {
        photoKeys,
        selectedAt: new Date().toISOString(),
        customerName,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
  },

  // Delete session
  deleteSession(id: string): void {
    const sessions = this.getAllSessions();
    const filtered = sessions.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  },

  // Generate session link
  generateLink(sessionId: string): string {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/favorites/${sessionId}`;
  },

  // Generate unique ID
  generateId(): string {
    return `fav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },
};
