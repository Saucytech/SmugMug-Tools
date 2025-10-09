'use client';

import { useState, useEffect } from 'react';
import { FolderIcon, Book, ShoppingCart, Code2, Wrench, Heart, Sparkles, Brain, Upload, ClipboardCheck, Coins, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ToolboxHeader from '@/components/ToolboxHeader';
import { useAlbumsStore } from '@/stores/albumsStore';

export default function Home() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [selectedAlbumsForEmbed, setSelectedAlbumsForEmbed] = useState<Set<string>>(new Set());

  // Use centralized albums store
  const { albums, loading, error, fetchAlbums } = useAlbumsStore();

  // Pagination, filtering, and sorting state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'count' | 'recent'>('name');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Check authentication status via API call (cookies are HTTP-only now)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/smugmug/user', {
          credentials: 'include',
        });
        if (response.ok) {
          setIsAuthenticated(true);
        }
      } catch (_error) {
        console.log('Not authenticated');
      }
    };
    checkAuth();
  }, []);

  const handleAuth = () => {
    window.location.href = '/api/auth/smugmug';
  };

  const _handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (_error) {
      console.error('Logout error:', _error);
    }
    // Clear photo organizer index when logging out
    localStorage.removeItem('photo-organizer-index');
    setIsAuthenticated(false);
  };

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
      <>
        <ToolboxHeader />
        <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-gradient-to-b from-gray-900 to-gray-800 text-white">
          <div className="text-center max-w-2xl w-full px-4">
            <Wrench className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 text-blue-400" />
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">Smugtools</h1>
            <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 text-gray-300 px-2">
              Professional tools to enhance your SmugMug workflow
            </p>
            <button
              onClick={handleAuth}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 active:bg-blue-800 active:scale-[0.98] text-white font-bold py-3 sm:py-4 px-6 sm:px-8 rounded-lg text-base sm:text-lg transition-all shadow-lg hover:shadow-xl min-h-[48px] touch-manipulation"
              aria-label="Connect your SmugMug account to access all tools"
            >
              Connect SmugMug Account
            </button>
            <p className="mt-4 sm:mt-6 text-base sm:text-sm text-gray-400">
              Don&apos;t have an API key yet?{' '}
              <a
                href="https://api.smugmug.com/api/developer/apply"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline min-h-[44px] inline-block py-2 active:text-blue-300"
                aria-label="Apply for SmugMug API key"
              >
                Apply here
              </a>
            </p>

            {/* Developer Tools */}
            <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-gray-700">
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Developer Tools</h3>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                <a
                  href="/api-reference"
                  className="bg-purple-600 hover:bg-purple-700 active:bg-purple-800 active:scale-[0.98] text-white font-semibold py-3 px-5 sm:px-6 rounded-lg transition-all flex items-center justify-center gap-2 min-h-[48px] touch-manipulation"
                  aria-label="Browse SmugMug API Reference documentation"
                >
                  <Book className="w-5 h-5" />
                  <span className="text-base">API Reference</span>
                </a>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  // If no tool selected, show toolbox dashboard
  if (!selectedTool) {
    return (
      <>
        <ToolboxHeader />

        {/* Disclaimer Banner */}
        <div className="bg-orange-50 border-b-2 border-orange-200">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-orange-900">
                  <strong>Not an official SmugMug app.</strong> These tools can delete, move, or modify your content. Use at your own risk.
                  <a href="https://www.smugmug.com/app/library/trash" target="_blank" rel="noopener noreferrer" className="underline hover:text-orange-700 ml-1">
                    Recover deleted items
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>

        <main className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Welcome Section */}
            <div className="mb-8 sm:mb-10 md:mb-12 text-center px-4">
              <Wrench className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-purple-600 mx-auto mb-3 sm:mb-4" />
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-2 sm:mb-3">Smugtools</h1>
              <p className="text-base sm:text-lg md:text-xl text-gray-600">Professional tools to enhance your SmugMug workflow</p>
            </div>

          {/* Tools Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {/* Embed and Sell Tool */}
            <button
              onClick={() => setSelectedTool('embed-sell')}
              className="group bg-white rounded-lg sm:rounded-xl p-3 sm:p-6 md:p-8 shadow-lg hover:shadow-2xl active:shadow-xl active:scale-[0.98] transition-all border-2 border-gray-200 hover:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-200 focus:border-purple-500 text-left min-h-[100px] sm:min-h-[160px] touch-manipulation"
              aria-label="Launch Embed & Sell tool to create embeddable galleries with buy buttons"
            >
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-5 md:mb-6 group-hover:scale-110 transition-transform">
                <ShoppingCart className="w-5 h-5 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
              </div>
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-3">Embed & Sell</h2>
              <p className="text-sm sm:text-base text-gray-600 mb-2 sm:mb-4 leading-snug sm:leading-relaxed line-clamp-2 sm:line-clamp-none">
                Create beautiful embeddable galleries with buy buttons. Perfect for selling photos on your own website.
              </p>
              <div className="flex flex-wrap gap-1 sm:gap-2">
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">Multi-select</span>
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">3 Layouts</span>
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">Buy Buttons</span>
              </div>
              <div className="mt-2 sm:mt-5 md:mt-6 text-purple-600 font-semibold flex items-center gap-2 text-base">
                Launch Tool
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </button>

            {/* Favorites Selector Tool */}
            <button
              onClick={() => router.push('/favorites-manager')}
              className="group bg-white rounded-lg sm:rounded-xl p-3 sm:p-6 md:p-8 shadow-lg hover:shadow-2xl active:shadow-xl active:scale-[0.98] transition-all border-2 border-gray-200 hover:border-pink-500 focus:outline-none focus:ring-4 focus:ring-pink-200 focus:border-pink-500 text-left min-h-[100px] sm:min-h-[160px] touch-manipulation"
              aria-label="Launch Favorites Selector for client photo selection and approvals"
            >
              <div className="bg-gradient-to-br from-pink-500 to-pink-600 w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-5 md:mb-6 group-hover:scale-110 transition-transform">
                <Heart className="w-5 h-5 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
              </div>
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-3">Favorites Selector</h2>
              <p className="text-sm sm:text-base text-gray-600 mb-2 sm:mb-4 leading-snug sm:leading-relaxed line-clamp-2 sm:line-clamp-none">
                Let customers select their favorite photos from your albums. Perfect for client galleries and photo approvals.
              </p>
              <div className="flex flex-wrap gap-1 sm:gap-2">
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-pink-100 text-pink-700 text-xs font-semibold rounded-full">Shareable Links</span>
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-pink-100 text-pink-700 text-xs font-semibold rounded-full">Vote Tracking</span>
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-pink-100 text-pink-700 text-xs font-semibold rounded-full">Results Dashboard</span>
              </div>
              <div className="mt-2 sm:mt-5 md:mt-6 text-pink-600 font-semibold flex items-center gap-2 text-base">
                Launch Tool
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </button>

            {/* MetaData Monster Tool */}
            <button
              onClick={() => router.push('/metadata-monster')}
              className="group bg-white rounded-lg sm:rounded-xl p-3 sm:p-6 md:p-8 shadow-lg hover:shadow-2xl active:shadow-xl active:scale-[0.98] transition-all border-2 border-gray-200 hover:border-green-500 focus:outline-none focus:ring-4 focus:ring-green-200 focus:border-green-500 text-left min-h-[100px] sm:min-h-[160px] touch-manipulation"
              aria-label="Launch MetaData Monster for AI-powered metadata generation"
            >
              <div className="bg-gradient-to-br from-green-500 to-green-600 w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-5 md:mb-6 group-hover:scale-110 transition-transform">
                <Code2 className="w-5 h-5 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
              </div>
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-3">MetaData Monster</h2>
              <p className="text-sm sm:text-base text-gray-600 mb-2 sm:mb-4 leading-snug sm:leading-relaxed line-clamp-2 sm:line-clamp-none">
                AI-powered automatic Title, Caption, and Keyword generator. Bulk process your entire photo library in minutes.
              </p>
              <div className="flex flex-wrap gap-1 sm:gap-2">
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full flex items-center gap-1">
                  <Coins className="w-3 h-3" />
                  Uses Coins
                </span>
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">AI-Powered</span>
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">Bulk Processing</span>
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">Auto-Save</span>
              </div>
              <div className="mt-2 sm:mt-5 md:mt-6 text-green-600 font-semibold flex items-center gap-2 text-base">
                Launch Tool
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </button>

            {/* AI Gallery Creator Tool */}
            <button
              onClick={() => router.push('/ai-gallery-creator')}
              className="group bg-white rounded-lg sm:rounded-xl p-3 sm:p-6 md:p-8 shadow-lg hover:shadow-2xl active:shadow-xl active:scale-[0.98] transition-all border-2 border-gray-200 hover:border-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-200 focus:border-teal-500 text-left min-h-[100px] sm:min-h-[160px] touch-manipulation"
              aria-label="Launch AI Gallery Creator to build folder structures with AI assistance"
            >
              <div className="bg-gradient-to-br from-teal-500 to-cyan-600 w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-5 md:mb-6 group-hover:scale-110 transition-transform">
                <Sparkles className="w-5 h-5 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
              </div>
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-3">AI Gallery Creator</h2>
              <p className="text-sm sm:text-base text-gray-600 mb-2 sm:mb-4 leading-snug sm:leading-relaxed line-clamp-2 sm:line-clamp-none">
                Chat with AI to create complex folder and gallery structures automatically. Build your entire SmugMug organization in minutes.
              </p>
              <div className="flex flex-wrap gap-1 sm:gap-2">
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full flex items-center gap-1">
                  <Coins className="w-3 h-3" />
                  Uses Coins
                </span>
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-teal-100 text-teal-700 text-xs font-semibold rounded-full">AI Chatbot</span>
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-teal-100 text-teal-700 text-xs font-semibold rounded-full">Nested Folders</span>
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-teal-100 text-teal-700 text-xs font-semibold rounded-full">Bulk Creation</span>
              </div>
              <div className="mt-2 sm:mt-5 md:mt-6 text-teal-600 font-semibold flex items-center gap-2 text-base">
                Launch Tool
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </button>

            {/* Photo Organizer Tool */}
            <button
              onClick={() => router.push('/photo-organizer')}
              className="group bg-white rounded-lg sm:rounded-xl p-3 sm:p-6 md:p-8 shadow-lg hover:shadow-2xl active:shadow-xl active:scale-[0.98] transition-all border-2 border-gray-200 hover:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 text-left min-h-[100px] sm:min-h-[160px] touch-manipulation"
              aria-label="Launch Photo Organizer for AI-powered smart photo organization"
            >
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-5 md:mb-6 group-hover:scale-110 transition-transform">
                <Brain className="w-5 h-5 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
              </div>
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-3">Photo Organizer</h2>
              <p className="text-sm sm:text-base text-gray-600 mb-2 sm:mb-4 leading-snug sm:leading-relaxed line-clamp-2 sm:line-clamp-none">
                AI-powered photo organization with smart gallery indexing. Build an index once, then auto-sort new images with confidence-based suggestions.
              </p>
              <div className="flex flex-wrap gap-1 sm:gap-2">
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full flex items-center gap-1">
                  <Coins className="w-3 h-3" />
                  Uses Coins
                </span>
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">Smart Index</span>
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">Auto-Sort</span>
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">Dry Run</span>
              </div>
              <div className="mt-2 sm:mt-5 md:mt-6 text-indigo-600 font-semibold flex items-center gap-2 text-base">
                Launch Tool
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </button>

            {/* Guest Upload Manager Tool */}
            <button
              onClick={() => router.push('/guest-upload-manager')}
              className="group bg-white rounded-lg sm:rounded-xl p-3 sm:p-6 md:p-8 shadow-lg hover:shadow-2xl active:shadow-xl active:scale-[0.98] transition-all border-2 border-gray-200 hover:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-blue-500 text-left min-h-[100px] sm:min-h-[160px] touch-manipulation"
              aria-label="Launch Guest Upload Manager to create shareable upload links for clients"
            >
              <div className="bg-gradient-to-br from-blue-500 to-cyan-600 w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-5 md:mb-6 group-hover:scale-110 transition-transform">
                <Upload className="w-5 h-5 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
              </div>
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-3">Guest Upload Manager</h2>
              <p className="text-sm sm:text-base text-gray-600 mb-2 sm:mb-4 leading-snug sm:leading-relaxed line-clamp-2 sm:line-clamp-none">
                Share upload links with clients and guests. Let them upload photos directly to your SmugMug albums with optional password protection.
              </p>
              <div className="flex flex-wrap gap-1 sm:gap-2">
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">Shareable Links</span>
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">Password Protected</span>
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">Direct Upload</span>
              </div>
              <div className="mt-2 sm:mt-5 md:mt-6 text-blue-600 font-semibold flex items-center gap-2 text-base">
                Launch Tool
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </button>

            {/* API Reference Tool */}
            <button
              onClick={() => router.push('/api-reference')}
              className="group bg-white rounded-xl sm:rounded-2xl p-5 sm:p-6 md:p-8 shadow-lg hover:shadow-2xl active:shadow-xl active:scale-[0.98] transition-all border-2 border-gray-200 hover:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-200 focus:border-amber-500 text-left min-h-[160px] touch-manipulation"
              aria-label="Launch API Reference to browse SmugMug API documentation"
            >
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-5 md:mb-6 group-hover:scale-110 transition-transform">
                <Book className="w-5 h-5 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
              </div>
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-3">API Reference</h2>
              <p className="text-sm sm:text-base text-gray-600 mb-2 sm:mb-4 leading-snug sm:leading-relaxed line-clamp-2 sm:line-clamp-none">
                Interactive SmugMug API documentation browser. Search endpoints, view examples, and test API calls directly in your browser.
              </p>
              <div className="flex flex-wrap gap-1 sm:gap-2">
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">Interactive</span>
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">Examples</span>
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">Search</span>
              </div>
              <div className="mt-2 sm:mt-5 md:mt-6 text-amber-600 font-semibold flex items-center gap-2 text-base">
                Launch Tool
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </button>

            {/* Folder Downloader Tool */}
            <button
              onClick={() => router.push('/downloader')}
              className="group bg-white rounded-xl sm:rounded-2xl p-5 sm:p-6 md:p-8 shadow-lg hover:shadow-2xl active:shadow-xl active:scale-[0.98] transition-all border-2 border-gray-200 hover:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-blue-500 text-left min-h-[160px] touch-manipulation"
              aria-label="Launch Folder Downloader to download photos with preserved folder hierarchy"
            >
              <div className="bg-gradient-to-br from-blue-500 to-cyan-600 w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-5 md:mb-6 group-hover:scale-110 transition-transform">
                <Download className="w-5 h-5 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
              </div>
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-3">Folder Downloader</h2>
              <p className="text-sm sm:text-base text-gray-600 mb-2 sm:mb-4 leading-snug sm:leading-relaxed line-clamp-2 sm:line-clamp-none">
                Download your photos with preserved folder hierarchy. Select folders and albums, choose image size, and export as ZIP.
              </p>
              <div className="flex flex-wrap gap-1 sm:gap-2">
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">Folder Structure</span>
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">Bulk Download</span>
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">ZIP Export</span>
              </div>
              <div className="mt-2 sm:mt-5 md:mt-6 text-blue-600 font-semibold flex items-center gap-2 text-base">
                Launch Tool
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </button>

            {/* Sanity Checker Tool */}
            <button
              onClick={() => router.push('/sanity-checker')}
              className="group bg-white rounded-xl sm:rounded-2xl p-5 sm:p-6 md:p-8 shadow-lg hover:shadow-2xl active:shadow-xl active:scale-[0.98] transition-all border-2 border-gray-200 hover:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-200 focus:border-orange-500 text-left min-h-[160px] touch-manipulation"
              aria-label="Launch Sanity Checker for comprehensive account analysis and optimization"
            >
              <div className="bg-gradient-to-br from-orange-500 to-red-600 w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-5 md:mb-6 group-hover:scale-110 transition-transform">
                <ClipboardCheck className="w-5 h-5 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
              </div>
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-3">Sanity Checker</h2>
              <p className="text-sm sm:text-base text-gray-600 mb-2 sm:mb-4 leading-snug sm:leading-relaxed line-clamp-2 sm:line-clamp-none">
                Comprehensive account analysis tool. Reviews all galleries, metadata, and settings to find optimization opportunities and potential issues.
              </p>
              <div className="flex flex-wrap gap-1 sm:gap-2">
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full flex items-center gap-1">
                  <Coins className="w-3 h-3" />
                  Uses Coins
                </span>
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">AI Analysis</span>
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">Auto-Fix</span>
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">Reports</span>
              </div>
              <div className="mt-2 sm:mt-5 md:mt-6 text-orange-600 font-semibold flex items-center gap-2 text-base">
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

      {/* Instructions Banner */}
      <div className="bg-purple-50 border-b border-purple-200 p-4 sm:p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start sm:items-center gap-3">
            <svg className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5 sm:mt-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-base sm:text-sm text-gray-800">
              <span className="font-semibold">How to use:</span> Select one or more albums from your SmugMug account, then choose individual photos to create embeddable galleries. Export as HTML, React components, WordPress shortcodes, or JSON for your website.
            </p>
          </div>
        </div>
      </div>

      <main className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">Embed & Sell</h1>
          <p className="text-sm sm:text-base text-gray-600">Create embeddable galleries with buy buttons for your website</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Albums Section */}
        <div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">Select Albums</h2>
              <p className="text-base sm:text-sm text-gray-600 mt-1">
                Choose one or more albums to select photos from
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={fetchAlbums}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 active:scale-[0.98] disabled:bg-blue-400 disabled:active:scale-100 text-white px-6 py-3 rounded-lg transition-all font-medium min-h-[48px] touch-manipulation text-base"
                aria-label={loading ? 'Loading albums' : albums.length > 0 ? 'Refresh album list' : 'Load your SmugMug albums'}
              >
                {loading ? 'Loading...' : albums.length > 0 ? 'Refresh Albums' : 'Load Albums'}
              </button>
            </div>
          </div>

          {albums.length === 0 && !loading && (
            <div className="text-center py-20 text-gray-500">
              <FolderIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p>Click &quot;Load Albums&quot; to see your SmugMug albums</p>
            </div>
          )}

          {albums.length > 0 && (
            <>
              {/* Search and Sort Controls */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
                <input
                  type="text"
                  placeholder="Search albums..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1); // Reset to first page on search
                  }}
                  className="flex-1 px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px] touch-manipulation"
                  aria-label="Search albums by name"
                />
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as 'name' | 'count' | 'recent');
                    setCurrentPage(1); // Reset to first page on sort change
                  }}
                  className="px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px] touch-manipulation bg-white"
                  aria-label="Sort albums by criteria"
                >
                  <option value="name">Sort by Name</option>
                  <option value="count">Sort by Photo Count</option>
                  <option value="recent">Most Recent</option>
                </select>
              </div>

              {/* Results Count */}
              <div className="mb-4 text-base sm:text-sm text-gray-600">
                Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, sortedAlbums.length)} of {sortedAlbums.length} albums
                {searchTerm && ` (filtered from ${albums.length} total)`}
              </div>

              {/* Albums Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
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
                      className={`bg-white border-2 rounded-lg p-3 sm:p-6 hover:shadow-xl active:shadow-lg active:scale-[0.98] cursor-pointer transition-all text-left relative min-h-[80px] sm:min-h-[120px] touch-manipulation ${
                        isSelected
                          ? 'border-purple-500 ring-4 ring-purple-200'
                          : 'border-gray-200 hover:border-blue-500'
                      }`}
                      aria-label={`${isSelected ? 'Deselect' : 'Select'} album ${album.Name} with ${album.ImageCount} photos`}
                      aria-pressed={isSelected}
                    >
                      {isSelected && (
                        <div className="absolute top-3 right-3 bg-purple-500 text-white w-7 h-7 rounded-full flex items-center justify-center" aria-hidden="true">
                          <span className="text-sm font-bold">✓</span>
                        </div>
                      )}
                      <FolderIcon className={`w-10 h-10 mb-2 sm:mb-3 ${isSelected ? 'text-purple-600' : 'text-blue-600'}`} aria-hidden="true" />
                      <h3 className="font-semibold text-sm sm:text-lg mb-0.5 sm:mb-1 text-gray-900">{album.Name}</h3>
                      <p className="text-xs sm:text-sm text-gray-600">{album.ImageCount} photos</p>
                    </button>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-wrap justify-center items-center gap-2 mt-8">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-4 sm:px-4 py-3 text-base bg-gray-200 hover:bg-gray-300 active:bg-gray-400 active:scale-[0.98] disabled:bg-gray-100 disabled:text-gray-400 disabled:active:scale-100 rounded-lg transition-all min-h-[48px] touch-manipulation"
                    aria-label="Go to previous page"
                  >
                    Previous
                  </button>

                  <div className="flex gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-4 sm:px-4 py-3 text-base rounded-lg transition-all min-h-[48px] min-w-[48px] touch-manipulation ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 hover:bg-gray-300 active:bg-gray-400 active:scale-[0.98]'
                        }`}
                        aria-label={`Go to page ${page}`}
                        aria-current={currentPage === page ? 'page' : undefined}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 sm:px-4 py-3 text-base bg-gray-200 hover:bg-gray-300 active:bg-gray-400 active:scale-[0.98] disabled:bg-gray-100 disabled:text-gray-400 disabled:active:scale-100 rounded-lg transition-all min-h-[48px] touch-manipulation"
                    aria-label="Go to next page"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </main>
    </>
  );
}
