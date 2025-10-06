'use client';

import { useState, useEffect } from 'react';
import { tokenStorage } from '@/lib/smugmug-client';
import { Upload, Copy, CheckCircle, XCircle, RefreshCw, Eye, EyeOff, Link2 } from 'lucide-react';

interface Album {
  AlbumKey: string;
  Name: string;
  Uri: string;
  UrlName: string;
  ImageCount: number;
  UploadKey?: string;
  Password?: string;
  SecurityType?: string;
  WebUri?: string;
}

interface GuestUploadInfo {
  albumKey: string;
  albumName: string;
  uploadUrl: string;
  password: string;
  imageCount: number;
  webUri?: string;
}

export default function GuestUploadManager() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [guestUploadLinks, setGuestUploadLinks] = useState<GuestUploadInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [userNickname, setUserNickname] = useState<string>('');
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});
  const [selectedAlbums, setSelectedAlbums] = useState<Set<string>>(new Set());

  useEffect(() => {
    const tokens = tokenStorage.getTokens();
    if (!tokens) {
      window.location.href = '/';
      return;
    }
    fetchUserAndAlbums();
  }, []);

  const fetchUserAndAlbums = async () => {
    setLoading(true);
    try {
      const tokens = tokenStorage.getTokens();
      if (!tokens) return;

      // Fetch user info
      const userResponse = await fetch('/api/smugmug/user', {
        headers: {
          'X-Access-Token': tokens.accessToken,
          'X-Access-Token-Secret': tokens.accessTokenSecret,
        },
      });
      const userData = await userResponse.json();
      const nickname = userData.user?.NickName || '';
      setUserNickname(nickname);

      // Fetch all albums
      const albumsResponse = await fetch('/api/smugmug/albums', {
        headers: {
          'X-Access-Token': tokens.accessToken,
          'X-Access-Token-Secret': tokens.accessTokenSecret,
        },
      });
      const albumsData = await albumsResponse.json();
      const albumsList = albumsData.albums || [];
      setAlbums(albumsList);

      // Filter albums that already have guest uploads enabled
      const existingGuestUploads: GuestUploadInfo[] = albumsList
        .filter((album: Album) => album.UploadKey && album.Password)
        .map((album: Album) => ({
          albumKey: album.AlbumKey,
          albumName: album.Name,
          uploadUrl: `https://${nickname}.smugmug.com/upload/${album.AlbumKey}/${album.UploadKey}/`,
          password: album.Password || '',
          imageCount: album.ImageCount || 0,
          webUri: album.WebUri,
        }));

      setGuestUploadLinks(existingGuestUploads);
    } catch (error) {
      console.error('Error fetching albums:', error);
    } finally {
      setLoading(false);
    }
  };

  const enableGuestUpload = async (albumKey: string, albumUri: string, albumName: string) => {
    setCreatingFor(albumKey);
    try {
      const tokens = tokenStorage.getTokens();
      if (!tokens) return;

      // Generate upload key and password
      const uploadKey = Math.random().toString(36).substring(2, 18);
      const password = Math.random().toString(36).substring(2, 10);

      // PATCH the album to enable guest uploads
      const response = await fetch(`/api/smugmug/album/${albumKey}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Access-Token': tokens.accessToken,
          'X-Access-Token-Secret': tokens.accessTokenSecret,
        },
        body: JSON.stringify({
          albumUri,
          updates: {
            UploadKey: uploadKey,
            SecurityType: 'Password',
            Password: password,
          },
        }),
      });

      if (response.ok) {
        const uploadUrl = `https://${userNickname}.smugmug.com/upload/${albumKey}/${uploadKey}/`;

        setGuestUploadLinks((prev) => [
          ...prev,
          {
            albumKey,
            albumName,
            uploadUrl,
            password,
            imageCount: albums.find(a => a.AlbumKey === albumKey)?.ImageCount || 0,
          },
        ]);

        // Refresh albums to update the list
        await fetchUserAndAlbums();
      } else {
        alert('Failed to enable guest uploads. Please try again.');
      }
    } catch (error) {
      console.error('Error enabling guest upload:', error);
      alert('Error enabling guest uploads.');
    } finally {
      setCreatingFor(null);
    }
  };

  const copyToClipboard = (text: string, albumKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(albumKey);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const togglePasswordVisibility = (albumKey: string) => {
    setShowPasswords((prev) => ({ ...prev, [albumKey]: !prev[albumKey] }));
  };

  const toggleAlbumSelection = (albumKey: string) => {
    setSelectedAlbums((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(albumKey)) {
        newSet.delete(albumKey);
      } else {
        newSet.add(albumKey);
      }
      return newSet;
    });
  };

  const exportSelectedLinks = () => {
    const selectedLinks = guestUploadLinks
      .filter((link) => selectedAlbums.has(link.albumKey))
      .map((link) => `${link.albumName}\nUpload URL: ${link.uploadUrl}\nPassword: ${link.password}\n`)
      .join('\n');

    if (selectedLinks) {
      navigator.clipboard.writeText(selectedLinks);
      alert(`Copied ${selectedAlbums.size} guest upload link(s) to clipboard!`);
      setSelectedAlbums(new Set());
    }
  };

  const albumsWithoutGuestUpload = albums.filter(
    (album) => !guestUploadLinks.some((link) => link.albumKey === album.AlbumKey)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Upload className="w-12 h-12 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Guest Upload Manager</h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Create and manage guest upload links for your SmugMug galleries. Share these links with clients
            or guests to allow them to upload photos directly to your albums.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active Guest Upload Links */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  Active Guest Upload Links ({guestUploadLinks.length})
                </h2>
                {selectedAlbums.size > 0 && (
                  <button
                    onClick={exportSelectedLinks}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Export Selected ({selectedAlbums.size})
                  </button>
                )}
              </div>

              {guestUploadLinks.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Upload className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">No guest upload links created yet.</p>
                  <p className="text-sm">Enable guest uploads for your albums below to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {guestUploadLinks.map((link) => (
                    <div
                      key={link.albumKey}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <input
                            type="checkbox"
                            checked={selectedAlbums.has(link.albumKey)}
                            onChange={() => toggleAlbumSelection(link.albumKey)}
                            className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900 mb-2">{link.albumName}</h3>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-600">Upload URL:</span>
                                <code className="text-sm bg-gray-100 px-2 py-1 rounded flex-1 font-mono">
                                  {link.uploadUrl}
                                </code>
                                <button
                                  onClick={() => copyToClipboard(link.uploadUrl, link.albumKey)}
                                  className="text-blue-600 hover:text-blue-700 p-1"
                                  title="Copy URL"
                                >
                                  {copiedLink === link.albumKey ? (
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                  ) : (
                                    <Copy className="w-5 h-5" />
                                  )}
                                </button>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-600">Password:</span>
                                <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                                  {showPasswords[link.albumKey] ? link.password : '••••••••'}
                                </code>
                                <button
                                  onClick={() => togglePasswordVisibility(link.albumKey)}
                                  className="text-gray-600 hover:text-gray-700 p-1"
                                  title={showPasswords[link.albumKey] ? 'Hide password' : 'Show password'}
                                >
                                  {showPasswords[link.albumKey] ? (
                                    <EyeOff className="w-5 h-5" />
                                  ) : (
                                    <Eye className="w-5 h-5" />
                                  )}
                                </button>
                                <button
                                  onClick={() => copyToClipboard(link.password, `${link.albumKey}-pass`)}
                                  className="text-blue-600 hover:text-blue-700 p-1"
                                  title="Copy password"
                                >
                                  {copiedLink === `${link.albumKey}-pass` ? (
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                  ) : (
                                    <Copy className="w-5 h-5" />
                                  )}
                                </button>
                              </div>
                              <div className="text-sm text-gray-600">
                                📸 {link.imageCount} photos •
                                {link.webUri && (
                                  <a
                                    href={link.webUri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-700 ml-2"
                                  >
                                    View Gallery →
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Albums Without Guest Upload */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <XCircle className="w-6 h-6 text-gray-400" />
                Albums Without Guest Upload ({albumsWithoutGuestUpload.length})
              </h2>

              {albumsWithoutGuestUpload.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-300" />
                  <p className="text-lg">All your albums have guest upload enabled!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {albumsWithoutGuestUpload.map((album) => (
                    <div
                      key={album.AlbumKey}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                    >
                      <h3 className="font-bold text-gray-900 mb-2 truncate">{album.Name}</h3>
                      <p className="text-sm text-gray-600 mb-3">
                        📸 {album.ImageCount || 0} photos
                      </p>
                      <button
                        onClick={() => enableGuestUpload(album.AlbumKey, album.Uri, album.Name)}
                        disabled={creatingFor === album.AlbumKey}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        {creatingFor === album.AlbumKey ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Enabling...
                          </>
                        ) : (
                          <>
                            <Link2 className="w-4 h-4" />
                            Enable Guest Upload
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Back to Home */}
        <div className="text-center mt-8">
          <a
            href="/"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to SmugMug Tools
          </a>
        </div>
      </div>
    </div>
  );
}
