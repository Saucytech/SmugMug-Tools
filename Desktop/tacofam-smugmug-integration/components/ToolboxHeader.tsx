'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Wrench, ChevronDown, LogOut, User, ShoppingCart, Heart, Code2, Home, Sparkles, Brain, Upload, ClipboardCheck, Grid, Book, Eye, Coins, BarChart3, LogIn, Download, Link2 } from 'lucide-react';
import { tokenStorage } from '@/lib/smugmug-client';
import AIActivityIndicator from '@/components/AIActivityIndicator';
import { useCoinBalance } from '@/stores/coinBalanceStore';

interface Tool {
  id: string;
  name: string;
  icon: React.ReactNode;
  path: string;
  color: string;
}

const TOOLS: Tool[] = [
  {
    id: 'embed-sell',
    name: 'Embed & Sell',
    icon: <ShoppingCart className="w-4 h-4" />,
    path: '/',
    color: 'text-purple-600',
  },
  {
    id: 'favorites',
    name: 'Favorites Selector',
    icon: <Heart className="w-4 h-4" />,
    path: '/favorites-manager',
    color: 'text-pink-600',
  },
  {
    id: 'metadata-monster',
    name: 'MetaData Monster',
    icon: <Code2 className="w-4 h-4" />,
    path: '/metadata-monster',
    color: 'text-green-600',
  },
  {
    id: 'ai-gallery-creator',
    name: 'AI Gallery Creator',
    icon: <Sparkles className="w-4 h-4" />,
    path: '/ai-gallery-creator',
    color: 'text-teal-600',
  },
  {
    id: 'photo-organizer',
    name: 'Photo Organizer',
    icon: <Brain className="w-4 h-4" />,
    path: '/photo-organizer',
    color: 'text-indigo-600',
  },
  {
    id: 'guest-upload-manager',
    name: 'Guest Upload Manager',
    icon: <Upload className="w-4 h-4" />,
    path: '/guest-upload-manager',
    color: 'text-blue-600',
  },
  {
    id: 'api-reference',
    name: 'API Reference',
    icon: <Book className="w-4 h-4" />,
    path: '/api-reference',
    color: 'text-amber-600',
  },
  {
    id: 'metadata-viewer',
    name: 'Metadata Viewer',
    icon: <Eye className="w-4 h-4" />,
    path: '/metadata',
    color: 'text-slate-600',
  },
  {
    id: 'downloader',
    name: 'Folder Downloader',
    icon: <Download className="w-4 h-4" />,
    path: '/downloader',
    color: 'text-blue-600',
  },
  {
    id: 'sanity-checker',
    name: 'Sanity Checker',
    icon: <ClipboardCheck className="w-4 h-4" />,
    path: '/sanity-checker',
    color: 'text-orange-600',
  },
];

interface ToolboxHeaderProps {
  currentTool?: string;
}

