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

interface Photo {
  ImageKey: string;
  Title?: string;
  Caption?: string;
  FileName: string;
  ArchivedUri: string;
  ThumbnailUrl?: string;
  AlbumKey: string;
  Uri: string;
  Uris?: {
    LargestImage?: {
      Uri: string;
    };
  };
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
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [embedLayout, setEmbedLayout] = useState<'grid' | 'carousel' | 'masonry' | 'slideshow' | 'polaroid'>('grid');
  const [embedFormat, setEmbedFormat] = useState<'html' | 'react' | 'json'>('html');
  const [showBuyButtons, setShowBuyButtons] = useState(true);
  const [buyButtonText, setBuyButtonText] = useState('Buy Now');
  const [buyButtonColor, setBuyButtonColor] = useState('#8b5cf6');
  const [showPreview, setShowPreview] = useState(false);

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

  const fetchPhotosFromAlbums = async () => {
    setLoadingPhotos(true);
    setError(null);
    try {
      const allPhotos: Photo[] = [];

      // Fetch images from each selected album
      for (const albumKey of Array.from(selectedAlbumsForEmbed)) {
        const data = await smugmugApi.getAlbumImages(albumKey);
        const albumPhotos = (data.images || []).map((img: any) => ({
          ...img,
          AlbumKey: albumKey,
        }));
        allPhotos.push(...albumPhotos);
      }

      setPhotos(allPhotos);
    } catch (err) {
      setError('Failed to load photos. Please try again.');
      console.error('Error fetching photos:', err);
    } finally {
      setLoadingPhotos(false);
    }
  };

  const generateEmbedCode = () => {
    const selectedPhotosList = photos.filter(p => selectedPhotos.has(p.ImageKey));

    if (embedFormat === 'json') {
      return JSON.stringify(
        {
          layout: embedLayout,
          showBuyButtons,
          buyButtonText,
          buyButtonColor,
          photos: selectedPhotosList.map(p => ({
            imageKey: p.ImageKey,
            title: p.Title || p.FileName,
            caption: p.Caption || '',
            thumbnailUrl: p.ThumbnailUrl || p.ArchivedUri,
            largeImageUrl: p.Uris?.LargestImage?.Uri || p.ArchivedUri,
            fileName: p.FileName,
          })),
        },
        null,
        2
      );
    }

    if (embedFormat === 'react') {
      const layoutClass = embedLayout === 'grid' ? 'grid grid-cols-3 gap-4' :
                         embedLayout === 'carousel' ? 'flex overflow-x-auto gap-4' :
                         embedLayout === 'masonry' ? 'columns-3 gap-4' :
                         embedLayout === 'slideshow' ? 'relative' :
                         'grid grid-cols-3 gap-4';

      return `import React, { useState } from 'react';

const SmugMugGallery = () => {
  const photos = ${JSON.stringify(
    selectedPhotosList.map(p => ({
      imageKey: p.ImageKey,
      title: p.Title || p.FileName,
      thumbnailUrl: p.ThumbnailUrl || p.ArchivedUri,
      largeImageUrl: p.Uris?.LargestImage?.Uri || p.ArchivedUri,
    })),
    null,
    2
  )};
  ${embedLayout === 'slideshow' ? `
  const [currentIndex, setCurrentIndex] = useState(0);
  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % photos.length);
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  ` : ''}

  return (
    <div className="smugmug-gallery-${embedLayout}">
      ${embedLayout === 'slideshow' ? `
      <div className="slideshow-container">
        <img src={photos[currentIndex].thumbnailUrl} alt={photos[currentIndex].title} />
        <h3>{photos[currentIndex].title}</h3>
        <button onClick={prevSlide}>Previous</button>
        <button onClick={nextSlide}>Next</button>
        ${showBuyButtons ? `<button style={{ backgroundColor: '${buyButtonColor}' }}>${buyButtonText}</button>` : ''}
      </div>
      ` : embedLayout === 'polaroid' ? `
      <div className="polaroid-grid">
        {photos.map((photo) => (
          <div key={photo.imageKey} className="polaroid-frame">
            <img src={photo.thumbnailUrl} alt={photo.title} />
            <p className="polaroid-caption">{photo.title}</p>
            ${showBuyButtons ? `<button style={{ backgroundColor: '${buyButtonColor}' }}>${buyButtonText}</button>` : ''}
          </div>
        ))}
      </div>
      ` : `
      <div className="${layoutClass}">
        {photos.map((photo) => (
          <div key={photo.imageKey} className="photo-item">
            <img src={photo.thumbnailUrl} alt={photo.title} />
            <h3>{photo.title}</h3>
            ${showBuyButtons ? `<button style={{ backgroundColor: '${buyButtonColor}' }}>${buyButtonText}</button>` : ''}
          </div>
        ))}
      </div>
      `}
    </div>
  );
};

export default SmugMugGallery;`;
    }

