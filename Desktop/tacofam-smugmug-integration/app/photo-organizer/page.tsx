'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FolderTree, Upload, Sparkles, Settings, CheckCircle, AlertTriangle, XCircle, Loader, Brain, Archive, RefreshCw, EyeOff, ChevronRight, ChevronDown, Folder, Image as ImageIcon } from 'lucide-react';
import { tokenStorage } from '@/lib/smugmug-client';
import ToolboxHeader from '@/components/ToolboxHeader';

interface GalleryIndex {
  albumKey: string;
  name: string;
  nodeId: string;
  themes: string[];
  dateRange: string;
  location?: string;
  imageCount: number;
  lastIndexed: string;
  sampleImages: string[];
  summary?: string;
  photoStyle?: string;
  subjects?: string[];
  tokensUsed?: number;
}

interface OrganizeTask {
  imageUrl: string;
  imageName: string;
  imageUri: string;
  sourceGallery: string;
  suggestedGallery: string;
  confidence: number;
  reasoning: string;
  status: 'auto-approved' | 'needs-review' | 'skipped' | 'approved' | 'rejected';
}

export default function PhotoOrganizer() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'build-index' | 'sort-existing' | 'upload-sort'>('build-index');
  const [galleries, setGalleries] = useState<any[]>([]);
  const [galleryIndex, setGalleryIndex] = useState<GalleryIndex[]>([]);
  const [selectedGalleries, setSelectedGalleries] = useState<string[]>([]);
  const [isIndexing, setIsIndexing] = useState(false);
  const [isSorting, setIsSorting] = useState(false);
  const [organizeTasks, setOrganizeTasks] = useState<OrganizeTask[]>([]);
  const [showDryRun, setShowDryRun] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(90);
  const [manualReview, setManualReview] = useState(false);
  const [indexingProgress, setIndexingProgress] = useState<{ current: number; total: number; galleryName: string } | null>(null);
  const [viewingIndex, setViewingIndex] = useState<string | null>(null);
  const [sourceGallery, setSourceGallery] = useState<string>('');
  const [sortingProgress, setSortingProgress] = useState<{ current: number; total: number; imageName: string } | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [copyMode, setCopyMode] = useState<boolean>(true); // true = copy/collect, false = move
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState<{ current: number; total: number; taskName: string } | null>(null);
  const [hideEmptyGalleries, setHideEmptyGalleries] = useState(false);
  const [tokens, setTokens] = useState<{ accessToken: string; accessTokenSecret: string } | null>(null);

  // Multi-select state for Sort Existing Photos
  const [folders, setFolders] = useState<any[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [selectedSourceGalleries, setSelectedSourceGalleries] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [loadedPhotos, setLoadedPhotos] = useState<any[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [showPhotoSelector, setShowPhotoSelector] = useState(false);

  useEffect(() => {
    const storedTokens = tokenStorage.getTokens();
    setTokens(storedTokens);
    if (!storedTokens) {
      router.push('/');
      return;
    }

    loadGalleries();
    loadGalleryIndex();
    loadFolders();

    // Auto-refresh galleries every 3 minutes to check for updates
    const refreshInterval = setInterval(() => {
      loadGalleries();
    }, 3 * 60 * 1000); // 3 minutes

    return () => clearInterval(refreshInterval);
  }, []);

  const loadGalleries = async () => {
    const tokens = tokenStorage.getTokens();
    if (!tokens) return;

    try {
      const response = await fetch('/api/smugmug/albums', {
        headers: {
          'X-Access-Token': tokens.accessToken,
          'X-Access-Token-Secret': tokens.accessTokenSecret,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setGalleries(data.albums || []);
      }
    } catch (error) {
      console.error('Error loading galleries:', error);
    }
  };

  const loadGalleryIndex = () => {
    const saved = localStorage.getItem('photo-organizer-index');
    if (saved) {
      try {
        setGalleryIndex(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading index:', error);
      }
    }
  };

  const saveGalleryIndex = (index: GalleryIndex[]) => {
    localStorage.setItem('photo-organizer-index', JSON.stringify(index));
    setGalleryIndex(index);
  };

  const loadFolders = async () => {
    const tokens = tokenStorage.getTokens();
    if (!tokens) return;

    try {
      const response = await fetch('/api/smugmug/folders', {
        headers: {
          'X-Access-Token': tokens.accessToken,
          'X-Access-Token-Secret': tokens.accessTokenSecret,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFolders(data.folders || []);
      }
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  };

  // Helper: Get all galleries in a folder (recursively)
  const getGalleriesInFolder = (folderId: string): string[] => {
    const folder = folders.find(f => f.NodeID === folderId);
    if (!folder) return [];

    const galleriesInFolder = galleries
      .filter(g => g.NodeID?.startsWith(folder.UrlPath) || g.ParentNode?.NodeID === folderId)
      .map(g => g.AlbumKey);

    // Also get galleries from child folders
    const childFolders = folders.filter(f => f.ParentNode?.NodeID === folderId);
    childFolders.forEach(childFolder => {
      galleriesInFolder.push(...getGalleriesInFolder(childFolder.NodeID));
    });

    return galleriesInFolder;
  };

  // Toggle folder selection
  const toggleFolderSelection = (folderId: string) => {
    const newSelectedFolders = new Set(selectedFolders);
    const newSelectedGalleries = new Set(selectedSourceGalleries);

    if (newSelectedFolders.has(folderId)) {
      // Deselect folder and all its galleries
      newSelectedFolders.delete(folderId);
      const galleriesInFolder = getGalleriesInFolder(folderId);
      galleriesInFolder.forEach(g => newSelectedGalleries.delete(g));
    } else {
      // Select folder and all its galleries
      newSelectedFolders.add(folderId);
      const galleriesInFolder = getGalleriesInFolder(folderId);
      galleriesInFolder.forEach(g => newSelectedGalleries.add(g));
    }

    setSelectedFolders(newSelectedFolders);
    setSelectedSourceGalleries(newSelectedGalleries);
  };

  // Toggle folder expand/collapse
  const toggleFolderExpand = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  // Toggle single gallery selection
  const toggleGallerySelection = (galleryKey: string) => {
    const newSelected = new Set(selectedSourceGalleries);
    if (newSelected.has(galleryKey)) {
      newSelected.delete(galleryKey);
    } else {
      newSelected.add(galleryKey);
    }
    setSelectedSourceGalleries(newSelected);
  };

  // Load photos from all selected galleries
  const loadPhotosFromSelection = async () => {
    if (selectedSourceGalleries.size === 0) {
      alert('Please select at least one gallery first');
      return;
    }

    setShowPhotoSelector(true);
    setLoadedPhotos([]);

    const tokens = tokenStorage.getTokens();
    if (!tokens) return;

    const allPhotos: any[] = [];

    for (const galleryKey of Array.from(selectedSourceGalleries)) {
      try {
        const response = await fetch(`/api/smugmug/albums/${galleryKey}/images`, {
          headers: {
            'X-Access-Token': tokens.accessToken,
            'X-Access-Token-Secret': tokens.accessTokenSecret,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const photos = (data.images || []).map((img: any) => ({
            ...img,
            sourceGalleryKey: galleryKey,
            sourceGalleryName: galleries.find(g => g.AlbumKey === galleryKey)?.Name || 'Unknown',
          }));
          allPhotos.push(...photos);
        }
      } catch (error) {
        console.error(`Error loading photos from gallery ${galleryKey}:`, error);
      }
    }

    setLoadedPhotos(allPhotos);
  };

  // Toggle photo selection
  const togglePhotoSelection = (imageKey: string) => {
    const newSelected = new Set(selectedPhotos);
    if (newSelected.has(imageKey)) {
      newSelected.delete(imageKey);
    } else {
      newSelected.add(imageKey);
    }
    setSelectedPhotos(newSelected);
  };

  // Select all photos
  const selectAllPhotos = () => {
    const allPhotoKeys = loadedPhotos.map(p => p.ImageKey);
    setSelectedPhotos(new Set(allPhotoKeys));
  };

  // Deselect all photos
  const deselectAllPhotos = () => {
    setSelectedPhotos(new Set());
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTerminalLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleBuildIndex = async () => {
    if (selectedGalleries.length === 0) {
      alert('Please select at least one gallery to index');
      return;
    }

    setIsIndexing(true);
    setTerminalLogs([]);
    setIndexingProgress({ current: 0, total: selectedGalleries.length, galleryName: '' });

    addLog('🚀 Starting gallery indexing process...');
    addLog(`📊 Processing ${selectedGalleries.length} galleries`);

    const tokens = tokenStorage.getTokens();
    if (!tokens) {
      alert('Please reconnect your SmugMug account');
      setIsIndexing(false);
      setIndexingProgress(null);
      return;
    }

    const newIndexEntries: GalleryIndex[] = [];

    try {
      for (let i = 0; i < selectedGalleries.length; i++) {
        const albumKey = selectedGalleries[i];
        const gallery = galleries.find(g => g.AlbumKey === albumKey);

        if (!gallery) continue;

        setIndexingProgress({
          current: i + 1,
          total: selectedGalleries.length,
          galleryName: gallery.Name
        });

        addLog(`\n📁 Gallery ${i + 1}/${selectedGalleries.length}: "${gallery.Name}"`);
        addLog('   → Fetching images from SmugMug API...');

        // Fetch images from this album
        const imagesResponse = await fetch(`/api/smugmug/albums/${albumKey}/images`, {
          headers: {
            'X-Access-Token': tokens.accessToken,
            'X-Access-Token-Secret': tokens.accessTokenSecret,
          },
        });

        if (!imagesResponse.ok) {
          addLog('   ❌ Failed to fetch images');
          console.error(`Failed to fetch images for ${gallery.Name}`);
          continue;
        }

        const imagesData = await imagesResponse.json();
        const images = imagesData.images || [];

        if (images.length === 0) {
          addLog('   ⚠️  No images found, skipping...');
          console.log(`Skipping ${gallery.Name} - no images`);
          continue;
        }

        addLog(`   ✓ Found ${images.length} images`);
        addLog('   → Extracting metadata (titles, captions, keywords, dates)...');

        // Get SmallUrl from each image (400px - perfect for AI analysis)
        const imageUrls = images
          .map((img: any) => img.Uris?.SmallUrl || img.ArchivedUri)
          .filter(Boolean);

        if (imageUrls.length === 0) {
          addLog('   ❌ No valid image URLs found');
          console.log(`Skipping ${gallery.Name} - no image URLs available`);
          continue;
        }

        addLog(`   ✓ Metadata extracted from ${Math.min(images.length, 20)} images`);
        addLog('   → Sending to Claude AI for analysis...');

        // Call AI analysis endpoint
        const analysisResponse = await fetch('/api/ai/analyze-gallery', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            images: images,
            galleryName: gallery.Name,
            albumKey: albumKey,
          }),
        });

        if (!analysisResponse.ok) {
          addLog('   ❌ AI analysis failed');
          console.error(`Failed to analyze ${gallery.Name}`);
          continue;
        }

        const analysisData = await analysisResponse.json();
        addLog(`   ✓ AI analysis complete (${analysisData.tokensUsed || 0} tokens used)`);

        // Create index entry
        const indexEntry: GalleryIndex = {
          albumKey: albumKey,
          name: gallery.Name,
          nodeId: gallery.NodeID || '',
          themes: analysisData.analysis.themes || [],
          dateRange: analysisData.analysis.dateRange || '',
          location: analysisData.analysis.location || undefined,
          imageCount: images.length,
          lastIndexed: new Date().toISOString(),
          sampleImages: analysisData.analysis.sampleImages || [],
          summary: analysisData.analysis.summary || '',
          photoStyle: analysisData.analysis.photoStyle || '',
          subjects: analysisData.analysis.subjects || [],
          tokensUsed: analysisData.tokensUsed || 0,
        };

        addLog(`   ✓ Gallery "${gallery.Name}" indexed successfully`);
        addLog(`   📝 Themes: ${indexEntry.themes.join(', ')}`);
        if (indexEntry.subjects && indexEntry.subjects.length > 0) {
          addLog(`   📝 Subjects: ${indexEntry.subjects.join(', ')}`);
        }

        newIndexEntries.push(indexEntry);
      }

      addLog('\n💾 Saving index to localStorage...');

      // Merge with existing index (update if exists, add if new)
      const updatedIndex = [...galleryIndex];
      newIndexEntries.forEach(newEntry => {
        const existingIndex = updatedIndex.findIndex(e => e.albumKey === newEntry.albumKey);
        if (existingIndex >= 0) {
          updatedIndex[existingIndex] = newEntry;
        } else {
          updatedIndex.push(newEntry);
        }
      });

      saveGalleryIndex(updatedIndex);

      addLog(`✅ Index saved! ${newIndexEntries.length} galleries successfully indexed`);
      addLog(`📊 Total galleries in index: ${updatedIndex.length}`);

      alert(`✅ Successfully indexed ${newIndexEntries.length} galleries!`);
      setSelectedGalleries([]);

    } catch (error) {
      addLog(`\n❌ Error: ${error}`);
      console.error('Error building index:', error);
      alert('Failed to build index. Check console for details.');
    } finally {
      setIsIndexing(false);
      setIndexingProgress(null);
    }
  };

  const handleSortExisting = async () => {
    // Check if we have any selection
    if (selectedSourceGalleries.size === 0 && selectedPhotos.size === 0) {
      alert('Please select folders, galleries, or individual photos to analyze');
      return;
    }

    if (galleryIndex.length === 0) {
      alert('Please build an index first! Go to "Build Index" tab.');
      return;
    }

    // Clear previous logs
    setTerminalLogs([]);

    const addLog = (message: string) => {
      const timestamp = new Date().toLocaleTimeString();
      setTerminalLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    };

    setIsSorting(true);
    setSortingProgress({ current: 0, total: 0, imageName: '' });

    const tokens = tokenStorage.getTokens();
    if (!tokens) {
      alert('Please reconnect your SmugMug account');
      setIsSorting(false);
      setSortingProgress(null);
      return;
    }

    try {
      addLog('🚀 Starting photo analysis workflow...');
      addLog(`📊 Using AI knowledge base with ${galleryIndex.length} indexed galleries`);

      let images: any[] = [];

      // Determine what to analyze
      if (selectedPhotos.size > 0) {
        // Analyze only selected photos
        addLog(`📸 Analyzing ${selectedPhotos.size} selected ${selectedPhotos.size === 1 ? 'photo' : 'photos'}`);
        images = loadedPhotos.filter(p => selectedPhotos.has(p.ImageKey));
      } else {
        // Analyze all photos from selected galleries
        addLog(`📁 Analyzing all photos from ${selectedSourceGalleries.size} selected ${selectedSourceGalleries.size === 1 ? 'gallery' : 'galleries'}`);

        for (const galleryKey of Array.from(selectedSourceGalleries)) {
          const galleryInfo = galleries.find(g => g.AlbumKey === galleryKey);
          addLog(`📡 Fetching images from "${galleryInfo?.Name || galleryKey}"...`);

          const imagesResponse = await fetch(`/api/smugmug/albums/${galleryKey}/images`, {
            headers: {
              'X-Access-Token': tokens.accessToken,
              'X-Access-Token-Secret': tokens.accessTokenSecret,
            },
          });

          if (imagesResponse.ok) {
            const imagesData = await imagesResponse.json();
            const galleryImages = (imagesData.images || []).map((img: any) => ({
              ...img,
              sourceGalleryKey: galleryKey,
              sourceGalleryName: galleryInfo?.Name || 'Unknown',
            }));
            images.push(...galleryImages);
            addLog(`   ✅ Found ${galleryImages.length} images`);
          } else {
            addLog(`   ⚠️  Failed to fetch images from "${galleryInfo?.Name || galleryKey}"`);
          }
        }
      }

      if (images.length === 0) {
        addLog('❌ No images found in selection');
        alert('No images found in selection');
        setIsSorting(false);
        setSortingProgress(null);
        return;
      }

      addLog(`✅ Total: ${images.length} images to analyze`);
      setSortingProgress({ current: 0, total: images.length, imageName: 'Analyzing...' });

      const tasks: OrganizeTask[] = [];

      // Analyze each image
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const imageName = image.FileName || image.Title || `Image ${i + 1}`;

        setSortingProgress({
          current: i + 1,
          total: images.length,
          imageName
        });

        addLog(`\n🔍 Analyzing ${i + 1}/${images.length}: "${imageName}"`);

        // Extract metadata
        const metadata = {
          title: image.Title || '',
          caption: image.Caption || '',
          keywords: image.Keywords || '',
          filename: image.FileName || '',
          date: image.Date || '',
        };

        addLog(`   📝 Metadata extracted:`);
        if (metadata.title) addLog(`      • Title: ${metadata.title}`);
        if (metadata.keywords) addLog(`      • Keywords: ${metadata.keywords}`);
        if (metadata.caption) addLog(`      • Caption: ${metadata.caption.substring(0, 50)}${metadata.caption.length > 50 ? '...' : ''}`);
        if (metadata.date) addLog(`      • Date: ${metadata.date}`);

        addLog(`   🤖 Sending to Claude AI for gallery suggestion...`);
        addLog(`   💭 Prompt: "Analyze metadata and suggest best gallery from ${galleryIndex.length} options"`);

        // Use AI to suggest best gallery
        const suggestionResponse = await fetch('/api/ai/suggest-gallery', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            metadata,
            galleryIndex,
          }),
        });

        if (suggestionResponse.ok) {
          const suggestion = await suggestionResponse.json();

          addLog(`   ✨ AI Response received (${suggestion.tokensUsed || 'N/A'} tokens used)`);
          addLog(`   🎯 Suggested: "${suggestion.suggestedGallery}"`);
          addLog(`   📊 Confidence: ${suggestion.confidence}%`);
          addLog(`   💡 Reasoning: ${suggestion.reasoning}`);

          let status: OrganizeTask['status'] = 'skipped';
          if (suggestion.confidence >= 90) {
            status = 'auto-approved';
            addLog(`   ✅ AUTO-APPROVED (confidence ≥ 90%)`);
          } else if (suggestion.confidence >= 70) {
            status = 'needs-review';
            addLog(`   ⚠️  NEEDS REVIEW (confidence 70-89%)`);
          } else {
            addLog(`   ⏭️  SKIPPED (confidence < 70%)`);
          }

          tasks.push({
            imageUrl: image.ThumbnailUrl || image.ArchivedUri || '',
            imageName,
            imageUri: image.Uris?.Image?.Uri || image.Uri || '',
            sourceGallery: image.sourceGalleryName || 'Unknown',
            suggestedGallery: suggestion.suggestedGallery,
            confidence: suggestion.confidence,
            reasoning: suggestion.reasoning,
            status,
          });
        } else {
          addLog(`   ❌ AI suggestion failed for this image`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      addLog(`\n🎉 Analysis complete!`);
      addLog(`📋 Results summary:`);
      addLog(`   • Total images analyzed: ${images.length}`);
      addLog(`   • Tasks created: ${tasks.length}`);
      addLog(`   • Auto-approved: ${tasks.filter(t => t.status === 'auto-approved').length}`);
      addLog(`   • Needs review: ${tasks.filter(t => t.status === 'needs-review').length}`);
      addLog(`   • Skipped: ${tasks.filter(t => t.status === 'skipped').length}`);

      console.log('Analysis complete. Tasks created:', tasks.length);
      console.log('Tasks:', tasks);

      if (tasks.length === 0) {
        addLog('⚠️  No suggestions generated - images may lack metadata');
        alert('No suggestions generated. Images may not have enough metadata to analyze.');
        return;
      }

      addLog('✅ Opening dry run review modal...');
      setOrganizeTasks(tasks);
      setShowDryRun(true);

    } catch (error) {
      console.error('Error sorting photos:', error);
      alert('Failed to sort photos. Check console for details.');
    } finally {
      setIsSorting(false);
      setSortingProgress(null);
    }
  };

  const toggleIndexGallerySelection = (albumKey: string) => {
    setSelectedGalleries(prev =>
      prev.includes(albumKey)
        ? prev.filter(k => k !== albumKey)
        : [...prev, albumKey]
    );
  };

  const handleExecuteOrganize = async () => {
    if (!tokens) return;

    const tasksToExecute = organizeTasks.filter(
      t => t.status === 'auto-approved' || t.status === 'needs-review'
    );

    if (tasksToExecute.length === 0) {
      alert('No tasks to execute');
      return;
    }

    const confirmMessage = copyMode
      ? `Copy ${tasksToExecute.length} images to suggested galleries?\n\nThis will create collected copies in the destination galleries.`
      : `Move ${tasksToExecute.length} images to suggested galleries?\n\nThis will relocate images to the destination galleries.`;

    if (!confirm(confirmMessage)) return;

    setShowDryRun(false);
    setIsExecuting(true);

    try {
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < tasksToExecute.length; i++) {
        const task = tasksToExecute[i];
        setExecutionProgress({
          current: i + 1,
          total: tasksToExecute.length,
          taskName: task.imageName,
        });

        try {
          // Find destination album key
          const destGallery = galleryIndex.find(g => g.name === task.suggestedGallery);
          if (!destGallery) {
            console.error('Destination gallery not found in index:', task.suggestedGallery);
            addLog(`   ❌ Destination gallery "${task.suggestedGallery}" not found in index`);
            failCount++;
            continue;
          }

          // Verify destination album still exists on SmugMug
          const verifyResponse = await fetch(`/api/smugmug/albums/${destGallery.albumKey}/images?limit=1`, {
            method: 'GET',
            headers: {
              'X-Access-Token': tokens.accessToken,
              'X-Access-Token-Secret': tokens.accessTokenSecret,
            },
          });

          if (!verifyResponse.ok) {
            console.error('Destination album not found on SmugMug:', destGallery.albumKey);
            addLog(`   ❌ Album "${task.suggestedGallery}" (${destGallery.albumKey}) no longer exists on SmugMug`);
            addLog(`      💡 Re-index your galleries to update deleted albums`);
            failCount++;
            continue;
          }

          addLog(`   📤 ${copyMode ? 'Copying' : 'Moving'} "${task.imageName}" to "${task.suggestedGallery}" (${destGallery.albumKey})`);

          if (copyMode) {
            // Copy/collect image to destination album
            const response = await fetch('/api/smugmug/collect-image', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Access-Token': tokens.accessToken,
                'X-Access-Token-Secret': tokens.accessTokenSecret,
              },
              body: JSON.stringify({
                imageUri: task.imageUri,
                albumKey: destGallery.albumKey,
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              console.error('Failed to copy image:', task.imageName, errorData);
              addLog(`   ❌ Failed to copy: ${errorData.error || 'Unknown error'}`);
              failCount++;
            } else {
              addLog(`   ✅ Successfully copied`);
              successCount++;
            }
          } else {
            // Move logic - would need a different API endpoint
            // For now, placeholder
            console.log('Move logic not yet implemented');
            failCount++;
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error('Error processing task:', error);
          failCount++;
        }
      }

      alert(
        `${copyMode ? 'Copy' : 'Move'} complete!\n\n` +
        `✅ Success: ${successCount}\n` +
        `❌ Failed: ${failCount}`
      );

      // Clear tasks after execution
      setOrganizeTasks([]);

    } catch (error) {
      console.error('Error executing organize:', error);
      alert('Failed to execute. Check console for details.');
    } finally {
      setIsExecuting(false);
      setExecutionProgress(null);
    }
  };

  const viewingIndexData = viewingIndex ? galleryIndex.find(idx => idx.albumKey === viewingIndex) : null;

  return (
    <div className="flex flex-col min-h-screen">
      <ToolboxHeader currentTool="photo-organizer" />

      {/* View Index Modal */}
      {viewingIndex && viewingIndexData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">AI Gallery Analysis</h2>
              <button
                onClick={() => setViewingIndex(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Gallery Info */}
              <div>
                <h3 className="font-bold text-lg text-gray-900">{viewingIndexData.name}</h3>
                <div className="text-sm text-gray-600 mt-1">
                  {viewingIndexData.imageCount} images • Last indexed: {new Date(viewingIndexData.lastIndexed).toLocaleString()}
                </div>
              </div>

              {/* Summary */}
              {viewingIndexData.summary && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Summary</h4>
                  <p className="text-gray-700 leading-relaxed">{viewingIndexData.summary}</p>
                </div>
              )}

              {/* Themes */}
              {viewingIndexData.themes && viewingIndexData.themes.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Themes</h4>
                  <div className="flex flex-wrap gap-2">
                    {viewingIndexData.themes.map((theme, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium"
                      >
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Subjects */}
              {viewingIndexData.subjects && viewingIndexData.subjects.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Subjects</h4>
                  <div className="flex flex-wrap gap-2">
                    {viewingIndexData.subjects.map((subject, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                      >
                        {subject}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Date Range */}
              {viewingIndexData.dateRange && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Date Range</h4>
                  <p className="text-gray-700">{viewingIndexData.dateRange}</p>
                </div>
              )}

              {/* Location */}
              {viewingIndexData.location && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Location</h4>
                  <p className="text-gray-700">{viewingIndexData.location}</p>
                </div>
              )}

              {/* Photo Style */}
              {viewingIndexData.photoStyle && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Photo Style</h4>
                  <p className="text-gray-700">{viewingIndexData.photoStyle}</p>
                </div>
              )}

              {/* Sample Images */}
              {viewingIndexData.sampleImages && viewingIndexData.sampleImages.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Sample Images Analyzed</h4>
                  <div className="grid grid-cols-5 gap-2">
                    {viewingIndexData.sampleImages.slice(0, 10).map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={`Sample ${i + 1}`}
                        className="w-full h-20 object-cover rounded border border-gray-200"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => setViewingIndex(null)}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <Brain className="w-8 h-8 text-indigo-600" />
                  Photo Organizer
                </h1>
                <p className="text-gray-600 mt-2">
                  AI-powered photo organization with smart gallery indexing
                </p>
              </div>

              {/* Settings */}
              <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Settings className="w-4 h-4 text-gray-600" />
                  <span className="font-semibold text-sm text-gray-900">Settings</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-gray-600">Auto-approve threshold</label>
                    <select
                      value={confidenceThreshold}
                      onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                      className="w-full px-3 py-1 border border-gray-300 rounded text-sm mt-1"
                      disabled={manualReview}
                    >
                      <option value={95}>95%+ (Very Conservative)</option>
                      <option value={90}>90%+ (Recommended)</option>
                      <option value={85}>85%+ (Balanced)</option>
                      <option value={80}>80%+ (Aggressive)</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={manualReview}
                      onChange={(e) => setManualReview(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-gray-700">Review all moves manually</span>
                  </label>
                  <div className="pt-2 mt-2 border-t border-gray-200">
                    <label className="text-xs text-gray-600 mb-1 block">Operation mode</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCopyMode(true)}
                        className={`flex-1 px-3 py-2 text-xs rounded font-medium transition-all ${
                          copyMode
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        📋 Copy
                      </button>
                      <button
                        onClick={() => setCopyMode(false)}
                        className={`flex-1 px-3 py-2 text-xs rounded font-medium transition-all ${
                          !copyMode
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        ↔️ Move
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {copyMode ? 'Create collected copies in suggested galleries' : 'Move photos to suggested galleries'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-8 pt-6">
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('build-index')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'build-index'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Archive className="w-4 h-4" />
                Build Index
              </div>
            </button>
            <button
              onClick={() => setActiveTab('sort-existing')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'sort-existing'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <FolderTree className="w-4 h-4" />
                Sort Existing Photos
              </div>
            </button>
            <button
              onClick={() => setActiveTab('upload-sort')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'upload-sort'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload & Sort
              </div>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {activeTab === 'build-index' && (
              <div className="flex gap-6">
                {/* Left Sidebar - Indexed Galleries */}
                {galleryIndex.length > 0 && (
                  <div className="w-80 flex-shrink-0">
                    <div className="sticky top-8">
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3 mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <h3 className="font-semibold text-gray-900">
                            Index Progress
                          </h3>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Indexed:</span>
                            <span className="font-semibold text-green-700">{galleryIndex.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Not Indexed:</span>
                            <span className="font-semibold text-gray-700">{galleries.length - galleryIndex.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Progress:</span>
                            <span className="font-semibold text-indigo-600">
                              {galleries.length > 0 ? Math.round((galleryIndex.length / galleries.length) * 100) : 0}%
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div
                            className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${galleries.length > 0 ? (galleryIndex.length / galleries.length) * 100 : 0}%` }}
                          />
                        </div>

                        {/* Cost Estimation */}
                        {(() => {
                          const indexedWithTokens = galleryIndex.filter(g => g.tokensUsed && g.tokensUsed > 0);
                          if (indexedWithTokens.length === 0) return null;

                          const totalTokens = indexedWithTokens.reduce((sum, g) => sum + (g.tokensUsed || 0), 0);
                          const avgTokens = Math.round(totalTokens / indexedWithTokens.length);
                          const remainingGalleries = galleries.length - galleryIndex.length;
                          const estimatedTokens = avgTokens * remainingGalleries;

                          // Claude Haiku pricing (per million tokens)
                          // Assume 50/50 split between input and output
                          const inputCost = 0.80; // per million
                          const outputCost = 4.00; // per million
                          const avgCostPerMillionTokens = (inputCost + outputCost) / 2;
                          const estimatedCost = (estimatedTokens / 1000000) * avgCostPerMillionTokens;

                          return (
                            <div className="pt-2 mt-2 border-t border-green-300">
                              <div className="text-xs font-semibold text-gray-700 mb-1">💰 Cost Estimation</div>
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Avg tokens/gallery:</span>
                                  <span className="font-semibold text-gray-900">{avgTokens.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Est. remaining tokens:</span>
                                  <span className="font-semibold text-gray-900">{estimatedTokens.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Est. remaining cost:</span>
                                  <span className="font-semibold text-green-700">${estimatedCost.toFixed(2)}</span>
                                </div>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Based on {indexedWithTokens.length} indexed {indexedWithTokens.length === 1 ? 'gallery' : 'galleries'}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                      <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                        {galleryIndex.map((index) => (
                          <div
                            key={index.albumKey}
                            className="bg-white border border-green-200 rounded-lg p-3 hover:shadow-sm transition-shadow"
                          >
                            <div className="font-semibold text-sm text-gray-900 truncate">
                              {index.name}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {index.imageCount} images
                            </div>
                            {index.themes && index.themes.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {index.themes.slice(0, 2).map((theme, i) => (
                                  <span
                                    key={i}
                                    className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded"
                                  >
                                    {theme}
                                  </span>
                                ))}
                                {index.themes.length > 2 && (
                                  <span className="text-xs text-gray-500">
                                    +{index.themes.length - 2}
                                  </span>
                                )}
                              </div>
                            )}
                            <button
                              onClick={() => setViewingIndex(index.albumKey)}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium mt-2"
                            >
                              View Details
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Main Content Area */}
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Archive className="w-5 h-5 text-indigo-600" />
                    Build Gallery Index
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Index your existing galleries to build AI knowledge. This is a one-time process that helps the AI understand your gallery structure.
                  </p>

                  {/* Gallery Selection */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">Select Galleries to Index</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={loadGalleries}
                        className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-medium transition-colors flex items-center gap-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Refresh
                      </button>
                      <button
                        onClick={() => setHideEmptyGalleries(!hideEmptyGalleries)}
                        className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors flex items-center gap-1 ${
                          hideEmptyGalleries
                            ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        {hideEmptyGalleries ? 'Show Empty' : 'Hide Empty'}
                      </button>
                      <button
                        onClick={() => setSelectedGalleries(galleries.map(g => g.AlbumKey))}
                        className="px-3 py-1 text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg font-medium transition-colors"
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => setSelectedGalleries([])}
                        className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 lg:grid-cols-5 gap-4 max-h-[600px] overflow-y-auto border border-gray-200 rounded-lg p-4">
                    {galleries
                      .filter(gallery => !hideEmptyGalleries || (gallery.ImageCount && gallery.ImageCount > 0))
                      .map((gallery) => {
                      const indexEntry = galleryIndex.find(idx => idx.albumKey === gallery.AlbumKey);
                      const isIndexed = !!indexEntry;

                      // Calculate index completion percentage
                      const currentImageCount = gallery.ImageCount || 0;
                      const indexedImageCount = indexEntry?.imageCount || 0;
                      const indexPercentage = currentImageCount > 0 ? Math.round((indexedImageCount / currentImageCount) * 100) : 0;

                      // Determine status color
                      let statusColor = 'gray'; // not indexed
                      let statusBg = 'white';
                      let statusBorder = 'gray-300';

                      if (isIndexed) {
                        if (indexPercentage >= 95) {
                          statusColor = 'green';
                          statusBg = 'from-green-50 to-green-100';
                          statusBorder = 'green-400';
                        } else if (indexPercentage >= 70) {
                          statusColor = 'yellow';
                          statusBg = 'from-yellow-50 to-yellow-100';
                          statusBorder = 'yellow-400';
                        } else {
                          statusColor = 'red';
                          statusBg = 'from-red-50 to-red-100';
                          statusBorder = 'red-400';
                        }
                      }

                      return (
                        <div
                          key={gallery.AlbumKey}
                          className={`relative border-2 rounded-xl p-4 transition-all hover:shadow-lg ${
                            isIndexed
                              ? `border-${statusBorder} bg-gradient-to-br ${statusBg}`
                              : 'border-gray-300 bg-white hover:border-indigo-400'
                          }`}
                        >
                          <label className="cursor-pointer block">
                            <input
                              type="checkbox"
                              checked={selectedGalleries.includes(gallery.AlbumKey)}
                              onChange={() => toggleIndexGallerySelection(gallery.AlbumKey)}
                              className="absolute top-3 right-3 rounded w-5 h-5"
                            />

                            <div className="pr-8">
                              <div className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2 min-h-[2.5rem]">
                                {gallery.Name}
                              </div>

                              <div className="text-xs text-gray-600 mb-3">
                                {gallery.ImageCount || 0} images
                              </div>

                              {isIndexed ? (
                                <div className="space-y-2">
                                  <div className={`flex items-center gap-1 text-xs font-semibold ${
                                    statusColor === 'green' ? 'text-green-700' :
                                    statusColor === 'yellow' ? 'text-yellow-700' :
                                    statusColor === 'red' ? 'text-red-700' : 'text-gray-700'
                                  }`}>
                                    <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                    <span className="truncate">{indexPercentage}% Indexed</span>
                                  </div>
                                  {indexPercentage < 100 && (
                                    <div className={`text-xs ${
                                      statusColor === 'yellow' ? 'text-yellow-600' :
                                      statusColor === 'red' ? 'text-red-600' : 'text-gray-600'
                                    }`}>
                                      {indexedImageCount}/{currentImageCount} images
                                      {indexPercentage < 95 && ' - Needs reindex'}
                                    </div>
                                  )}
                                  <div className={`text-xs ${
                                    statusColor === 'green' ? 'text-green-600' :
                                    statusColor === 'yellow' ? 'text-yellow-600' :
                                    statusColor === 'red' ? 'text-red-600' : 'text-gray-600'
                                  }`}>
                                    {new Date(indexEntry.lastIndexed).toLocaleDateString()}
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setViewingIndex(gallery.AlbumKey);
                                    }}
                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
                                  >
                                    View Analysis →
                                  </button>
                                </div>
                              ) : (
                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                  <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                  <span>Not indexed</span>
                                </div>
                              )}
                            </div>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Progress Indicator */}
                {indexingProgress && (
                  <div className="mb-6 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Loader className="w-5 h-5 text-indigo-600 animate-spin" />
                      <div className="flex-1">
                        <div className="font-semibold text-indigo-900">
                          Analyzing gallery {indexingProgress.current} of {indexingProgress.total}
                        </div>
                        <div className="text-sm text-indigo-700">
                          {indexingProgress.galleryName}
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-indigo-600">
                        {Math.round((indexingProgress.current / indexingProgress.total) * 100)}%
                      </div>
                    </div>
                    <div className="w-full bg-indigo-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(indexingProgress.current / indexingProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Terminal Log */}
                {terminalLogs.length > 0 && (
                  <div className="bg-gray-900 rounded-xl p-4 font-mono text-xs text-green-400 max-h-[400px] overflow-y-auto">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-700">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      </div>
                      <span className="text-gray-400">process.log</span>
                    </div>
                    {terminalLogs.map((log, idx) => (
                      <div key={idx} className="whitespace-pre-wrap leading-relaxed">
                        {log}
                      </div>
                    ))}
                  </div>
                )}

                {/* Build Button */}
                <button
                  onClick={handleBuildIndex}
                  disabled={isIndexing || selectedGalleries.length === 0}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 text-white px-6 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  {isIndexing ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Building Index...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Build Index ({selectedGalleries.length} galleries selected)
                    </>
                  )}
                </button>
                </div>
              </div>
            )}

            {activeTab === 'sort-existing' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Sort Existing Photos</h2>
                  <p className="text-gray-600">
                    Analyze photos in a gallery and AI will suggest which indexed gallery each photo belongs in.
                  </p>
                </div>

                {/* Status Check */}
                {galleryIndex.length === 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <div className="font-semibold mb-1">No index found!</div>
                      <div>Please go to "Build Index" tab and index some galleries first.</div>
                    </div>
                  </div>
                )}

                {galleryIndex.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-sm text-green-800">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-semibold">Index ready!</span>
                      <span>{galleryIndex.length} galleries indexed</span>
                    </div>
                  </div>
                )}

                {/* Multi-Level Selector */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-semibold text-gray-700">
                      Select Folders, Galleries, or Individual Photos
                    </label>
                    <div className="text-sm text-gray-600">
                      {selectedSourceGalleries.size} {selectedSourceGalleries.size === 1 ? 'gallery' : 'galleries'} selected
                      {selectedPhotos.size > 0 && ` • ${selectedPhotos.size} ${selectedPhotos.size === 1 ? 'photo' : 'photos'} selected`}
                    </div>
                  </div>

                  {/* Folders & Galleries Tree */}
                  <div className="bg-white border border-gray-300 rounded-xl p-4 max-h-96 overflow-y-auto">
                    {folders.length === 0 && galleries.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <FolderTree className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p>Loading folders and galleries...</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {/* Root folders */}
                        {folders.filter(f => !f.ParentNode || f.ParentNode.NodeID === null).map((folder) => (
                          <div key={folder.NodeID}>
                            <div className="flex items-center gap-2 py-2 px-2 hover:bg-gray-50 rounded-lg">
                              <button
                                onClick={() => toggleFolderExpand(folder.NodeID)}
                                className="p-1 hover:bg-gray-200 rounded"
                              >
                                {expandedFolders.has(folder.NodeID) ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                              <input
                                type="checkbox"
                                checked={selectedFolders.has(folder.NodeID)}
                                onChange={() => toggleFolderSelection(folder.NodeID)}
                                className="w-4 h-4 text-indigo-600 rounded"
                              />
                              <Folder className="w-4 h-4 text-yellow-600" />
                              <span className="text-sm font-medium text-gray-900">{folder.Name}</span>
                            </div>

                            {/* Child items */}
                            {expandedFolders.has(folder.NodeID) && (
                              <div className="ml-6 space-y-1">
                                {/* Child folders */}
                                {folders.filter(f => f.ParentNode?.NodeID === folder.NodeID).map((childFolder) => (
                                  <div key={childFolder.NodeID} className="flex items-center gap-2 py-2 px-2 hover:bg-gray-50 rounded-lg">
                                    <button
                                      onClick={() => toggleFolderExpand(childFolder.NodeID)}
                                      className="p-1 hover:bg-gray-200 rounded"
                                    >
                                      {expandedFolders.has(childFolder.NodeID) ? (
                                        <ChevronDown className="w-4 h-4" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4" />
                                      )}
                                    </button>
                                    <input
                                      type="checkbox"
                                      checked={selectedFolders.has(childFolder.NodeID)}
                                      onChange={() => toggleFolderSelection(childFolder.NodeID)}
                                      className="w-4 h-4 text-indigo-600 rounded"
                                    />
                                    <Folder className="w-4 h-4 text-yellow-600" />
                                    <span className="text-sm text-gray-900">{childFolder.Name}</span>
                                  </div>
                                ))}

                                {/* Galleries in this folder */}
                                {galleries.filter(g => g.ParentNode?.NodeID === folder.NodeID).map((gallery) => (
                                  <div key={gallery.AlbumKey} className="flex items-center gap-2 py-2 px-2 hover:bg-gray-50 rounded-lg ml-6">
                                    <div className="w-6" /> {/* Spacer for alignment */}
                                    <input
                                      type="checkbox"
                                      checked={selectedSourceGalleries.has(gallery.AlbumKey)}
                                      onChange={() => toggleGallerySelection(gallery.AlbumKey)}
                                      className="w-4 h-4 text-indigo-600 rounded"
                                    />
                                    <ImageIcon className="w-4 h-4 text-blue-600" />
                                    <span className="text-sm text-gray-700">{gallery.Name}</span>
                                    <span className="text-xs text-gray-500">({gallery.ImageCount || 0})</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}

                        {/* Galleries without folders */}
                        {galleries.filter(g => !g.ParentNode || !folders.find(f => f.NodeID === g.ParentNode?.NodeID)).map((gallery) => (
                          <div key={gallery.AlbumKey} className="flex items-center gap-2 py-2 px-2 hover:bg-gray-50 rounded-lg">
                            <div className="w-6" /> {/* Spacer */}
                            <input
                              type="checkbox"
                              checked={selectedSourceGalleries.has(gallery.AlbumKey)}
                              onChange={() => toggleGallerySelection(gallery.AlbumKey)}
                              className="w-4 h-4 text-indigo-600 rounded"
                            />
                            <ImageIcon className="w-4 h-4 text-blue-600" />
                            <span className="text-sm text-gray-900">{gallery.Name}</span>
                            <span className="text-xs text-gray-500">({gallery.ImageCount || 0})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Load Photos Button */}
                  {selectedSourceGalleries.size > 0 && (
                    <button
                      onClick={loadPhotosFromSelection}
                      disabled={isSorting}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <ImageIcon className="w-5 h-5" />
                      {showPhotoSelector ? 'Reload Photos' : `Load Photos from ${selectedSourceGalleries.size} ${selectedSourceGalleries.size === 1 ? 'Gallery' : 'Galleries'}`}
                    </button>
                  )}

                  {/* Photo Selector */}
                  {showPhotoSelector && loadedPhotos.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-semibold text-gray-700">
                          Select Photos to Analyze ({loadedPhotos.length} loaded)
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={selectAllPhotos}
                            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                          >
                            Select All
                          </button>
                          <button
                            onClick={deselectAllPhotos}
                            className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                          >
                            Deselect All
                          </button>
                        </div>
                      </div>

                      <div className="bg-white border border-gray-300 rounded-xl p-4 max-h-96 overflow-y-auto">
                        <div className="grid grid-cols-4 gap-3">
                          {loadedPhotos.map((photo) => (
                            <div
                              key={photo.ImageKey}
                              onClick={() => togglePhotoSelection(photo.ImageKey)}
                              className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                                selectedPhotos.has(photo.ImageKey)
                                  ? 'border-indigo-600 ring-2 ring-indigo-600'
                                  : 'border-gray-200 hover:border-gray-400'
                              }`}
                            >
                              <img
                                src={photo.ThumbnailUrl}
                                alt={photo.FileName}
                                className="w-full h-32 object-cover"
                              />
                              <div className="absolute top-2 right-2">
                                <input
                                  type="checkbox"
                                  checked={selectedPhotos.has(photo.ImageKey)}
                                  onChange={() => {}}
                                  className="w-5 h-5 text-indigo-600 rounded"
                                />
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                                <p className="text-xs text-white truncate">{photo.FileName}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Progress */}
                {sortingProgress && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-indigo-900">
                          Analyzing image {sortingProgress.current} of {sortingProgress.total}
                        </div>
                        <div className="text-sm text-indigo-700">
                          {sortingProgress.imageName}
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-indigo-600">
                        {Math.round((sortingProgress.current / sortingProgress.total) * 100)}%
                      </div>
                    </div>
                    <div className="w-full bg-indigo-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(sortingProgress.current / sortingProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Execution Progress */}
                {executionProgress && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-green-900">
                          {copyMode ? 'Copying' : 'Moving'} image {executionProgress.current} of {executionProgress.total}
                        </div>
                        <div className="text-sm text-green-700">
                          {executionProgress.taskName}
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-green-600">
                        {Math.round((executionProgress.current / executionProgress.total) * 100)}%
                      </div>
                    </div>
                    <div className="w-full bg-green-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(executionProgress.current / executionProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Terminal Log */}
                {terminalLogs.length > 0 && (
                  <div className="bg-gray-900 rounded-xl p-4 font-mono text-xs text-green-400 max-h-[400px] overflow-y-auto">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-700">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      </div>
                      <span className="text-gray-400">photo-organizer.log</span>
                    </div>
                    {terminalLogs.map((log, idx) => (
                      <div key={idx} className="whitespace-pre-wrap leading-relaxed">
                        {log}
                      </div>
                    ))}
                  </div>
                )}

                {/* Analyze Button */}
                <button
                  onClick={handleSortExisting}
                  disabled={isSorting || (selectedSourceGalleries.size === 0 && selectedPhotos.size === 0) || galleryIndex.length === 0}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-300 disabled:to-gray-400 text-white px-6 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  {isSorting ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Analyzing Selection...
                    </>
                  ) : (
                    <>
                      <Brain className="w-5 h-5" />
                      Analyze Selection
                      {selectedPhotos.size > 0
                        ? ` (${selectedPhotos.size} ${selectedPhotos.size === 1 ? 'Photo' : 'Photos'})`
                        : selectedSourceGalleries.size > 0
                        ? ` (${selectedSourceGalleries.size} ${selectedSourceGalleries.size === 1 ? 'Gallery' : 'Galleries'})`
                        : ''}
                    </>
                  )}
                </button>
              </div>
            )}

            {activeTab === 'upload-sort' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Upload & Sort</h2>
                <p className="text-gray-600 mb-6">
                  Upload new photos from your computer and AI will suggest the best gallery for each.
                </p>
                <div className="text-center py-12 text-gray-500">
                  Coming soon - Drag & drop photos to auto-organize
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dry Run Review Modal */}
      {showDryRun && organizeTasks.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  Review Suggested {copyMode ? 'Copies' : 'Moves'}
                  <span className="text-sm font-normal px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                    {copyMode ? '📋 Copy Mode' : '↔️ Move Mode'}
                  </span>
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {organizeTasks.filter(t => t.status === 'auto-approved').length} auto-approved · {' '}
                  {organizeTasks.filter(t => t.status === 'needs-review').length} need review · {' '}
                  {organizeTasks.filter(t => t.status === 'skipped').length} skipped
                </p>
              </div>
              <button
                onClick={() => setShowDryRun(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {organizeTasks.map((task, idx) => (
                <div
                  key={idx}
                  className={`border-2 rounded-xl p-4 ${
                    task.status === 'auto-approved'
                      ? 'border-green-300 bg-green-50'
                      : task.status === 'needs-review'
                      ? 'border-yellow-300 bg-yellow-50'
                      : 'border-gray-300 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Thumbnail */}
                    {task.imageUrl && (
                      <img
                        src={task.imageUrl}
                        alt={task.imageName}
                        className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                      />
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{task.imageName}</div>
                      <div className="text-sm mt-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 font-medium">FROM:</span>
                          <span className="font-semibold text-gray-700">{task.sourceGallery}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 font-medium">{copyMode ? 'COPY TO:' : 'MOVE TO:'}</span>
                          <span className="font-semibold text-indigo-600">{task.suggestedGallery}</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{task.reasoning}</div>
                    </div>

                    {/* Confidence Badge */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          task.confidence >= 90
                            ? 'bg-green-200 text-green-800'
                            : task.confidence >= 70
                            ? 'bg-yellow-200 text-yellow-800'
                            : 'bg-gray-200 text-gray-800'
                        }`}
                      >
                        {task.confidence}% confidence
                      </div>
                      {task.status === 'auto-approved' && (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                      {task.status === 'needs-review' && (
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      )}
                      {task.status === 'skipped' && (
                        <XCircle className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Actions */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
              <button
                onClick={() => setShowDryRun(false)}
                className="px-6 py-3 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteOrganize}
                className="px-8 py-3 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                {copyMode ? 'Execute Copies' : 'Execute Moves'} ({organizeTasks.filter(t => t.status === 'auto-approved' || t.status === 'needs-review').length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