export default function ToolboxHeader({ currentTool }: ToolboxHeaderProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [showToolsDropdown, setShowToolsDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCoinMenu, setShowCoinMenu] = useState(false);
  const [smugmugUser, setSmugmugUser] = useState<any>(null);

  // Use centralized coin balance store
  const { balance: coinBalance, addCoins } = useCoinBalance();

  useEffect(() => {
    if (session) {
      loadSmugmugUser();
    }
  }, [session]);

  const handleTopUp = (amount: number, price: string) => {
    addCoins(amount, `Purchased ${amount.toLocaleString()} Coins for ${price}`);
    setShowCoinMenu(false);
  };

  const handleConnectSmugMug = () => {
    window.location.href = '/api/auth/smugmug';
  };

  const handleDisconnectSmugMug = async () => {
    if (!confirm('Are you sure you want to disconnect your SmugMug account? You can reconnect anytime.')) {
      return;
    }

    try {
      const response = await fetch('/api/auth/smugmug/disconnect', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        setSmugmugUser(null);
        // Optionally reload the page to clear any cached data
        window.location.reload();
      } else {
        alert('Failed to disconnect SmugMug account. Please try again.');
      }
    } catch (error) {
      console.error('Error disconnecting SmugMug:', error);
      alert('Failed to disconnect SmugMug account. Please try again.');
    }
  };

  const loadSmugmugUser = async () => {
    try {
      // Fetch SmugMug user info (tokens are in HTTP-only cookies)
      const response = await fetch('/api/smugmug/user', {
        credentials: 'include', // Send cookies
      });

      if (response.ok) {
        const data = await response.json();
        setSmugmugUser(data.user);
      } else if (response.status === 401) {
        // Not connected to SmugMug
        setSmugmugUser(null);
      }
    } catch (err) {
      console.error('Error loading SmugMug user:', err);
      setSmugmugUser(null);
    }
  };

  const handleLogout = async () => {
    tokenStorage.clearTokens();
    localStorage.removeItem('photo-organizer-index');
    await signOut({ redirect: false });
    router.push('/');
  };

  const getCurrentTool = () => {
    return TOOLS.find(t => t.id === currentTool);
  };

  const activeTool = getCurrentTool();

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Logo & Tool Selector */}
          <div className="flex items-center gap-2 sm:gap-4 md:gap-6 min-w-0 flex-1">
            {/* Logo */}
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-1.5 sm:gap-2 hover:opacity-80 transition-opacity min-h-[44px] touch-manipulation shrink-0"
            >
              <Wrench className="w-6 h-6 sm:w-7 sm:h-7 text-purple-600 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-sm sm:text-base md:text-lg font-bold text-gray-900 truncate">Smugtools</span>
                {activeTool && (
                  <span className="text-xs text-gray-500 truncate hidden sm:block">/ {activeTool.name}</span>
                )}
              </div>
            </button>

            {/* Tool Switcher */}
            {currentTool && (
              <div className="relative hidden md:block">
                <button
                  onClick={() => setShowToolsDropdown(!showToolsDropdown)}
                  onBlur={() => setTimeout(() => setShowToolsDropdown(false), 200)}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg transition-colors text-sm font-medium text-gray-700 min-h-[44px] touch-manipulation"
                >
                  {activeTool?.icon}
                  <span className="hidden lg:inline">{activeTool?.name || 'Tools'}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showToolsDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown */}
                {showToolsDropdown && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                    <div className="p-2">
                      <button
                        onClick={() => {
                          router.push('/');
                          setShowToolsDropdown(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                      >
                        <Home className="w-4 h-4 text-gray-600" />
                        <div>
                          <div className="font-medium text-gray-900">Smugtools Home</div>
                          <div className="text-xs text-gray-500">View all tools</div>
                        </div>
                      </button>

                      <div className="h-px bg-gray-200 my-2" />

                      {TOOLS.filter(t => t.id !== currentTool).map(tool => (
                        <button
                          key={tool.id}
                          onClick={() => {
                            router.push(tool.path);
                            setShowToolsDropdown(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                        >
                          <div className={tool.color}>{tool.icon}</div>
                          <div>
                            <div className="font-medium text-gray-900">{tool.name}</div>
                            <div className="text-xs text-gray-500">Switch to {tool.name}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: AI Activity Indicator, Token Balance & User Info */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {/* AI Activity Indicator */}
            <AIActivityIndicator />

            {/* Coin Balance */}
            {session && (
              <div className="relative">
                <button
                  onClick={() => setShowCoinMenu(!showCoinMenu)}
                  onBlur={() => setTimeout(() => setShowCoinMenu(false), 200)}
                  className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 active:scale-[0.98] rounded-lg transition-all shadow-sm hover:shadow-md min-h-[44px] touch-manipulation"
                  aria-label="Coin Balance"
                >
                  <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  <span className="text-xs sm:text-sm font-bold text-white hidden sm:inline">
                    {coinBalance.toLocaleString()}
                  </span>
                </button>

                {/* Coin Menu Dropdown */}
                {showCoinMenu && (
                  <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50">
                    <div className="p-4 bg-gradient-to-r from-yellow-400 to-amber-500">
                      <div className="flex items-center gap-2 mb-1">
                        <Coins className="w-5 h-5 text-white" />
                        <h3 className="text-lg font-bold text-white">Coins</h3>
                      </div>
                      <p className="text-3xl font-bold text-white">{coinBalance.toLocaleString()}</p>
                      <p className="text-xs text-white/80 mt-1">In-app currency for AI operations</p>
                    </div>

                    <div className="p-4">
                      <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-900 font-medium">
                          💡 Coins are our in-app currency. They&apos;re automatically spent when AI processes your photos.
                        </p>
                      </div>

                      <p className="text-sm text-gray-600 mb-3 font-semibold">Purchase More Coins:</p>

                      <div className="space-y-2">
                        <button
                          onClick={() => handleTopUp(5000, '$5.00')}
                          className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border border-green-200 rounded-lg transition-colors"
                        >
                          <span className="text-sm font-semibold text-gray-900">+5,000 Coins</span>
                          <span className="text-xs text-green-600 font-bold">$5.00</span>
                        </button>

                        <button
                          onClick={() => handleTopUp(25000, '$20.00')}
                          className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 rounded-lg transition-colors"
                        >
                          <div className="flex flex-col items-start">
                            <span className="text-sm font-semibold text-gray-900">+25,000 Coins</span>
                            <span className="text-xs text-blue-600">Most Popular</span>
                          </div>
                          <span className="text-xs text-blue-600 font-bold">$20.00</span>
                        </button>

                        <button
                          onClick={() => handleTopUp(100000, '$75.00')}
                          className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border border-purple-200 rounded-lg transition-colors"
                        >
                          <div className="flex flex-col items-start">
                            <span className="text-sm font-semibold text-gray-900">+100,000 Coins</span>
                            <span className="text-xs text-purple-600">Best Value - 20% Bonus</span>
                          </div>
                          <span className="text-xs text-purple-600 font-bold">$75.00</span>
                        </button>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-500 text-center leading-relaxed">
                          Used by MetaData Monster, AI Gallery Creator, Photo Organizer & Sanity Checker
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {status === 'loading' ? (
              <div className="text-xs sm:text-sm text-gray-500">Loading...</div>
            ) : session ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  onBlur={() => setTimeout(() => setShowUserMenu(false), 200)}
                  className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors min-h-[44px] touch-manipulation"
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                    {session.user?.name?.charAt(0)?.toUpperCase() || session.user?.email?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="text-left hidden sm:block min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">
                      {session.user?.name || session.user?.email || 'User'}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {(session.user as any)?.role === 'admin' ? 'Admin' : 'User'}
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform shrink-0 ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* User Menu Dropdown */}
                {showUserMenu && (
                  <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                    <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-b border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                          {session.user?.name?.charAt(0)?.toUpperCase() || session.user?.email?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">
                            {session.user?.name || 'User'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {session.user?.email}
                          </div>
                          {smugmugUser?.Domain && (
                            <a
                              href={`https://${smugmugUser.Domain}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-purple-600 hover:underline"
                            >
                              {smugmugUser.Domain}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-2">
                      {(session.user as any)?.role === 'admin' && (
                        <>
                          <button
                            onClick={() => {
                              router.push('/admin');
                              setShowUserMenu(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-purple-50 rounded-lg transition-colors text-left"
                          >
                            <BarChart3 className="w-4 h-4 text-purple-600" />
                            <div>
                              <div className="font-medium text-gray-900">Admin Dashboard</div>
                              <div className="text-xs text-gray-500">Platform analytics</div>
                            </div>
                          </button>
                          <div className="h-px bg-gray-200 my-2" />
                        </>
                      )}

                      <button
                        onClick={() => {
                          router.push('/ai-dashboard');
                          setShowUserMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-purple-50 rounded-lg transition-colors text-left"
                      >
                        <BarChart3 className="w-4 h-4 text-purple-600" />
                        <div>
                          <div className="font-medium text-gray-900">My AI Operations</div>
                          <div className="text-xs text-gray-500">Track your usage</div>
                        </div>
                      </button>

                      <div className="h-px bg-gray-200 my-2" />

                      {!smugmugUser ? (
                        <button
                          onClick={handleConnectSmugMug}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-green-50 rounded-lg transition-colors text-left"
                        >
                          <Link2 className="w-4 h-4 text-green-600" />
                          <div>
                            <div className="font-medium text-gray-900">Connect to SmugMug</div>
                            <div className="text-xs text-gray-500">Link your SmugMug account</div>
                          </div>
                        </button>
                      ) : (
                        <div className="px-4 py-3 bg-green-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Link2 className="w-4 h-4 text-green-600" />
                            <div className="text-sm font-medium text-gray-900">Connected to SmugMug</div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-500">
                              {smugmugUser.NickName}
                            </div>
                            <button
                              onClick={handleDisconnectSmugMug}
                              className="text-xs text-red-600 hover:text-red-700 hover:underline transition-colors"
                            >
                              Disconnect
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="h-px bg-gray-200 my-2" />

                      <button
                        onClick={() => {
                          handleLogout();
                          setShowUserMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 rounded-lg transition-colors text-left text-red-600"
                      >
                        <LogOut className="w-4 h-4" />
                        <div className="font-medium">Logout</div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => router.push('/auth/signin')}
                className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 active:scale-[0.98] text-white px-3 sm:px-4 py-2 rounded-lg transition-all text-xs sm:text-sm font-semibold min-h-[44px] touch-manipulation shadow-lg hover:shadow-xl"
              >
                <LogIn className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Sign In</span>
                <span className="sm:hidden">Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
