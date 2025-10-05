'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Wand2, Check, X, RefreshCw, AlertCircle, Download, Upload, Coins, Settings, CreditCard } from 'lucide-react';
import { tokenStorage } from '@/lib/smugmug-client';
import { creditsStorage } from '@/lib/credits-storage';
import ToolboxHeader from '@/components/ToolboxHeader';

interface Album {
  AlbumKey: string;
  Name: string;
  ImageCount: number;
}

interface Photo {
  ImageKey: string;
  FileName: string;
  Title?: string;
  Caption?: string;
  Keywords?: string;
  ThumbnailUrl: string;
  ArchivedUri?: string;
}

interface GeneratedMetadata {
  title: string;
  caption: string;
  keywords: string;
}

interface PhotoWithMetadata extends Photo {
  generated?: GeneratedMetadata;
  status: 'pending' | 'generating' | 'generated' | 'saving' | 'saved' | 'error';
  error?: string;
}

type PromptStyle = 'professional' | 'creative' | 'descriptive' | 'seo' | 'minimal';

interface ProcessingOptions {
  generateTitle: boolean;
  generateCaption: boolean;
  generateKeywords: boolean;
  promptStyle: PromptStyle;
  saveToSmugMug: boolean;
}

export default function MetaDataMonster() {
  const router = useRouter();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [photos, setPhotos] = useState<PhotoWithMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Credits
  const [credits, setCredits] = useState<{ total: number; used: number; remaining: number; lastUpdated: string }>({
    total: 100,
    used: 0,
    remaining: 100,
    lastUpdated: new Date().toISOString(),
  });
  const [showCreditsModal, setShowCreditsModal] = useState(false);

  // Settings (always visible on page)
  const [options, setOptions] = useState<ProcessingOptions>({
    generateTitle: true,
    generateCaption: true,
    generateKeywords: true,
    promptStyle: 'professional',
    saveToSmugMug: true,
  });

  // Multi-select
  const [selectedPhotos, setSelectedPhotos] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadAlbums();

    // Initialize credits from localStorage (client-side only)
    const balance = creditsStorage.getBalance();
    if (balance) {
      setCredits(balance);
    } else {
      const newBalance = creditsStorage.initialize();
      setCredits(newBalance);
    }
  }, []);

  const loadAlbums = async () => {
    const tokens = tokenStorage.getTokens();
    if (!tokens) {
      router.push('/');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/smugmug/albums', {
        headers: {
          'X-Access-Token': tokens.accessToken,
          'X-Access-Token-Secret': tokens.accessTokenSecret,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAlbums(data.albums || []);
      }
    } catch (err) {
      console.error('Error loading albums:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPhotos = async (albumKey: string) => {
    const tokens = tokenStorage.getTokens();
    if (!tokens) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/smugmug/albums/${albumKey}/images`, {
        headers: {
          'X-Access-Token': tokens.accessToken,
          'X-Access-Token-Secret': tokens.accessTokenSecret,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const photosWithStatus = (data.images || []).map((photo: Photo) => ({
          ...photo,
          status: 'pending' as const,
        }));
        setPhotos(photosWithStatus);
        setSelectedAlbum(albumKey);
      }
    } catch (err) {
      console.error('Error loading photos:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateMetadata = async (photo: PhotoWithMetadata): Promise<GeneratedMetadata> => {
    // Use already generated metadata as the base (if it exists), otherwise use original photo data
    const baseTitle = photo.generated?.title || photo.Title || '';
    const baseCaption = photo.generated?.caption || photo.Caption || '';
    const baseKeywords = photo.generated?.keywords || photo.Keywords || '';

    // Call AI API to generate metadata based on image
    const response = await fetch('/api/ai/generate-metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl: photo.ThumbnailUrl,
        fileName: photo.FileName,
        existingTitle: baseTitle,
        existingCaption: baseCaption,
        existingKeywords: baseKeywords,
        promptStyle: options.promptStyle,
        generateTitle: options.generateTitle,
        generateCaption: options.generateCaption,
        generateKeywords: options.generateKeywords,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate metadata');
    }

    const generated = await response.json();

    // Return generated fields + preserve existing for disabled fields
    return {
      title: generated.title || baseTitle,
      caption: generated.caption || baseCaption,
      keywords: generated.keywords || baseKeywords,
    };
  };

  const saveMetadata = async (photo: PhotoWithMetadata): Promise<void> => {
    const tokens = tokenStorage.getTokens();
    if (!tokens || !photo.generated) return;

    // Only include fields that were actually generated (and have values)
    const updateData: any = {};
    if (options.generateTitle && photo.generated.title) {
      updateData.Title = photo.generated.title;
    }
    if (options.generateCaption && photo.generated.caption) {
      updateData.Caption = photo.generated.caption;
    }
    if (options.generateKeywords && photo.generated.keywords) {
      updateData.Keywords = photo.generated.keywords;
    }

    // Don't send request if no data to update
    if (Object.keys(updateData).length === 0) {
      return;
    }

    // Add small random delay to prevent nonce collisions (0-300ms)
    await new Promise(resolve => setTimeout(resolve, Math.random() * 300));

    console.log('Saving metadata for image:', photo.ImageKey, updateData);

    // Use AlbumImage endpoint instead of Image endpoint to avoid nonce issues
    const response = await fetch(`/api/smugmug/album/${selectedAlbum}/image/${photo.ImageKey}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Token': tokens.accessToken || '',
        'X-Access-Token-Secret': tokens.accessTokenSecret || '',
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Failed to save metadata:', errorData);
      throw new Error(errorData.error || 'Failed to save metadata to SmugMug');
    }

    const result = await response.json();
    console.log('Successfully saved metadata:', result);
  };

  const togglePhotoSelection = (index: number) => {
    const newSelection = new Set(selectedPhotos);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedPhotos(newSelection);
  };

  const selectAll = () => {
    const allIndices = new Set(photos.map((_, i) => i));
    setSelectedPhotos(allIndices);
  };

  const deselectAll = () => {
    setSelectedPhotos(new Set());
  };

  const processPhotos = async (photoIndices?: number[]) => {
    const indicesToProcess = photoIndices || Array.from(selectedPhotos);

    if (indicesToProcess.length === 0) {
      alert('Please select photos to process');
      return;
    }

    // Check if user has enough credits
    if (!creditsStorage.hasCredits(indicesToProcess.length)) {
      setShowCreditsModal(true);
      return;
    }

    setProcessing(true);

    for (let i = 0; i < indicesToProcess.length; i++) {
      const photoIndex = indicesToProcess[i];
      const photo = photos[photoIndex];

      // Skip already processed photos
      if (photo.status === 'saved') continue;

      // Check credits before processing each photo
      if (!creditsStorage.hasCredits(1)) {
        setShowCreditsModal(true);
        setProcessing(false);
        return;
      }

      // Update status to generating
      setPhotos(prev => prev.map((p, idx) =>
        idx === photoIndex ? { ...p, status: 'generating' } : p
      ));

      try {
        // Deduct credit
        creditsStorage.deductCredits(1);
        setCredits(creditsStorage.getBalance()!);

        // Generate metadata
        const generated = await generateMetadata(photo);

        // Update with generated data
        setPhotos(prev => prev.map((p, idx) =>
          idx === photoIndex ? { ...p, generated, status: 'generated' } : p
        ));

        // Save to SmugMug if enabled
        if (options.saveToSmugMug) {
          setPhotos(prev => prev.map((p, idx) =>
            idx === photoIndex ? { ...p, status: 'saving' } : p
          ));

          await saveMetadata({ ...photo, generated });

          // Mark as saved
          setPhotos(prev => prev.map((p, idx) =>
            idx === photoIndex ? { ...p, status: 'saved' } : p
          ));
        } else {
          // Mark as generated (ready for download)
          setPhotos(prev => prev.map((p, idx) =>
            idx === photoIndex ? { ...p, status: 'generated' } : p
          ));
        }

        // Small delay between photos to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error(`Error processing photo ${photoIndex}:`, err);
        setPhotos(prev => prev.map((p, idx) =>
          idx === photoIndex ? { ...p, status: 'error', error: err instanceof Error ? err.message : 'Unknown error' } : p
        ));
      }
    }

    setProcessing(false);
    setSelectedPhotos(new Set()); // Clear selection after processing
  };

  const retryPhoto = async (index: number) => {
    const photo = photos[index];

    setPhotos(prev => prev.map((p, idx) =>
      idx === index ? { ...p, status: 'generating', error: undefined } : p
    ));

    try {
      const generated = await generateMetadata(photo);
      setPhotos(prev => prev.map((p, idx) =>
        idx === index ? { ...p, generated, status: 'generated' } : p
      ));

      if (options.saveToSmugMug) {
        setPhotos(prev => prev.map((p, idx) =>
          idx === index ? { ...p, status: 'saving' } : p
        ));

        await saveMetadata({ ...photo, generated });

        setPhotos(prev => prev.map((p, idx) =>
          idx === index ? { ...p, status: 'saved' } : p
        ));
      }
    } catch (err) {
      console.error('Retry error:', err);
      setPhotos(prev => prev.map((p, idx) =>
        idx === index ? {
          ...p,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error'
        } : p
      ));
    }
  };

  const updatePhotoMetadata = (index: number, field: keyof GeneratedMetadata, value: string) => {
    setPhotos(prev => prev.map((p, idx) => {
      if (idx === index && p.generated) {
        return {
          ...p,
          generated: {
            ...p.generated,
            [field]: value,
          }
        };
      }
      return p;
    }));
  };

  const exportReport = () => {
    const csv = [
      ['Filename', 'Original Title', 'Generated Title', 'Generated Caption', 'Generated Keywords', 'Status'],
      ...photos.map(p => [
        p.FileName,
        p.Title || '',
        p.generated?.title || '',
        p.generated?.caption || '',
        p.generated?.keywords || '',
        p.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metadata-monster-${selectedAlbum}-${Date.now()}.csv`;
    a.click();
  };

  const stats = {
    total: photos.length,
    pending: photos.filter(p => p.status === 'pending').length,
    generated: photos.filter(p => p.status === 'generated').length,
    saved: photos.filter(p => p.status === 'saved').length,
    errors: photos.filter(p => p.status === 'error').length,
  };

  return (
    <>
      <ToolboxHeader currentTool="metadata-monster" />
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">MetaData Monster</h1>
              <p className="text-gray-600">AI-powered metadata generation for your photos</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Credits Display */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCreditsModal(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all font-semibold"
                >
                  <Coins className="w-5 h-5" />
                  {credits.remaining} Credits
                </button>
                <button
                  onClick={() => {
                    creditsStorage.reset();
                    setCredits(creditsStorage.getBalance()!);
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                  title="Reset credits to 100 (dev only)"
                >
                  Reset
                </button>
              </div>

              {/* Export Report */}
              {photos.length > 0 && (
                <button
                  onClick={exportReport}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export Report
                </button>
              )}
            </div>
          </div>

        {/* Album Selection */}
        {!selectedAlbum ? (
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Select an Album</h2>
            {loading ? (
              <div className="text-center py-20 text-gray-600">Loading albums...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {albums.map(album => (
                  <button
                    key={album.AlbumKey}
                    onClick={() => loadPhotos(album.AlbumKey)}
                    className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:shadow-xl hover:border-green-500 cursor-pointer transition-all text-left"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-green-100 p-3 rounded-lg">
                        <Wand2 className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900">{album.Name}</h3>
                        <p className="text-sm text-gray-600">{album.ImageCount} photos</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Back Button & Album Info */}
            <div className="mb-6 flex items-center justify-between">
              <button
                onClick={() => {
                  setSelectedAlbum(null);
                  setPhotos([]);
                  setSelectedPhotos(new Set());
                }}
                className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Albums
              </button>
              <div className="text-right">
                <h2 className="text-xl font-bold text-gray-900">
                  {albums.find(a => a.AlbumKey === selectedAlbum)?.Name || 'Album'}
                </h2>
                <p className="text-sm text-gray-600">{photos.length} photos</p>
              </div>
            </div>

            {/* Settings Panel */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Processing Settings</h2>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Left Column - What to Generate */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">What to Generate</h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={options.generateTitle}
                        onChange={(e) => setOptions({ ...options, generateTitle: e.target.checked })}
                        className="w-4 h-4 text-green-600 rounded"
                      />
                      <span className="text-sm text-gray-700">Titles</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={options.generateCaption}
                        onChange={(e) => setOptions({ ...options, generateCaption: e.target.checked })}
                        className="w-4 h-4 text-green-600 rounded"
                      />
                      <span className="text-sm text-gray-700">Captions</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={options.generateKeywords}
                        onChange={(e) => setOptions({ ...options, generateKeywords: e.target.checked })}
                        className="w-4 h-4 text-green-600 rounded"
                      />
                      <span className="text-sm text-gray-700">Keywords</span>
                    </label>
                  </div>
                </div>

                {/* Right Column - Style & Save */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Prompt Style</label>
                    <select
                      value={options.promptStyle}
                      onChange={(e) => setOptions({ ...options, promptStyle: e.target.value as PromptStyle })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm text-gray-900 bg-white"
                    >
                      <option value="professional">Professional - Clean, business-appropriate language</option>
                      <option value="creative">Creative - Artistic, expressive, evocative descriptions</option>
                      <option value="descriptive">Descriptive - Detailed, comprehensive analysis</option>
                      <option value="seo">SEO - Search-optimized keywords and phrases</option>
                      <option value="minimal">Minimal - Brief, concise descriptions</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-2">
                      Example for tortilla photo: {
                        options.promptStyle === 'professional' ? '"Traditional Tortilla Making on Rustic Griddle"' :
                        options.promptStyle === 'creative' ? '"Hands Dancing Across Sun-Kissed Stone"' :
                        options.promptStyle === 'descriptive' ? '"Traditional Outdoor Tortilla Preparation Process on Weathered Stone Griddle with Rising Steam"' :
                        options.promptStyle === 'seo' ? '"Authentic Mexican Tortilla Making Traditional Cooking Outdoor Kitchen"' :
                        '"Tortillas on Griddle"'
                      }
                    </p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.saveToSmugMug}
                      onChange={(e) => setOptions({ ...options, saveToSmugMug: e.target.checked })}
                      className="w-4 h-4 text-green-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Save to SmugMug automatically</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <div className="bg-white rounded-xl p-4 shadow border border-gray-200">
                <p className="text-sm text-gray-600">Total Photos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow border border-gray-200">
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-500">{stats.pending}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow border border-blue-200 bg-blue-50">
                <p className="text-sm text-blue-600">Generated</p>
                <p className="text-2xl font-bold text-blue-600">{stats.generated}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow border border-green-200 bg-green-50">
                <p className="text-sm text-green-600">Saved</p>
                <p className="text-2xl font-bold text-green-600">{stats.saved}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow border border-red-200 bg-red-50">
                <p className="text-sm text-red-600">Errors</p>
                <p className="text-2xl font-bold text-red-600">{stats.errors}</p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="bg-white rounded-xl p-6 shadow mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Bulk Actions</h3>
                  <p className="text-sm text-gray-600">
                    {selectedPhotos.size > 0
                      ? `${selectedPhotos.size} photo${selectedPhotos.size !== 1 ? 's' : ''} selected`
                      : 'Select photos to process'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={selectAll}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Select All
                  </button>
                  <button
                    onClick={deselectAll}
                    className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                  >
                    Deselect All
                  </button>
                  <button
                    onClick={() => processPhotos()}
                    disabled={processing || selectedPhotos.size === 0}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg transition-colors font-semibold"
                  >
                    <Wand2 className="w-5 h-5" />
                    {processing ? 'Processing...' : `Process Selected (${selectedPhotos.size})`}
                  </button>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            {processing && (
              <div className="mb-6 bg-white rounded-xl p-6 shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Processing photo {currentPhotoIndex + 1} of {stats.total}
                  </span>
                  <span className="text-sm text-gray-600">
                    {Math.round(((currentPhotoIndex + 1) / stats.total) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-green-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${((currentPhotoIndex + 1) / stats.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Photos List */}
            <div className="space-y-4">
              {photos.map((photo, index) => (
                <div
                  key={photo.ImageKey}
                  className={`bg-white rounded-xl overflow-hidden shadow border-2 transition-all ${
                    selectedPhotos.has(index) ? 'border-purple-500 ring-2 ring-purple-200' :
                    photo.status === 'saved' ? 'border-green-500' :
                    photo.status === 'error' ? 'border-red-500' :
                    photo.status === 'generating' || photo.status === 'saving' ? 'border-blue-500 animate-pulse' :
                    'border-gray-200'
                  }`}
                >
                  <div className="flex gap-6 p-6">
                    {/* Selection Checkbox */}
                    <div className="flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={selectedPhotos.has(index)}
                        onChange={() => togglePhotoSelection(index)}
                        className="w-5 h-5 text-purple-600 rounded cursor-pointer"
                      />
                    </div>

                    {/* Thumbnail */}
                    <div className="flex-shrink-0">
                      <img
                        src={photo.ThumbnailUrl}
                        alt={photo.FileName}
                        className="w-32 h-32 object-cover rounded-lg"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg text-gray-900">{photo.FileName}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            {photo.status === 'pending' && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">Pending</span>
                            )}
                            {photo.status === 'generating' && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full flex items-center gap-1">
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                Generating...
                              </span>
                            )}
                            {photo.status === 'generated' && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                Generated
                              </span>
                            )}
                            {photo.status === 'saving' && (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-600 text-xs rounded-full flex items-center gap-1">
                                <Upload className="w-3 h-3 animate-bounce" />
                                Saving...
                              </span>
                            )}
                            {photo.status === 'saved' && (
                              <span className="px-2 py-1 bg-green-100 text-green-600 text-xs rounded-full flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                Saved to SmugMug
                              </span>
                            )}
                            {photo.status === 'error' && (
                              <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Error
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {photo.status === 'error' && (
                            <button
                              onClick={() => retryPhoto(index)}
                              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                            >
                              <RefreshCw className="w-4 h-4" />
                              Retry
                            </button>
                          )}
                          {photo.status === 'pending' && (
                            <button
                              onClick={() => processPhotos([index])}
                              disabled={processing}
                              className="flex items-center gap-1 text-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-1 rounded transition-colors"
                            >
                              <Wand2 className="w-4 h-4" />
                              Process This Photo
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Original Metadata */}
                      {(photo.Title || photo.Caption) && (
                        <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Original:</p>
                          {photo.Title && <p className="text-sm text-gray-700"><strong>Title:</strong> {photo.Title}</p>}
                          {photo.Caption && <p className="text-sm text-gray-700"><strong>Caption:</strong> {photo.Caption}</p>}
                        </div>
                      )}

                      {/* Generated Metadata */}
                      {photo.generated && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Title</label>
                            <input
                              type="text"
                              value={photo.generated.title}
                              onChange={(e) => updatePhotoMetadata(index, 'title', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                              disabled={photo.status === 'saved'}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Caption</label>
                            <textarea
                              value={photo.generated.caption}
                              onChange={(e) => updatePhotoMetadata(index, 'caption', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                              rows={2}
                              disabled={photo.status === 'saved'}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Keywords</label>
                            <input
                              type="text"
                              value={photo.generated.keywords}
                              onChange={(e) => updatePhotoMetadata(index, 'keywords', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                              disabled={photo.status === 'saved'}
                            />
                          </div>

                          {/* Save to SmugMug Button */}
                          {photo.status === 'generated' && (
                            <div className="mt-4">
                              <button
                                onClick={async () => {
                                  try {
                                    setPhotos(prev => prev.map((p, idx) =>
                                      idx === index ? { ...p, status: 'saving' } : p
                                    ));

                                    await saveMetadata(photo);

                                    setPhotos(prev => prev.map((p, idx) =>
                                      idx === index ? { ...p, status: 'saved' } : p
                                    ));
                                  } catch (err) {
                                    console.error('Error saving:', err);
                                    setPhotos(prev => prev.map((p, idx) =>
                                      idx === index ? { ...p, status: 'error', error: 'Failed to save to SmugMug' } : p
                                    ));
                                  }
                                }}
                                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                              >
                                <Upload className="w-4 h-4" />
                                Save to SmugMug
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {photo.error && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-600">{photo.error}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Credits Modal */}
        {showCreditsModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCreditsModal(false)}>
            <div className="bg-white rounded-2xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-8 py-6">
                <h2 className="text-2xl font-bold text-gray-900">Need More Credits?</h2>
                <p className="text-gray-600 mt-1">Purchase credits to continue processing photos</p>
              </div>

              <div className="p-8">
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-6 mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Coins className="w-8 h-8 text-orange-600" />
                    <div>
                      <p className="text-sm text-gray-600">Current Balance</p>
                      <p className="text-3xl font-bold text-gray-900">{credits.remaining} Credits</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">You've used {credits.used} of {credits.total} credits</p>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="border-2 border-gray-200 rounded-xl p-4 hover:border-green-500 cursor-pointer transition-all">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">50 Credits</h3>
                        <p className="text-sm text-gray-600">Process 50 photos</p>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">$5</p>
                    </div>
                  </div>
                  <div className="border-2 border-green-500 bg-green-50 rounded-xl p-4 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">200 Credits</h3>
                        <p className="text-sm text-gray-600">Process 200 photos</p>
                        <span className="inline-block bg-green-600 text-white text-xs px-2 py-1 rounded-full mt-1">BEST VALUE</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">$15</p>
                    </div>
                  </div>
                  <div className="border-2 border-gray-200 rounded-xl p-4 hover:border-green-500 cursor-pointer transition-all">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">500 Credits</h3>
                        <p className="text-sm text-gray-600">Process 500 photos</p>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">$30</p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-500 text-center">Payment integration coming soon</p>
              </div>

              <div className="bg-gray-50 border-t border-gray-200 px-8 py-6">
                <button
                  onClick={() => setShowCreditsModal(false)}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg transition-colors font-semibold"
                >
                  Close
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
