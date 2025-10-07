// OAuth token management with secure cookie storage
// Tokens are now stored in HTTP-only cookies for security

export const tokenStorage = {
  // Check if user has tokens (by checking cookie existence)
  hasTokens: (): boolean => {
    if (typeof window === 'undefined') {
      return false;
    }
    // Check if the cookie exists (we can't read the value of HTTP-only cookies)
    return document.cookie.includes('smugmug_access_token');
  },

  // Clear tokens by calling logout endpoint
  clearTokens: async () => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        console.error('Failed to logout');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  // Legacy methods for backward compatibility (these now work with cookies)
  setTokens: (_accessToken: string, _accessTokenSecret: string) => {
    // No longer used - tokens are set via HTTP-only cookies in the callback
    console.warn('setTokens is deprecated. Tokens are now managed via secure cookies.');
  },

  getTokens: (): { accessToken: string | null; accessTokenSecret: string | null } => {
    // Can't read HTTP-only cookies from client-side
    // This method is kept for compatibility but returns null
    console.warn('getTokens is deprecated. Tokens are now in HTTP-only cookies.');
    return { accessToken: null, accessTokenSecret: null };
  },
};

// API client helper - now uses cookies automatically
export const smugmugApi = {
  fetchWithAuth: async (url: string, options: RequestInit = {}) => {
    // Cookies are sent automatically with credentials: 'include'
    return fetch(url, {
      ...options,
      credentials: 'include', // This ensures cookies are sent with the request
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  },

  getAlbums: async () => {
    const response = await smugmugApi.fetchWithAuth('/api/smugmug/albums');
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Not authenticated. Please log in again.');
      }
      throw new Error('Failed to fetch albums');
    }
    return response.json();
  },

  getAlbumImages: async (albumKey: string) => {
    const response = await smugmugApi.fetchWithAuth(
      `/api/smugmug/albums/${albumKey}/images`
    );
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Not authenticated. Please log in again.');
      }
      throw new Error('Failed to fetch images');
    }
    return response.json();
  },

  // Helper to check authentication status
  checkAuth: async (): Promise<boolean> => {
    try {
      const response = await smugmugApi.fetchWithAuth('/api/smugmug/user');
      return response.ok;
    } catch {
      return false;
    }
  },
};