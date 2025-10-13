'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Download,
  Folder,
  ChevronRight,
  ChevronDown,
  Image as ImageIcon,
  Loader,
  CheckSquare,
  Square,
  MinusSquare,
  HardDrive,
  Info,
  Trash2,
} from 'lucide-react';
import ToolboxHeader from '@/components/ToolboxHeader';

interface FolderNode {
  name: string;
  path: string;
  nodeId?: string;
  urlPath?: string;
  albums: Array<{
    albumKey: string;
    name: string;
    imageCount: number;
  }>;
  subfolders: FolderNode[];
  totalImages: number;
}

interface SelectionState {
  folders: Set<string>; // paths
  albums: Set<string>; // album keys
}

export default function Downloader() {
  const router = useRouter();
  const [folderTree, setFolderTree] = useState<FolderNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [selection, setSelection] = useState<SelectionState>({
    folders: new Set(),
    albums: new Set(),
  });
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [imageSize, setImageSize] = useState<string>('Original');
  const [splitStrategy, setSplitStrategy] = useState<'single' | 'album' | 'auto'>('single');
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{
    current: number;
    total: number;
    currentAlbum: string;
  } | null>(null);

  useEffect(() => {
    loadFolderTree();
  }, []);

  const loadFolderTree = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/smugmug/folder-tree', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load folder tree');
      }

      const data = await response.json();
      setFolderTree(data.folderTree);
    } catch (error) {
      console.error('Error loading folder tree:', error);
      alert('Failed to load your SmugMug folder structure');
    } finally {
      setLoading(false);
    }
  };

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const toggleFolderSelection = (folder: FolderNode) => {
    const newSelection = { ...selection };
    const isSelected = newSelection.folders.has(folder.path);

    if (isSelected) {
      // Deselect folder and all children
      newSelection.folders.delete(folder.path);
      deselectAllChildren(folder, newSelection);
    } else {
      // Select folder and all children
      newSelection.folders.add(folder.path);
      selectAllChildren(folder, newSelection);
    }

    setSelection(newSelection);
  };

  const toggleAlbumSelection = (albumKey: string) => {
    const newSelection = { ...selection };
    if (newSelection.albums.has(albumKey)) {
      newSelection.albums.delete(albumKey);
    } else {
      newSelection.albums.add(albumKey);
    }
    setSelection(newSelection);
  };

  const selectAllChildren = (folder: FolderNode, selection: SelectionState) => {
    // Select all albums in this folder
    folder.albums.forEach((album) => {
      selection.albums.add(album.albumKey);
    });

    // Select all subfolders and their children
    folder.subfolders.forEach((subfolder) => {
      selection.folders.add(subfolder.path);
      selectAllChildren(subfolder, selection);
    });
  };

  const deselectAllChildren = (folder: FolderNode, selection: SelectionState) => {
    // Deselect all albums in this folder
    folder.albums.forEach((album) => {
      selection.albums.delete(album.albumKey);
    });

    // Deselect all subfolders and their children
    folder.subfolders.forEach((subfolder) => {
      selection.folders.delete(subfolder.path);
      deselectAllChildren(subfolder, selection);
    });
  };

  const getSelectionStatus = (folder: FolderNode): 'all' | 'some' | 'none' => {
    const allAlbumKeys = getAllAlbumKeys(folder);
    const selectedCount = allAlbumKeys.filter((key) => selection.albums.has(key)).length;

    if (selectedCount === 0) return 'none';
    if (selectedCount === allAlbumKeys.length) return 'all';
    return 'some';
  };

  const getAllAlbumKeys = (folder: FolderNode): string[] => {
    const keys: string[] = [];
    folder.albums.forEach((album) => keys.push(album.albumKey));
    folder.subfolders.forEach((subfolder) => {
      keys.push(...getAllAlbumKeys(subfolder));
    });
    return keys;
  };

  const getTotalSelectedImages = (): number => {
    let total = 0;
    if (!folderTree) return 0;

    const countImages = (folder: FolderNode) => {
      folder.albums.forEach((album) => {
        if (selection.albums.has(album.albumKey)) {
          total += album.imageCount;
        }
      });
      folder.subfolders.forEach((subfolder) => countImages(subfolder));
    };

    countImages(folderTree);
    return total;
  };

  const getAlbumInfo = () => {
    // Get album details for selected albums
    const albumList: Array<{ key: string; name: string; imageCount: number }> = [];

    const traverseFolder = (folder: FolderNode) => {
      folder.albums.forEach(album => {
        if (selection.albums.has(album.albumKey)) {
          albumList.push({
            key: album.albumKey,
            name: album.name,
            imageCount: album.imageCount,
          });
        }
      });
      folder.subfolders.forEach(subfolder => traverseFolder(subfolder));
    };

    if (folderTree) {
      traverseFolder(folderTree);
    }

    return albumList;
  };

  const calculateDownloadPlan = () => {
    const albums = getAlbumInfo();
    const totalImages = albums.reduce((sum, album) => sum + album.imageCount, 0);

    let zipGroups: Array<Array<{ key: string; name: string; imageCount: number }>> = [];

    if (splitStrategy === 'single') {
      zipGroups = [albums];
    } else if (splitStrategy === 'album') {
      zipGroups = albums.map(album => [album]);
    } else if (splitStrategy === 'auto') {
      // Group albums into batches of max 150 images
      const MAX_IMAGES_PER_ZIP = 150;
      let currentGroup: typeof albums = [];
      let currentCount = 0;

      albums.forEach(album => {
        if (currentCount + album.imageCount > MAX_IMAGES_PER_ZIP && currentGroup.length > 0) {
          zipGroups.push(currentGroup);
          currentGroup = [album];
          currentCount = album.imageCount;
        } else {
          currentGroup.push(album);
          currentCount += album.imageCount;
        }
      });

      if (currentGroup.length > 0) {
        zipGroups.push(currentGroup);
      }
    }

    // Estimate time based on real-world testing: ~1 second per image for Original
    const timePerImage = imageSize === 'Original' ? 1 :
                        imageSize.includes('Large') ? 0.6 : 0.3;
    const estimatedSeconds = totalImages * timePerImage;

    return {
      zipGroups,
      totalImages,
      estimatedSeconds,
      zipCount: zipGroups.length,
    };
  };

  const handleDownload = async () => {
    if (selection.albums.size === 0) {
      alert('Please select at least one album to download');
      return;
    }

    const plan = calculateDownloadPlan();

    // Show confirmation with download plan
    const timeEstimate = plan.estimatedSeconds < 60
      ? `~${Math.ceil(plan.estimatedSeconds)} seconds`
      : `~${Math.ceil(plan.estimatedSeconds / 60)} minutes`;

    const confirmMessage = plan.zipCount === 1
      ? `Ready to download ${plan.totalImages} images in 1 ZIP file.\n\nEstimated time: ${timeEstimate}\n\nProceed?`
      : `Ready to download ${plan.totalImages} images split into ${plan.zipCount} ZIP files.\n\nEstimated time: ${timeEstimate}\n\nEach ZIP will download automatically. Proceed?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setDownloading(true);
    let successCount = 0;

    try {
      // Download each ZIP group sequentially
      for (let i = 0; i < plan.zipGroups.length; i++) {
        const group = plan.zipGroups[i];
        const albumKeys = group.map(a => a.key);
        const groupImageCount = group.reduce((sum, a) => sum + a.imageCount, 0);

        setDownloadProgress({
          current: i + 1,
          total: plan.zipGroups.length,
          currentAlbum: group.length === 1 ? group[0].name : `${group.length} albums (${groupImageCount} images)`,
        });

        const response = await fetch('/api/download/create-zip', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            albumKeys,
            imageSize,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to create ZIP ${i + 1}`);
        }

        // Get the blob and download it
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        // Generate filename based on strategy
        let filename: string;
        if (plan.zipGroups.length === 1) {
          filename = `SmugMug-Export-${new Date().toISOString().split('T')[0]}.zip`;
        } else if (splitStrategy === 'album' && group.length === 1) {
          filename = `${group[0].name.replace(/[^a-zA-Z0-9-_]/g, '-')}.zip`;
        } else {
          filename = `SmugMug-Part${i + 1}of${plan.zipGroups.length}-${new Date().toISOString().split('T')[0]}.zip`;
        }

        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        successCount++;

        // Small delay between downloads
        if (i < plan.zipGroups.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      alert(`Successfully downloaded ${successCount} ZIP file${successCount !== 1 ? 's' : ''}!`);
    } catch (error) {
      console.error('Download error:', error);
      alert(`Downloaded ${successCount} of ${plan.zipGroups.length} ZIP files before error. Please try again for remaining files.`);
    } finally {
      setDownloading(false);
      setDownloadProgress(null);
    }
  };

  const handleDelete = async () => {
    if (selection.albums.size === 0) {
      alert('Please select at least one album to delete');
      return;
    }

    const albumCount = selection.albums.size;
    const imageCount = getTotalSelectedImages();

    const confirmed = window.confirm(
      `Are you sure you want to delete ${albumCount} album${albumCount !== 1 ? 's' : ''} (${imageCount.toLocaleString()} images)?\n\nThis action cannot be undone!`
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch('/api/smugmug/albums/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          albumKeys: Array.from(selection.albums),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete albums');
      }

      const data = await response.json();

      // Show result message
      if (data.failed === 0) {
        alert(`Successfully deleted ${data.deleted} album${data.deleted !== 1 ? 's' : ''}!`);
      } else {
        alert(
          `Deleted ${data.deleted} album${data.deleted !== 1 ? 's' : ''}.\n${data.failed} album${data.failed !== 1 ? 's' : ''} failed to delete.`
        );
      }

      // Refresh folder tree and clear selection
      setSelection({
        folders: new Set(),
        albums: new Set(),
      });
      await loadFolderTree();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete albums. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const renderFolderTree = (folder: FolderNode, level: number = 0): JSX.Element => {
    const isExpanded = expandedFolders.has(folder.path);
    const selectionStatus = getSelectionStatus(folder);
    const hasChildren = folder.subfolders.length > 0 || folder.albums.length > 0;

    return (
      <div key={folder.path}>
        {/* Folder Row */}
        <div
          className="flex items-center gap-2 py-2 px-3 hover:bg-gray-50 rounded-lg transition-colors"
          style={{ paddingLeft: `${level * 20 + 12}px` }}
        >
          {/* Expand/Collapse */}
          {hasChildren && (
            <button
              onClick={() => toggleFolder(folder.path)}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-6" />}

          {/* Checkbox */}
          <button
            onClick={() => toggleFolderSelection(folder)}
            className="flex-shrink-0"
          >
            {selectionStatus === 'all' && (
              <CheckSquare className="w-5 h-5 text-blue-600" />
            )}
            {selectionStatus === 'some' && (
              <MinusSquare className="w-5 h-5 text-blue-400" />
            )}
            {selectionStatus === 'none' && (
              <Square className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {/* Folder Icon & Name */}
          <Folder className="w-5 h-5 text-yellow-500 flex-shrink-0" />
          <span className="font-medium text-gray-900">{folder.name}</span>

          {/* Image Count */}
          <span className="text-sm text-gray-500 ml-auto">
            {folder.totalImages.toLocaleString()} images
          </span>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div>
            {/* Albums */}
            {folder.albums.map((album) => (
              <div
                key={album.albumKey}
                className="flex items-center gap-2 py-2 px-3 hover:bg-gray-50 rounded-lg transition-colors"
                style={{ paddingLeft: `${(level + 1) * 20 + 12}px` }}
              >
                <div className="w-6" />
                <button
                  onClick={() => toggleAlbumSelection(album.albumKey)}
                  className="flex-shrink-0"
                >
                  {selection.albums.has(album.albumKey) ? (
                    <CheckSquare className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                <ImageIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-gray-800">{album.name}</span>
                <span className="text-sm text-gray-500 ml-auto">
                  {album.imageCount.toLocaleString()} images
                </span>
              </div>
            ))}

            {/* Subfolders */}
            {folder.subfolders.map((subfolder) =>
              renderFolderTree(subfolder, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <ToolboxHeader currentTool="downloader" />
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Instructions */}
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <p className="text-sm text-gray-800">
                <span className="font-semibold">How to use:</span> Select folders and albums from your SmugMug library. The folder structure will be preserved in the downloaded ZIP file. Choose your preferred image size and click Download.
              </p>
            </div>
          </div>

          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Folder Downloader
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Download your photos with preserved folder hierarchy
            </p>
          </div>

          {/* Settings Panel */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Download Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Image Size */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Image Size
                </label>
                <select
                  value={imageSize}
                  onChange={(e) => setImageSize(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Original">Original (Full Resolution)</option>
                  <option value="X3Large">X3Large (3000px)</option>
                  <option value="X2Large">X2Large (1600px)</option>
                  <option value="XLarge">XLarge (1280px)</option>
                  <option value="Large">Large (1280px)</option>
                  <option value="Medium">Medium (800px)</option>
                  <option value="Small">Small (1 MegaPixel)</option>
                  <option value="Thumb">Thumbnail (150px)</option>
                </select>
              </div>

              {/* Download Strategy */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Download Strategy
                </label>
                <select
                  value={splitStrategy}
                  onChange={(e) => setSplitStrategy(e.target.value as 'single' | 'album' | 'auto')}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="single">Single ZIP (All together)</option>
                  <option value="album">One ZIP per Album</option>
                  <option value="auto">Auto Split (Max 150 images)</option>
                </select>
              </div>

              {/* Selection Summary */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
                <div className="text-sm font-semibold text-gray-700 mb-2">Selection Summary</div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Albums:</span>
                    <span className="font-bold text-gray-900">{selection.albums.size}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Images:</span>
                    <span className="font-bold text-gray-900">
                      {getTotalSelectedImages().toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Strategy Info */}
            {splitStrategy !== 'single' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  {splitStrategy === 'album' && (
                    <p>Each album will be downloaded as a separate ZIP file. Perfect for organizing photos by event or project.</p>
                  )}
                  {splitStrategy === 'auto' && (
                    <p>Albums will be automatically grouped into ZIPs of up to 150 images each. This ensures faster, more reliable downloads for large collections.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Folder Tree */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Your SmugMug Library</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDelete}
                  disabled={deleting || selection.albums.size === 0}
                  className="flex items-center gap-2 bg-red-100 hover:bg-red-200 disabled:bg-gray-100 disabled:text-gray-400 text-red-700 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  onClick={loadFolderTree}
                  disabled={loading}
                  className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                >
                  <HardDrive className="w-4 h-4" />
                  {loading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
            </div>

            {loading && (
              <div className="flex items-center justify-center py-20">
                <Loader className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            )}

            {!loading && !folderTree && (
              <div className="text-center py-20 text-gray-500">
                <HardDrive className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p>Failed to load folder structure</p>
              </div>
            )}

            {!loading && folderTree && (
              <div className="border border-gray-200 rounded-lg p-2 max-h-[500px] overflow-y-auto">
                {renderFolderTree(folderTree)}
              </div>
            )}
          </div>

          {/* Download Button */}
          <div className="sticky bottom-6">
            <button
              onClick={handleDownload}
              disabled={downloading || selection.albums.size === 0}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 text-white px-6 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              {downloading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Download Selected ({getTotalSelectedImages().toLocaleString()} images)
                </>
              )}
            </button>
          </div>

          {/* Progress Bar */}
          {downloadProgress && (
            <div className="fixed bottom-20 left-0 right-0 px-4 sm:px-6">
              <div className="max-w-xl mx-auto bg-white rounded-xl p-6 shadow-2xl border-2 border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Downloading ZIP {downloadProgress.current} of {downloadProgress.total}
                  </span>
                  <span className="text-sm text-gray-600">
                    {Math.round((downloadProgress.current / downloadProgress.total) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all duration-300"
                    style={{
                      width: `${(downloadProgress.current / downloadProgress.total) * 100}%`,
                    }}
                  />
                </div>
                <div className="text-xs text-gray-600 text-center">
                  {downloadProgress.currentAlbum}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
