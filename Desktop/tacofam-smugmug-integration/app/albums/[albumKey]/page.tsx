'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { tokenStorage } from '@/lib/smugmug-client';

interface Photo {
  ImageKey: string;
  FileName: string;
  Title?: string;
  Caption?: string;
  ThumbnailUrl: string;
  ArchivedUri?: string;
  Uris?: {
    LargeImageUrl?: string;
  };
}

export default function AlbumPage() {
  const params = useParams();
  const router = useRouter();
  const albumKey = params.albumKey as string;
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [albumName, setAlbumName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const tokens = tokenStorage.getTokens();
        if (!tokens) {
          router.push('/');
          return;
        }

        const urlParams = new URLSearchParams();
        urlParams.set('albumKey', albumKey);
        if (typeof window !== 'undefined') {
          const searchParams = new URLSearchParams(window.location.search);
          const name = searchParams.get('albumName');
          if (name) setAlbumName(decodeURIComponent(name));
        }

        const response = await fetch(`/api/smugmug/albums/${albumKey}/images`, {
          headers: {
            'X-Access-Token': tokens.accessToken,
            'X-Access-Token-Secret': tokens.accessTokenSecret,
          },
        });

        if (!response.ok) throw new Error('Failed to fetch photos');

        const data = await response.json();
        setPhotos(data.images || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPhotos();
  }, [albumKey, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading photos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <button
            onClick={() => router.push('/')}
            className="hover:text-blue-600 transition-colors"
          >
            Your Albums
          </button>
          <span>/</span>
          <span className="text-gray-900 font-semibold">{albumName || albumKey}</span>
        </div>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/')}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">{albumName || 'Album'}</h1>
            <p className="text-gray-600">{photos.length} photos</p>
          </div>
        </div>

        {/* Photos Grid */}
        {photos.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No photos in this album</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <button
                key={photo.ImageKey}
                onClick={() => {
                  const tokens = tokenStorage.getTokens();
                  const params = new URLSearchParams({
                    access_token: tokens?.accessToken || '',
                    access_token_secret: tokens?.accessTokenSecret || '',
                    albumName: albumName,
                    albumKey: albumKey,
                  });
                  router.push(`/photo/${photo.ImageKey}?${params.toString()}`);
                }}
                className="group relative aspect-square overflow-hidden rounded-lg bg-gray-200 hover:ring-4 hover:ring-blue-500 transition-all"
              >
                <img
                  src={photo.ThumbnailUrl}
                  alt={photo.Title || photo.FileName}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white text-sm font-semibold truncate">
                      {photo.Title || photo.FileName}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
