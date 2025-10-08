'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Link2, Users, Heart, Trash2, Copy, Check, Eye, Upload, Image } from 'lucide-react';
import { tokenStorage, smugmugApi } from '@/lib/smugmug-client';
import { favoritesStorage, FavoriteSession } from '@/lib/favorites-storage';
import ToolboxHeader from '@/components/ToolboxHeader';

interface Album {
  AlbumKey: string;
  Name: string;
  ImageCount: number;
}

export default function FavoritesManagerPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<FavoriteSession[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(false);

  // Create session form
  const [sessionName, setSessionName] = useState('');
  const [sessionDescription, setSessionDescription] = useState('');
  const [selectedAlbums, setSelectedAlbums] = useState<Set<string>>(new Set());
  const [sessionTheme, setSessionTheme] = useState<'purple' | 'blue' | 'green' | 'red' | 'orange' | 'pink' | 'dark'>('purple');
  const [showBuyButton, setShowBuyButton] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  useEffect(() => {
    // Check auth via API call to verify cookies
    const checkAuthAndLoad = async () => {
      try {
        const response = await fetch('/api/smugmug/user', {
          credentials: 'include',
        });

        if (!response.ok) {
          console.error('[Favorites Manager] Authentication failed, redirecting to home');
          router.push('/');
          return;
        }

        console.log('[Favorites Manager] Authentication verified, loading data');

        // Load sessions
        loadSessions();

        // Load albums
        loadAlbums();
      } catch (_error) {
        console.error('[Favorites Manager] Auth check failed:', _error);
        router.push('/');
      }
    };

    checkAuthAndLoad();
  }, [router]);

  const loadSessions = () => {
    const allSessions = favoritesStorage.getAllSessions();
    setSessions(allSessions);
  };

  const loadAlbums = async () => {
    setLoading(true);
    try {
      const data = await smugmugApi.getAlbums();
      setAlbums(data.albums || []);
    } catch (_err) {
      console.error('Error loading albums:', _err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = () => {
    if (!sessionName || selectedAlbums.size === 0) return;

    const session = favoritesStorage.createSession({
      name: sessionName,
      description: sessionDescription,
      albumKeys: Array.from(selectedAlbums),
      theme: sessionTheme,
      showBuyButton: showBuyButton,
      logoUrl: logoUrl || undefined,
    });

    loadSessions();
    setShowCreateModal(false);
    setSessionName('');
    setSessionDescription('');
    setSelectedAlbums(new Set());
    setSessionTheme('purple');
    setShowBuyButton(false);
    setLogoUrl('');
    setLogoPreview('');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('Logo file must be less than 2MB');
        return;
      }

      // Convert to base64 for storage
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setLogoUrl(base64String);
        setLogoPreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteSession = (id: string) => {
    if (confirm('Delete this favorites session? All customer selections will be lost.')) {
      favoritesStorage.deleteSession(id);
      loadSessions();
    }
  };

  const copyLink = (sessionId: string) => {
    const link = favoritesStorage.generateLink(sessionId);
    navigator.clipboard.writeText(link);
    setCopiedLink(sessionId);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const toggleAlbum = (albumKey: string) => {
    const newSelection = new Set(selectedAlbums);
    if (newSelection.has(albumKey)) {
      newSelection.delete(albumKey);
    } else {
      newSelection.add(albumKey);
    }
    setSelectedAlbums(newSelection);
  };

  const getTotalCustomers = (session: FavoriteSession) => {
    return Object.keys(session.customerFavorites).length;
  };

  const getTotalFavorites = (session: FavoriteSession) => {
    return Object.values(session.customerFavorites).reduce(
      (sum, customer) => sum + customer.photoKeys.length,
      0
    );
  };

  return (
    <>
      <ToolboxHeader currentTool="favorites" />
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">

          {/* Instructions Banner */}
          <div className="mb-6 bg-pink-50 border border-pink-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-gray-800">
                <span className="font-semibold">How to use:</span> Create a session by selecting albums and customizing settings. Share the generated link with clients for photo selection. View and export their favorites anytime.
              </p>
            </div>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Favorites Manager</h1>
              <p className="text-gray-600">Create sessions for customers to select their favorite photos</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Favorites Session
            </button>
          </div>

        {/* Sessions List */}
        {sessions.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Favorites Sessions Yet</h3>
            <p className="text-gray-500 mb-6">Create a session to let customers select their favorite photos</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Your First Session
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {sessions.map((session) => (
              <div key={session.id} className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{session.name}</h2>
                    {session.description && (
                      <p className="text-gray-600 mb-3">{session.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-semibold rounded-full">
                        {session.albumKeys.length} Album{session.albumKeys.length !== 1 ? 's' : ''}
                      </span>
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {getTotalCustomers(session)} Customer{getTotalCustomers(session) !== 1 ? 's' : ''}
                      </span>
                      <span className="px-3 py-1 bg-pink-100 text-pink-700 text-sm font-semibold rounded-full flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        {getTotalFavorites(session)} Favorite{getTotalFavorites(session) !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteSession(session.id)}
                    className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600"
                    title="Delete session"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => copyLink(session.id)}
                    className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg transition-colors font-semibold"
                  >
                    {copiedLink === session.id ? (
                      <>
                        <Check className="w-5 h-5" />
                        Link Copied!
                      </>
                    ) : (
                      <>
                        <Link2 className="w-5 h-5" />
                        Copy Share Link
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => router.push(`/favorites-manager/${session.id}`)}
                    className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg transition-colors font-semibold"
                  >
                    <Eye className="w-5 h-5" />
                    View Results
                  </button>
                </div>

                {/* Customer Details */}
                {Object.keys(session.customerFavorites).length > 0 && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Customer Selections:</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {Object.entries(session.customerFavorites).map(([email, data]) => (
                        <div key={email} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Users className="w-3 h-3 text-blue-600" />
                            <span className="font-medium text-gray-800">
                              {data.customerName || 'Unknown'}
                            </span>
                            <span className="text-gray-600">({email})</span>
                          </div>
                          <span className="text-blue-600 font-semibold">
                            {data.photoKeys.length} photos
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Customer Link Display */}
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Customer Link:</p>
                      <a
                        href={favoritesStorage.generateLink(session.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-700 underline break-all font-mono"
                      >
                        {favoritesStorage.generateLink(session.id)}
                      </a>
                    </div>
                    <button
                      onClick={() => window.open(favoritesStorage.generateLink(session.id), '_blank')}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors text-sm font-medium flex-shrink-0"
                      title="Preview customer view"
                    >
                      <Eye className="w-4 h-4" />
                      Preview
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Session Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCreateModal(false)}>
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6">
                <h2 className="text-2xl font-bold text-gray-900">Create Favorites Session</h2>
                <p className="text-gray-600 mt-1">Select albums for customers to choose their favorites from</p>
              </div>

              {/* Modal Content */}
              <div className="p-8">
                {/* Session Name */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Session Name *
                  </label>
                  <input
                    type="text"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    placeholder="e.g., Wedding Photos Selection"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                  />
                </div>

                {/* Description */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={sessionDescription}
                    onChange={(e) => setSessionDescription(e.target.value)}
                    placeholder="Instructions for your customers..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                  />
                </div>

                {/* Album Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Select Albums * ({selectedAlbums.size} selected)
                  </label>
                  {loading ? (
                    <div className="text-center py-8 text-gray-500">Loading albums...</div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4">
                      {albums.map((album) => (
                        <button
                          key={album.AlbumKey}
                          onClick={() => toggleAlbum(album.AlbumKey)}
                          className={`p-4 rounded-lg border-2 text-left transition-all ${
                            selectedAlbums.has(album.AlbumKey)
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:border-purple-300 bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-sm text-gray-900">{album.Name}</h3>
                            {selectedAlbums.has(album.AlbumKey) && (
                              <Check className="w-5 h-5 text-purple-600" />
                            )}
                          </div>
                          <p className="text-xs text-gray-600">{album.ImageCount} photos</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Theme Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Gallery Theme
                  </label>
                  <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
                    {[
                      { value: 'purple', color: 'bg-purple-600', name: 'Purple' },
                      { value: 'blue', color: 'bg-blue-600', name: 'Blue' },
                      { value: 'green', color: 'bg-green-600', name: 'Green' },
                      { value: 'red', color: 'bg-red-600', name: 'Red' },
                      { value: 'orange', color: 'bg-orange-600', name: 'Orange' },
                      { value: 'pink', color: 'bg-pink-600', name: 'Pink' },
                      { value: 'dark', color: 'bg-gray-900', name: 'Dark' },
                    ].map((theme) => (
                      <button
                        key={theme.value}
                        onClick={() => setSessionTheme(theme.value as any)}
                        className={`p-4 rounded-lg border-2 text-center transition-all ${
                          sessionTheme === theme.value
                            ? 'border-purple-500 ring-2 ring-purple-200'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className={`w-full h-12 ${theme.color} rounded-md mb-2`}></div>
                        <p className="text-xs font-medium text-gray-700">{theme.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Buy Button Option */}
                <div className="mb-6">
                  <label className="flex items-center gap-3 cursor-pointer p-4 border-2 border-gray-200 rounded-lg hover:border-purple-300 transition-all">
                    <input
                      type="checkbox"
                      checked={showBuyButton}
                      onChange={(e) => setShowBuyButton(e.target.checked)}
                      className="w-5 h-5 text-purple-600 rounded"
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Enable "Buy" Button</p>
                      <p className="text-xs text-gray-600">Allow customers to purchase photos directly from SmugMug</p>
                    </div>
                  </label>
                </div>

                {/* Logo Upload */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Branding Logo (Optional)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition-all">
                    {logoPreview ? (
                      <div className="space-y-3">
                        <div className="relative inline-block">
                          <img
                            src={logoPreview}
                            alt="Logo preview"
                            className="max-h-24 mx-auto"
                          />
                          <button
                            onClick={() => {
                              setLogoUrl('');
                              setLogoPreview('');
                            }}
                            className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <p className="text-xs text-gray-500">Logo uploaded</p>
                      </div>
                    ) : (
                      <div>
                        <Image className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                        <label className="cursor-pointer">
                          <span className="text-purple-600 hover:text-purple-700 font-semibold">Upload a logo</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/svg+xml"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                        </label>
                        <p className="text-xs text-gray-500 mt-2">PNG, JPG, or SVG (max 2MB)</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-8 py-6 flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSession}
                  disabled={!sessionName || selectedAlbums.size === 0}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white px-6 py-3 rounded-lg transition-colors font-semibold"
                >
                  Create Session
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </>
  );
}