    // Determine hover color (darken by ~10%)
    const hoverColor = buyButtonColor.replace(/#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i, (match, r, g, b) => {
      const darken = (hex: string) => Math.max(0, parseInt(hex, 16) - 20).toString(16).padStart(2, '0');
      return `#${darken(r)}${darken(g)}${darken(b)}`;
    });

    // HTML format with all layouts
    const layoutStyles = {
      grid: `
    .gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 20px;
    }`,
      carousel: `
    .gallery-carousel {
      display: flex;
      overflow-x: auto;
      gap: 20px;
      scroll-snap-type: x mandatory;
      padding-bottom: 10px;
    }
    .gallery-carousel .photo-item {
      flex: 0 0 300px;
      scroll-snap-align: start;
    }`,
      masonry: `
    .gallery-masonry {
      column-count: 3;
      column-gap: 20px;
    }
    .gallery-masonry .photo-item {
      break-inside: avoid;
      margin-bottom: 30px;
      padding-bottom: 10px;
    }`,
      slideshow: `
    .gallery-slideshow {
      position: relative;
      max-width: 800px;
      margin: 0 auto;
    }
    .slideshow-image {
      width: 100%;
      height: auto;
      border-radius: 8px;
    }
    .slideshow-controls {
      position: absolute;
      top: 50%;
      width: 100%;
      display: flex;
      justify-content: space-between;
      padding: 0 20px;
      transform: translateY(-50%);
    }
    .slideshow-button {
      background: rgba(0, 0, 0, 0.5);
      color: white;
      border: none;
      padding: 10px 20px;
      cursor: pointer;
      border-radius: 4px;
    }
    .slideshow-button:hover {
      background: rgba(0, 0, 0, 0.7);
    }`,
      polaroid: `
    .gallery-polaroid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 30px;
    }
    .polaroid-frame {
      background: white;
      padding: 15px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      transform: rotate(-2deg);
      transition: transform 0.3s;
    }
    .polaroid-frame:nth-child(even) {
      transform: rotate(2deg);
    }
    .polaroid-frame:hover {
      transform: rotate(0deg) scale(1.05);
      z-index: 10;
    }
    .polaroid-frame img {
      width: 100%;
      height: auto;
      border-radius: 0;
    }
    .polaroid-caption {
      text-align: center;
      margin-top: 10px;
      font-family: 'Permanent Marker', cursive;
      font-size: 16px;
      color: #333;
    }`
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SmugMug Gallery</title>
  ${embedLayout === 'polaroid' ? '<link href="https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap" rel="stylesheet">' : ''}
  <style>
    .smugmug-gallery-${embedLayout} {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    ${layoutStyles[embedLayout]}
    .photo-item img {
      width: 100%;
      height: auto;
      border-radius: 8px;
      cursor: pointer;
    }
    .photo-title {
      margin-top: 8px;
      font-size: 14px;
      font-weight: 600;
    }
    .buy-button {
      margin-top: 8px;
      padding: 8px 16px;
      background-color: ${buyButtonColor};
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
    }
    .buy-button:hover {
      background-color: ${hoverColor};
    }
  </style>
  ${embedLayout === 'slideshow' ? `
  <script>
    let currentSlide = 0;
    const photos = ${JSON.stringify(selectedPhotosList.map(p => ({
      src: p.ThumbnailUrl || p.ArchivedUri,
      title: p.Title || p.FileName
    })))};

    function showSlide(n) {
      currentSlide = (n + photos.length) % photos.length;
      document.getElementById('slideshow-image').src = photos[currentSlide].src;
      document.getElementById('slideshow-title').textContent = photos[currentSlide].title;
    }

    function nextSlide() { showSlide(currentSlide + 1); }
    function prevSlide() { showSlide(currentSlide - 1); }
  </script>` : ''}
</head>
<body>
  <div class="smugmug-gallery-${embedLayout}">
    ${embedLayout === 'slideshow' ? `
    <div class="gallery-slideshow">
      <img id="slideshow-image" src="${selectedPhotosList[0]?.ThumbnailUrl || selectedPhotosList[0]?.ArchivedUri}" alt="${selectedPhotosList[0]?.Title || selectedPhotosList[0]?.FileName}" class="slideshow-image" />
      <div class="photo-title" id="slideshow-title">${selectedPhotosList[0]?.Title || selectedPhotosList[0]?.FileName}</div>
      ${showBuyButtons ? `<button class="buy-button">${buyButtonText}</button>` : ''}
      <div class="slideshow-controls">
        <button onclick="prevSlide()" class="slideshow-button">← Previous</button>
        <button onclick="nextSlide()" class="slideshow-button">Next →</button>
      </div>
    </div>` : `
    <div class="gallery-${embedLayout}">
${selectedPhotosList
  .map(
    p => embedLayout === 'polaroid' ?
      `      <div class="polaroid-frame">
        <img src="${p.ThumbnailUrl || p.ArchivedUri}" alt="${p.Title || p.FileName}" />
        <p class="polaroid-caption">${p.Title || p.FileName}</p>
        ${showBuyButtons ? `<button class="buy-button">${buyButtonText}</button>` : ''}
      </div>` :
      `      <div class="photo-item">
        <img src="${p.ThumbnailUrl || p.ArchivedUri}" alt="${p.Title || p.FileName}" />
        <div class="photo-title">${p.Title || p.FileName}</div>
        ${showBuyButtons ? `<button class="buy-button">${buyButtonText}</button>` : ''}
      </div>`
  )
  .join('\n')}
    </div>`}
  </div>
</body>
</html>`;
  };

  const copyToClipboard = () => {
    const code = generateEmbedCode();
    navigator.clipboard.writeText(code);
    alert('Embed code copied to clipboard!');
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

  // Auto-load photos when moving to Step 2
  useEffect(() => {
    if (embedWorkflowStep === 'select-photos' && selectedAlbumsForEmbed.size > 0) {
      fetchPhotosFromAlbums();
    }
  }, [embedWorkflowStep]);

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
                  {loadingPhotos
                    ? `Loading photos from ${selectedAlbumsForEmbed.size} album${selectedAlbumsForEmbed.size !== 1 ? 's' : ''}...`
                    : `Select photos from ${photos.length} loaded images`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {selectedPhotos.size > 0 && !loadingPhotos && (
                  <button
                    onClick={() => setEmbedWorkflowStep('generate-embed')}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors font-medium"
                  >
                    Continue with {selectedPhotos.size} Photo{selectedPhotos.size !== 1 ? 's' : ''}
                  </button>
                )}
                <button
                  onClick={() => setEmbedWorkflowStep('select-albums')}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors font-medium"
                >
                  Back to Albums
                </button>
              </div>
            </div>

            {loadingPhotos && (
              <div className="text-center py-20 text-gray-500">
                <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-400 animate-pulse" />
                <p className="text-lg font-medium">Loading photos...</p>
                <p className="text-sm mt-2">Fetching images from your selected albums</p>
              </div>
            )}

            {!loadingPhotos && photos.length === 0 && (
              <div className="text-center py-20 text-gray-500">
                <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p>No photos found in selected albums</p>
                <button
                  onClick={() => setEmbedWorkflowStep('select-albums')}
                  className="mt-4 text-blue-600 hover:text-blue-700 underline"
                >
                  Go back and select different albums
                </button>
              </div>
            )}

            {!loadingPhotos && photos.length > 0 && (
              <>
                {/* Selection Controls */}
                <div className="flex justify-between items-center mb-6 p-4 bg-gray-100 rounded-lg">
                  <div className="text-sm text-gray-700">
                    <span className="font-semibold">{selectedPhotos.size}</span> of{' '}
                    <span className="font-semibold">{photos.length}</span> photos selected
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedPhotos(new Set(photos.map(p => p.ImageKey)))}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setSelectedPhotos(new Set())}
                      className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>

                {/* Photos Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {photos.map((photo) => {
                    const isSelected = selectedPhotos.has(photo.ImageKey);
                    return (
                      <button
                        key={photo.ImageKey}
                        onClick={() => {
                          const newSelection = new Set(selectedPhotos);
                          if (isSelected) {
                            newSelection.delete(photo.ImageKey);
                          } else {
                            newSelection.add(photo.ImageKey);
                          }
                          setSelectedPhotos(newSelection);
                        }}
                        className={`relative aspect-square rounded-lg overflow-hidden border-4 transition-all hover:shadow-lg ${
                          isSelected
                            ? 'border-purple-500 ring-4 ring-purple-200'
                            : 'border-gray-200 hover:border-blue-400'
                        }`}
                      >
                        <img
                          src={photo.ThumbnailUrl || photo.ArchivedUri}
                          alt={photo.Title || photo.FileName}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-purple-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-lg">
                            <span className="text-xs font-bold">✓</span>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                          <p className="text-white text-xs truncate">
                            {photo.Title || photo.FileName}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 3: Generate Embed Code */}
        {embedWorkflowStep === 'generate-embed' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-gray-800">Step 3: Generate Embed Code</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Customize and copy your embeddable gallery code
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setEmbedWorkflowStep('select-photos')}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors font-medium"
                >
                  Back to Photos
                </button>
              </div>
            </div>

            {/* Configuration Options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Layout Selection */}
              <div className="bg-white rounded-lg p-6 shadow-md">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Layout Style</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setEmbedLayout('grid')}
                    className={`text-center px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                      embedLayout === 'grid'
                        ? 'bg-purple-600 text-white ring-2 ring-purple-300'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Grid
                  </button>
                  <button
                    onClick={() => setEmbedLayout('carousel')}
                    className={`text-center px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                      embedLayout === 'carousel'
                        ? 'bg-purple-600 text-white ring-2 ring-purple-300'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Carousel
                  </button>
                  <button
                    onClick={() => setEmbedLayout('masonry')}
                    className={`text-center px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                      embedLayout === 'masonry'
                        ? 'bg-purple-600 text-white ring-2 ring-purple-300'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Collage
                  </button>
                  <button
                    onClick={() => setEmbedLayout('slideshow')}
                    className={`text-center px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                      embedLayout === 'slideshow'
                        ? 'bg-purple-600 text-white ring-2 ring-purple-300'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Slideshow
                  </button>
                  <button
                    onClick={() => setEmbedLayout('polaroid')}
                    className={`text-center px-3 py-2 rounded-lg transition-all text-sm font-medium col-span-2 ${
                      embedLayout === 'polaroid'
                        ? 'bg-purple-600 text-white ring-2 ring-purple-300'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Polaroid
                  </button>
                </div>
              </div>

              {/* Format Selection */}
              <div className="bg-white rounded-lg p-6 shadow-md">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Code Format</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setEmbedFormat('html')}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                      embedFormat === 'html'
                        ? 'bg-purple-600 text-white ring-2 ring-purple-300'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div className="font-semibold">HTML</div>
                    <div className="text-sm opacity-80">Static HTML page</div>
                  </button>
                  <button
                    onClick={() => setEmbedFormat('react')}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                      embedFormat === 'react'
                        ? 'bg-purple-600 text-white ring-2 ring-purple-300'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div className="font-semibold">React</div>
                    <div className="text-sm opacity-80">React component</div>
                  </button>
                  <button
                    onClick={() => setEmbedFormat('json')}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                      embedFormat === 'json'
                        ? 'bg-purple-600 text-white ring-2 ring-purple-300'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div className="font-semibold">JSON</div>
                    <div className="text-sm opacity-80">Data only</div>
                  </button>
                </div>
              </div>

              {/* Additional Options */}
              <div className="bg-white rounded-lg p-6 shadow-md">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Options</h3>
                <div className="space-y-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showBuyButtons}
                      onChange={(e) => setShowBuyButtons(e.target.checked)}
                      className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="ml-3 text-gray-700 font-medium">Show Buy Buttons</span>
                  </label>

                  {showBuyButtons && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Button Text
                        </label>
                        <input
                          type="text"
                          value={buyButtonText}
                          onChange={(e) => setBuyButtonText(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                          placeholder="Buy Now"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Button Color
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={buyButtonColor}
                            onChange={(e) => setBuyButtonColor(e.target.value)}
                            className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={buyButtonColor}
                            onChange={(e) => setBuyButtonColor(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-mono"
                            placeholder="#8b5cf6"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600">
                      <strong>{selectedPhotos.size}</strong> photos selected
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Code/Preview Section */}
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  {showPreview ? 'Live Preview' : 'Generated Code'}
                </h3>
                <div className="flex items-center gap-3">
                  {/* Toggle between Code and Preview */}
                  <div className="flex bg-gray-200 rounded-lg p-1">
                    <button
                      onClick={() => setShowPreview(false)}
                      className={`px-4 py-2 rounded-lg transition-all font-medium ${
                        !showPreview
                          ? 'bg-white text-purple-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      Code
                    </button>
                    <button
                      onClick={() => setShowPreview(true)}
                      className={`px-4 py-2 rounded-lg transition-all font-medium ${
                        showPreview
                          ? 'bg-white text-purple-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      Preview
                    </button>
                  </div>
                  {!showPreview && (
                    <button
                      onClick={copyToClipboard}
                      className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                    >
                      <Code2 className="w-4 h-4" />
                      Copy to Clipboard
                    </button>
                  )}
                </div>
              </div>

              {/* Code View */}
              {!showPreview && (
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono">
                  <code className="text-gray-100">{generateEmbedCode()}</code>
                </pre>
              )}

              {/* Preview View */}
              {showPreview && (
                <div className="border-2 border-gray-200 rounded-lg p-6 bg-gray-50 min-h-[400px]">
                  {embedLayout === 'slideshow' ? (
                    <div className="max-w-2xl mx-auto">
                      <img
                        src={photos.filter(p => selectedPhotos.has(p.ImageKey))[0]?.ThumbnailUrl || photos.filter(p => selectedPhotos.has(p.ImageKey))[0]?.ArchivedUri}
                        alt={photos.filter(p => selectedPhotos.has(p.ImageKey))[0]?.Title || photos.filter(p => selectedPhotos.has(p.ImageKey))[0]?.FileName}
                        className="w-full h-auto rounded-lg shadow-lg"
                      />
                      <div className="mt-4 text-center font-semibold text-gray-800">
                        {photos.filter(p => selectedPhotos.has(p.ImageKey))[0]?.Title || photos.filter(p => selectedPhotos.has(p.ImageKey))[0]?.FileName}
                      </div>
                      {showBuyButtons && (
                        <button
                          style={{ backgroundColor: buyButtonColor }}
                          className="mt-3 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity mx-auto block"
                        >
                          {buyButtonText}
                        </button>
                      )}
                      <div className="flex justify-center gap-4 mt-6">
                        <button className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800">
                          ← Previous
                        </button>
                        <button className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800">
                          Next →
                        </button>
                      </div>
                      <div className="text-center mt-4 text-sm text-gray-600">
                        Slideshow preview (1 of {selectedPhotos.size} photos)
                      </div>
                    </div>
                  ) : embedLayout === 'polaroid' ? (
                    <div className="grid grid-cols-3 gap-8">
                      {photos
                        .filter(p => selectedPhotos.has(p.ImageKey))
                        .slice(0, 6)
                        .map((photo, index) => (
                          <div
                            key={photo.ImageKey}
                            className="bg-white p-4 shadow-lg hover:shadow-xl transition-shadow"
                            style={{
                              transform: index % 2 === 0 ? 'rotate(-2deg)' : 'rotate(2deg)'
                            }}
                          >
                            <img
                              src={photo.ThumbnailUrl || photo.ArchivedUri}
                              alt={photo.Title || photo.FileName}
                              className="w-full h-auto"
                            />
                            <p className="text-center mt-3 font-handwriting text-gray-800" style={{fontFamily: 'cursive'}}>
                              {photo.Title || photo.FileName}
                            </p>
                            {showBuyButtons && (
                              <button
                                style={{ backgroundColor: buyButtonColor }}
                                className="mt-2 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity w-full"
                              >
                                {buyButtonText}
                              </button>
                            )}
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className={embedLayout === 'grid' ? 'grid grid-cols-3 gap-4' : embedLayout === 'carousel' ? 'flex overflow-x-auto gap-4 pb-4' : 'columns-3 gap-4'}>
                      {photos
                        .filter(p => selectedPhotos.has(p.ImageKey))
                        .slice(0, 9)
                        .map(photo => (
                          <div key={photo.ImageKey} className={`flex flex-col ${embedLayout === 'masonry' ? 'mb-6 pb-3' : ''}`}>
                            <img
                              src={photo.ThumbnailUrl || photo.ArchivedUri}
                              alt={photo.Title || photo.FileName}
                              className="w-full h-auto rounded-lg shadow-md"
                            />
                            <div className="mt-2 text-sm font-semibold text-gray-700 truncate">
                              {photo.Title || photo.FileName}
                            </div>
                            {showBuyButtons && (
                              <button
                                style={{ backgroundColor: buyButtonColor }}
                                className="mt-2 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
                              >
                                {buyButtonText}
                              </button>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                  {embedLayout !== 'slideshow' && selectedPhotos.size > (embedLayout === 'polaroid' ? 6 : 9) && (
                    <div className="text-center mt-6 text-sm text-gray-600 font-medium">
                      Showing {embedLayout === 'polaroid' ? '6' : '9'} of {selectedPhotos.size} photos
                    </div>
                  )}
                </div>
              )}
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
