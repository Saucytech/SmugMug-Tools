'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Heart, Grid, LayoutGrid, Columns, X, Copy, Check } from 'lucide-react';
import { tokenStorage } from '@/lib/smugmug-client';

interface Photo {
  ImageKey: string;
  FileName: string;
  Title?: string;
  Caption?: string;
  ThumbnailUrl: string;
  ArchivedUri?: string;
  WebUri?: string;
  AlbumName?: string;
  AlbumKey?: string;
}

type DisplayOption = 'grid' | 'carousel' | 'masonry';
type ExportFormat = 'html' | 'react' | 'wordpress' | 'json';

export default function MultiAlbumSelector() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const albumKeysParam = searchParams.get('albums');
  const albumKeys = albumKeysParam ? albumKeysParam.split(',') : [];

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(true); // Start in selection mode
  const [showModal, setShowModal] = useState(false);
  const [selectedDisplay, setSelectedDisplay] = useState<DisplayOption | null>(null);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('html');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadPhotos();
  }, [albumKeysParam]);

  const loadPhotos = async () => {
    if (albumKeys.length === 0) {
      router.push('/');
      return;
    }

    setLoading(true);
    const tokens = tokenStorage.getTokens();
    if (!tokens) {
      router.push('/');
      return;
    }

    const allPhotos: Photo[] = [];

    // Fetch photos from all selected albums
    for (const albumKey of albumKeys) {
      try {
        const response = await fetch(`/api/smugmug/albums/${albumKey}/images`, {
          headers: {
            'X-Access-Token': tokens.accessToken,
            'X-Access-Token-Secret': tokens.accessTokenSecret,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const albumPhotos = (data.images || []).map((photo: any) => ({
            ...photo,
            AlbumKey: albumKey,
          }));
          allPhotos.push(...albumPhotos);
        }
      } catch (err) {
        console.error(`Error loading album ${albumKey}:`, err);
      }
    }

    setPhotos(allPhotos);
    setLoading(false);
  };

  const togglePhoto = (photoKey: string) => {
    const newSelection = new Set(selectedPhotos);
    if (newSelection.has(photoKey)) {
      newSelection.delete(photoKey);
    } else {
      newSelection.add(photoKey);
    }
    setSelectedPhotos(newSelection);
  };

  const selectAll = () => {
    const allPhotoKeys = new Set(photos.map(p => p.ImageKey));
    setSelectedPhotos(allPhotoKeys);
  };

  const exitSelection = () => {
    router.push('/');
  };

  const getSelectedPhotoData = () => {
    return photos.filter(p => selectedPhotos.has(p.ImageKey));
  };

  const generateEmbedCode = (displayType: DisplayOption) => {
    const selected = getSelectedPhotoData();
    const photosData = selected.map(p => ({
      imageKey: p.ImageKey,
      title: p.Title || p.FileName,
      caption: p.Caption,
      thumbnail: p.ThumbnailUrl,
      fullImage: p.ArchivedUri || p.ThumbnailUrl,
      buyUrl: p.WebUri ? `${p.WebUri}/buy` : ''
    }));

    if (displayType === 'grid') {
      return `<!-- SmugMug Photo Grid -->
<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; padding: 20px;">
  ${photosData.map(photo => `
  <div style="border: 1px solid #ddd; border-radius: 8px; overflow: hidden; transition: transform 0.2s;">
    <img src="${photo.thumbnail}" alt="${photo.title}" style="width: 100%; height: 250px; object-fit: cover;" />
    <div style="padding: 15px;">
      <h3 style="margin: 0 0 10px 0; font-size: 16px;">${photo.title}</h3>
      ${photo.caption ? `<p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">${photo.caption}</p>` : ''}
      <a href="${photo.buyUrl}" target="_blank" style="display: inline-block; background: #4CAF50; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px;">Buy Photo</a>
    </div>
  </div>`).join('')}
</div>`;
    } else if (displayType === 'carousel') {
      return `<!-- SmugMug Carousel -->
<div style="position: relative; max-width: 800px; margin: 0 auto; overflow: hidden;">
  <div id="smugmug-carousel" style="display: flex; transition: transform 0.3s ease;">
    ${photosData.map((photo, i) => `
    <div style="min-width: 100%; padding: 20px;">
      <img src="${photo.fullImage}" alt="${photo.title}" style="width: 100%; height: 500px; object-fit: contain; border-radius: 8px;" />
      <div style="text-align: center; margin-top: 20px;">
        <h3>${photo.title}</h3>
        ${photo.caption ? `<p style="color: #666;">${photo.caption}</p>` : ''}
        <a href="${photo.buyUrl}" target="_blank" style="display: inline-block; background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 10px;">Buy Photo</a>
      </div>
    </div>`).join('')}
  </div>
  <button onclick="document.getElementById('smugmug-carousel').style.transform = 'translateX(' + Math.max(0, parseInt(document.getElementById('smugmug-carousel').style.transform.replace(/[^0-9-]/g, '') || '0') - 100) + '%)';" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.5); color: white; border: none; padding: 15px; cursor: pointer; border-radius: 50%;">&lt;</button>
  <button onclick="document.getElementById('smugmug-carousel').style.transform = 'translateX(' + Math.min(-(${photosData.length - 1}) * 100, parseInt(document.getElementById('smugmug-carousel').style.transform.replace(/[^0-9-]/g, '') || '0') + 100) + '%)';" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.5); color: white; border: none; padding: 15px; cursor: pointer; border-radius: 50%;">&gt;</button>
</div>`;
    } else {
      return `<!-- SmugMug Masonry Layout -->
<div style="column-count: 3; column-gap: 20px; padding: 20px;">
  ${photosData.map(photo => `
  <div style="break-inside: avoid; margin-bottom: 20px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
    <img src="${photo.thumbnail}" alt="${photo.title}" style="width: 100%; display: block;" />
    <div style="padding: 15px;">
      <h3 style="margin: 0 0 10px 0; font-size: 16px;">${photo.title}</h3>
      ${photo.caption ? `<p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">${photo.caption}</p>` : ''}
      <a href="${photo.buyUrl}" target="_blank" style="display: inline-block; background: #4CAF50; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px;">Buy Photo</a>
    </div>
  </div>`).join('')}
</div>`;
    }
  };

  const generateReactComponent = () => {
    const selected = getSelectedPhotoData();
    const photosData = JSON.stringify(selected.map(p => ({
      imageKey: p.ImageKey,
      title: p.Title || p.FileName,
      caption: p.Caption,
      thumbnail: p.ThumbnailUrl,
      fullImage: p.ArchivedUri || p.ThumbnailUrl,
      buyUrl: p.WebUri ? `${p.WebUri}/buy` : ''
    })), null, 2);

    const displayType = selectedDisplay || 'grid';

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
    const photosJson = JSON.stringify(selected.map(p => ({
      imageKey: p.ImageKey,
      title: p.Title || p.FileName,
      caption: p.Caption,
      thumbnail: p.ThumbnailUrl,
      fullImage: p.ArchivedUri || p.ThumbnailUrl,
      buyUrl: p.WebUri ? `${p.WebUri}/buy` : ''
    })));

    return `<?php
/*
Plugin Name: SmugMug Gallery
Description: Embeds SmugMug galleries with buy buttons
Version: 1.0
*/

function smugmug_gallery_shortcode($atts) {
    $photos = json_decode('${photosJson}', true);

    ob_start();
    ?>
    <div class="smugmug-gallery">
        <?php foreach ($photos as $photo): ?>
        <div class="photo-item">
            <img src="<?php echo esc_url($photo['thumbnail']); ?>" alt="<?php echo esc_attr($photo['title']); ?>" />
            <div class="photo-info">
                <h3><?php echo esc_html($photo['title']); ?></h3>
                <?php if (!empty($photo['caption'])): ?>
                    <p><?php echo esc_html($photo['caption']); ?></p>
                <?php endif; ?>
                <a href="<?php echo esc_url($photo['buyUrl']); ?>" target="_blank">Buy Photo</a>
            </div>
        </div>
        <?php endforeach; ?>
    </div>
    <?php
    return ob_get_clean();
}

add_shortcode('smugmug_gallery', 'smugmug_gallery_shortcode');
?>`;
  };

  const generateJSON = () => {
    const selected = getSelectedPhotoData();
    return JSON.stringify({
      displayType: selectedDisplay || 'grid',
      photos: selected.map(p => ({
        imageKey: p.ImageKey,
        title: p.Title || p.FileName,
        caption: p.Caption,
        thumbnail: p.ThumbnailUrl,
        fullImage: p.ArchivedUri || p.ThumbnailUrl,
        buyUrl: p.WebUri ? `${p.WebUri}/buy` : ''
      }))
    }, null, 2);
  };

  const getCodeToExport = () => {
    if (!selectedDisplay) return '';

    switch (exportFormat) {
      case 'react':
        return generateReactComponent();
      case 'wordpress':
        return generateWordPressShortcode();
      case 'json':
        return generateJSON();
      default:
        return generateEmbedCode(selectedDisplay);
    }
  };

  const copyToClipboard = () => {
    const code = getCodeToExport();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading photos from {albumKeys.length} albums...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
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
              <h1 className="text-4xl font-bold text-gray-900">Select Photos</h1>
              <p className="text-gray-600">
                {photos.length} photos from {albumKeys.length} album{albumKeys.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={selectAll}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Select All
            </button>
            <button
              onClick={exitSelection}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Exit
            </button>
          </div>
        </div>

        {/* Floating Selection Bar */}
        {selectedPhotos.size > 0 && (
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white rounded-full shadow-2xl px-6 py-4 flex items-center gap-6 z-50">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-400 fill-pink-400" />
              <span className="font-semibold">{selectedPhotos.size} photo{selectedPhotos.size !== 1 ? 's' : ''} selected</span>
            </div>

            <div className="h-6 w-px bg-gray-700" />

            <button
              onClick={() => setShowModal(true)}
              className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg font-semibold transition-colors"
            >
              Create Embed
            </button>
          </div>
        )}

        {/* Photos Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => {
            const isSelected = selectedPhotos.has(photo.ImageKey);
            return (
              <button
                key={photo.ImageKey}
                onClick={() => togglePhoto(photo.ImageKey)}
                className={`group relative aspect-square overflow-hidden rounded-lg transition-all ${
                  isSelected
                    ? 'ring-4 ring-purple-500'
                    : 'hover:ring-4 hover:ring-purple-300'
                }`}
              >
                <img
                  src={photo.ThumbnailUrl}
                  alt={photo.Title || photo.FileName}
                  className={`w-full h-full object-cover transition-all ${
                    isSelected ? 'opacity-90' : 'group-hover:opacity-90'
                  }`}
                />

                {/* Checkbox Overlay */}
                <div className={`absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-purple-500'
                    : 'bg-white/80 backdrop-blur-sm'
                }`}>
                  <Check
                    className={`w-5 h-5 ${
                      isSelected ? 'text-white' : 'text-gray-400 opacity-0 group-hover:opacity-100'
                    }`}
                  />
                </div>

                {/* Title overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                  <p className="text-white text-sm font-semibold truncate">
                    {photo.Title || photo.Caption || photo.FileName}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Display Options Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Create Embed Code</h2>
                    <p className="text-gray-600 mt-1">{selectedPhotos.size} photos selected</p>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {!selectedDisplay ? (
                  <>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Display Style</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <button
                        onClick={() => setSelectedDisplay('grid')}
                        className="group border-2 border-gray-200 hover:border-purple-500 rounded-xl p-6 transition-all text-left"
                      >
                        <Grid className="w-12 h-12 text-purple-600 mb-3" />
                        <h4 className="font-bold text-lg mb-2">Gallery Grid</h4>
                        <p className="text-sm text-gray-600">Responsive grid layout perfect for photo galleries</p>
                      </button>

                      <button
                        onClick={() => setSelectedDisplay('carousel')}
                        className="group border-2 border-gray-200 hover:border-purple-500 rounded-xl p-6 transition-all text-left"
                      >
                        <LayoutGrid className="w-12 h-12 text-purple-600 mb-3" />
                        <h4 className="font-bold text-lg mb-2">Carousel Slider</h4>
                        <p className="text-sm text-gray-600">Slideshow format for featured photo presentations</p>
                      </button>

                      <button
                        onClick={() => setSelectedDisplay('masonry')}
                        className="group border-2 border-gray-200 hover:border-purple-500 rounded-xl p-6 transition-all text-left"
                      >
                        <Columns className="w-12 h-12 text-purple-600 mb-3" />
                        <h4 className="font-bold text-lg mb-2">Masonry Layout</h4>
                        <p className="text-sm text-gray-600">Pinterest-style cascading grid for varied photo sizes</p>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Format</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <button
                          onClick={() => setExportFormat('html')}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            exportFormat === 'html'
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          HTML
                        </button>
                        <button
                          onClick={() => setExportFormat('react')}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            exportFormat === 'react'
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          React
                        </button>
                        <button
                          onClick={() => setExportFormat('wordpress')}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            exportFormat === 'wordpress'
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          WordPress
                        </button>
                        <button
                          onClick={() => setExportFormat('json')}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            exportFormat === 'json'
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          JSON
                        </button>
                      </div>
                    </div>

                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">Code</h3>
                        <button
                          onClick={copyToClipboard}
                          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          {copied ? 'Copied!' : 'Copy Code'}
                        </button>
                      </div>
                      <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm max-h-96">
                        <code>{getCodeToExport()}</code>
                      </pre>
                    </div>

                    {exportFormat === 'html' && (
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Preview</h3>
                        <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
                          <div dangerouslySetInnerHTML={{ __html: getCodeToExport() }} />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => setSelectedDisplay(null)}
                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg transition-colors font-semibold"
                      >
                        Change Layout
                      </button>
                      <button
                        onClick={() => {
                          setShowModal(false);
                          setSelectedDisplay(null);
                        }}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors font-semibold"
                      >
                        Done
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
