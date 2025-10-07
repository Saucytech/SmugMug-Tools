'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Heart, Check, Send, Mail, ShoppingCart } from 'lucide-react';
import { favoritesStorage, FavoriteSession } from '@/lib/favorites-storage';

interface Photo {
  ImageKey: string;
  FileName: string;
  Title?: string;
  Caption?: string;
  ThumbnailUrl: string;
  ArchivedUri?: string;
  AlbumName?: string;
  WebUri?: string;
}

// Theme color configurations
const themeConfig = {
  purple: {
    gradient: 'from-purple-600 to-purple-700',
    primary: 'purple-600',
    primaryHover: 'purple-700',
    primaryLight: 'purple-100',
    primaryDark: 'purple-200',
    ring: 'purple-300',
    accent: 'pink-500',
    accentFill: 'pink-400',
  },
  blue: {
    gradient: 'from-blue-600 to-blue-700',
    primary: 'blue-600',
    primaryHover: 'blue-700',
    primaryLight: 'blue-100',
    primaryDark: 'blue-200',
    ring: 'blue-300',
    accent: 'cyan-500',
    accentFill: 'cyan-400',
  },
  green: {
    gradient: 'from-green-600 to-green-700',
    primary: 'green-600',
    primaryHover: 'green-700',
    primaryLight: 'green-100',
    primaryDark: 'green-200',
    ring: 'green-300',
    accent: 'emerald-500',
    accentFill: 'emerald-400',
  },
  red: {
    gradient: 'from-red-600 to-red-700',
    primary: 'red-600',
    primaryHover: 'red-700',
    primaryLight: 'red-100',
    primaryDark: 'red-200',
    ring: 'red-300',
    accent: 'rose-500',
    accentFill: 'rose-400',
  },
  orange: {
    gradient: 'from-orange-600 to-orange-700',
    primary: 'orange-600',
    primaryHover: 'orange-700',
    primaryLight: 'orange-100',
    primaryDark: 'orange-200',
    ring: 'orange-300',
    accent: 'amber-500',
    accentFill: 'amber-400',
  },
  pink: {
    gradient: 'from-pink-600 to-pink-700',
    primary: 'pink-600',
    primaryHover: 'pink-700',
    primaryLight: 'pink-100',
    primaryDark: 'pink-200',
    ring: 'pink-300',
    accent: 'rose-500',
    accentFill: 'rose-400',
  },
  dark: {
    gradient: 'from-gray-900 to-gray-800',
    primary: 'gray-900',
    primaryHover: 'gray-800',
    primaryLight: 'gray-100',
    primaryDark: 'gray-200',
    ring: 'gray-600',
    accent: 'purple-500',
    accentFill: 'purple-400',
  },
};

