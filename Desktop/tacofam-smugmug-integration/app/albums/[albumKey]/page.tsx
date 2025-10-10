'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Image as ImageIcon, Check, Grid, LayoutGrid, Columns, X, Copy } from 'lucide-react';
import { escapeHtml, sanitizeUrl } from '@/lib/html-sanitizer';

interface Photo {
  ImageKey: string;
  FileName: string;
  Title?: string;
  Caption?: string;
  ThumbnailUrl: string;
  ArchivedUri?: string;
  WebUri?: string;
  Uris?: {
    LargeImageUrl?: string;
  };
}

type DisplayOption = 'grid' | 'carousel' | 'masonry';

export default function AlbumPage() {
  const params = useParams();
  const router = useRouter();
  const albumKey = params.albumKey as string;
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [albumName, setAlbumName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Multi-select state
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [showDisplayOptions, setShowDisplayOptions] = useState(false);
  const [selectedDisplay, setSelectedDisplay] = useState<DisplayOption | null>(null);
  const [embedCopied, setEmbedCopied] = useState(false);
  const [exportFormat, setExportFormat] = useState<'html' | 'react' | 'wordpress' | 'json'>('html');

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        // Check authentication
        const authCheck = await fetch('/api/smugmug/user', {
          credentials: 'include'
        });

        if (!authCheck.ok) {
          console.error('Album Page: Not authenticated');
          router.push('/');
          return;
        }

        const urlParams = new URLSearchParams();
        urlParams.set('albumKey', albumKey);
        if (typeof window !== 'undefined') {
          const searchParams = new URLSearchParams(window.location.search);
          const name = searchParams.get('albumName');
          if (name) setAlbumName(decodeURIComponent(name));
        }

        const response = await fetch(`/api/smugmug/albums/${albumKey}/images`, {
          credentials: 'include'
        });

        if (!response.ok) throw new Error('Failed to fetch photos');

        const data = await response.json();
        setPhotos(data.images || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPhotos();
  }, [albumKey, router]);

  const togglePhotoSelection = (imageKey: string) => {
    const newSelection = new Set(selectedPhotos);
    if (newSelection.has(imageKey)) {
      newSelection.delete(imageKey);
    } else {
      newSelection.add(imageKey);
    }
    setSelectedPhotos(newSelection);
    if (newSelection.size === 0) {
      setSelectionMode(false);
    }
  };

  const clearSelection = () => {
    setSelectedPhotos(new Set());
    setSelectionMode(false);
    setShowDisplayOptions(false);
  };

  const selectAll = () => {
    const allPhotoKeys = new Set(photos.map(p => p.ImageKey));
    setSelectedPhotos(allPhotoKeys);
  };

  const getSelectedPhotoData = () => {
    return photos.filter(p => selectedPhotos.has(p.ImageKey));
  };

  const generateGridEmbed = () => {
    const selected = getSelectedPhotoData();
    const photosHtml = selected
      .map(photo => {
        const title = escapeHtml(photo.Title || photo.FileName || 'Photo');
        const caption = photo.Caption ? escapeHtml(photo.Caption) : '';
        const thumbnailUrl = escapeHtml(sanitizeUrl(photo.ThumbnailUrl || ''));
        const webUri = sanitizeUrl(photo.WebUri || '');
        const buyUrl = webUri
          ? escapeHtml(sanitizeUrl(`${webUri.replace(/\/$/, '')}/buy`))
          : '';

        return `    <div class="photo-card">
      <img src="${thumbnailUrl}" alt="${title}">
      <div class="photo-info">
        <h3>${title}</h3>
        ${caption ? `<p>${caption}</p>` : ''}
        <a href="${buyUrl}" target="_blank" rel="noopener noreferrer" class="buy-btn">Buy Photo</a>
      </div>
    </div>`;
      })
      .join('\n');

    return `<!-- SmugMug Gallery Grid -->
<style>
  .smugmug-gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; max-width: 1200px; margin: 0 auto; font-family: Arial, sans-serif; }
  .photo-card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: transform 0.3s, box-shadow 0.3s; }
  .photo-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.15); }
  .photo-card img { width: 100%; height: 240px; object-fit: cover; }
  .photo-info { padding: 16px; }
  .photo-info h3 { margin: 0 0 8px 0; font-size: 16px; color: #111; }
  .photo-info p { margin: 0 0 12px 0; font-size: 14px; color: #666; }
  .buy-btn { display: inline-block; background: #2563eb; color: white; padding: 8px 16px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600; transition: background 0.3s; }
  .buy-btn:hover { background: #1d4ed8; }
</style>
<div class="smugmug-gallery-grid">
${photosHtml}
</div>`;
  };

  const generateCarouselEmbed = () => {
    const selected = getSelectedPhotoData();
    const photosHtml = selected
      .map((photo, idx) => {
        const title = escapeHtml(photo.Title || photo.FileName || 'Photo');
        const caption = photo.Caption ? escapeHtml(photo.Caption) : '';
        const imageUrl = escapeHtml(
          sanitizeUrl(photo.ArchivedUri || photo.ThumbnailUrl || '')
        );
        const webUri = sanitizeUrl(photo.WebUri || '');
        const buyUrl = webUri
          ? escapeHtml(sanitizeUrl(`${webUri.replace(/\/$/, '')}/buy`))
          : '';

        return `    <div class="carousel-slide ${idx === 0 ? 'active' : ''}">
      <img src="${imageUrl}" alt="${title}">
      <div class="carousel-caption">
        <h3>${title}</h3>
        ${caption ? `<p>${caption}</p>` : ''}
        <a href="${buyUrl}" target="_blank" rel="noopener noreferrer" class="buy-btn">Buy This Photo</a>
      </div>
    </div>`;
      })
      .join('\n');

    return `<!-- SmugMug Carousel -->
<style>
  .smugmug-carousel { position: relative; max-width: 900px; margin: 0 auto; overflow: hidden; border-radius: 16px; background: #000; font-family: Arial, sans-serif; }
  .carousel-slide { display: none; position: relative; }
  .carousel-slide.active { display: block; }
  .carousel-slide img { width: 100%; height: auto; max-height: 600px; object-fit: contain; }
  .carousel-caption { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(0,0,0,0.9), transparent); padding: 32px 24px; color: white; }
  .carousel-caption h3 { margin: 0 0 8px 0; font-size: 24px; }
  .carousel-caption p { margin: 0 0 16px 0; font-size: 16px; opacity: 0.9; }
  .carousel-nav { position: absolute; top: 50%; transform: translateY(-50%); width: 100%; display: flex; justify-content: space-between; padding: 0 16px; pointer-events: none; }
  .carousel-nav button { pointer-events: all; background: rgba(255,255,255,0.3); border: none; color: white; width: 48px; height: 48px; border-radius: 50%; cursor: pointer; font-size: 24px; transition: background 0.3s; }
  .carousel-nav button:hover { background: rgba(255,255,255,0.5); }
  .buy-btn { display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600; }
</style>
<div class="smugmug-carousel" id="carousel-${Date.now()}">
${photosHtml}
  <div class="carousel-nav">
    <button onclick="this.closest('.smugmug-carousel').querySelector('.carousel-slide.active').classList.remove('active'); let prev = this.closest('.smugmug-carousel').querySelector('.carousel-slide.active')?.previousElementSibling || this.closest('.smugmug-carousel').querySelector('.carousel-slide:last-child'); prev.classList.add('active');">‹</button>
    <button onclick="this.closest('.smugmug-carousel').querySelector('.carousel-slide.active').classList.remove('active'); let next = this.closest('.smugmug-carousel').querySelector('.carousel-slide.active')?.nextElementSibling || this.closest('.smugmug-carousel').querySelector('.carousel-slide:first-child'); next.classList.add('active');">›</button>
  </div>
</div>`;
  };

  const generateMasonryEmbed = () => {
    const selected = getSelectedPhotoData();
    const photosHtml = selected
      .map(photo => {
        const title = escapeHtml(photo.Title || photo.FileName || 'Photo');
        const imageUrl = escapeHtml(
          sanitizeUrl(photo.ArchivedUri || photo.ThumbnailUrl || '')
        );
        const webUri = sanitizeUrl(photo.WebUri || '');
        const buyUrl = webUri
          ? escapeHtml(sanitizeUrl(`${webUri.replace(/\/$/, '')}/buy`))
          : '';

        return `    <div class="masonry-item">
      <img src="${imageUrl}" alt="${title}">
      <div class="masonry-overlay">
        <h3>${title}</h3>
        <a href="${buyUrl}" target="_blank" rel="noopener noreferrer" class="buy-btn">Buy</a>
      </div>
    </div>`;
      })
      .join('\n');

    return `<!-- SmugMug Masonry Gallery -->
<style>
  .smugmug-masonry { column-count: 3; column-gap: 16px; max-width: 1200px; margin: 0 auto; font-family: Arial, sans-serif; }
  @media (max-width: 768px) { .smugmug-masonry { column-count: 2; } }
  @media (max-width: 480px) { .smugmug-masonry { column-count: 1; } }
  .masonry-item { position: relative; display: inline-block; width: 100%; margin-bottom: 16px; break-inside: avoid; overflow: hidden; border-radius: 8px; cursor: pointer; }
  .masonry-item img { width: 100%; height: auto; display: block; transition: transform 0.3s; }
  .masonry-item:hover img { transform: scale(1.05); }
  .masonry-overlay { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); padding: 16px; opacity: 0; transition: opacity 0.3s; }
  .masonry-item:hover .masonry-overlay { opacity: 1; }
  .masonry-overlay h3 { margin: 0 0 8px 0; color: white; font-size: 14px; }
  .buy-btn { display: inline-block; background: #2563eb; color: white; padding: 6px 12px; text-decoration: none; border-radius: 4px; font-size: 12px; font-weight: 600; }
</style>
<div class="smugmug-masonry">
${photosHtml}
</div>`;
  };

  const generateReactComponent = () => {
    const selected = getSelectedPhotoData();
    const displayType = selectedDisplay;

    const photosData = JSON.stringify(selected.map(p => ({
      imageKey: p.ImageKey,
      title: p.Title || p.FileName,
      caption: p.Caption,
      thumbnail: p.ThumbnailUrl,
      fullImage: p.ArchivedUri || p.ThumbnailUrl,
      buyUrl: p.WebUri ? `${p.WebUri}/buy` : ''
    })), null, 2);

    return `import React from 'react';

const SmugMugGallery = () => {
  const photos = ${photosData};

  return (
    <div className="smugmug-gallery-${displayType}">
      {photos.map((photo) => (
        <div key={photo.imageKey} className="photo-item">
          <img src={photo.thumbnail} alt={photo.title} />
          <div className="photo-info">
            <h3>{photo.title}</h3>
            {photo.caption && <p>{photo.caption}</p>}
            <a href={photo.buyUrl} target="_blank" rel="noopener noreferrer">
              Buy Photo
            </a>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SmugMugGallery;`;
  };

  const generateWordPressShortcode = () => {
    const selected = getSelectedPhotoData();

    return `<?php
/*
Plugin Name: SmugMug Gallery
Description: Embed SmugMug photos with buy buttons
Version: 1.0
*/

function smugmug_gallery_shortcode($atts) {
    $photos = array(
${selected.map(p => `        array(
            'key' => '${p.ImageKey}',
            'title' => '${(p.Title || p.FileName).replace(/'/g, "\\'")}',
            'caption' => '${(p.Caption || '').replace(/'/g, "\\'")}',
            'thumbnail' => '${p.ThumbnailUrl}',
            'buy_url' => '${p.WebUri ? `${p.WebUri}/buy` : ''}'
        )`).join(',\n')}
    );

    ob_start();
    ?>
    <div class="smugmug-gallery">
        <?php foreach ($photos as $photo): ?>
            <div class="photo-card">
                <img src="<?php echo esc_url($photo['thumbnail']); ?>"
                     alt="<?php echo esc_attr($photo['title']); ?>">
                <div class="photo-info">
                    <h3><?php echo esc_html($photo['title']); ?></h3>
                    <?php if ($photo['caption']): ?>
                        <p><?php echo esc_html($photo['caption']); ?></p>
                    <?php endif; ?>
                    <a href="<?php echo esc_url($photo['buy_url']); ?>"
                       target="_blank" class="buy-button">Buy Photo</a>
                </div>
            </div>
        <?php endforeach; ?>
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode('smugmug_gallery', 'smugmug_gallery_shortcode');

// Use: [smugmug_gallery]
?>`;
  };

  const generateJSON = () => {
    const selected = getSelectedPhotoData();
    return JSON.stringify({
      gallery: {
        type: selectedDisplay,
        photoCount: selected.length,
        photos: selected.map(p => ({
          imageKey: p.ImageKey,
          fileName: p.FileName,
          title: p.Title,
          caption: p.Caption,
          thumbnailUrl: p.ThumbnailUrl,
          fullImageUrl: p.ArchivedUri || p.ThumbnailUrl,
          webUri: p.WebUri,
          buyUrl: p.WebUri ? `${p.WebUri}/buy` : '',
          keywords: p.Keywords
        }))
      }
    }, null, 2);
  };

  const getEmbedCode = () => {
    if (exportFormat === 'react') return generateReactComponent();
    if (exportFormat === 'wordpress') return generateWordPressShortcode();
    if (exportFormat === 'json') return generateJSON();

    // HTML format
    switch (selectedDisplay) {
      case 'grid': return generateGridEmbed();
      case 'carousel': return generateCarouselEmbed();
      case 'masonry': return generateMasonryEmbed();
      default: return '';
    }
  };

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(getEmbedCode());
    setEmbedCopied(true);
    setTimeout(() => setEmbedCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading photos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <button
            onClick={() => router.push('/')}
            className="hover:text-blue-600 transition-colors"
          >
            Your Albums
          </button>
          <span>/</span>
          <span className="text-gray-900 font-semibold">{albumName || albumKey}</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">{albumName || 'Album'}</h1>
              <p className="text-gray-600">{photos.length} photos</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {selectionMode && (
              <button
                onClick={selectAll}
                className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Check className="w-4 h-4" />
                Select All
              </button>
            )}
            {!selectionMode ? (
              <button
                onClick={() => setSelectionMode(true)}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Check className="w-4 h-4" />
                Select Photos
              </button>
            ) : (
              <button
                onClick={() => {
                  setSelectionMode(false);
                  clearSelection();
                }}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                Exit Selection
              </button>
            )}
          </div>
        </div>

        {/* Photos Grid */}
        {photos.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No photos in this album</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo) => {
              const isSelected = selectedPhotos.has(photo.ImageKey);
              return (
                <button
                  key={photo.ImageKey}
                  onClick={() => {
                    if (selectionMode) {
                      togglePhotoSelection(photo.ImageKey);
                    } else {
                      const tokens = tokenStorage.getTokens();
                      sessionStorage.setItem('currentPhoto', JSON.stringify(photo));
                      const params = new URLSearchParams({
                        access_token: tokens?.accessToken || '',
                        access_token_secret: tokens?.accessTokenSecret || '',
                        albumName: albumName,
                        albumKey: albumKey,
                      });
                      router.push(`/photo/${photo.ImageKey}?${params.toString()}`);
                    }
                  }}
                  className={`group relative aspect-square overflow-hidden rounded-lg bg-gray-200 transition-all ${
                    selectionMode
                      ? isSelected
                        ? 'ring-4 ring-purple-500'
                        : 'hover:ring-4 hover:ring-purple-300'
                      : 'hover:ring-4 hover:ring-blue-500'
                  }`}
                >
                  <img
                    src={photo.ThumbnailUrl}
                    alt={photo.Title || photo.FileName}
                    className={`w-full h-full object-cover transition-transform duration-300 ${
                      selectionMode ? '' : 'group-hover:scale-110'
                    } ${isSelected ? 'opacity-75' : ''}`}
                  />

                  {/* Selection Checkbox */}
                  {selectionMode && (
                    <div className="absolute top-3 right-3 z-10">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-purple-600 border-purple-600'
                          : 'bg-white/80 border-white backdrop-blur-sm'
                      }`}>
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </div>
                    </div>
                  )}

                  {/* Hover overlay with title */}
                  <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity ${
                    selectionMode ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'
                  }`}>
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white text-sm font-semibold truncate">
                        {photo.Title || photo.Caption || photo.FileName}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Floating Action Bar */}
        {selectedPhotos.size > 0 && (
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white rounded-full shadow-2xl px-6 py-4 flex items-center gap-6 z-50 animate-slide-up">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-purple-400" />
              <span className="font-semibold">{selectedPhotos.size} photo{selectedPhotos.size !== 1 ? 's' : ''} selected</span>
            </div>

            <div className="h-6 w-px bg-gray-700" />

            <button
              onClick={() => setShowDisplayOptions(true)}
              className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              Create Embed
            </button>

            <button
              onClick={clearSelection}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              title="Clear selection"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Display Options Modal */}
        {showDisplayOptions && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => !selectedDisplay && setShowDisplayOptions(false)}>
            <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Choose Display Style</h2>
                  <p className="text-gray-600 mt-1">{selectedPhotos.size} photos selected</p>
                </div>
                <button
                  onClick={() => {
                    setShowDisplayOptions(false);
                    setSelectedDisplay(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Display Options */}
              {!selectedDisplay ? (
                <div className="p-8">
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Gallery Grid Option */}
                    <button
                      onClick={() => setSelectedDisplay('grid')}
                      className="group bg-gray-50 hover:bg-purple-50 border-2 border-gray-200 hover:border-purple-500 rounded-xl p-6 text-left transition-all"
                    >
                      <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200 group-hover:border-purple-300">
                        <Grid className="w-12 h-12 text-purple-600 mx-auto" />
                      </div>
                      <h3 className="font-bold text-lg mb-2 text-gray-900">Gallery Grid</h3>
                      <p className="text-sm text-gray-600">Classic grid layout with cards. Perfect for portfolios and product galleries.</p>
                    </button>

                    {/* Carousel Option */}
                    <button
                      onClick={() => setSelectedDisplay('carousel')}
                      className="group bg-gray-50 hover:bg-purple-50 border-2 border-gray-200 hover:border-purple-500 rounded-xl p-6 text-left transition-all"
                    >
                      <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200 group-hover:border-purple-300">
                        <LayoutGrid className="w-12 h-12 text-purple-600 mx-auto" />
                      </div>
                      <h3 className="font-bold text-lg mb-2 text-gray-900">Carousel Slider</h3>
                      <p className="text-sm text-gray-600">Full-width slideshow with navigation. Great for showcasing featured images.</p>
                    </button>

                    {/* Masonry Option */}
                    <button
                      onClick={() => setSelectedDisplay('masonry')}
                      className="group bg-gray-50 hover:bg-purple-50 border-2 border-gray-200 hover:border-purple-500 rounded-xl p-6 text-left transition-all"
                    >
                      <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200 group-hover:border-purple-300">
                        <Columns className="w-12 h-12 text-purple-600 mx-auto" />
                      </div>
                      <h3 className="font-bold text-lg mb-2 text-gray-900">Masonry Layout</h3>
                      <p className="text-sm text-gray-600">Pinterest-style cascading grid. Ideal for varied image sizes and artistic displays.</p>
                    </button>
                  </div>
                </div>
              ) : (
                /* Embed Code Preview */
                <div className="p-8">
                  {/* Export Format Selector */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Export Format</h3>
                    <div className="grid grid-cols-4 gap-3">
                      <button
                        onClick={() => setExportFormat('html')}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          exportFormat === 'html'
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <div className="font-semibold text-sm">HTML</div>
                        <div className="text-xs text-gray-500">Pure HTML/CSS</div>
                      </button>
                      <button
                        onClick={() => setExportFormat('react')}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          exportFormat === 'react'
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <div className="font-semibold text-sm">React</div>
                        <div className="text-xs text-gray-500">Component</div>
                      </button>
                      <button
                        onClick={() => setExportFormat('wordpress')}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          exportFormat === 'wordpress'
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <div className="font-semibold text-sm">WordPress</div>
                        <div className="text-xs text-gray-500">Plugin</div>
                      </button>
                      <button
                        onClick={() => setExportFormat('json')}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          exportFormat === 'json'
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <div className="font-semibold text-sm">JSON</div>
                        <div className="text-xs text-gray-500">Data Only</div>
                      </button>
                    </div>
                  </div>

                  {/* Preview (only for HTML) */}
                  {exportFormat === 'html' && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Preview</h3>
                        <button
                          onClick={() => setSelectedDisplay(null)}
                          className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                        >
                          ← Choose Different Style
                        </button>
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 max-h-96 overflow-auto">
                        <div dangerouslySetInnerHTML={{ __html: getEmbedCode() }} />
                      </div>
                    </div>
                  )}

                  {/* Code Display */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {exportFormat === 'html' && 'HTML Code'}
                          {exportFormat === 'react' && 'React Component'}
                          {exportFormat === 'wordpress' && 'WordPress Plugin'}
                          {exportFormat === 'json' && 'JSON Data'}
                        </h3>
                        {exportFormat !== 'html' && (
                          <button
                            onClick={() => setSelectedDisplay(null)}
                            className="text-sm text-purple-600 hover:text-purple-700 font-medium mt-1"
                          >
                            ← Choose Different Style
                          </button>
                        )}
                      </div>
                      <button
                        onClick={copyEmbedCode}
                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        {embedCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {embedCopied ? 'Copied!' : 'Copy Code'}
                      </button>
                    </div>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto max-h-96">
                      {getEmbedCode()}
                    </pre>

                    {/* Usage Instructions */}
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-2 text-sm">How to Use:</h4>
                      <ul className="text-xs text-blue-800 space-y-1">
                        {exportFormat === 'html' && (
                          <>
                            <li>• Copy the code above and paste it into your HTML file</li>
                            <li>• Works on any website - no dependencies required</li>
                            <li>• Responsive and mobile-friendly</li>
                          </>
                        )}
                        {exportFormat === 'react' && (
                          <>
                            <li>• Save as SmugMugGallery.jsx in your components folder</li>
                            <li>• Import and use: {'<SmugMugGallery />'}</li>
                            <li>• Add your own CSS styling as needed</li>
                          </>
                        )}
                        {exportFormat === 'wordpress' && (
                          <>
                            <li>• Save as smugmug-gallery.php in wp-content/plugins/</li>
                            <li>• Activate in WordPress Admin → Plugins</li>
                            <li>• Use shortcode: [smugmug_gallery] in any post or page</li>
                          </>
                        )}
                        {exportFormat === 'json' && (
                          <>
                            <li>• Use this data with your own custom implementation</li>
                            <li>• Perfect for API integrations or custom apps</li>
                            <li>• Includes all photo metadata and buy URLs</li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
