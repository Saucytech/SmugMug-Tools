'use client';

import { useState, useEffect } from 'react';
import { FolderIcon, ShoppingCart, Code2, Wrench, Heart, Sparkles, Brain, Upload, ClipboardCheck, Coins, Download, MessageSquarePlus, Power, PowerOff, Ban } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import ToolboxHeader from '@/components/ToolboxHeader';
import { useAlbumsStore } from '@/stores/albumsStore';
import { withRetry } from '@/lib/retry';

interface ToolState {
  tool_id: string;
  status: 'on' | 'disabled' | 'off';
  disabled_message: string | null;
}

export default function Home() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [selectedAlbumsForEmbed, setSelectedAlbumsForEmbed] = useState<Set<string>>(new Set());
  const [toolStates, setToolStates] = useState<Record<string, ToolState>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSmugMugConnected, setIsSmugMugConnected] = useState(false);
  const [checkingSmugMug, setCheckingSmugMug] = useState(true);

  // Use centralized albums store
  const { albums, loading, error, fetchAlbums} = useAlbumsStore();

  // Pagination, filtering, and sorting state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'count' | 'recent'>('name');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Check authentication status and admin role
  useEffect(() => {
    // Check if user is logged in with NextAuth
    if (session) {
      setIsAuthenticated(true);
      checkSmugMugConnection();
    } else {
      setIsAuthenticated(false);
      setIsSmugMugConnected(false);
      setCheckingSmugMug(false);
    }

    // Check if user is admin
    if (session?.user) {
      const adminStatus = (session.user as any).role === 'admin';
      console.log('Admin check:', { session: session.user, role: (session.user as any).role, isAdmin: adminStatus });
      setIsAdmin(adminStatus);
    }

    // Load tool states
    loadToolStates();
  }, [session]);

  const checkSmugMugConnection = async () => {
    try {
      console.log('🔍 Checking SmugMug connection with retry logic...');

      // Use retry logic to handle race conditions after OAuth callback
      const response = await withRetry(
        () => fetch('/api/smugmug/user', { credentials: 'include' }),
        {
          retries: 4,
          initialDelayMs: 500,
          backoffFactor: 1.8,
          onRetry: (attempt, error) => {
            console.warn(`⚠️ SmugMug connection check attempt ${attempt} failed, retrying...`, error);
          },
        }
      );

      console.log('📡 SmugMug check response:', {
        status: response.status,
        ok: response.ok,
      });

      setIsSmugMugConnected(response.ok);

      if (response.ok) {
        console.log('✅ SmugMug connection verified successfully');
      } else {
        console.warn('⚠️ SmugMug connection check failed with status:', response.status);
      }
    } catch (error) {
      console.error('❌ SmugMug connection check failed after all retries:', error);
      setIsSmugMugConnected(false);
    } finally {
      setCheckingSmugMug(false);
    }
  };

  const loadToolStates = async () => {
    try {
      const response = await fetch('/api/tools/states');
      if (response.ok) {
        const data = await response.json();
        const statesMap: Record<string, ToolState> = {};
        data.tools.forEach((tool: any) => {
          statesMap[tool.tool_id] = {
            tool_id: tool.tool_id,
            status: tool.status,
            disabled_message: tool.disabled_message,
          };
        });
        setToolStates(statesMap);
      }
    } catch (error) {
      console.error('Error loading tool states:', error);
    }
  };

  const getToolStatus = (toolId: string): 'on' | 'disabled' | 'off' => {
    return toolStates[toolId]?.status || 'on'; // Default to 'on' if not found
  };

  const isToolDisabled = (toolId: string): boolean => {
    return getToolStatus(toolId) === 'disabled';
  };

  const isToolHidden = (toolId: string): boolean => {
    return getToolStatus(toolId) === 'off';
  };

  const updateToolState = async (toolId: string, newStatus: 'on' | 'disabled' | 'off', e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click

    try {
      const response = await fetch('/api/admin/tools', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toolId,
          status: newStatus,
          disabledMessage: newStatus === 'disabled' ? 'This feature is temporarily disabled and will return soon.' : null,
        }),
      });

      if (response.ok) {
        // Reload tool states
        await loadToolStates();
      } else {
        console.error('Failed to update tool state');
      }
    } catch (error) {
      console.error('Error updating tool state:', error);
    }
  };

  const handleToolClick = (toolPath?: string) => {
    if (toolPath) {
      router.push(toolPath);
    }
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
    const testimonials = [
      {
        before: "Before SmugTools I spent hours manually writing titles and captions for each photo",
        after: "Now I can generate professional metadata for 100+ photos in minutes with AI!",
        author: "Sarah M., Wedding Photographer"
      },
      {
        before: "Before SmugTools my clients had to email me their favorite photos",
        after: "Now they just click hearts on a beautiful gallery and I get instant notifications!",
        author: "James K., Portrait Photographer"
      },
      {
        before: "Before SmugTools I manually organized thousands of photos into folders",
        after: "With SmugTools I can auto-sort new uploads into the right galleries with AI confidence scoring!",
        author: "Maria L., Event Photographer"
      },
      {
        before: "Before SmugTools I had no analytics on my AI usage",
        after: "Now I track every coin spent and optimize my workflows with real-time dashboards!",
        author: "David R., Commercial Photographer"
      },
      {
        before: "Before SmugTools creating complex folder structures took days",
        after: "With SmugTools I just chat with AI and my entire SmugMug organization is built automatically!",
        author: "Emily T., Stock Photographer"
      },
      {
        before: "Before SmugTools I wasted hours checking for duplicate photos and missing metadata",
        after: "Now the Sanity Checker finds and fixes issues across my entire library in one click!",
        author: "Michael P., Nature Photographer"
      }
    ];

    return (
      <>
        <ToolboxHeader />
        <main className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-pink-900 text-white relative overflow-hidden">
          {/* Background Animation */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
            <div className="absolute top-40 right-10 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '2s'}}></div>
            <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '4s'}}></div>
          </div>

          {/* Hero Section */}
          <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 md:p-8">
            <div className="text-center max-w-5xl w-full px-4">
              {/* Logo */}
              <div className="mb-8">
                <Wrench className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 mx-auto mb-6 text-white drop-shadow-2xl animate-bounce" />
              </div>

              {/* Main Heading with Sparkle - 5% smaller */}
              <div className="relative inline-block mb-6">
                <h1 className="text-[2.85rem] sm:text-[3.42rem] md:text-[3.99rem] lg:text-[4.56rem] font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300 animate-pulse">
                  Smugtools
                </h1>
                <Sparkles className="absolute -top-4 -right-4 w-8 h-8 text-yellow-400 animate-spin" style={{animationDuration: '3s'}} />
                <Sparkles className="absolute -bottom-2 -left-4 w-6 h-6 text-pink-400 animate-spin" style={{animationDuration: '4s'}} />
              </div>

              {/* Coming Soon Badge with Animation - 20% smaller */}
              <div className="inline-block mb-8 animate-bounce">
                <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 px-6 py-3 rounded-full shadow-2xl transform hover:scale-110 transition-transform">
                  <p className="text-lg sm:text-2xl md:text-3xl font-black text-gray-900">
                    🚀 COMING SOON 🚀
                  </p>
                </div>
              </div>

              {/* Hype Description */}
              <p className="text-2xl sm:text-3xl md:text-4xl mb-4 text-yellow-300 font-bold">
                The Ultimate SmugMug Powerhouse!
              </p>
              <p className="text-lg sm:text-xl md:text-2xl mb-8 text-purple-100 max-w-3xl mx-auto leading-relaxed">
                Revolutionize your photography workflow with <span className="text-yellow-300 font-bold">AI-powered automation</span>,
                <span className="text-pink-300 font-bold"> stunning client galleries</span>, and
                <span className="text-green-300 font-bold"> intelligent organization</span> that saves you HOURS every week!
              </p>

              {/* Feature Highlights Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 max-w-4xl mx-auto">
                <div className="bg-gradient-to-br from-purple-600/30 to-purple-800/30 backdrop-blur-sm rounded-xl p-4 border-2 border-purple-400/50 hover:scale-105 transition-transform">
                  <div className="text-4xl mb-2">🤖</div>
                  <div className="font-bold text-sm">AI Metadata Generation</div>
                </div>
                <div className="bg-gradient-to-br from-pink-600/30 to-pink-800/30 backdrop-blur-sm rounded-xl p-4 border-2 border-pink-400/50 hover:scale-105 transition-transform">
                  <div className="text-4xl mb-2">❤️</div>
                  <div className="font-bold text-sm">Client Favorites</div>
                </div>
                <div className="bg-gradient-to-br from-green-600/30 to-green-800/30 backdrop-blur-sm rounded-xl p-4 border-2 border-green-400/50 hover:scale-105 transition-transform">
                  <div className="text-4xl mb-2">🧠</div>
                  <div className="font-bold text-sm">Smart Organization</div>
                </div>
                <div className="bg-gradient-to-br from-blue-600/30 to-blue-800/30 backdrop-blur-sm rounded-xl p-4 border-2 border-blue-400/50 hover:scale-105 transition-transform">
                  <div className="text-4xl mb-2">📊</div>
                  <div className="font-bold text-sm">Usage Analytics</div>
                </div>
              </div>

              {/* Email Signup with More Excitement */}
              <div className="bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-md rounded-3xl p-8 border-2 border-yellow-400/50 max-w-2xl mx-auto mb-12 shadow-2xl">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Sparkles className="w-6 h-6 text-yellow-400" />
                  <h3 className="text-2xl sm:text-3xl font-black">GET EARLY ACCESS!</h3>
                  <Sparkles className="w-6 h-6 text-yellow-400" />
                </div>
                <p className="text-base sm:text-lg text-purple-100 mb-6">
                  Join the waitlist and be among the FIRST to experience the future of SmugMug automation!
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    placeholder="your.email@example.com"
                    className="flex-1 px-6 py-4 text-lg rounded-xl bg-white/30 border-2 border-white/50 text-white placeholder-purple-200 focus:outline-none focus:ring-4 focus:ring-yellow-400/50 backdrop-blur-sm font-semibold"
                  />
                  <button className="px-8 py-4 text-lg bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 hover:from-yellow-500 hover:via-orange-600 hover:to-red-600 text-gray-900 rounded-xl font-black transition-all transform hover:scale-105 active:scale-95 shadow-2xl whitespace-nowrap">
                    NOTIFY ME! 🔥
                  </button>
                </div>
                <p className="text-xs text-purple-200 mt-4">
                  🎁 Early subscribers get <span className="text-yellow-300 font-bold">BONUS COINS</span> at launch!
                </p>
              </div>
            </div>
          </div>

          {/* Scrolling Testimonials Section */}
          <div className="relative z-10 py-16 overflow-hidden">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 text-yellow-300">
                What Photographers Are Saying 🎉
              </h2>
              <p className="text-lg text-purple-200">Real stories from real photographers (coming soon!)</p>
            </div>

            {/* Scrolling Container */}
            <div className="relative">
              <div className="flex gap-6 animate-scroll">
                {[...testimonials, ...testimonials].map((testimonial, index) => (
                  <div
                    key={index}
                    className="flex-shrink-0 w-96 bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-md rounded-2xl p-6 border-2 border-purple-400/50 shadow-2xl"
                  >
                    <div className="mb-4">
                      <div className="text-red-400 font-semibold mb-2 flex items-center gap-2">
                        <span className="text-2xl">😤</span>
                        <span>BEFORE:</span>
                      </div>
                      <p className="text-sm text-purple-100 italic">&ldquo;{testimonial.before}&rdquo;</p>
                    </div>
                    <div className="mb-4">
                      <div className="text-green-400 font-semibold mb-2 flex items-center gap-2">
                        <span className="text-2xl">🎉</span>
                        <span>NOW:</span>
                      </div>
                      <p className="text-sm text-purple-100 italic">&ldquo;{testimonial.after}&rdquo;</p>
                    </div>
                    <div className="text-xs text-yellow-300 font-semibold pt-4 border-t border-white/20">
                      — {testimonial.author}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tools Preview Grid */}
          <div className="relative z-10 py-16 px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 text-yellow-300">
                  🛠️ Powerful Tools Inside 🛠️
                </h2>
                <p className="text-lg text-purple-200">Everything you need to supercharge your SmugMug workflow</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { icon: "🤖", name: "MetaData Monster", desc: "AI generates titles, captions & keywords in bulk!" },
                  { icon: "❤️", name: "Favorites Manager", desc: "Let clients pick favorites with beautiful galleries!" },
                  { icon: "🧠", name: "Photo Organizer", desc: "AI auto-sorts photos into the right albums!" },
                  { icon: "✨", name: "AI Gallery Creator", desc: "Chat with AI to build folder structures instantly!" },
                  { icon: "📤", name: "Guest Upload Manager", desc: "Shareable upload links for clients & guests!" },
                  { icon: "🔍", name: "Sanity Checker", desc: "Find & fix issues across your entire library!" },
                  { icon: "💰", name: "Coin System", desc: "Flexible credit-based AI usage tracking!" },
                  { icon: "📊", name: "Analytics Dashboard", desc: "Track usage, costs & client engagement!" },
                  { icon: "📥", name: "Folder Downloader", desc: "Bulk download with preserved structure!" }
                ].map((tool, index) => (
                  <div
                    key={index}
                    className="bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-md rounded-2xl p-6 border-2 border-purple-400/50 hover:border-yellow-400/50 hover:scale-105 transition-all shadow-xl"
                  >
                    <div className="text-5xl mb-3">{tool.icon}</div>
                    <h3 className="text-xl font-bold mb-2 text-yellow-300">{tool.name}</h3>
                    <p className="text-sm text-purple-100">{tool.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="relative z-10 py-12 px-4 border-t border-white/20">
            <div className="max-w-4xl mx-auto text-center">
              <p className="text-sm text-purple-300 mb-4">
                Professional tools built by photographers, for photographers
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm">
                <a href="mailto:support@smugtools.com" className="text-purple-200 hover:text-yellow-300 transition-colors">
                  📧 Contact Us
                </a>
                <span className="text-purple-400">•</span>
                <a href="https://github.com/Saucytech/smugtools" target="_blank" rel="noopener noreferrer" className="text-purple-200 hover:text-yellow-300 transition-colors">
                  💻 GitHub
                </a>
              </div>
              <p className="text-xs text-purple-400 mt-6">
                Not affiliated with SmugMug, Inc. Built with ❤️ by Saucytech
              </p>
            </div>
          </div>

          {/* CSS for scrolling animation */}
          <style jsx>{`
            @keyframes scroll {
              0% {
                transform: translateX(0);
              }
              100% {
                transform: translateX(-50%);
              }
            }
            .animate-scroll {
              animation: scroll 30s linear infinite;
            }
            .animate-scroll:hover {
              animation-play-state: paused;
            }
          `}</style>
        </main>
      </>
    );
  }

  // If no tool selected, show toolbox dashboard
  if (!selectedTool) {
    return (
      <>
        <ToolboxHeader />

        <main className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
          <div className="max-w-7xl mx-auto">

          {/* SmugMug Connection Banner */}
          {!checkingSmugMug && !isSmugMugConnected && (
            <div className="mb-6 bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 rounded-xl p-6 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <svg className="w-12 h-12 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    SmugMug Connection Required
                  </h3>
                  <p className="text-gray-700 mb-4">
                    All tools require a SmugMug account connection to function. Please connect your SmugMug account to access the toolbox.
                  </p>
                  <button
                    onClick={() => window.location.href = '/api/auth/smugmug'}
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Connect to SmugMug
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tools Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {/* Embed and Sell Tool */}
            {(!isToolHidden('embed-sell') || isAdmin) && (
              <div className="relative">
                <button
                  onClick={() => {
                    if (!isSmugMugConnected && !isAdmin) return;
                    if (isToolDisabled('embed-sell') && !isAdmin) return;
                    setSelectedTool('embed-sell');
                  }}
                  disabled={(isToolDisabled('embed-sell') || !isSmugMugConnected) && !isAdmin}
                  className={`w-full group bg-white rounded-lg p-2 sm:p-3 md:p-4 shadow-md transition-all border-2 text-left min-h-[60px] sm:min-h-[100px] touch-manipulation ${
                    ((isToolDisabled('embed-sell') || !isSmugMugConnected) && !isAdmin)
                      ? 'opacity-60 cursor-not-allowed border-gray-200'
                      : 'hover:shadow-xl active:shadow-lg active:scale-[0.98] border-gray-200 hover:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-500'
                  }`}
                  aria-label="Launch Embed & Sell tool to create embeddable galleries with buy buttons"
                  title={!isSmugMugConnected && !isAdmin ? 'Connect to SmugMug to use this tool' : (isToolDisabled('embed-sell') && !isAdmin ? (toolStates['embed-sell']?.disabled_message || 'This feature is temporarily disabled') : '')}
                >
                  <div className={`bg-gradient-to-br from-purple-500 to-purple-600 w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center mb-1 sm:mb-2 md:mb-3 transition-transform ${!isToolDisabled('embed-sell') && 'group-hover:scale-110'}`}>
                    <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" />
                  </div>
                  <h2 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-0.5 sm:mb-1">Embed & Sell</h2>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2 leading-tight line-clamp-2">
                    Multi-album selector with buy buttons. 4 export formats.
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <span className="px-1.5 sm:px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] sm:text-xs font-semibold rounded-full">HTML/React/WP</span>
                    <span className="px-1.5 sm:px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] sm:text-xs font-semibold rounded-full">JSON</span>
                  </div>
                </button>

                {/* OFF State Overlay */}
                {isAdmin && getToolStatus('embed-sell') === 'off' && (
                  <div className="absolute inset-0 bg-red-500/20 rounded-lg pointer-events-none" />
                )}

                {/* Admin Toggle Controls */}
                {isAdmin && (
                  <div className="absolute top-1 right-1 flex gap-0.5 z-10">
                    <button
                      onClick={(e) => updateToolState('embed-sell', 'on', e)}
                      className={`p-1 rounded transition-all ${getToolStatus('embed-sell') === 'on' ? 'bg-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-gray-200 text-gray-600 hover:bg-green-100'}`}
                      title="Turn ON"
                    >
                      <Power className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => updateToolState('embed-sell', 'disabled', e)}
                      className={`p-1 rounded ${getToolStatus('embed-sell') === 'disabled' ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-yellow-100'}`}
                      title="Disable"
                    >
                      <Ban className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => updateToolState('embed-sell', 'off', e)}
                      className={`p-1 rounded ${getToolStatus('embed-sell') === 'off' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-red-100'}`}
                      title="Turn OFF"
                    >
                      <PowerOff className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Favorites Selector Tool */}
            {(!isToolHidden('favorites-manager') || isAdmin) && (
              <div className="relative">
                <button
                  onClick={() => {
                    if (!isSmugMugConnected && !isAdmin) return;
                    if (isToolDisabled('favorites-manager') && !isAdmin) return;
                    handleToolClick('/favorites-manager');
                  }}
                  disabled={(isToolDisabled('favorites-manager') || !isSmugMugConnected) && !isAdmin}
                  className={`w-full group bg-white rounded-lg p-2 sm:p-3 md:p-4 shadow-md transition-all border-2 text-left min-h-[60px] sm:min-h-[100px] touch-manipulation ${
                    ((isToolDisabled('favorites-manager') || !isSmugMugConnected) && !isAdmin)
                      ? 'opacity-60 cursor-not-allowed border-gray-200'
                      : 'hover:shadow-xl active:shadow-lg active:scale-[0.98] border-gray-200 hover:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-500'
                  }`}
                  aria-label="Launch Favorites Selector for client photo selection and approvals"
                  title={!isSmugMugConnected && !isAdmin ? 'Connect to SmugMug to use this tool' : (isToolDisabled('favorites-manager') && !isAdmin ? (toolStates['favorites-manager']?.disabled_message || 'This feature is temporarily disabled') : '')}
                >
                  <div className={`bg-gradient-to-br from-pink-500 to-pink-600 w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center mb-1 sm:mb-2 md:mb-3 transition-transform ${!isToolDisabled('favorites-manager') && 'group-hover:scale-110'}`}>
                    <Heart className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" />
                  </div>
                  <h2 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-0.5 sm:mb-1">Favorites Selector</h2>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2 leading-tight line-clamp-2">
                    Client gallery with 7 themes, logo branding, and buy button.
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <span className="px-1.5 sm:px-2 py-0.5 bg-pink-100 text-pink-700 text-[10px] sm:text-xs font-semibold rounded-full">7 Themes</span>
                    <span className="px-1.5 sm:px-2 py-0.5 bg-pink-100 text-pink-700 text-[10px] sm:text-xs font-semibold rounded-full">Logo Upload</span>
                  </div>
                </button>

                {/* OFF State Overlay */}
                {isAdmin && getToolStatus('favorites-manager') === 'off' && (
                  <div className="absolute inset-0 bg-red-500/20 rounded-lg pointer-events-none" />
                )}

                {isAdmin && (
                  <div className="absolute top-1 right-1 flex gap-0.5 z-10">
                    <button onClick={(e) => updateToolState('favorites-manager', 'on', e)} className={`p-1 rounded transition-all ${getToolStatus('favorites-manager') === 'on' ? 'bg-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-gray-200 text-gray-600 hover:bg-green-100'}`} title="Turn ON"><Power className="w-3 h-3" /></button>
                    <button onClick={(e) => updateToolState('favorites-manager', 'disabled', e)} className={`p-1 rounded ${getToolStatus('favorites-manager') === 'disabled' ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-yellow-100'}`} title="Disable"><Ban className="w-3 h-3" /></button>
                    <button onClick={(e) => updateToolState('favorites-manager', 'off', e)} className={`p-1 rounded ${getToolStatus('favorites-manager') === 'off' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-red-100'}`} title="Turn OFF"><PowerOff className="w-3 h-3" /></button>
                  </div>
                )}
              </div>
            )}

            {/* MetaData Monster Tool */}
            {(!isToolHidden('metadata-monster') || isAdmin) && (
              <div className="relative">
                <button
                  onClick={() => {
                    if (!isSmugMugConnected && !isAdmin) return;
                    if (isToolDisabled('metadata-monster') && !isAdmin) return;
                    handleToolClick('/metadata-monster');
                  }}
                  disabled={(isToolDisabled('metadata-monster') || !isSmugMugConnected) && !isAdmin}
                  className={`w-full group bg-white rounded-lg p-2 sm:p-3 md:p-4 shadow-md transition-all border-2 text-left min-h-[60px] sm:min-h-[100px] touch-manipulation ${
                    ((isToolDisabled('metadata-monster') || !isSmugMugConnected) && !isAdmin)
                      ? 'opacity-60 cursor-not-allowed border-gray-200'
                      : 'hover:shadow-xl active:shadow-lg active:scale-[0.98] border-gray-200 hover:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-500'
                  }`}
                  aria-label="Launch MetaData Monster for AI-powered metadata generation"
                  title={!isSmugMugConnected && !isAdmin ? 'Connect to SmugMug to use this tool' : (isToolDisabled('metadata-monster') && !isAdmin ? (toolStates['metadata-monster']?.disabled_message || 'This feature is temporarily disabled') : '')}
                >
                  <div className={`bg-gradient-to-br from-green-500 to-green-600 w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center mb-1 sm:mb-2 md:mb-3 transition-transform ${!isToolDisabled('metadata-monster') && !isAdmin && 'group-hover:scale-110'}`}>
                    <Code2 className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" />
                  </div>
                  <h2 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-0.5 sm:mb-1">MetaData Monster</h2>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2 leading-tight line-clamp-2">
                    AI metadata with Seek & Capture mode. 5 prompt styles, CSV export.
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <span className="px-1.5 sm:px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] sm:text-xs font-semibold rounded-full flex items-center gap-0.5">
                      <Coins className="w-2 h-2 sm:w-3 sm:h-3" />
                      Coins
                    </span>
                    <span className="px-1.5 sm:px-2 py-0.5 bg-green-100 text-green-700 text-[10px] sm:text-xs font-semibold rounded-full">Seek & Capture</span>
                  </div>
                </button>

                {/* OFF State Overlay */}
                {isAdmin && getToolStatus('metadata-monster') === 'off' && (
                  <div className="absolute inset-0 bg-red-500/20 rounded-lg pointer-events-none" />
                )}

                {isAdmin && (
                  <div className="absolute top-1 right-1 flex gap-0.5 z-10">
                    <button onClick={(e) => updateToolState('metadata-monster', 'on', e)} className={`p-1 rounded transition-all ${getToolStatus('metadata-monster') === 'on' ? 'bg-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-gray-200 text-gray-600 hover:bg-green-100'}`} title="Turn ON"><Power className="w-3 h-3" /></button>
                    <button onClick={(e) => updateToolState('metadata-monster', 'disabled', e)} className={`p-1 rounded ${getToolStatus('metadata-monster') === 'disabled' ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-yellow-100'}`} title="Disable"><Ban className="w-3 h-3" /></button>
                    <button onClick={(e) => updateToolState('metadata-monster', 'off', e)} className={`p-1 rounded ${getToolStatus('metadata-monster') === 'off' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-red-100'}`} title="Turn OFF"><PowerOff className="w-3 h-3" /></button>
                  </div>
                )}
              </div>
            )}

            {/* AI Gallery Creator Tool */}
            {(!isToolHidden('ai-gallery-creator') || isAdmin) && (
              <div className="relative">
                <button
                  onClick={() => {
                    if (!isSmugMugConnected && !isAdmin) return;
                    if (isToolDisabled('ai-gallery-creator') && !isAdmin) return;
                    handleToolClick('/ai-gallery-creator');
                  }}
                  disabled={(isToolDisabled('ai-gallery-creator') || !isSmugMugConnected) && !isAdmin}
                  className={`w-full group bg-white rounded-lg p-2 sm:p-3 md:p-4 shadow-md transition-all border-2 text-left min-h-[60px] sm:min-h-[100px] touch-manipulation ${
                    ((isToolDisabled('ai-gallery-creator') || !isSmugMugConnected) && !isAdmin)
                      ? 'opacity-60 cursor-not-allowed border-gray-200'
                      : 'hover:shadow-xl active:shadow-lg active:scale-[0.98] border-gray-200 hover:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-500'
                  }`}
                  aria-label="Launch AI Gallery Creator to build folder structures with AI assistance"
                  title={!isSmugMugConnected && !isAdmin ? 'Connect to SmugMug to use this tool' : (isToolDisabled('ai-gallery-creator') && !isAdmin ? (toolStates['ai-gallery-creator']?.disabled_message || 'This feature is temporarily disabled') : '')}
                >
                  <div className={`bg-gradient-to-br from-teal-500 to-cyan-600 w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center mb-1 sm:mb-2 md:mb-3 transition-transform ${!isToolDisabled('ai-gallery-creator') && !isAdmin && 'group-hover:scale-110'}`}>
                    <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" />
                  </div>
                  <h2 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-0.5 sm:mb-1">AI Gallery Creator</h2>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2 leading-tight line-clamp-2">
                    AI + manual tools. 5 templates, destruction mode, guest links.
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <span className="px-1.5 sm:px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] sm:text-xs font-semibold rounded-full flex items-center gap-0.5">
                      <Coins className="w-2 h-2 sm:w-3 sm:h-3" />
                      Coins
                    </span>
                    <span className="px-1.5 sm:px-2 py-0.5 bg-teal-100 text-teal-700 text-[10px] sm:text-xs font-semibold rounded-full">5 Templates</span>
                  </div>
                </button>

                {/* OFF State Overlay */}
                {isAdmin && getToolStatus('ai-gallery-creator') === 'off' && (
                  <div className="absolute inset-0 bg-red-500/20 rounded-lg pointer-events-none" />
                )}

                {isAdmin && (
                  <div className="absolute top-1 right-1 flex gap-0.5 z-10">
                    <button onClick={(e) => updateToolState('ai-gallery-creator', 'on', e)} className={`p-1 rounded transition-all ${getToolStatus('ai-gallery-creator') === 'on' ? 'bg-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-gray-200 text-gray-600 hover:bg-green-100'}`} title="Turn ON"><Power className="w-3 h-3" /></button>
                    <button onClick={(e) => updateToolState('ai-gallery-creator', 'disabled', e)} className={`p-1 rounded ${getToolStatus('ai-gallery-creator') === 'disabled' ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-yellow-100'}`} title="Disable"><Ban className="w-3 h-3" /></button>
                    <button onClick={(e) => updateToolState('ai-gallery-creator', 'off', e)} className={`p-1 rounded ${getToolStatus('ai-gallery-creator') === 'off' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-red-100'}`} title="Turn OFF"><PowerOff className="w-3 h-3" /></button>
                  </div>
                )}
              </div>
            )}

            {/* Photo Organizer Tool */}
            {(!isToolHidden('photo-organizer') || isAdmin) && (
              <div className="relative">
                <button
                  onClick={() => {
                    if (!isSmugMugConnected && !isAdmin) return;
                    if (isToolDisabled('photo-organizer') && !isAdmin) return;
                    handleToolClick('/photo-organizer');
                  }}
                  disabled={(isToolDisabled('photo-organizer') || !isSmugMugConnected) && !isAdmin}
                  className={`w-full group bg-white rounded-lg p-2 sm:p-3 md:p-4 shadow-md transition-all border-2 text-left min-h-[60px] sm:min-h-[100px] touch-manipulation ${
                    ((isToolDisabled('photo-organizer') || !isSmugMugConnected) && !isAdmin)
                      ? 'opacity-60 cursor-not-allowed border-gray-200'
                      : 'hover:shadow-xl active:shadow-lg active:scale-[0.98] border-gray-200 hover:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500'
                  }`}
                  aria-label="Launch Photo Organizer for AI-powered smart photo organization"
                  title={!isSmugMugConnected && !isAdmin ? 'Connect to SmugMug to use this tool' : (isToolDisabled('photo-organizer') && !isAdmin ? (toolStates['photo-organizer']?.disabled_message || 'This feature is temporarily disabled') : '')}
                >
                  <div className={`bg-gradient-to-br from-indigo-500 to-purple-600 w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center mb-1 sm:mb-2 md:mb-3 transition-transform ${!isToolDisabled('photo-organizer') && !isAdmin && 'group-hover:scale-110'}`}>
                    <Brain className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" />
                  </div>
                  <h2 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-0.5 sm:mb-1">Photo Organizer</h2>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2 leading-tight line-clamp-2">
                    AI-powered photo organization with smart indexing.
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <span className="px-1.5 sm:px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] sm:text-xs font-semibold rounded-full flex items-center gap-0.5">
                      <Coins className="w-2 h-2 sm:w-3 sm:h-3" />
                      Coins
                    </span>
                    <span className="px-1.5 sm:px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] sm:text-xs font-semibold rounded-full">Auto-Sort</span>
                  </div>
                </button>

                {/* OFF State Overlay */}
                {isAdmin && getToolStatus('photo-organizer') === 'off' && (
                  <div className="absolute inset-0 bg-red-500/20 rounded-lg pointer-events-none" />
                )}

                {isAdmin && (
                  <div className="absolute top-1 right-1 flex gap-0.5 z-10">
                    <button onClick={(e) => updateToolState('photo-organizer', 'on', e)} className={`p-1 rounded transition-all ${getToolStatus('photo-organizer') === 'on' ? 'bg-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-gray-200 text-gray-600 hover:bg-green-100'}`} title="Turn ON"><Power className="w-3 h-3" /></button>
                    <button onClick={(e) => updateToolState('photo-organizer', 'disabled', e)} className={`p-1 rounded ${getToolStatus('photo-organizer') === 'disabled' ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-yellow-100'}`} title="Disable"><Ban className="w-3 h-3" /></button>
                    <button onClick={(e) => updateToolState('photo-organizer', 'off', e)} className={`p-1 rounded ${getToolStatus('photo-organizer') === 'off' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-red-100'}`} title="Turn OFF"><PowerOff className="w-3 h-3" /></button>
                  </div>
                )}
              </div>
            )}

            {/* Guest Upload Manager Tool */}
            {(!isToolHidden('guest-upload-manager') || isAdmin) && (
              <div className="relative">
                <button
                  onClick={() => {
                    if (!isSmugMugConnected && !isAdmin) return;
                    if (isToolDisabled('guest-upload-manager') && !isAdmin) return;
                    handleToolClick('/guest-upload-manager');
                  }}
                  disabled={(isToolDisabled('guest-upload-manager') || !isSmugMugConnected) && !isAdmin}
                  className={`w-full group bg-white rounded-lg p-2 sm:p-3 md:p-4 shadow-md transition-all border-2 text-left min-h-[60px] sm:min-h-[100px] touch-manipulation ${
                    ((isToolDisabled('guest-upload-manager') || !isSmugMugConnected) && !isAdmin)
                      ? 'opacity-60 cursor-not-allowed border-gray-200'
                      : 'hover:shadow-xl active:shadow-lg active:scale-[0.98] border-gray-200 hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500'
                  }`}
                  aria-label="Launch Guest Upload Manager to create shareable upload links for clients"
                  title={!isSmugMugConnected && !isAdmin ? 'Connect to SmugMug to use this tool' : (isToolDisabled('guest-upload-manager') && !isAdmin ? (toolStates['guest-upload-manager']?.disabled_message || 'This feature is temporarily disabled') : '')}
                >
                  <div className={`bg-gradient-to-br from-blue-500 to-cyan-600 w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center mb-1 sm:mb-2 md:mb-3 transition-transform ${!isToolDisabled('guest-upload-manager') && !isAdmin && 'group-hover:scale-110'}`}>
                    <Upload className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" />
                  </div>
                  <h2 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-0.5 sm:mb-1">Guest Upload Manager</h2>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2 leading-tight line-clamp-2">
                    Project-based with people library. Drag-and-drop management.
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <span className="px-1.5 sm:px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] sm:text-xs font-semibold rounded-full">Projects</span>
                    <span className="px-1.5 sm:px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] sm:text-xs font-semibold rounded-full">Drag-Drop</span>
                  </div>
                </button>

                {/* OFF State Overlay */}
                {isAdmin && getToolStatus('guest-upload-manager') === 'off' && (
                  <div className="absolute inset-0 bg-red-500/20 rounded-lg pointer-events-none" />
                )}

                {isAdmin && (
                  <div className="absolute top-1 right-1 flex gap-0.5 z-10">
                    <button onClick={(e) => updateToolState('guest-upload-manager', 'on', e)} className={`p-1 rounded transition-all ${getToolStatus('guest-upload-manager') === 'on' ? 'bg-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-gray-200 text-gray-600 hover:bg-green-100'}`} title="Turn ON"><Power className="w-3 h-3" /></button>
                    <button onClick={(e) => updateToolState('guest-upload-manager', 'disabled', e)} className={`p-1 rounded ${getToolStatus('guest-upload-manager') === 'disabled' ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-yellow-100'}`} title="Disable"><Ban className="w-3 h-3" /></button>
                    <button onClick={(e) => updateToolState('guest-upload-manager', 'off', e)} className={`p-1 rounded ${getToolStatus('guest-upload-manager') === 'off' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-red-100'}`} title="Turn OFF"><PowerOff className="w-3 h-3" /></button>
                  </div>
                )}
              </div>
            )}

            {/* Folder Downloader Tool */}
            {(!isToolHidden('downloader') || isAdmin) && (
              <div className="relative">
                <button
                  onClick={() => {
                    if (!isSmugMugConnected && !isAdmin) return;
                    if (isToolDisabled('downloader') && !isAdmin) return;
                    handleToolClick('/downloader');
                  }}
                  disabled={(isToolDisabled('downloader') || !isSmugMugConnected) && !isAdmin}
                  className={`w-full group bg-white rounded-lg p-2 sm:p-3 md:p-4 shadow-md transition-all border-2 text-left min-h-[60px] sm:min-h-[100px] touch-manipulation ${
                    ((isToolDisabled('downloader') || !isSmugMugConnected) && !isAdmin)
                      ? 'opacity-60 cursor-not-allowed border-gray-200'
                      : 'hover:shadow-xl active:shadow-lg active:scale-[0.98] border-gray-200 hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500'
                  }`}
                  aria-label="Launch Folder Downloader to download photos with preserved folder hierarchy"
                  title={!isSmugMugConnected && !isAdmin ? 'Connect to SmugMug to use this tool' : (isToolDisabled('downloader') && !isAdmin ? (toolStates['downloader']?.disabled_message || 'This feature is temporarily disabled') : '')}
                >
                  <div className={`bg-gradient-to-br from-blue-500 to-cyan-600 w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center mb-1 sm:mb-2 md:mb-3 transition-transform ${!isToolDisabled('downloader') && !isAdmin && 'group-hover:scale-110'}`}>
                    <Download className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" />
                  </div>
                  <h2 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-0.5 sm:mb-1">Folder Downloader</h2>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2 leading-tight line-clamp-2">
                    3 download strategies, 5 size options. Preserves hierarchy.
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <span className="px-1.5 sm:px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] sm:text-xs font-semibold rounded-full">3 Strategies</span>
                    <span className="px-1.5 sm:px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] sm:text-xs font-semibold rounded-full">5 Sizes</span>
                  </div>
                </button>

                {/* OFF State Overlay */}
                {isAdmin && getToolStatus('downloader') === 'off' && (
                  <div className="absolute inset-0 bg-red-500/20 rounded-lg pointer-events-none" />
                )}

                {isAdmin && (
                  <div className="absolute top-1 right-1 flex gap-0.5 z-10">
                    <button onClick={(e) => updateToolState('downloader', 'on', e)} className={`p-1 rounded transition-all ${getToolStatus('downloader') === 'on' ? 'bg-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-gray-200 text-gray-600 hover:bg-green-100'}`} title="Turn ON"><Power className="w-3 h-3" /></button>
                    <button onClick={(e) => updateToolState('downloader', 'disabled', e)} className={`p-1 rounded ${getToolStatus('downloader') === 'disabled' ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-yellow-100'}`} title="Disable"><Ban className="w-3 h-3" /></button>
                    <button onClick={(e) => updateToolState('downloader', 'off', e)} className={`p-1 rounded ${getToolStatus('downloader') === 'off' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-red-100'}`} title="Turn OFF"><PowerOff className="w-3 h-3" /></button>
                  </div>
                )}
              </div>
            )}

            {/* Sanity Checker Tool */}
            {(!isToolHidden('sanity-checker') || isAdmin) && (
              <div className="relative">
                <button
                  onClick={() => {
                    if (!isSmugMugConnected && !isAdmin) return;
                    if (isToolDisabled('sanity-checker') && !isAdmin) return;
                    handleToolClick('/sanity-checker');
                  }}
                  disabled={(isToolDisabled('sanity-checker') || !isSmugMugConnected) && !isAdmin}
                  className={`w-full group bg-white rounded-lg p-2 sm:p-3 md:p-4 shadow-md transition-all border-2 text-left min-h-[60px] sm:min-h-[100px] touch-manipulation ${
                    ((isToolDisabled('sanity-checker') || !isSmugMugConnected) && !isAdmin)
                      ? 'opacity-60 cursor-not-allowed border-gray-200'
                      : 'hover:shadow-xl active:shadow-lg active:scale-[0.98] border-gray-200 hover:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-500'
                  }`}
                  aria-label="Launch Sanity Checker for comprehensive account analysis and optimization"
                  title={!isSmugMugConnected && !isAdmin ? 'Connect to SmugMug to use this tool' : (isToolDisabled('sanity-checker') && !isAdmin ? (toolStates['sanity-checker']?.disabled_message || 'This feature is temporarily disabled') : '')}
                >
                  <div className={`bg-gradient-to-br from-orange-500 to-red-600 w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center mb-1 sm:mb-2 md:mb-3 transition-transform ${!isToolDisabled('sanity-checker') && !isAdmin && 'group-hover:scale-110'}`}>
                    <ClipboardCheck className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" />
                  </div>
                  <h2 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-0.5 sm:mb-1">Sanity Checker</h2>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2 leading-tight line-clamp-2">
                    AI analysis with severity grouping. Auto-fix for some issues.
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <span className="px-1.5 sm:px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] sm:text-xs font-semibold rounded-full flex items-center gap-0.5">
                      <Coins className="w-2 h-2 sm:w-3 sm:h-3" />
                      Coins
                    </span>
                    <span className="px-1.5 sm:px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] sm:text-xs font-semibold rounded-full">Auto-Fix</span>
                  </div>
                </button>

                {/* OFF State Overlay */}
                {isAdmin && getToolStatus('sanity-checker') === 'off' && (
                  <div className="absolute inset-0 bg-red-500/20 rounded-lg pointer-events-none" />
                )}

                {isAdmin && (
                  <div className="absolute top-1 right-1 flex gap-0.5 z-10">
                    <button onClick={(e) => updateToolState('sanity-checker', 'on', e)} className={`p-1 rounded transition-all ${getToolStatus('sanity-checker') === 'on' ? 'bg-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-gray-200 text-gray-600 hover:bg-green-100'}`} title="Turn ON"><Power className="w-3 h-3" /></button>
                    <button onClick={(e) => updateToolState('sanity-checker', 'disabled', e)} className={`p-1 rounded ${getToolStatus('sanity-checker') === 'disabled' ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-yellow-100'}`} title="Disable"><Ban className="w-3 h-3" /></button>
                    <button onClick={(e) => updateToolState('sanity-checker', 'off', e)} className={`p-1 rounded ${getToolStatus('sanity-checker') === 'off' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-red-100'}`} title="Turn OFF"><PowerOff className="w-3 h-3" /></button>
                  </div>
                )}
              </div>
            )}

            {/* Feature Request Card */}
            <button
              onClick={() => router.push('/feature-request')}
              className="group bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-2 sm:p-3 md:p-4 shadow-md hover:shadow-xl active:shadow-lg active:scale-[0.98] transition-all border-2 border-dashed border-gray-300 hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200 text-left min-h-[60px] sm:min-h-[100px] touch-manipulation"
              aria-label="Submit a feature request"
            >
              <div className="bg-gradient-to-br from-purple-400 to-pink-500 w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center mb-1 sm:mb-2 md:mb-3 group-hover:scale-110 transition-transform">
                <MessageSquarePlus className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" />
              </div>
              <h2 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-0.5 sm:mb-1">Feature Request</h2>
              <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2 leading-tight line-clamp-2">
                Have an idea? Let us know what features you'd like to see!
              </p>
              <div className="flex flex-wrap gap-1">
                <span className="px-1.5 sm:px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] sm:text-xs font-semibold rounded-full">Feedback</span>
                <span className="px-1.5 sm:px-2 py-0.5 bg-pink-100 text-pink-700 text-[10px] sm:text-xs font-semibold rounded-full">New</span>
              </div>
            </button>
          </div>
        </div>

        {/* Footer Disclaimer */}
        <footer className="mt-12 pb-6">
          <div className="max-w-7xl mx-auto px-4">
            <p className="text-xs text-gray-500 text-center">
              Not an official SmugMug app. These tools can delete, move, or modify your content. Use at your own risk.{' '}
              <a href="https://www.smugmug.com/app/library/trash" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-700">
                Recover deleted items
              </a>
            </p>
          </div>
        </footer>
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
                    if (!isSmugMugConnected && !isAdmin) return;
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