export default function FavoritesSelectionPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<FavoriteSession | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  // Customer info
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [showSubmitForm, setShowSubmitForm] = useState(false);

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    const sessionData = favoritesStorage.getSession(sessionId);

    if (!sessionData) {
      setLoading(false);
      return;
    }

    setSession(sessionData);

    // Load photos from all albums in the session
    // Note: In a real app, you'd fetch this from SmugMug API
    // For demo, we'll simulate with sample data
    loadPhotosForSession(sessionData);
  };

  const loadPhotosForSession = async (sessionData: FavoriteSession) => {
    // Check if user is authenticated (owner viewing their own session)
    let isAuthenticated = false;
    try {
      const authCheck = await fetch('/api/smugmug/user', {
        credentials: 'include'
      });
      isAuthenticated = authCheck.ok;
    } catch (err) {
      isAuthenticated = false;
    }

    if (isAuthenticated) {
      // Owner has access - fetch real photos from SmugMug
      const allPhotos: Photo[] = [];

      for (const albumKey of sessionData.albumKeys) {
        try {
          const response = await fetch(`/api/smugmug/albums/${albumKey}/images`, {
            credentials: 'include'
          });

          if (response.ok) {
            const data = await response.json();
            const albumPhotos = data.images || [];
            allPhotos.push(...albumPhotos.map((p: any) => ({
              ...p,
              AlbumName: `Album ${albumKey}`,
            })));
          }
        } catch (err) {
          console.error(`Error loading album ${albumKey}:`, err);
        }
      }

      setPhotos(allPhotos);
    } else {
      // Customer view - no auth, show placeholder message
      // In production, you'd want to make photos publicly accessible or use signed URLs
      setPhotos([]);
    }

    setLoading(false);
  };

  const toggleFavorite = (photoKey: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(photoKey)) {
      newFavorites.delete(photoKey);
    } else {
      newFavorites.add(photoKey);
    }
    setFavorites(newFavorites);
  };

  const handleSubmit = () => {
    if (!customerEmail || favorites.size === 0) return;

    favoritesStorage.addCustomerFavorites(
      sessionId,
      customerEmail,
      Array.from(favorites),
      customerName
    );

    setSubmitted(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <Heart className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Session Not Found</h1>
          <p className="text-gray-600">This favorites session doesn't exist or has been deleted.</p>
        </div>
      </div>
    );
  }

  // Get theme colors
  const theme = themeConfig[session?.theme || 'purple'];

  if (submitted) {
    return (
      <div className={`min-h-screen bg-gradient-to-b from-${theme.primaryLight} to-white flex items-center justify-center p-8`}>
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Thank You!</h1>
          <p className="text-lg text-gray-600 mb-2">
            Your {favorites.size} favorite{favorites.size !== 1 ? 's have' : ' has'} been submitted.
          </p>
          <p className="text-sm text-gray-500">
            The photographer will review your selections.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className={`bg-gradient-to-r ${theme.gradient} text-white py-12 px-8`}>
        <div className="max-w-7xl mx-auto">
          {/* Logo */}
          {session.logoUrl ? (
            <img
              src={session.logoUrl}
              alt="Logo"
              className="h-16 mb-6 max-w-xs object-contain"
            />
          ) : (
            <Heart className="w-12 h-12 mb-4" />
          )}
          <h1 className="text-4xl font-bold mb-3">{session.name}</h1>
          {session.description && (
            <p className={`text-xl text-${theme.primaryLight} mb-4`}>{session.description}</p>
          )}
          <p className={`text-${theme.primaryDark}`}>
            Select your favorite photos • {photos.length} photos available
          </p>
        </div>
      </div>

      {/* Floating Selection Bar */}
      {favorites.size > 0 && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white rounded-full shadow-2xl px-6 py-4 flex items-center gap-6 z-50">
          <div className="flex items-center gap-2">
            <Heart className={`w-5 h-5 text-${theme.accentFill} fill-${theme.accentFill}`} />
            <span className="font-semibold">{favorites.size} favorite{favorites.size !== 1 ? 's' : ''} selected</span>
          </div>

          <div className="h-6 w-px bg-gray-700" />

          <button
            onClick={() => setShowSubmitForm(true)}
            className={`bg-${theme.primary} hover:bg-${theme.primaryHover} px-6 py-2 rounded-lg font-semibold transition-colors`}
          >
            Submit Selections
          </button>
        </div>
      )}

      {/* Photos Grid */}
      <div className="max-w-7xl mx-auto p-8">
        {photos.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500">
              This is a customer-facing favorites selector.
              <br />
              Photos will be visible to customers via public sharing settings.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo) => {
              const isFavorite = favorites.has(photo.ImageKey);
              return (
                <div key={photo.ImageKey} className="relative">
                  <button
                    onClick={() => toggleFavorite(photo.ImageKey)}
                    className={`group relative aspect-square overflow-hidden rounded-lg transition-all w-full ${
                      isFavorite
                        ? `ring-4 ring-${theme.accent}`
                        : `hover:ring-4 hover:ring-${theme.ring}`
                    }`}
                  >
                    <img
                      src={photo.ThumbnailUrl}
                      alt={photo.Title || photo.FileName}
                      className={`w-full h-full object-cover transition-all ${
                        isFavorite ? 'opacity-90' : 'group-hover:opacity-90'
                      }`}
                    />

                    {/* Heart Overlay */}
                    <div className={`absolute top-3 right-3 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isFavorite
                        ? `bg-${theme.accent}`
                        : 'bg-white/80 backdrop-blur-sm'
                    }`}>
                      <Heart
                        className={`w-6 h-6 ${
                          isFavorite ? 'text-white fill-white' : 'text-gray-700'
                        }`}
                      />
                    </div>

                    {/* Title overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                      <p className="text-white text-sm font-semibold truncate">
                        {photo.Title || photo.Caption || photo.FileName}
                      </p>
                    </div>
                  </button>

                  {/* Buy Button */}
                  {session.showBuyButton && photo.WebUri && (
                    <a
                      href={photo.WebUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`mt-2 w-full flex items-center justify-center gap-2 bg-${theme.primary} hover:bg-${theme.primaryHover} text-white px-3 py-2 rounded-lg transition-colors text-sm font-semibold`}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Buy This Photo
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Submit Form Modal */}
      {showSubmitForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowSubmitForm(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-8" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Submit Your Favorites</h2>
            <p className="text-gray-600 mb-6">
              You've selected {favorites.size} photo{favorites.size !== 1 ? 's' : ''}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Your Name (Optional)
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSubmitForm(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg transition-colors font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!customerEmail || favorites.size === 0}
                className={`flex-1 bg-${theme.primary} hover:bg-${theme.primaryHover} disabled:bg-${theme.primaryLight} text-white px-6 py-3 rounded-lg transition-colors font-semibold flex items-center justify-center gap-2`}
              >
                <Send className="w-5 h-5" />
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
