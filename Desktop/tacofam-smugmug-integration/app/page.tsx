'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { ImageIcon, FolderIcon, Book, Database, ShoppingCart, Code2, Wrench, Heart, Sparkles, Brain, Upload, ClipboardCheck } from 'lucide-react';
import { tokenStorage, smugmugApi } from '@/lib/smugmug-client';
import { useRouter, useSearchParams } from 'next/navigation';
import ToolboxHeader from '@/components/ToolboxHeader';
import { withRetry } from '@/lib/retry';
import { useSession, signOut } from 'next-auth/react';

interface Album {
  AlbumKey: string;
  Name: string;
  ImageCount: number;
  UrlName?: string;
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionChecking, setConnectionChecking] = useState(false);
  const [verificationAttempts, setVerificationAttempts] = useState(0);
  const [isConnectionVerified, setIsConnectionVerified] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [selectedAlbumsForEmbed, setSelectedAlbumsForEmbed] = useState<Set<string>>(new Set());
  const [embedWorkflowStep, setEmbedWorkflowStep] = useState<'select-albums' | 'select-photos' | 'generate-embed'>('select-albums');

  // Pagination, filtering, and sorting state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'count' | 'recent'>('name');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Initialize connection state from persisted flag or callback
  useEffect(() => {
    if (searchParams?.get('connected') === '1') {
      router.replace('/');
      setIsConnectionVerified(false);
      setVerificationAttempts(0);
      setConnectionError(null);
      tokenStorage.setConnected();
    } else if (tokenStorage.isConnected()) {
      setIsConnectionVerified(false);
      setVerificationAttempts(0);
      setConnectionError(null);
    }
  }, [router, searchParams]);

  const verifySmugMugConnection = useCallback(async () => {
    setVerificationAttempts((count) => count + 1);
    setConnectionChecking(true);
    setConnectionError(null);

    try {
      await withRetry(() => smugmugApi.verifyConnection(), {
        retries: 4,
        initialDelayMs: 400,
        backoffFactor: 1.8,
        onRetry: (attempt, retryError) => {
          console.warn('Retrying SmugMug connection check', {
            attempt,
            error: retryError,
          });
        },
      });
      setIsConnectionVerified(true);
      tokenStorage.setConnected();
    } catch (err) {
      console.error('Unable to confirm SmugMug connection', err);
      setConnectionError('We could not confirm your SmugMug connection. Please try reconnecting.');
      setIsConnectionVerified(false);
    } finally {
      setConnectionChecking(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || isConnectionVerified || connectionChecking || verificationAttempts > 0) {
      return;
    }

    verifySmugMugConnection();
  }, [isAuthenticated, isConnectionVerified, connectionChecking, verificationAttempts, verifySmugMugConnection]);

  const handleAuth = () => {
    window.location.href = '/api/auth/smugmug';
  };

  const handleLogout = () => {
    tokenStorage.clearTokens();
    // Clear photo organizer index when logging out
    localStorage.removeItem('photo-organizer-index');
    signOut({ callbackUrl: '/' });
    setIsConnectionVerified(false);
    setVerificationAttempts(0);
    setConnectionError(null);
    setAlbums([]);
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

  // Auto-load albums when Embed & Sell tool is selected
  useEffect(() => {
    if (selectedTool === 'embed-sell') {
      // Reset workflow to first step
      setEmbedWorkflowStep('select-albums');
      setSelectedAlbumsForEmbed(new Set());

      // Auto-load albums
      if (albums.length === 0 && !loading) {
        fetchAlbums();
      }
    }
  }, [selectedTool]);

  // Filter albums by search term
  const filteredAlbums = albums.filter((album) =>
    album.Name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort albums
  const sortedAlbums = [...filteredAlbums].sort((a, b) => {
    if (sortBy === 'name') {
      return a.Name.localeCompare(b.Name);
    } else if (sortBy === 'count') {
      return b.ImageCount - a.ImageCount;
    }
    // 'recent' - no sorting, keep original order (assumes API returns recent first)
    return 0;
  });

  // Paginate albums
  const totalPages = Math.ceil(sortedAlbums.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAlbums = sortedAlbums.slice(startIndex, startIndex + itemsPerPage);


  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-gray-900 to-gray-800 text-white">
        <div className="text-center max-w-2xl">
          <Wrench className="w-20 h-20 mx-auto mb-6 text-purple-400" />
          <h1 className="text-5xl font-bold mb-4">Smugtools</h1>
          <p className="text-xl mb-8 text-gray-300">
            Professional SmugMug Tools for Photographers
          </p>
          <a
            href="/auth/signin"
            className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-colors shadow-lg hover:shadow-xl"
          >
            Sign In
          </a>
        </div>
      </main>
    );
  }

  if (!isConnectionVerified) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50 text-gray-900">
        <div className="max-w-xl w-full bg-white shadow-xl rounded-2xl p-8 text-center">
          <Wrench className="w-16 h-16 text-purple-600 mx-auto mb-4" />
          <h1 className="text-3xl font-semibold mb-2">
            {connectionChecking ? 'Finalizing SmugMug Connection' : 'SmugMug Connection Required'}
          </h1>
          <p className="text-gray-600 mb-6">
            {connectionChecking
              ? 'Hang tight while we confirm your SmugMug connection. This can take a few seconds.'
              : connectionError || 'We could not confirm your SmugMug connection. Please try again.'}
          </p>
          <div className="flex flex-col gap-3 items-center">
            <button
              onClick={handleAuth}
              disabled={connectionChecking}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Connect SmugMug Account
            </button>
            {verificationAttempts > 0 && (
              <button
                onClick={verifySmugMugConnection}
                disabled={connectionChecking}
                className="bg-gray-500 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
              >
                {connectionChecking ? 'Checking Connection…' : 'Retry Connection Check'}
              </button>
            )}
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </main>
    );
  }

  // If no tool selected, show toolbox dashboard
  if (!selectedTool) {
    return (
      <>
        <ToolboxHeader />
        <main className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-7xl mx-auto">
            {/* Welcome Section */}
            <div className="mb-12 text-center">
              <Wrench className="w-16 h-16 text-purple-600 mx-auto mb-4" />
              <h1 className="text-5xl font-bold text-gray-900 mb-3">SmugMug Toolbox</h1>
              <p className="text-xl text-gray-600">Professional tools to enhance your SmugMug workflow</p>
            </div>

          {/* Tools Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Embed and Sell Tool */}
            <button
              onClick={() => setSelectedTool('embed-sell')}
              className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all border-2 border-gray-200 hover:border-purple-500 text-left"
            >
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShoppingCart className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Embed & Sell</h2>
              <p className="text-gray-600 mb-4">
                Create beautiful embeddable galleries with buy buttons. Perfect for selling photos on your own website.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">Multi-select</span>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">3 Layouts</span>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">Buy Buttons</span>
              </div>
              <div className="mt-6 text-purple-600 font-semibold flex items-center gap-2">
                Launch Tool
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </button>

            {/* Favorites Selector Tool */}
            <button
              onClick={() => router.push('/favorites-manager')}
              className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all border-2 border-gray-200 hover:border-pink-500 text-left"
            >
              <div className="bg-gradient-to-br from-pink-500 to-pink-600 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Favorites Selector</h2>
              <p className="text-gray-600 mb-4">
                Let customers select their favorite photos from your albums. Perfect for client galleries and photo approvals.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-pink-100 text-pink-700 text-xs font-semibold rounded-full">Shareable Links</span>
                <span className="px-3 py-1 bg-pink-100 text-pink-700 text-xs font-semibold rounded-full">Vote Tracking</span>
                <span className="px-3 py-1 bg-pink-100 text-pink-700 text-xs font-semibold rounded-full">Results Dashboard</span>
              </div>
              <div className="mt-6 text-pink-600 font-semibold flex items-center gap-2">
                Launch Tool
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </button>

            {/* MetaData Monster Tool */}
            <button
              onClick={() => router.push('/metadata-monster')}
              className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all border-2 border-gray-200 hover:border-green-500 text-left"
            >
              <div className="bg-gradient-to-br from-green-500 to-green-600 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Code2 className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">MetaData Monster</h2>
              <p className="text-gray-600 mb-4">
                AI-powered automatic Title, Caption, and Keyword generator. Bulk process your entire photo library in minutes.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">AI-Powered</span>
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">Bulk Processing</span>
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">Auto-Save</span>
              </div>
              <div className="mt-6 text-green-600 font-semibold flex items-center gap-2">
                Launch Tool
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </button>

            {/* AI Gallery Creator Tool */}
            <button
              onClick={() => router.push('/ai-gallery-creator')}
              className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all border-2 border-gray-200 hover:border-teal-500 text-left"
            >
              <div className="bg-gradient-to-br from-teal-500 to-cyan-600 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">AI Gallery Creator</h2>
              <p className="text-gray-600 mb-4">
                Chat with AI to create complex folder and gallery structures automatically. Build your entire SmugMug organization in minutes.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-teal-100 text-teal-700 text-xs font-semibold rounded-full">AI Chatbot</span>
                <span className="px-3 py-1 bg-teal-100 text-teal-700 text-xs font-semibold rounded-full">Nested Folders</span>
                <span className="px-3 py-1 bg-teal-100 text-teal-700 text-xs font-semibold rounded-full">Bulk Creation</span>
              </div>
              <div className="mt-6 text-teal-600 font-semibold flex items-center gap-2">
                Launch Tool
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </button>

            {/* Photo Organizer Tool */}
            <button
              onClick={() => router.push('/photo-organizer')}
              className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all border-2 border-gray-200 hover:border-indigo-500 text-left"
            >
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Photo Organizer</h2>
              <p className="text-gray-600 mb-4">
                AI-powered photo organization with smart gallery indexing. Build an index once, then auto-sort new images with confidence-based suggestions.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">Smart Index</span>
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">Auto-Sort</span>
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">Dry Run</span>
              </div>
              <div className="mt-6 text-indigo-600 font-semibold flex items-center gap-2">
                Launch Tool
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </button>

            {/* Guest Upload Manager Tool */}
            <button
              onClick={() => router.push('/guest-upload-manager')}
              className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all border-2 border-gray-200 hover:border-blue-500 text-left"
            >
              <div className="bg-gradient-to-br from-blue-500 to-cyan-600 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Guest Upload Manager</h2>
              <p className="text-gray-600 mb-4">
                Share upload links with clients and guests. Let them upload photos directly to your SmugMug albums with optional password protection.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">Shareable Links</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">Password Protected</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">Direct Upload</span>
              </div>
              <div className="mt-6 text-blue-600 font-semibold flex items-center gap-2">
                Launch Tool
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </button>

            {/* Sanity Checker Tool */}
            <button
              onClick={() => router.push('/sanity-checker')}
              className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all border-2 border-gray-200 hover:border-orange-500 text-left"
            >
              <div className="bg-gradient-to-br from-orange-500 to-red-600 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ClipboardCheck className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Sanity Checker</h2>
              <p className="text-gray-600 mb-4">
                Comprehensive account analysis tool. Reviews all galleries, metadata, and settings to find optimization opportunities and potential issues.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">AI Analysis</span>
                <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">Auto-Fix</span>
                <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">Reports</span>
              </div>
              <div className="mt-6 text-orange-600 font-semibold flex items-center gap-2">
                Launch Tool
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </button>
          </div>
        </div>
      </main>
      </>
    );
  }

  // Show the selected tool (Embed & Sell)
  return (
    <>
      <ToolboxHeader currentTool="embed-sell" />
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Workflow Progress Indicator */}
        <div className="mb-8 flex items-center justify-center gap-4">
          <div className={`flex items-center gap-2 ${embedWorkflowStep === 'select-albums' ? 'text-purple-600 font-semibold' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${embedWorkflowStep === 'select-albums' ? 'bg-purple-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
              1
            </div>
            <span>Select Albums</span>
          </div>
          <div className="w-12 h-1 bg-gray-300"></div>
          <div className={`flex items-center gap-2 ${embedWorkflowStep === 'select-photos' ? 'text-purple-600 font-semibold' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${embedWorkflowStep === 'select-photos' ? 'bg-purple-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
              2
            </div>
            <span>Select Photos</span>
          </div>
          <div className="w-12 h-1 bg-gray-300"></div>
          <div className={`flex items-center gap-2 ${embedWorkflowStep === 'generate-embed' ? 'text-purple-600 font-semibold' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${embedWorkflowStep === 'generate-embed' ? 'bg-purple-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
              3
            </div>
            <span>Generate Embed</span>
          </div>
        </div>

        {/* Step 1: Albums Section */}
        {embedWorkflowStep === 'select-albums' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">Step 1: Select Albums</h2>
              <p className="text-sm text-gray-600 mt-1">
                Choose one or more albums to select photos from
              </p>
            </div>
            <div className="flex items-center gap-3">
              {selectedAlbumsForEmbed.size > 0 && (
                <button
                  onClick={() => {
                    // Move to next step in Embed & Sell workflow
                    setEmbedWorkflowStep('select-photos');
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors font-medium"
                >
                  Continue with {selectedAlbumsForEmbed.size} Album{selectedAlbumsForEmbed.size !== 1 ? 's' : ''}
                </button>
              )}
              <button
                onClick={fetchAlbums}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg transition-colors font-medium"
              >
                {loading ? 'Loading...' : albums.length > 0 ? 'Refresh Albums' : 'Load Albums'}
              </button>
            </div>
          </div>

          {albums.length === 0 && !loading && (
            <div className="text-center py-20 text-gray-500">
              <FolderIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p>Click "Load Albums" to see your SmugMug albums</p>
            </div>
          )}

          {albums.length > 0 && (
            <>
              {/* Search and Sort Controls */}
              <div className="flex gap-4 mb-6">
                <input
                  type="text"
                  placeholder="Search albums..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1); // Reset to first page on search
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as 'name' | 'count' | 'recent');
                    setCurrentPage(1); // Reset to first page on sort change
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="name">Sort by Name</option>
                  <option value="count">Sort by Photo Count</option>
                  <option value="recent">Most Recent</option>
                </select>
              </div>

              {/* Results Count */}
              <div className="mb-4 text-sm text-gray-600">
                Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, sortedAlbums.length)} of {sortedAlbums.length} albums
                {searchTerm && ` (filtered from ${albums.length} total)`}
              </div>

              {/* Albums Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {paginatedAlbums.map((album) => {
                  const isSelected = selectedAlbumsForEmbed.has(album.AlbumKey);
                  return (
                    <button
                      key={album.AlbumKey}
                      onClick={() => {
                        const newSelection = new Set(selectedAlbumsForEmbed);
                        if (isSelected) {
                          newSelection.delete(album.AlbumKey);
                        } else {
                          newSelection.add(album.AlbumKey);
                        }
                        setSelectedAlbumsForEmbed(newSelection);
                      }}
                      className={`bg-white border-2 rounded-lg p-6 hover:shadow-xl cursor-pointer transition-all text-left relative ${
                        isSelected
                          ? 'border-purple-500 ring-4 ring-purple-200'
                          : 'border-gray-200 hover:border-blue-500'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-3 right-3 bg-purple-500 text-white w-6 h-6 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold">✓</span>
                        </div>
                      )}
                      <FolderIcon className={`w-12 h-12 mb-3 ${isSelected ? 'text-purple-600' : 'text-blue-600'}`} />
                      <h3 className="font-semibold text-lg mb-1 text-gray-900">{album.Name}</h3>
                      <p className="text-sm text-gray-600">{album.ImageCount} photos</p>
                    </button>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 rounded-lg transition-colors"
                  >
                    Previous
                  </button>

                  <div className="flex gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 hover:bg-gray-300'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 rounded-lg transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        )}

        {/* Step 2: Select Photos */}
        {embedWorkflowStep === 'select-photos' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-gray-800">Step 2: Select Photos</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Loading photos from selected albums... (Coming soon!)
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setEmbedWorkflowStep('select-albums')}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors font-medium"
                >
                  Back to Albums
                </button>
              </div>
            </div>
            <div className="text-center py-20 text-gray-500">
              <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p>Photo selection interface coming soon!</p>
              <p className="text-sm mt-2">This step will show all photos from your selected albums</p>
            </div>
          </div>
        )}

        {/* Step 3: Generate Embed Code */}
        {embedWorkflowStep === 'generate-embed' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-gray-800">Step 3: Generate Embed Code</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Generate embeddable gallery code (Coming soon!)
                </p>
              </div>
            </div>
            <div className="text-center py-20 text-gray-500">
              <Code2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p>Embed code generation coming soon!</p>
              <p className="text-sm mt-2">This step will generate HTML, React, and JSON embed codes</p>
            </div>
          </div>
        )}

      </div>
    </main>
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
