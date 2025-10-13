'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Wand2, Check, X, RefreshCw, AlertCircle, Download, Upload, Coins, Settings, CreditCard, Search, Target } from 'lucide-react';
import { tokenStorage } from '@/lib/smugmug-client';
import { creditsStorage } from '@/lib/credits-storage';
import ToolboxHeader from '@/components/ToolboxHeader';
import SystemPromptViewer from '@/components/SystemPromptViewer';
import { useModelPreferences, AVAILABLE_MODELS } from '@/stores/modelPreferencesStore';
import { useAIActivityStore } from '@/stores/aiActivityStore';

interface Album {
  AlbumKey: string;
  Name: string;
  ImageCount: number;
  Uris?: {
    AlbumImage?: {
      Uri?: string;
    };
  };
}

interface Photo {
  ImageKey: string;
  Uri?: string; // SmugMug's versioned URI (e.g., /api/v2/album/xxx/image/yyy-0)
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
  albumKey?: string; // Track which album this photo belongs to (needed for Seek & Capture mode)
}

type PromptStyle = 'professional' | 'creative' | 'descriptive' | 'seo' | 'minimal';

interface ProcessingOptions {
  generateTitle: boolean;
  generateCaption: boolean;
  generateKeywords: boolean;
  promptStyle: PromptStyle;
  saveToSmugMug: boolean;
  metadataMode: 'replace' | 'build-upon';
}

type Mode = 'normal' | 'seek-and-capture';

interface MissingMetadataGroup {
  type: 'title' | 'caption' | 'keywords' | 'all';
  label: string;
  photos: PhotoWithMetadata[];
}

