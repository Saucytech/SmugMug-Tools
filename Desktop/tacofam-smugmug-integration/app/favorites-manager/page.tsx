'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Link2, Users, Heart, Trash2, Copy, Check, Eye, Upload, Image, LayoutGrid, LayoutList } from 'lucide-react';
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
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

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
    // Reverse the array to show most recent sessions at the top
    setSessions(allSessions.reverse());
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
      <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">

          {/* Instructions Banner */}
          <div className="mb-4 sm:mb-6 bg-pink-50 border border-pink-200 rounded-lg p-3 sm:p-4">
            <div className="flex items-start sm:items-center gap-2 sm:gap-3">
              <svg className="w-5 h-5 text-pink-600 flex-shrink-0 mt-0.5 sm:mt-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs sm:text-sm text-gray-800">
                <span className="font-semibold">How to use:</span> Create a session by selecting albums and customizing settings. Share the generated link with clients for photo selection. View and export their favorites anytime.
              </p>
            </div>
          </div>

          {/* Header - Mobile Optimized */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">Favorites Manager</h1>
              <p className="text-sm sm:text-base text-gray-600">Create sessions for customers to select their favorite photos</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* View Toggle */}
              {sessions.length > 0 && (
                <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('card')}
                    className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${
                      viewMode === 'card'
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    title="Card view"
                  >
                    <LayoutGrid className="w-4 h-4" />
                    <span className="hidden sm:inline text-sm font-medium">Card</span>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${
                      viewMode === 'list'
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    title="List view"
                  >
                    <LayoutList className="w-4 h-4" />
                    <span className="hidden sm:inline text-sm font-medium">List</span>
                  </button>
                </div>
              )}
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors min-h-[44px] font-semibold whitespace-nowrap"
              >
                <Plus className="w-5 h-5" />
                <span>New Session</span>
              </button>
            </div>
          </div>

        {/* Sessions List */}
        {sessions.length === 0 ? (
          <div className="text-center py-12 sm:py-20 px-4">
            <Heart className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">No Favorites Sessions Yet</h3>
            <p className="text-sm sm:text-base text-gray-500 mb-6">Create a session to let customers select their favorite photos</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors inline-flex items-center justify-center gap-2 min-h-[44px] font-semibold"
            >
              <Plus className="w-5 h-5" />
              <span>Create Your First Session</span>
            </button>
          </div>
        ) : viewMode === 'list' ? (
          /* List View - Compact */
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Session</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Albums</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Customers</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Favorites</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sessions.map((session) => (
                    <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900">{session.name}</span>
                          {session.description && (
                            <span className="text-sm text-gray-600 mt-1">{session.description}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {session.albumKeys.length}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-gray-900">{getTotalCustomers(session)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          <Heart className="w-4 h-4 text-pink-600" />
                          <span className="text-sm font-medium text-gray-900">{getTotalFavorites(session)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => copyLink(session.id)}
                            className="p-2 hover:bg-purple-100 rounded-lg transition-colors text-purple-600"
                            title="Copy link"
                          >
                            {copiedLink === session.id ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Link2 className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => router.push(`/favorites-manager/${session.id}`)}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-600"
                            title="View results"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSession(session.id)}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600"
                            title="Delete session"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Card View - Grid */
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session) => (
              <div key={session.id} className="bg-white rounded-xl p-4 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-gray-900 mb-1 truncate">{session.name}</h2>
                    {session.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{session.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteSession(session.id)}
                    className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600 flex-shrink-0"
                    title="Delete session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Stats */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                    {session.albumKeys.length} Album{session.albumKeys.length !== 1 ? 's' : ''}
                  </span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {getTotalCustomers(session)}
                  </span>
                  <span className="px-2 py-0.5 bg-pink-100 text-pink-700 text-xs font-semibold rounded-full flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    {getTotalFavorites(session)}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={() => copyLink(session.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg transition-colors text-sm font-medium"
                    title="Copy share link"
                  >
                    {copiedLink === session.id ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Link2 className="w-4 h-4" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => router.push(`/favorites-manager/${session.id}`)}
                    className="flex items-center justify-center gap-1.5 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg transition-colors text-sm font-medium"
                    title="View results"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Results</span>
                  </button>
                </div>

                {/* Customer List - Compact */}
                {Object.keys(session.customerFavorites).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Recent Customers:</p>
                    <div className="space-y-1.5">
                      {Object.entries(session.customerFavorites).slice(0, 2).map(([email, data]) => (
                        <div key={email} className="flex items-center justify-between text-xs">
                          <span className="font-medium text-gray-800 truncate flex-1">
                            {data.customerName || email}
                          </span>
                          <span className="text-blue-600 font-semibold ml-2">
                            {data.photoKeys.length}
                          </span>
                        </div>
                      ))}
                      {Object.keys(session.customerFavorites).length > 2 && (
                        <p className="text-xs text-gray-500 italic">
                          +{Object.keys(session.customerFavorites).length - 2} more...
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Create Session Modal - Mobile Optimized */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 overscroll-contain" onClick={() => setShowCreateModal(false)}>
            <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-4xl w-full h-[95vh] sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header - Sticky */}
              <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 sm:px-8 py-4 sm:py-6">
                {/* Mobile drag indicator */}
                <div className="flex sm:hidden justify-center mb-3">
                  <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Create Favorites Session</h2>
                    <p className="text-sm sm:text-base text-gray-600 mt-1">Select albums for customers to choose their favorites from</p>
                  </div>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="sm:hidden flex-shrink-0 p-2 hover:bg-gray-100 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label="Close modal"
                  >
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Content - Scrollable */}
              <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-8 -webkit-overflow-scrolling-touch">
                {/* Session Name */}
                <div className="mb-4 sm:mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="session-name">
                    Session Name *
                  </label>
                  <input
                    id="session-name"
                    type="text"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    placeholder="e.g., Wedding Photos Selection"
                    autoComplete="off"
                    className="w-full px-4 py-3 text-base sm:text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-900 min-h-[48px] touch-manipulation"
                  />
                </div>

                {/* Description */}
                <div className="mb-4 sm:mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="session-description">
                    Description (Optional)
                  </label>
                  <textarea
                    id="session-description"
                    value={sessionDescription}
                    onChange={(e) => setSessionDescription(e.target.value)}
                    placeholder="Instructions for your customers..."
                    rows={3}
                    className="w-full px-4 py-3 text-base sm:text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-900 resize-none min-h-[96px] touch-manipulation"
                  />
                </div>

                {/* Album Selection - Single column on mobile */}
                <div className="mb-4 sm:mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Select Albums * ({selectedAlbums.size} selected)
                  </label>
                  {loading ? (
                    <div className="text-center py-8 text-sm sm:text-base text-gray-500">Loading albums...</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 sm:max-h-96 overflow-y-auto touch-pan-y border-2 border-gray-200 rounded-lg p-3 sm:p-4 bg-gray-50">
                      {albums.map((album) => (
                        <button
                          key={album.AlbumKey}
                          onClick={() => toggleAlbum(album.AlbumKey)}
                          className={`p-4 sm:p-5 rounded-lg border-2 text-left transition-all min-h-[80px] touch-manipulation active:scale-[0.98] ${
                            selectedAlbums.has(album.AlbumKey)
                              ? 'border-purple-500 bg-purple-50 shadow-md'
                              : 'border-gray-200 hover:border-purple-300 bg-white'
                          }`}
                          aria-pressed={selectedAlbums.has(album.AlbumKey)}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-semibold text-sm sm:text-base text-gray-900 flex-1 break-words">{album.Name}</h3>
                            {selectedAlbums.has(album.AlbumKey) && (
                              <Check className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-gray-600">{album.ImageCount} photos</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Theme Selection - 3 columns on mobile */}
                <div className="mb-4 sm:mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Gallery Theme
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3">
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
                        className={`p-3 sm:p-4 rounded-lg border-2 text-center transition-all min-h-[88px] sm:min-h-[96px] touch-manipulation active:scale-95 ${
                          sessionTheme === theme.value
                            ? 'border-purple-500 ring-2 ring-purple-200 shadow-md'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        aria-label={`Select ${theme.name} theme`}
                        aria-pressed={sessionTheme === theme.value}
                      >
                        <div className={`w-full h-10 sm:h-12 ${theme.color} rounded-md mb-2`}></div>
                        <p className="text-xs sm:text-sm font-medium text-gray-700">{theme.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Buy Button Option */}
                <div className="mb-6">
                  <label className="flex items-center gap-3 cursor-pointer p-4 border-2 border-gray-200 rounded-lg hover:border-purple-300 transition-all min-h-[72px] touch-manipulation active:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={showBuyButton}
                      onChange={(e) => setShowBuyButton(e.target.checked)}
                      className="w-6 h-6 text-purple-600 rounded touch-manipulation flex-shrink-0"
                      aria-label="Enable buy button"
                    />
                    <div className="flex-1">
                      <p className="text-sm sm:text-base font-semibold text-gray-900">Enable "Buy" Button</p>
                      <p className="text-xs sm:text-sm text-gray-600">Allow customers to purchase photos directly from SmugMug</p>
                    </div>
                  </label>
                </div>

                {/* Logo Upload */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Branding Logo (Optional)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 sm:p-8 text-center hover:border-purple-400 transition-all touch-manipulation min-h-[160px] flex items-center justify-center">
                    {logoPreview ? (
                      <div className="space-y-3 w-full">
                        <div className="relative inline-block">
                          <img
                            src={logoPreview}
                            alt="Logo preview"
                            className="max-h-24 sm:max-h-32 mx-auto"
                          />
                          <button
                            onClick={() => {
                              setLogoUrl('');
                              setLogoPreview('');
                            }}
                            className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-2 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                            aria-label="Remove logo"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-500">Logo uploaded</p>
                      </div>
                    ) : (
                      <div className="w-full">
                        <Image className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-400 mb-3" />
                        <label className="cursor-pointer inline-block">
                          <span className="text-purple-600 hover:text-purple-700 font-semibold text-sm sm:text-base px-4 py-2 border-2 border-purple-600 rounded-lg inline-block hover:bg-purple-50 transition-colors min-h-[44px] flex items-center">Upload a logo</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/svg+xml"
                            onChange={handleLogoUpload}
                            className="hidden"
                            aria-label="Upload logo file"
                          />
                        </label>
                        <p className="text-xs sm:text-sm text-gray-500 mt-3">PNG, JPG, or SVG (max 2MB)</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer - Sticky */}
              <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-4 sm:px-8 py-4 sm:py-6 flex flex-col-reverse sm:flex-row gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-full sm:flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg transition-colors font-semibold min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSession}
                  disabled={!sessionName || selectedAlbums.size === 0}
                  className="w-full sm:flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-colors font-semibold min-h-[44px]"
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
