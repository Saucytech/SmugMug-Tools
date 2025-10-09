import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { smugmugApi } from '@/lib/smugmug-client';

export interface Album {
  AlbumKey: string;
  Name: string;
  ImageCount: number;
  UrlName?: string;
  Description?: string;
  Keywords?: string[];
  Uri?: string;
  WebUri?: string;
  Date?: {
    Year?: number;
    Month?: number;
    Day?: number;
  };
  // Add any other SmugMug album properties you need
}

interface AlbumsStore {
  albums: Album[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;

  // Actions
  fetchAlbums: () => Promise<void>;
  setAlbums: (albums: Album[]) => void;
  clearAlbums: () => void;
  getAlbumByKey: (albumKey: string) => Album | undefined;

  // Search and filter helpers
  searchAlbums: (searchTerm: string) => Album[];
  sortAlbums: (sortBy: 'name' | 'count' | 'recent') => Album[];

  // Check if data is fresh (less than 5 minutes old)
  isFresh: () => boolean;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useAlbumsStore = create<AlbumsStore>()(
  persist(
    (set, get) => ({
      albums: [],
      loading: false,
      error: null,
      lastFetched: null,

      fetchAlbums: async () => {
        // Don't fetch if already loading
        if (get().loading) {
          return;
        }

        // Use cached data if it's fresh
        if (get().isFresh() && get().albums.length > 0) {
          console.log('Using cached albums data');
          return;
        }

        set({ loading: true, error: null });

        try {
          const data = await smugmugApi.getAlbums();
          set({
            albums: data.albums || [],
            loading: false,
            error: null,
            lastFetched: Date.now(),
          });
        } catch (err: any) {
          console.error('Error fetching albums:', err);
          set({
            error: err.message || 'Failed to load albums',
            loading: false,
          });
        }
      },

      setAlbums: (albums) => {
        set({
          albums,
          lastFetched: Date.now(),
          error: null,
        });
      },

      clearAlbums: () => {
        set({
          albums: [],
          loading: false,
          error: null,
          lastFetched: null,
        });
      },

      getAlbumByKey: (albumKey) => {
        return get().albums.find((album) => album.AlbumKey === albumKey);
      },

      searchAlbums: (searchTerm) => {
        const term = searchTerm.toLowerCase();
        return get().albums.filter((album) =>
          album.Name.toLowerCase().includes(term) ||
          album.Description?.toLowerCase().includes(term) ||
          album.Keywords?.some(k => k.toLowerCase().includes(term))
        );
      },

      sortAlbums: (sortBy) => {
        const albums = [...get().albums];

        if (sortBy === 'name') {
          return albums.sort((a, b) => a.Name.localeCompare(b.Name));
        } else if (sortBy === 'count') {
          return albums.sort((a, b) => b.ImageCount - a.ImageCount);
        }

        // 'recent' - keep original order (API returns recent first)
        return albums;
      },

      isFresh: () => {
        const { lastFetched } = get();
        if (!lastFetched) return false;
        return Date.now() - lastFetched < CACHE_DURATION;
      },
    }),
    {
      name: 'smugmug-albums-storage', // localStorage key
      partialize: (state) => ({
        // Only persist minimal album data to avoid localStorage quota errors
        albums: state.albums.map(album => ({
          AlbumKey: album.AlbumKey,
          Name: album.Name,
          ImageCount: album.ImageCount,
        })),
        lastFetched: state.lastFetched,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn('Failed to load albums from storage:', error);
          // Clear the storage and start fresh
          localStorage.removeItem('smugmug-albums-storage');
        }
      },
    }
  )
);
