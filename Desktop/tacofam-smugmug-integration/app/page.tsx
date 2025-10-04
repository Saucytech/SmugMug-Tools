'use client';

import { useState, useEffect } from 'react';
import { ImageIcon, FolderIcon, LogOut, Download } from 'lucide-react';
import { tokenStorage, smugmugApi } from '@/lib/smugmug-client';

interface Album {
  AlbumKey: string;
  Name: string;
  ImageCount: number;
  UrlName?: string;
}

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

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for OAuth callback tokens in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access_token');
    const accessTokenSecret = params.get('access_token_secret');

    if (accessToken && accessTokenSecret) {
      tokenStorage.setTokens(accessToken, accessTokenSecret);
      // Clean URL
      window.history.replaceState({}, '', '/');
      setIsAuthenticated(true);
    } else if (tokenStorage.hasTokens()) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleAuth = () => {
    window.location.href = '/api/auth/smugmug';
  };

  const handleLogout = () => {
    tokenStorage.clearTokens();
    setIsAuthenticated(false);
    setAlbums([]);
    setSelectedAlbum(null);
    setPhotos([]);
    setSelectedPhotos(new Set());
  };

  const fetchAlbums = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await smugmugApi.getAlbums();
      setAlbums(data.albums || []);
    } catch (err) {
      setError('Failed to load albums. Please try reconnecting.');
      console.error('Error fetching albums:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPhotos = async (albumKey: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await smugmugApi.getAlbumImages(albumKey);
      setPhotos(data.images || []);
    } catch (err) {
      setError('Failed to load photos. Please try again.');
      console.error('Error fetching photos:', err);
    } finally {
      setLoading(false);
    }
  };

  const togglePhotoSelection = (imageKey: string) => {
    const newSelection = new Set(selectedPhotos);
    if (newSelection.has(imageKey)) {
      newSelection.delete(imageKey);
    } else {
      newSelection.add(imageKey);
    }
    setSelectedPhotos(newSelection);
  };

  const exportSelectedPhotos = () => {
    const selected = photos.filter(photo => selectedPhotos.has(photo.ImageKey));
    const jsonData = JSON.stringify(selected, null, 2);
    
    navigator.clipboard.writeText(jsonData);
    alert(`${selected.length} photos copied to clipboard as JSON!`);
  };

  const downloadJSON = () => {
    const selected = photos.filter(photo => selectedPhotos.has(photo.ImageKey));
    const jsonData = JSON.stringify(selected, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tacofam-photos-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-gray-900 to-gray-800 text-white">
        <div className="text-center max-w-2xl">
          <ImageIcon className="w-20 h-20 mx-auto mb-6 text-blue-400" />
          <h1 className="text-5xl font-bold mb-4">TacoFam SmugMug Integration</h1>
          <p className="text-xl mb-8 text-gray-300">
            Connect your SmugMug account to browse albums and select photos for your TacoFam articles
          </p>
          <button
            onClick={handleAuth}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-colors shadow-lg hover:shadow-xl"
          >
            Connect SmugMug Account
          </button>
          <p className="mt-6 text-sm text-gray-400">
            Don't have an API key yet?{' '}
            <a
              href="https://api.smugmug.com/api/developer/apply"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              Apply here
            </a>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">SmugMug Photo Browser</h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Albums Section */}
        {!selectedAlbum && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">Your Albums</h2>
              <button
                onClick={fetchAlbums}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg transition-colors font-medium"
              >
                {loading ? 'Loading...' : albums.length > 0 ? 'Refresh Albums' : 'Load Albums'}
              </button>
            </div>

            {albums.length === 0 && !loading && (
              <div className="text-center py-20 text-gray-500">
                <FolderIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p>Click "Load Albums" to see your SmugMug albums</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {albums.map((album) => (
                <div
                  key={album.AlbumKey}
                  onClick={() => {
                    setSelectedAlbum(album);
                    fetchPhotos(album.AlbumKey);
                  }}
                  className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:shadow-xl hover:border-blue-500 cursor-pointer transition-all"
                >
                  <FolderIcon className="w-12 h-12 mb-3 text-blue-600" />
                  <h3 className="font-semibold text-lg mb-1 text-gray-900">{album.Name}</h3>
                  <p className="text-sm text-gray-600">{album.ImageCount} photos</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Photos Section */}
        {selectedAlbum && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <button
                  onClick={() => {
                    setSelectedAlbum(null);
                    setPhotos([]);
                    setSelectedPhotos(new Set());
                  }}
                  className="text-blue-600 hover:underline mb-2 text-sm font-medium"
                >
                  ← Back to Albums
                </button>
                <h2 className="text-3xl font-bold text-gray-900">{selectedAlbum.Name}</h2>
                <p className="text-gray-600 mt-1">
                  {selectedPhotos.size > 0 ? `${selectedPhotos.size} selected` : 'Click photos to select'}
                </p>
              </div>
              {selectedPhotos.size > 0 && (
                <div className="flex gap-3">
                  <button
                    onClick={exportSelectedPhotos}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
                  >
                    <Download className="w-5 h-5" />
                    Copy {selectedPhotos.size} to Clipboard
                  </button>
                  <button
                    onClick={downloadJSON}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
                  >
                    <Download className="w-5 h-5" />
                    Download JSON
                  </button>
                </div>
              )}
            </div>

            {loading && (
              <div className="text-center py-20">
                <p className="text-gray-600">Loading photos...</p>
              </div>
            )}

            {!loading && photos.length === 0 && (
              <div className="text-center py-20 text-gray-500">
                <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p>No photos found in this album</p>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {photos.map((photo) => (
                <div
                  key={photo.ImageKey}
                  onClick={() => togglePhotoSelection(photo.ImageKey)}
                  className={`bg-white border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                    selectedPhotos.has(photo.ImageKey)
                      ? 'ring-4 ring-blue-600 border-blue-600 shadow-xl'
                      : 'border-gray-200 hover:shadow-lg hover:border-blue-300'
                  }`}
                >
                  <div className="aspect-square bg-gray-100">
                    <img
                      src={photo.ThumbnailUrl}
                      alt={photo.FileName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-2">
                    <p className="text-xs truncate text-gray-700">{photo.FileName}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
