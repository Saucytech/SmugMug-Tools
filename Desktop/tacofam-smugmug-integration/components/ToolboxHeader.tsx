'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Wrench, ChevronDown, LogOut, User, ShoppingCart, Heart, Code2, Home } from 'lucide-react';
import { tokenStorage } from '@/lib/smugmug-client';

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
];

interface ToolboxHeaderProps {
  currentTool?: string;
}

export default function ToolboxHeader({ currentTool }: ToolboxHeaderProps) {
  const router = useRouter();
  const [showToolsDropdown, setShowToolsDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const tokens = tokenStorage.getTokens();
    if (!tokens) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/smugmug/user', {
        headers: {
          'X-Access-Token': tokens.accessToken,
          'X-Access-Token-Secret': tokens.accessTokenSecret,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (err) {
      console.error('Error loading user:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    tokenStorage.clearTokens();
    router.push('/');
  };

  const getCurrentTool = () => {
    return TOOLS.find(t => t.id === currentTool);
  };

  const activeTool = getCurrentTool();

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Logo & Tool Selector */}
          <div className="flex items-center gap-6">
            {/* Logo */}
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <Wrench className="w-7 h-7 text-purple-600" />
              <div className="flex flex-col">
                <span className="text-lg font-bold text-gray-900">SmugMug Toolbox</span>
                {activeTool && (
                  <span className="text-xs text-gray-500">/ {activeTool.name}</span>
                )}
              </div>
            </button>

            {/* Tool Switcher */}
            {currentTool && (
              <div className="relative">
                <button
                  onClick={() => setShowToolsDropdown(!showToolsDropdown)}
                  onBlur={() => setTimeout(() => setShowToolsDropdown(false), 200)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium text-gray-700"
                >
                  {activeTool?.icon}
                  <span>{activeTool?.name || 'Tools'}</span>
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
                          <div className="font-medium text-gray-900">Toolbox Home</div>
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

          {/* Right: User Info & Logout */}
          <div className="flex items-center gap-4">
            {loading ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  onBlur={() => setTimeout(() => setShowUserMenu(false), 200)}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {user.ImageUrl ? (
                    <img
                      src={user.ImageUrl}
                      alt={user.NickName}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                      {user.NickName?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <div className="text-left">
                    <div className="text-sm font-semibold text-gray-900">
                      {user.NickName || user.Name || 'User'}
                    </div>
                    <div className="text-xs text-gray-500">SmugMug Account</div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* User Menu Dropdown */}
                {showUserMenu && (
                  <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                    <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-b border-gray-200">
                      <div className="flex items-center gap-3">
                        {user.ImageUrl ? (
                          <img
                            src={user.ImageUrl}
                            alt={user.NickName}
                            className="w-12 h-12 rounded-full"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                            {user.NickName?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-gray-900">
                            {user.NickName || user.Name}
                          </div>
                          {user.Domain && (
                            <a
                              href={`https://${user.Domain}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-purple-600 hover:underline"
                            >
                              {user.Domain}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-2">
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
                onClick={() => router.push('/')}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
              >
                <User className="w-4 h-4" />
                Connect Account
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
