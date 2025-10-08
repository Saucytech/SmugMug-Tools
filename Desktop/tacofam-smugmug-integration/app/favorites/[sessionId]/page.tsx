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

// Theme color configurations with actual hex values for inline styles
const themeConfig = {
  purple: {
    gradientClass: 'from-purple-600 to-purple-700',
    gradientFrom: '#9333ea',
    gradientTo: '#7e22ce',
    primary: '#9333ea',
    primaryHover: '#7e22ce',
    primaryLight: '#f3e8ff',
    primaryDark: '#e9d5ff',
    ring: '#d8b4fe',
    accent: '#ec4899',
    accentFill: '#f472b6',
  },
  blue: {
    gradientClass: 'from-blue-600 to-blue-700',
    gradientFrom: '#2563eb',
    gradientTo: '#1d4ed8',
    primary: '#2563eb',
    primaryHover: '#1d4ed8',
    primaryLight: '#dbeafe',
    primaryDark: '#bfdbfe',
    ring: '#93c5fd',
    accent: '#06b6d4',
    accentFill: '#22d3ee',
  },
  green: {
    gradientClass: 'from-green-600 to-green-700',
    gradientFrom: '#16a34a',
    gradientTo: '#15803d',
    primary: '#16a34a',
    primaryHover: '#15803d',
    primaryLight: '#dcfce7',
    primaryDark: '#bbf7d0',
    ring: '#86efac',
    accent: '#10b981',
    accentFill: '#34d399',
  },
  red: {
    gradientClass: 'from-red-600 to-red-700',
    gradientFrom: '#dc2626',
    gradientTo: '#b91c1c',
    primary: '#dc2626',
    primaryHover: '#b91c1c',
    primaryLight: '#fee2e2',
    primaryDark: '#fecaca',
    ring: '#fca5a5',
    accent: '#f43f5e',
    accentFill: '#fb7185',
  },
  orange: {
    gradientClass: 'from-orange-600 to-orange-700',
    gradientFrom: '#ea580c',
    gradientTo: '#c2410c',
    primary: '#ea580c',
    primaryHover: '#c2410c',
    primaryLight: '#ffedd5',
    primaryDark: '#fed7aa',
    ring: '#fdba74',
    accent: '#f59e0b',
    accentFill: '#fbbf24',
  },
  pink: {
    gradientClass: 'from-pink-600 to-pink-700',
    gradientFrom: '#db2777',
    gradientTo: '#be185d',
    primary: '#db2777',
    primaryHover: '#be185d',
    primaryLight: '#fce7f3',
    primaryDark: '#fbcfe8',
    ring: '#f9a8d4',
    accent: '#f43f5e',
    accentFill: '#fb7185',
  },
  dark: {
    gradientClass: 'from-gray-900 to-gray-800',
    gradientFrom: '#111827',
    gradientTo: '#1f2937',
    primary: '#111827',
    primaryHover: '#1f2937',
    primaryLight: '#f3f4f6',
    primaryDark: '#e5e7eb',
    ring: '#4b5563',
    accent: '#a855f7',
    accentFill: '#c084fc',
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
    } catch (_err) {
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
        } catch (_err) {
          console.error(`Error loading album ${albumKey}:`, _err);
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
      <div
        className="min-h-screen bg-gradient-to-b flex items-center justify-center p-4 sm:p-8"
        style={{
          backgroundImage: `linear-gradient(to bottom, ${theme.primaryLight}, white)`
        }}
      >
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Thank You!</h1>
          <p className="text-base sm:text-lg text-gray-600 mb-2">
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
      <div
        className={`bg-gradient-to-r ${theme.gradientClass} text-white py-8 sm:py-12 px-4 sm:px-8`}
      >
        <div className="max-w-7xl mx-auto">
          {/* Logo */}
          {session.logoUrl ? (
            <img
              src={session.logoUrl}
              alt="Logo"
              className="h-12 sm:h-16 mb-4 sm:mb-6 max-w-xs object-contain"
            />
          ) : (
            <Heart className="w-10 h-10 sm:w-12 sm:h-12 mb-4" />
          )}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3">{session.name}</h1>
          {session.description && (
            <p className="text-lg sm:text-xl mb-4 opacity-90">{session.description}</p>
          )}
          <p className="text-sm sm:text-base opacity-80">
            Select your favorite photos • {photos.length} photos available
          </p>
        </div>
      </div>

      {/* Floating Selection Bar - Responsive */}
      {favorites.size > 0 && (
        <div className="fixed bottom-4 sm:bottom-8 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 bg-gray-900 text-white rounded-full shadow-2xl px-4 sm:px-6 py-3 sm:py-4 z-50 max-w-md sm:max-w-xl mx-auto">
          <div className="flex items-center justify-between sm:justify-center gap-3 sm:gap-6">
            <div className="flex items-center gap-2 min-w-0 flex-shrink">
              <Heart
                className="w-5 h-5 flex-shrink-0"
                style={{ color: theme.accentFill, fill: theme.accentFill }}
              />
              <span className="font-semibold text-sm sm:text-base truncate">
                {favorites.size} selected
              </span>
            </div>

            <div className="h-6 w-px bg-gray-700 hidden sm:block flex-shrink-0" />

            <button
              onClick={() => setShowSubmitForm(true)}
              className="px-4 sm:px-6 py-2 rounded-lg font-semibold transition-colors flex-shrink-0 text-sm sm:text-base"
              style={{
                backgroundColor: theme.primary
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.primaryHover}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.primary}
            >
              Submit
            </button>
          </div>
        </div>
      )}

      {/* Photos Grid */}
      <div className="max-w-7xl mx-auto p-4 sm:p-8">
        {photos.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-sm sm:text-base">
              This is a customer-facing favorites selector.
              <br />
              Photos will be visible to customers via public sharing settings.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {photos.map((photo) => {
              const isFavorite = favorites.has(photo.ImageKey);
              return (
                <div key={photo.ImageKey} className="relative">
                  <button
                    onClick={() => toggleFavorite(photo.ImageKey)}
                    aria-label={`${isFavorite ? 'Remove from' : 'Add to'} favorites: ${photo.Title || photo.FileName}`}
                    aria-pressed={isFavorite}
                    className="group relative aspect-square overflow-hidden rounded-lg transition-all w-full ring-4"
                    style={{
                      ringColor: isFavorite ? theme.accent : 'transparent'
                    }}
                  >
                    <img
                      src={photo.ThumbnailUrl}
                      alt={photo.Title || photo.FileName}
                      loading="lazy"
                      className={`w-full h-full object-cover transition-all ${
                        isFavorite ? 'opacity-90' : 'group-hover:opacity-90'
                      }`}
                    />

                    {/* Heart Overlay - Larger touch target (48x48px) */}
                    <div
                      className="absolute top-2 right-2 z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all"
                      style={{
                        backgroundColor: isFavorite ? theme.accent : 'rgba(255, 255, 255, 0.8)',
                        backdropFilter: isFavorite ? 'none' : 'blur(4px)'
                      }}
                    >
                      <Heart
                        className={`w-7 h-7 ${
                          isFavorite ? 'text-white fill-white' : 'text-gray-700'
                        }`}
                      />
                    </div>

                    {/* Title overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 sm:p-3">
                      <p className="text-white text-xs sm:text-sm font-semibold truncate">
                        {photo.Title || photo.Caption || photo.FileName}
                      </p>
                    </div>
                  </button>

                  {/* Buy Button - Larger touch target */}
                  {session.showBuyButton && photo.WebUri && (
                    <a
                      href={photo.WebUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 w-full flex items-center justify-center gap-2 text-white px-3 py-3 rounded-lg transition-colors text-xs sm:text-sm font-semibold min-h-[44px]"
                      style={{
                        backgroundColor: theme.primary
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.primaryHover}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.primary}
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

      {/* Submit Form Modal - Mobile Optimized */}
      {showSubmitForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowSubmitForm(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Submit Your Favorites</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-6">
              You've selected {favorites.size} photo{favorites.size !== 1 ? 's' : ''}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="customer-name">
                  Your Name (Optional)
                </label>
                <input
                  id="customer-name"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="John Doe"
                  autoComplete="name"
                  autoCapitalize="words"
                  className="w-full px-4 py-4 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="customer-email">
                  Email Address *
                </label>
                <input
                  id="customer-email"
                  type="email"
                  inputMode="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="your@email.com"
                  autoComplete="email"
                  autoCapitalize="none"
                  required
                  className="w-full px-4 py-4 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                onClick={() => setShowSubmitForm(false)}
                className="w-full sm:flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg transition-colors font-semibold min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!customerEmail || favorites.size === 0}
                className="w-full sm:flex-1 text-white px-6 py-3 rounded-lg transition-colors font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                style={{
                  backgroundColor: !customerEmail || favorites.size === 0 ? theme.primaryLight : theme.primary
                }}
                onMouseEnter={(e) => {
                  if (customerEmail && favorites.size > 0) {
                    e.currentTarget.style.backgroundColor = theme.primaryHover;
                  }
                }}
                onMouseLeave={(e) => {
                  if (customerEmail && favorites.size > 0) {
                    e.currentTarget.style.backgroundColor = theme.primary;
                  }
                }}
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