export default function MetaDataMonster() {
  const router = useRouter();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [photos, setPhotos] = useState<PhotoWithMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // AI Model & Activity Tracking
  const { getModel } = useModelPreferences();
  const { addJob, updateJob, completeJob, failJob } = useAIActivityStore();
  const selectedModel = getModel('metadata-monster');

  // Seek and Capture Mode
  const [mode, setMode] = useState<Mode>('normal');
  const [selectedGalleries, setSelectedGalleries] = useState<Set<string>>(new Set());
  const [scanning, setScanning] = useState(false);
  const [missingMetadataGroups, setMissingMetadataGroups] = useState<MissingMetadataGroup[]>([]);

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
    metadataMode: 'replace',
  });

  // Multi-select
  const [selectedPhotos, setSelectedPhotos] = useState<Set<number>>(new Set());

  // Album featured images
  const [albumImages, setAlbumImages] = useState<{ [key: string]: string }>({});

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
    // First check authentication via API
    try {
      const authCheck = await fetch('/api/smugmug/user', {
        credentials: 'include',
      });

      if (!authCheck.ok) {
        router.push('/');
        return;
      }
    } catch (_error) {
      console.error('[MetaData Monster] Auth check failed:', _error);
      router.push('/');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/smugmug/albums', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const albumsList = data.albums || [];
        setAlbums(albumsList);

        // Fetch album images for albums that have them
        const imagePromises = albumsList
          .filter((album: Album) => album.Uris?.AlbumImage?.Uri)
          .map(async (album: Album) => {
            try {
              const imageResponse = await fetch(`${album.Uris!.AlbumImage!.Uri}?_accept=application/json`, {
                credentials: 'include',
              });
              if (imageResponse.ok) {
                const imageData = await imageResponse.json();
                return {
                  albumKey: album.AlbumKey,
                  imageUrl: imageData.Response?.AlbumImage?.Uris?.ImageSizes?.SmallImageUrl,
                };
              }
            } catch (_err) {
              console.error('Error loading album image:', _err);
            }
            return null;
          });

        const images = await Promise.all(imagePromises);
        const imageMap: { [key: string]: string } = {};
        images.forEach(img => {
          if (img && img.imageUrl) {
            imageMap[img.albumKey] = img.imageUrl;
          }
        });
        setAlbumImages(imageMap);
      }
    } catch (_err) {
      console.error('Error loading albums:', _err);
    } finally {
      setLoading(false);
    }
  };

  const loadPhotos = async (albumKey: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/smugmug/albums/${albumKey}/images`, {
        credentials: 'include',
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
    } catch (_err) {
      console.error('Error loading photos:', _err);
    } finally {
      setLoading(false);
    }
  };

  const generateMetadata = async (photo: PhotoWithMetadata): Promise<GeneratedMetadata> => {
    // Use already generated metadata as the base (if it exists), otherwise use original photo data
    const baseTitle = photo.generated?.title || photo.Title || '';
    const baseCaption = photo.generated?.caption || photo.Caption || '';
    const baseKeywords = photo.generated?.keywords || photo.Keywords || '';

    // Create unique job ID and register AI activity
    const jobId = `metadata-${photo.ImageKey}-${Date.now()}`;
    const modelInfo = AVAILABLE_MODELS[selectedModel];

    addJob({
      id: jobId,
      tool: 'MetaData Monster',
      toolPath: '/metadata-monster',
      status: 'processing',
      startTime: new Date(),
      message: `Generating metadata for ${photo.FileName}`,
      model: selectedModel,
      modelName: modelInfo.name,
    });

    try {
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
          model: selectedModel,
          metadataMode: options.metadataMode,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate metadata');
      }

      const generated = await response.json();

      // Complete the job with success and token usage
      const inputTokens = generated.usage?.input_tokens || 0;
      const outputTokens = generated.usage?.output_tokens || 0;
      const totalTokens = inputTokens + outputTokens;

      console.log('📊 Token Usage:', {
        inputTokens,
        outputTokens,
        totalTokens,
        fullResponse: generated
      });

      completeJob(jobId, totalTokens, inputTokens, outputTokens);

      // Return generated fields + preserve existing for disabled fields
      return {
        title: generated.title || baseTitle,
        caption: generated.caption || baseCaption,
        keywords: generated.keywords || baseKeywords,
      };
    } catch (error) {
      // Fail the job with error message
      failJob(jobId, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  };

  const saveMetadata = async (photo: PhotoWithMetadata): Promise<void> => {
    if (!photo.generated) return;

    // Include fields that should be updated (based on checkboxes)
    // This allows users to clear metadata by setting empty strings
    const updateData: any = {};
    if (options.generateTitle) {
      updateData.Title = photo.generated.title || ''; // Empty string will clear the field
    }
    if (options.generateCaption) {
      updateData.Caption = photo.generated.caption || ''; // Empty string will clear the field
    }
    if (options.generateKeywords) {
      updateData.Keywords = photo.generated.keywords || ''; // Empty string will clear the field
    }

    // Don't send request if no fields are enabled
    if (Object.keys(updateData).length === 0) {
      return;
    }

    // Add small random delay to prevent nonce collisions (0-300ms)
    await new Promise(resolve => setTimeout(resolve, Math.random() * 300));

    // Extract versioned image key from Uri if available
    // The Uri looks like /api/v2/album/XXXX/image/YYYY-0 where -0 is the serial number
    let versionedImageKey = photo.ImageKey;
    if (photo.Uri) {
      const uriParts = photo.Uri.split('/');
      const lastPart = uriParts[uriParts.length - 1];
      if (lastPart && lastPart.includes('-')) {
        versionedImageKey = lastPart; // This will be something like "MLB2MBL-0"
      }
    }

    console.log('Saving metadata for image:', versionedImageKey, updateData);

    // Determine the actual album key to use
    // For normal mode: use selectedAlbum
    // For Seek & Capture mode: use the photo's albumKey property
    const actualAlbumKey = photo.albumKey || selectedAlbum;

    if (!actualAlbumKey || actualAlbumKey === 'mixed') {
      throw new Error('Cannot save: No valid album key. This photo needs an album key set.');
    }

    // Use AlbumImage endpoint with versioned image key to avoid redirect and nonce issues
    const response = await fetch(`/api/smugmug/album/${actualAlbumKey}/image/${versionedImageKey}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
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
      } catch (_err) {
        console.error(`Error processing photo ${photoIndex}:`, _err);
        setPhotos(prev => prev.map((p, idx) =>
          idx === photoIndex ? { ...p, status: 'error', error: _err instanceof Error ? _err.message : 'Unknown error' } : p
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

      // Don't auto-save on rescan - let user review and manually save
      // This allows users to try different models and compare results
    } catch (_err) {
      console.error('Retry error:', _err);
      setPhotos(prev => prev.map((p, idx) =>
        idx === index ? {
          ...p,
          status: 'error',
          error: _err instanceof Error ? _err.message : 'Unknown error'
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

  // Seek and Capture Functions
  const toggleGallerySelection = (albumKey: string) => {
    const newSelection = new Set(selectedGalleries);
    if (newSelection.has(albumKey)) {
      newSelection.delete(albumKey);
    } else {
      newSelection.add(albumKey);
    }
    setSelectedGalleries(newSelection);
  };

  const selectAllGalleries = () => {
    setSelectedGalleries(new Set(albums.map(a => a.AlbumKey)));
  };

  const deselectAllGalleries = () => {
    setSelectedGalleries(new Set());
  };

  const scanForMissingMetadata = async () => {
    if (selectedGalleries.size === 0) {
      alert('Please select at least one gallery to scan');
      return;
    }

    setScanning(true);
    const allPhotosWithMissingData: PhotoWithMetadata[] = [];

    try {
      // Fetch photos from each selected gallery
      for (const albumKey of Array.from(selectedGalleries)) {
        const album = albums.find(a => a.AlbumKey === albumKey);
        console.log(`Scanning ${album?.Name}...`);

        const response = await fetch(`/api/smugmug/albums/${albumKey}/images`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          const galleryPhotos = (data.images || []).map((photo: Photo) => ({
            ...photo,
            status: 'pending' as const,
            galleryName: album?.Name || 'Unknown',
            albumKey: albumKey,
          }));

          // Filter photos missing metadata
          const photosWithMissingData = galleryPhotos.filter((photo: Photo) => {
            const missingTitle = !photo.Title || photo.Title.trim() === '';
            const missingCaption = !photo.Caption || photo.Caption.trim() === '';
            const missingKeywords = !photo.Keywords || photo.Keywords.trim() === '';
            return missingTitle || missingCaption || missingKeywords;
          });

          allPhotosWithMissingData.push(...photosWithMissingData);
        }

        // Small delay between galleries to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Group photos by what's missing
      const groups: MissingMetadataGroup[] = ([
        {
          type: 'all' as const,
          label: 'Missing All Metadata (Title, Caption, Keywords)',
          photos: allPhotosWithMissingData.filter(p =>
            (!p.Title || p.Title.trim() === '') &&
            (!p.Caption || p.Caption.trim() === '') &&
            (!p.Keywords || p.Keywords.trim() === '')
          ),
        },
        {
          type: 'title' as const,
          label: 'Missing Title Only',
          photos: allPhotosWithMissingData.filter(p =>
            (!p.Title || p.Title.trim() === '') &&
            (p.Caption && p.Caption.trim() !== '') &&
            (p.Keywords && p.Keywords.trim() !== '')
          ),
        },
        {
          type: 'caption' as const,
          label: 'Missing Caption Only',
          photos: allPhotosWithMissingData.filter(p =>
            (p.Title && p.Title.trim() !== '') &&
            (!p.Caption || p.Caption.trim() === '') &&
            (p.Keywords && p.Keywords.trim() !== '')
          ),
        },
        {
          type: 'keywords' as const,
          label: 'Missing Keywords Only',
          photos: allPhotosWithMissingData.filter(p =>
            (p.Title && p.Title.trim() !== '') &&
            (p.Caption && p.Caption.trim() !== '') &&
            (!p.Keywords || p.Keywords.trim() === '')
          ),
        },
      ] as MissingMetadataGroup[]).filter(g => g.photos.length > 0); // Only show groups with photos

      setMissingMetadataGroups(groups);
      console.log(`Found ${allPhotosWithMissingData.length} photos with missing metadata`);
    } catch (err) {
      console.error('Error scanning for missing metadata:', err);
      alert('Failed to scan galleries. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  const loadGroupPhotos = (group: MissingMetadataGroup) => {
    // Set the photos from this group and switch to normal processing mode
    setPhotos(group.photos);
    setMode('normal');
    setSelectedAlbum('mixed'); // Special indicator for mixed galleries
    setMissingMetadataGroups([]); // Clear the groups
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
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto">

          {/* Instructions Banner */}
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-gray-800">
                <span className="font-semibold">How to use:</span> {
                  mode === 'normal'
                    ? 'Select an album and photos that need metadata. Choose a prompt style (Professional, Creative, SEO, etc.) and generate AI-powered titles, captions, and keywords. Review and edit before saving to SmugMug.'
                    : 'Select galleries to scan (use "Select All" for all galleries). Click "Scan for Missing Metadata" to find photos without titles, captions, or keywords. Then process the grouped results with AI.'
                }
              </p>
            </div>
          </div>

          {/* Header - Mobile Optimized */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 sm:mb-8">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">MetaData Monster</h1>
              <p className="text-sm sm:text-base text-gray-600">AI-powered metadata generation for your photos</p>
            </div>

            {/* Export Report */}
            {photos.length > 0 && (
              <button
                onClick={exportReport}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 py-3 sm:py-2 rounded-lg transition-colors min-h-[48px]"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export Report</span>
                <span className="sm:hidden">Export</span>
              </button>
            )}
          </div>

          {/* Mode Toggle - Mobile Optimized */}
          <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
              <button
                onClick={() => {
                  setMode('normal');
                  setMissingMetadataGroups([]);
                  setSelectedGalleries(new Set());
                }}
                className={`flex items-center justify-center gap-2 px-4 py-3 sm:py-2 rounded-lg font-semibold transition-all min-h-[48px] ${
                  mode === 'normal'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                }`}
              >
                <Wand2 className="w-5 h-5 sm:w-4 sm:h-4" />
                Normal Mode
              </button>
              <button
                onClick={() => {
                  setMode('seek-and-capture');
                  setSelectedAlbum(null);
                  setPhotos([]);
                  setSelectedPhotos(new Set());
                }}
                className={`flex items-center justify-center gap-2 px-4 py-3 sm:py-2 rounded-lg font-semibold transition-all min-h-[48px] ${
                  mode === 'seek-and-capture'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                }`}
              >
                <Target className="w-5 h-5 sm:w-4 sm:h-4" />
                Seek & Capture
              </button>
              <div className="flex-1 text-sm text-gray-600 text-center sm:text-left pt-2 sm:pt-0">
                {mode === 'normal' ? (
                  'Select an album and process photos individually'
                ) : (
                  'Scan multiple galleries to find photos missing metadata'
                )}
              </div>
            </div>
          </div>

        {/* Seek and Capture Mode */}
        {mode === 'seek-and-capture' && missingMetadataGroups.length === 0 ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">Scan Galleries for Missing Metadata</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={selectAllGalleries}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAllGalleries}
                  className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                >
                  Deselect All
                </button>
                <button
                  onClick={scanForMissingMetadata}
                  disabled={scanning || selectedGalleries.size === 0}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg transition-colors font-semibold"
                >
                  {scanning ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      Scan for Missing Metadata ({selectedGalleries.size})
                    </>
                  )}
                </button>
              </div>
            </div>

            {scanning && (
              <div className="mb-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-purple-600 animate-spin" />
                  <p className="text-sm text-purple-800">
                    Scanning {selectedGalleries.size} galleries for photos missing metadata...
                  </p>
                </div>
              </div>
            )}

            {loading ? (
              <div className="text-center py-20 text-gray-600">Loading galleries...</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {albums.map(album => (
                  <div
                    key={album.AlbumKey}
                    onClick={() => toggleGallerySelection(album.AlbumKey)}
                    className={`bg-white border-2 rounded-lg p-4 sm:p-6 cursor-pointer transition-all min-h-[80px] ${
                      selectedGalleries.has(album.AlbumKey)
                        ? 'border-purple-500 ring-2 ring-purple-200 shadow-lg'
                        : 'border-gray-200 hover:shadow-xl hover:border-purple-300 active:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedGalleries.has(album.AlbumKey)}
                        onChange={() => {}}
                        className="w-6 h-6 text-purple-600 rounded flex-shrink-0"
                      />
                      {albumImages[album.AlbumKey] ? (
                        <img
                          src={albumImages[album.AlbumKey]}
                          alt={album.Name}
                          className="w-16 h-16 sm:w-16 sm:h-16 object-cover rounded-lg flex-shrink-0"
                        />
                      ) : (
                        <div className="bg-purple-100 p-3 rounded-lg w-16 h-16 flex items-center justify-center flex-shrink-0">
                          <Target className="w-6 h-6 text-purple-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base sm:text-lg text-gray-900 truncate">{album.Name}</h3>
                        <p className="text-sm text-gray-600">{album.ImageCount} photos</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : mode === 'seek-and-capture' && missingMetadataGroups.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-gray-800">Scan Results</h2>
                <p className="text-sm text-gray-600">
                  Found {missingMetadataGroups.reduce((sum, g) => sum + g.photos.length, 0)} photos with missing metadata
                </p>
              </div>
              <button
                onClick={() => {
                  setMissingMetadataGroups([]);
                  setSelectedGalleries(new Set());
                }}
                className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                New Scan
              </button>
            </div>

            <div className="space-y-6">
              {missingMetadataGroups.map((group, idx) => (
                <div key={idx} className="bg-white rounded-xl shadow-lg border-2 border-purple-200 overflow-hidden">
                  <div className="bg-purple-50 p-6 border-b border-purple-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{group.label}</h3>
                        <p className="text-sm text-gray-600 mt-1">{group.photos.length} photos found</p>
                      </div>
                      <button
                        onClick={() => loadGroupPhotos(group)}
                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors font-semibold"
                      >
                        <Wand2 className="w-5 h-5" />
                        Process These Photos
                      </button>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {group.photos.slice(0, 12).map((photo, photoIdx) => (
                        <div key={photoIdx} className="relative group">
                          <img
                            src={photo.ThumbnailUrl}
                            alt={photo.FileName}
                            className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 group-hover:border-purple-500 transition-all"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all rounded-lg flex items-center justify-center">
                            <p className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-all text-center px-2">
                              {photo.FileName}
                            </p>
                          </div>
                        </div>
                      ))}
                      {group.photos.length > 12 && (
                        <div className="w-full h-32 bg-purple-100 rounded-lg border-2 border-dashed border-purple-300 flex items-center justify-center">
                          <p className="text-purple-600 font-semibold text-center">
                            +{group.photos.length - 12} more
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : mode === 'normal' && !selectedAlbum ? (
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Select an Album</h2>
            {loading ? (
              <div className="text-center py-20 text-gray-600">Loading albums...</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {albums.map(album => (
                  <button
                    key={album.AlbumKey}
                    onClick={() => loadPhotos(album.AlbumKey)}
                    className="bg-white border-2 border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-xl hover:border-green-500 active:bg-green-50 cursor-pointer transition-all text-left min-h-[80px]"
                  >
                    <div className="flex items-center gap-3">
                      {albumImages[album.AlbumKey] ? (
                        <img
                          src={albumImages[album.AlbumKey]}
                          alt={album.Name}
                          className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                        />
                      ) : (
                        <div className="bg-green-100 p-3 rounded-lg w-16 h-16 flex items-center justify-center flex-shrink-0">
                          <Wand2 className="w-6 h-6 text-green-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base sm:text-lg text-gray-900 truncate">{album.Name}</h3>
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
                  {selectedAlbum === 'mixed'
                    ? 'Photos with Missing Metadata'
                    : albums.find(a => a.AlbumKey === selectedAlbum)?.Name || 'Album'}
                </h2>
                <p className="text-sm text-gray-600">{photos.length} photos</p>
              </div>
            </div>

            {/* Settings Panel - Mobile Optimized */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6 mb-8">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Processing Settings</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column - What to Generate */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">What to Generate</h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
                      <input
                        type="checkbox"
                        checked={options.generateTitle}
                        onChange={(e) => setOptions({ ...options, generateTitle: e.target.checked })}
                        className="w-5 h-5 sm:w-4 sm:h-4 text-green-600 rounded flex-shrink-0"
                      />
                      <span className="text-base sm:text-sm text-gray-700">Titles</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
                      <input
                        type="checkbox"
                        checked={options.generateCaption}
                        onChange={(e) => setOptions({ ...options, generateCaption: e.target.checked })}
                        className="w-5 h-5 sm:w-4 sm:h-4 text-green-600 rounded flex-shrink-0"
                      />
                      <span className="text-base sm:text-sm text-gray-700">Captions</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
                      <input
                        type="checkbox"
                        checked={options.generateKeywords}
                        onChange={(e) => setOptions({ ...options, generateKeywords: e.target.checked })}
                        className="w-5 h-5 sm:w-4 sm:h-4 text-green-600 rounded flex-shrink-0"
                      />
                      <span className="text-base sm:text-sm text-gray-700">Keywords</span>
                    </label>
                  </div>
                </div>

                {/* Right Column - Style & Mode */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Metadata Mode</label>
                    <select
                      value={options.metadataMode}
                      onChange={(e) => setOptions({ ...options, metadataMode: e.target.value as 'replace' | 'build-upon' })}
                      className="w-full px-4 py-3 sm:px-3 sm:py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-base sm:text-sm text-gray-900 bg-white min-h-[48px]"
                    >
                      <option value="replace">Replace - Generate completely new metadata</option>
                      <option value="build-upon">Build Upon - Enhance existing metadata</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-2 hidden sm:block">
                      {options.metadataMode === 'replace'
                        ? 'AI will create fresh metadata from scratch, ignoring any existing content'
                        : 'AI will improve and expand existing metadata while keeping the core concepts'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Prompt Style</label>
                    <select
                      value={options.promptStyle}
                      onChange={(e) => setOptions({ ...options, promptStyle: e.target.value as PromptStyle })}
                      className="w-full px-4 py-3 sm:px-3 sm:py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-base sm:text-sm text-gray-900 bg-white min-h-[48px]"
                    >
                      <option value="professional">Professional - Clean, business-appropriate language</option>
                      <option value="creative">Creative - Artistic, expressive, evocative descriptions</option>
                      <option value="descriptive">Descriptive - Detailed, comprehensive analysis</option>
                      <option value="seo">SEO - Search-optimized keywords and phrases</option>
                      <option value="minimal">Minimal - Brief, concise descriptions</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-2 hidden sm:block">
                      Example for tortilla photo: {
                        options.promptStyle === 'professional' ? '"Traditional Tortilla Making on Rustic Griddle"' :
                        options.promptStyle === 'creative' ? '"Hands Dancing Across Sun-Kissed Stone"' :
                        options.promptStyle === 'descriptive' ? '"Traditional Outdoor Tortilla Preparation Process on Weathered Stone Griddle with Rising Steam"' :
                        options.promptStyle === 'seo' ? '"Authentic Mexican Tortilla Making Traditional Cooking Outdoor Kitchen"' :
                        '"Tortillas on Griddle"'
                      }
                    </p>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
                    <input
                      type="checkbox"
                      checked={options.saveToSmugMug}
                      onChange={(e) => setOptions({ ...options, saveToSmugMug: e.target.checked })}
                      className="w-5 h-5 sm:w-4 sm:h-4 text-green-600 rounded flex-shrink-0"
                    />
                    <span className="text-base sm:text-sm text-gray-700">Save to SmugMug automatically</span>
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

            {/* Action Bar - Mobile Optimized */}
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Bulk Actions</h3>
                  <p className="text-sm text-gray-600">
                    {selectedPhotos.size > 0
                      ? `${selectedPhotos.size} photo${selectedPhotos.size !== 1 ? 's' : ''} selected`
                      : 'Select photos to process'}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex gap-3">
                    <button
                      onClick={selectAll}
                      className="flex-1 sm:flex-none text-sm text-blue-600 hover:text-blue-700 active:text-blue-800 font-medium min-h-[44px] px-4 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      onClick={deselectAll}
                      className="flex-1 sm:flex-none text-sm text-gray-600 hover:text-gray-700 active:text-gray-800 font-medium min-h-[44px] px-4 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      Deselect All
                    </button>
                  </div>
                  <button
                    onClick={() => processPhotos()}
                    disabled={processing || selectedPhotos.size === 0}
                    className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg transition-colors font-semibold min-h-[48px]"
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

            {/* Photos List - Mobile Optimized */}
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
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 sm:p-6">
                    {/* Mobile: Checkbox and Thumbnail Row */}
                    <div className="flex gap-4 sm:gap-6 items-start">
                      {/* Selection Checkbox */}
                      <div className="flex-shrink-0 pt-1">
                        <input
                          type="checkbox"
                          checked={selectedPhotos.has(index)}
                          onChange={() => togglePhotoSelection(index)}
                          className="w-6 h-6 sm:w-5 sm:h-5 text-purple-600 rounded cursor-pointer"
                        />
                      </div>

                      {/* Thumbnail */}
                      <div className="flex-shrink-0">
                        <img
                          src={photo.ThumbnailUrl}
                          alt={photo.FileName}
                          className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-lg"
                        />
                      </div>
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

                      {/* Generated Metadata - Mobile Optimized Forms */}
                      {photo.generated && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Title</label>
                            <input
                              type="text"
                              value={photo.generated.title}
                              onChange={(e) => updatePhotoMetadata(index, 'title', e.target.value)}
                              className="w-full px-4 py-3 sm:px-3 sm:py-2 border-2 border-gray-300 rounded-lg text-base sm:text-sm text-gray-900 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all min-h-[48px]"
                              disabled={photo.status === 'saved'}
                              placeholder="Photo title..."
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Caption</label>
                            <textarea
                              value={photo.generated.caption}
                              onChange={(e) => updatePhotoMetadata(index, 'caption', e.target.value)}
                              className="w-full px-4 py-3 sm:px-3 sm:py-2 border-2 border-gray-300 rounded-lg text-base sm:text-sm text-gray-900 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all min-h-[80px]"
                              rows={3}
                              disabled={photo.status === 'saved'}
                              placeholder="Photo caption..."
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Keywords</label>
                            <input
                              type="text"
                              value={photo.generated.keywords}
                              onChange={(e) => updatePhotoMetadata(index, 'keywords', e.target.value)}
                              className="w-full px-4 py-3 sm:px-3 sm:py-2 border-2 border-gray-300 rounded-lg text-base sm:text-sm text-gray-900 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all min-h-[48px]"
                              disabled={photo.status === 'saved'}
                              placeholder="keywords, separated, by, commas"
                            />
                          </div>

                          {/* Action Buttons */}
                          {photo.status === 'generated' && (
                            <div className="mt-4 space-y-2">
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
                                  } catch (_err) {
                                    console.error('Error saving:', _err);
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
                              <button
                                onClick={() => retryPhoto(index)}
                                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                              >
                                <RefreshCw className="w-4 h-4" />
                                Rescan (Try Different Model)
                              </button>
                            </div>
                          )}
                          {(photo.status === 'saved' || photo.status === 'error') && (
                            <div className="mt-4">
                              <button
                                onClick={() => retryPhoto(index)}
                                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                              >
                                <RefreshCw className="w-4 h-4" />
                                Rescan with AI
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

      {/* System Prompt Viewer */}
      <SystemPromptViewer
        toolName="MetaData Monster"
        apiEndpoint="/api/ai/generate-metadata"
        toolId="metadata-monster"
      />
      </div>
    </div>
    </>
  );
}
