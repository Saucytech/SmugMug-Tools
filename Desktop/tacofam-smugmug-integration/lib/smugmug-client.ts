// API client helper
const CONNECTION_KEY = 'smugmug_connection_state';

const markConnected = () => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(CONNECTION_KEY, 'connected');
  }
};

const clearConnection = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CONNECTION_KEY);
  }
};

const isConnected = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  return localStorage.getItem(CONNECTION_KEY) === 'connected';
};

export const tokenStorage = {
  setConnected: markConnected,
  clear: clearConnection,
  isConnected,
  // Backwards-compatible helpers for legacy code paths
  setTokens: markConnected,
  clearTokens: clearConnection,
  hasTokens: isConnected,
  getTokens: () => (isConnected() ? { accessToken: null, accessTokenSecret: null } : null),
};

export const smugmugApi = {
  fetchWithAuth: async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    return fetch(url, {
      ...options,
      credentials: 'include',
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
