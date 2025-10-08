'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Users, Heart, Download, Mail, Trophy } from 'lucide-react';
import { favoritesStorage, FavoriteSession } from '@/lib/favorites-storage';
import ToolboxHeader from '@/components/ToolboxHeader';

interface PhotoWithVotes {
  ImageKey: string;
  FileName: string;
  Title?: string;
  Caption?: string;
  ThumbnailUrl: string;
  votes: number;
  votedBy: Array<{ email: string; name?: string }>;
}

export default function FavoritesResultsPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<FavoriteSession | null>(null);
  const [photos, setPhotos] = useState<PhotoWithVotes[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'votes' | 'recent'>('votes');

  useEffect(() => {
    checkAuthAndLoad();
  }, [sessionId, router]);

  const checkAuthAndLoad = async () => {
    try {
      const authCheck = await fetch('/api/smugmug/user', {
        credentials: 'include'
      });

      if (!authCheck.ok) {
        console.error('Favorites Manager: Not authenticated');
        router.push('/');
        return;
      }

      loadSessionResults();
    } catch (_error) {
      console.error('Favorites Manager: Auth check failed:', _error);
      router.push('/');
    }
  };

  const loadSessionResults = async () => {
    const sessionData = favoritesStorage.getSession(sessionId);

    if (!sessionData) {
      setLoading(false);
      return;
    }

    setSession(sessionData);

    // Load photos and count votes
    const allPhotos: Map<string, PhotoWithVotes> = new Map();

    for (const albumKey of sessionData.albumKeys) {
      try {
        const response = await fetch(`/api/smugmug/albums/${albumKey}/images`, {
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          const albumPhotos = data.images || [];

          albumPhotos.forEach((photo: any) => {
            allPhotos.set(photo.ImageKey, {
              ...photo,
              votes: 0,
              votedBy: [],
            });
          });
        }
      } catch (_err) {
        console.error(`Error loading album ${albumKey}:`, _err);
      }
    }

    // Count votes from customer favorites
    Object.entries(sessionData.customerFavorites).forEach(([email, customer]) => {
      customer.photoKeys.forEach((photoKey) => {
        const photo = allPhotos.get(photoKey);
        if (photo) {
          photo.votes++;
          photo.votedBy.push({
            email,
            name: customer.customerName,
          });
        }
      });
    });

    // Convert to array and filter out photos with no votes
    const photosArray = Array.from(allPhotos.values()).filter(p => p.votes > 0);
    setPhotos(photosArray);
    setLoading(false);
  };

  const sortedPhotos = [...photos].sort((a, b) => {
    if (sortBy === 'votes') {
      return b.votes - a.votes;
    }
    return 0;
  });

  const getTopPhotos = () => sortedPhotos.slice(0, 10);

  const exportResults = () => {
    const csv = [
      ['Photo', 'Votes', 'Customers'],
      ...sortedPhotos.map(p => [
        p.Title || p.FileName,
        p.votes,
        p.votedBy.map(v => v.name || v.email).join('; ')
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `favorites-${session?.name.replace(/\s+/g, '-')}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading results...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Session Not Found</h1>
          <button
            onClick={() => router.push('/favorites-manager')}
            className="text-purple-600 hover:underline"
          >
            ← Back to Favorites Manager
          </button>
        </div>
      </div>
    );
  }

  const totalCustomers = Object.keys(session.customerFavorites).length;
  const totalVotes = photos.reduce((sum, p) => sum + p.votes, 0);

  return (
    <>
      <ToolboxHeader currentTool="favorites" />
      <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header - Mobile Optimized */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <button
                  onClick={() => router.push('/favorites-manager')}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Back to Favorites Manager"
                >
                  <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 truncate">{session.name}</h1>
              </div>
              <p className="text-sm sm:text-base text-gray-600 ml-12 sm:ml-14">Favorites Results</p>
            </div>
          <button
            onClick={exportResults}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors min-h-[44px] font-semibold"
          >
            <Download className="w-5 h-5" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-4 rounded-xl">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Customers</p>
                <p className="text-3xl font-bold text-gray-900">{totalCustomers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="bg-pink-100 p-4 rounded-xl">
                <Heart className="w-8 h-8 text-pink-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Favorites</p>
                <p className="text-3xl font-bold text-gray-900">{totalVotes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="bg-purple-100 p-4 rounded-xl">
                <Trophy className="w-8 h-8 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Most Popular</p>
                <p className="text-xl font-bold text-gray-900 truncate">
                  {sortedPhotos[0]?.votes || 0} votes
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        {photos.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Favorites Yet</h3>
            <p className="text-gray-500">Share the session link with customers to start collecting favorites</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Top Photos</h2>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'votes' | 'recent')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="votes">Sort by Votes</option>
                <option value="recent">Most Recent</option>
              </select>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
              {sortedPhotos.map((photo, index) => (
                <div key={photo.ImageKey} className="bg-white rounded-xl overflow-hidden shadow-lg border border-gray-200 hover:shadow-xl transition-all">
                  <div className="relative aspect-square">
                    <img
                      src={photo.ThumbnailUrl}
                      alt={photo.Title || photo.FileName}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                    {index < 3 && (
                      <div className="absolute top-2 sm:top-3 left-2 sm:left-3 bg-yellow-500 text-white w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm sm:text-base shadow-lg">
                        #{index + 1}
                      </div>
                    )}
                    <div className="absolute top-2 sm:top-3 right-2 sm:right-3 bg-pink-500 text-white px-2 sm:px-3 py-1 rounded-full flex items-center gap-1 font-semibold text-xs sm:text-sm shadow-lg">
                      <Heart className="w-3 h-3 sm:w-4 sm:h-4 fill-white" />
                      {photo.votes}
                    </div>
                  </div>
                  <div className="p-3 sm:p-4">
                    <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-2 truncate">
                      {photo.Title || photo.FileName}
                    </h3>
                    <div className="text-xs text-gray-500">
                      <p className="font-semibold mb-1">Favorited by:</p>
                      <div className="space-y-1 max-h-20 overflow-y-auto touch-pan-y">
                        {photo.votedBy.map((customer, i) => (
                          <div key={i} className="flex items-center gap-1">
                            <Mail className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{customer.name || customer.email}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Customer List - Responsive Table/Cards */}
        {totalCustomers > 0 && (
          <div className="mt-8 sm:mt-12">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Customer Submissions</h2>
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              {/* Desktop: Table */}
              <table className="hidden md:table w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Customer</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Email</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Favorites</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {Object.entries(session.customerFavorites).map(([email, customer]) => (
                    <tr key={email} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{customer.customerName || 'Anonymous'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{email}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-pink-100 text-pink-700 text-sm font-semibold rounded-full">
                          {customer.photoKeys.length} photos
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(customer.selectedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile: Card-based layout */}
              <div className="md:hidden divide-y divide-gray-200">
                {Object.entries(session.customerFavorites).map(([email, customer]) => (
                  <div key={email} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 mb-1">
                          {customer.customerName || 'Anonymous'}
                        </div>
                        <div className="text-sm text-gray-600 truncate">{email}</div>
                      </div>
                      <span className="px-3 py-1 bg-pink-100 text-pink-700 text-sm font-semibold rounded-full whitespace-nowrap flex-shrink-0">
                        {customer.photoKeys.length} photos
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <span className="font-medium">Submitted:</span>
                      <span>{new Date(customer.selectedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
