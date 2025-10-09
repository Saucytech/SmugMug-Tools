'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useAlbumsStore } from '@/stores/albumsStore';
import { tokenStorage } from '@/lib/smugmug-client';

/**
 * Background album loader component
 * Automatically fetches albums when user is authenticated with SmugMug
 * Should be placed in the root layout to run globally
 */
export default function AlbumsLoader() {
  const { data: session } = useSession();
  const { fetchAlbums, isFresh } = useAlbumsStore();

  useEffect(() => {
    // Only fetch if user is logged in with NextAuth
    if (!session) {
      return;
    }

    // Check if user has SmugMug tokens
    const tokens = tokenStorage.getTokens();
    if (!tokens) {
      return;
    }

    // Fetch albums in the background if cache is stale
    if (!isFresh()) {
      console.log('🔄 Auto-loading albums in background...');
      fetchAlbums().then(() => {
        console.log('✅ Albums loaded and cached');
      }).catch((err) => {
        console.error('❌ Background album loading failed:', err);
      });
    } else {
      console.log('✅ Albums already cached and fresh');
    }
  }, [session, fetchAlbums, isFresh]);

  // This component doesn't render anything
  return null;
}
