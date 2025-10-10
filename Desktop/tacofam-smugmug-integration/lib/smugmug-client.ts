// Simple client-side storage for OAuth tokens
// In production, these should be stored server-side in a secure session

export const tokenStorage = {
  setTokens: (accessToken: string, accessTokenSecret: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('smugmug_access_token', accessToken);
      localStorage.setItem('smugmug_access_token_secret', accessTokenSecret);
    }
  },

  getTokens: (): { accessToken: string | null; accessTokenSecret: string | null } => {
    if (typeof window === 'undefined') {
      return { accessToken: null, accessTokenSecret: null };
    }

    return {
      accessToken: localStorage.getItem('smugmug_access_token'),
      accessTokenSecret: localStorage.getItem('smugmug_access_token_secret'),
    };
  },

  clearTokens: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('smugmug_access_token');
      localStorage.removeItem('smugmug_access_token_secret');
    }
  },

  hasTokens: (): boolean => {
    const { accessToken, accessTokenSecret } = tokenStorage.getTokens();
    return !!(accessToken && accessTokenSecret);
  },
};

// API client helper
export const smugmugApi = {
  fetchWithAuth: async (url: string, options: RequestInit = {}) => {
    const { accessToken, accessTokenSecret } = tokenStorage.getTokens();

    if (!accessToken || !accessTokenSecret) {
      throw new Error('Not authenticated');
    }

    const headers = {
      ...options.headers,
      'X-Access-Token': accessToken,
      'X-Access-Token-Secret': accessTokenSecret,
    };

    return fetch(url, {
      ...options,
      headers,
    });
  },

  getAlbums: async () => {
    const response = await smugmugApi.fetchWithAuth('/api/smugmug/albums');
    if (!response.ok) {
      throw new Error('Failed to fetch albums');
    }
    return response.json();
  },

  verifyConnection: async () => {
    const response = await smugmugApi.fetchWithAuth('/api/smugmug/user');
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to verify SmugMug connection: ${error}`);
    }
    return response.json();
  },

  getAlbumImages: async (albumKey: string) => {
    const response = await smugmugApi.fetchWithAuth(
      `/api/smugmug/albums/${albumKey}/images`
    );
    if (!response.ok) {
      throw new Error('Failed to fetch images');
    }
    return response.json();
  },
};
