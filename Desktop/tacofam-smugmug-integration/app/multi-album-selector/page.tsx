'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Heart, Grid, LayoutGrid, Columns, X, Copy, Check, Play, Image as ImageIcon, Sparkles, Layout, Layers, Camera, Monitor, Tablet, Smartphone, Code2, Eye } from 'lucide-react';
import ToolboxHeader from '@/components/ToolboxHeader';

export const dynamic = 'force-dynamic';

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

type DisplayStyle = 'grid' | 'carousel' | 'masonry' | 'slideshow' | 'lightbox' | 'pinterest' | 'justified' | 'polaroid';
type ExportFormat = 'html' | 'react' | 'wordpress' | 'json';
type PreviewDevice = 'desktop' | 'tablet' | 'mobile';
type SmugMugImageSize = 'Ti' | 'Th' | 'S' | 'M' | 'L' | 'XL' | 'X2' | 'X3' | 'X4' | 'X5' | '4k' | '5k' | 'O';

interface CustomizationOptions {
  columns: number;
  gap: number;
  borderRadius: number;
  shadow: 'none' | 'sm' | 'md' | 'lg';
  hoverEffect: 'zoom' | 'fade' | 'slide' | 'none';
  aspectRatio: 'square' | 'native' | '16:9' | '4:3' | '3:2';
  showTitles: boolean;
  showCaptions: boolean;
  showKeywords: boolean;
  showFilename: boolean;
  showBuyButtons: boolean;
  buyButtonText: string;
  buyButtonNewTab: boolean;
  backgroundColor: string;
  thumbnailSize: SmugMugImageSize;
  fullImageSize: SmugMugImageSize;
}

export default function MultiAlbumSelector() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const albumKeysParam = searchParams.get('albums');
  const albumKeys = albumKeysParam ? albumKeysParam.split(',') : [];
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [selectedDisplay, setSelectedDisplay] = useState<DisplayStyle | null>(null);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('html');
  const [copied, setCopied] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
  const [showPreview, _setShowPreview] = useState(true);
  const [showTestPlayground, setShowTestPlayground] = useState(false);

  const [customization, setCustomization] = useState<CustomizationOptions>({
    columns: 3,
    gap: 20,
    borderRadius: 8,
    shadow: 'md',
    hoverEffect: 'zoom',
    aspectRatio: 'square',
    showTitles: true,
    showCaptions: false,
    showKeywords: false,
    showFilename: false,
    showBuyButtons: true,
    buyButtonText: 'Buy',
    buyButtonNewTab: true,
    backgroundColor: '#ffffff',
    thumbnailSize: 'M',
    fullImageSize: 'X3',
  });

  useEffect(() => {
    loadPhotos();
  }, [albumKeysParam]);

  useEffect(() => {
    if (showPreview && selectedDisplay && iframeRef.current) {
      updatePreview();
    }
  }, [selectedDisplay, exportFormat, customization, showPreview]);

  const loadPhotos = async () => {
    if (albumKeys.length === 0) {
      router.push('/');
      return;
    }

    setLoading(true);

    // Check authentication first
    try {
      const authCheck = await fetch('/api/smugmug/user', {
        credentials: 'include',
      });

      if (!authCheck.ok) {
        router.push('/');
        return;
      }
    } catch (_error) {
      console.error('[Multi-Album Selector] Auth check failed:', _error);
      router.push('/');
      return;
    }

    const allPhotos: Photo[] = [];

    for (const albumKey of albumKeys) {
      try {
        const response = await fetch(`/api/smugmug/albums/${albumKey}/images`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          const albumPhotos = (data.images || []).map((photo: any) => ({
            ...photo,
            AlbumKey: albumKey,
          }));
          allPhotos.push(...albumPhotos);
        }
      } catch (_err) {
        console.error(`Error loading album ${albumKey}:`, _err);
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

  const getSelectedPhotoData = () => {
    return photos.filter(p => selectedPhotos.has(p.ImageKey));
  };

  // Helper function to convert SmugMug image URL to different size
  const convertImageSize = (url: string, targetSize: SmugMugImageSize): string => {
    if (!url) return url;

    // SmugMug URL pattern: .../{size}/{filename}-{size}.jpg
    // Example: .../X3/DSC_5734-nocast-X3.jpg
    const sizePattern = /\/(Ti|Th|S|M|L|XL|X2|X3|X4|X5|4k|5k|O)\//;
    const filenameSizePattern = /-(Ti|Th|S|M|L|XL|X2|X3|X4|X5|4k|5k|O)\.(jpg|jpeg|png|gif)/i;

    let newUrl = url;

    // Replace size in path
    newUrl = newUrl.replace(sizePattern, `/${targetSize}/`);

    // Replace size in filename
    newUrl = newUrl.replace(filenameSizePattern, `-${targetSize}.$2`);

    return newUrl;
  };

  const generateEmbedCode = (displayType: DisplayStyle): string => {
    const selected = getSelectedPhotoData();
    const photosData = selected.map(p => ({
      imageKey: p.ImageKey,
      title: p.Title || '',
      caption: p.Caption || '',
      keywords: p.Keywords || '',
      filename: p.FileName || '',
      thumbnail: convertImageSize(p.ThumbnailUrl, customization.thumbnailSize),
      fullImage: convertImageSize(p.ArchivedUri || p.ThumbnailUrl, customization.fullImageSize),
      buyUrl: p.WebUri ? `${p.WebUri}/buy` : ''
    }));

    const { columns, gap, borderRadius, shadow, hoverEffect, aspectRatio, showTitles, showCaptions, showKeywords, showFilename, showBuyButtons, buyButtonText, buyButtonNewTab, backgroundColor } = customization;

    const shadowStyles = {
      none: 'none',
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
    };

    const hoverEffectStyles = {
      zoom: 'transform: scale(1.05);',
      fade: 'opacity: 0.8;',
      slide: 'transform: translateY(-5px);',
      none: ''
    };

    const getAspectRatioStyle = () => {
      switch(aspectRatio) {
        case 'square': return 'aspect-ratio: 1/1; object-fit: cover;';
        case 'native': return 'height: auto; object-fit: contain;';
        case '16:9': return 'aspect-ratio: 16/9; object-fit: cover;';
        case '4:3': return 'aspect-ratio: 4/3; object-fit: cover;';
        case '3:2': return 'aspect-ratio: 3/2; object-fit: cover;';
        default: return 'aspect-ratio: 1/1; object-fit: cover;';
      }
    };

    const hasAnyMetadata = showTitles || showCaptions || showKeywords || showFilename || showBuyButtons;

    if (displayType === 'grid') {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    .smugmug-grid {
      display: grid;
      grid-template-columns: repeat(${columns}, 1fr);
      gap: ${gap}px;
      padding: 20px;
      background: ${backgroundColor};
    }
    .photo-card {
      border: 1px solid #ddd;
      border-radius: ${borderRadius}px;
      overflow: hidden;
      transition: all 0.3s ease;
      box-shadow: ${shadowStyles[shadow]};
      background: white;
      display: flex;
      flex-direction: column;
    }
    .photo-card:hover {
      ${hoverEffectStyles[hoverEffect]}
      box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1);
    }
    .photo-card img {
      width: 100%;
      ${getAspectRatioStyle()}
      display: block;
    }
    .photo-info {
      padding: ${hasAnyMetadata ? '15px' : '0'};
      flex: 1;
    }
    .photo-title {
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 600;
      color: #1f2937;
    }
    .photo-caption {
      margin: 0 0 8px 0;
      font-size: 14px;
      color: #6b7280;
      line-height: 1.5;
    }
    .photo-keywords {
      margin: 0 0 8px 0;
      font-size: 12px;
      color: #9ca3af;
      font-style: italic;
    }
    .photo-filename {
      margin: 0 0 12px 0;
      font-size: 12px;
      color: #9ca3af;
      font-family: monospace;
    }
    .buy-button {
      display: inline-block;
      background: #8b5cf6;
      color: white;
      padding: 10px 20px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      transition: background 0.2s;
    }
    .buy-button:hover {
      background: #7c3aed;
    }
    @media (max-width: 736px) {
      .smugmug-grid {
        grid-template-columns: repeat(${Math.max(1, columns - 1)}, 1fr);
        gap: ${Math.max(10, gap / 2)}px;
      }
    }
    @media (max-width: 480px) {
      .smugmug-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="smugmug-grid">
    ${photosData.map(photo => `
    <div class="photo-card">
      <img src="${photo.thumbnail}" alt="${photo.title || photo.filename}" loading="lazy" />
      ${hasAnyMetadata ? `<div class="photo-info">
        ${showTitles && photo.title ? `<h3 class="photo-title">${photo.title}</h3>` : ''}
        ${showCaptions && photo.caption ? `<p class="photo-caption">${photo.caption}</p>` : ''}
        ${showKeywords && photo.keywords ? `<p class="photo-keywords">Keywords: ${photo.keywords}</p>` : ''}
        ${showFilename && photo.filename ? `<p class="photo-filename">${photo.filename}</p>` : ''}
        ${showBuyButtons && photo.buyUrl ? `<a href="${photo.buyUrl}"${buyButtonNewTab ? ' target="_blank" rel="noopener"' : ''} class="buy-button">${buyButtonText}</a>` : ''}
      </div>` : ''}
    </div>`).join('\n    ')}
  </div>
</body>
</html>`;
    }

    if (displayType === 'slideshow') {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    .slideshow-container {
      position: relative;
      max-width: 1000px;
      margin: 40px auto;
      background: ${backgroundColor};
      border-radius: ${borderRadius}px;
      box-shadow: ${shadowStyles[shadow]};
      overflow: hidden;
    }
    .slide-input {
      display: none;
    }
    .slide {
      display: none;
      padding: 40px;
      text-align: center;
    }
    ${photosData.map((_, i) => `
    #slide-${i}:checked ~ .slides .slide-${i} {
      display: block;
      animation: fadeIn 0.5s;
    }`).join('\n    ')}
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .slide img {
      max-width: 100%;
      max-height: 600px;
      ${getAspectRatioStyle()}
      border-radius: 8px;
    }
    .slide-info {
      margin-top: 30px;
    }
    .slide-title {
      font-size: 24px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 10px;
    }
    .slide-caption {
      font-size: 16px;
      color: #6b7280;
      margin-bottom: 20px;
      line-height: 1.6;
    }
    .slide-navigation {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin: 20px 0;
    }
    .nav-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #d1d5db;
      cursor: pointer;
      transition: all 0.3s;
    }
    ${photosData.map((_, i) => `
    #slide-${i}:checked ~ .slide-navigation label[for="slide-${i}"] {
      background: #8b5cf6;
      width: 30px;
      border-radius: 6px;
    }`).join('\n    ')}
    .buy-button {
      display: inline-block;
      background: #8b5cf6;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      transition: background 0.2s;
      margin-top: 15px;
    }
    .buy-button:hover {
      background: #7c3aed;
    }
    @media (max-width: 736px) {
      .slide {
        padding: 20px;
      }
      .slide img {
        max-height: 400px;
      }
    }
  </style>
</head>
<body>
  <div class="slideshow-container">
    ${photosData.map((_, i) => `<input type="radio" name="slide" id="slide-${i}" class="slide-input"${i === 0 ? ' checked' : ''} />`).join('\n    ')}

    <div class="slides">
      ${photosData.map((photo, i) => `
      <div class="slide slide-${i}">
        <img src="${photo.fullImage}" alt="${photo.title || photo.filename}" />
        ${hasAnyMetadata ? `<div class="slide-info">
          ${showTitles && photo.title ? `<h2 class="slide-title">${photo.title}</h2>` : ''}
          ${showCaptions && photo.caption ? `<p class="slide-caption">${photo.caption}</p>` : ''}
          ${showKeywords && photo.keywords ? `<p class="slide-caption" style="font-style: italic; font-size: 14px;">Keywords: ${photo.keywords}</p>` : ''}
          ${showFilename && photo.filename ? `<p class="slide-caption" style="font-family: monospace; font-size: 12px;">${photo.filename}</p>` : ''}
          ${showBuyButtons && photo.buyUrl ? `<a href="${photo.buyUrl}"${buyButtonNewTab ? ' target="_blank" rel="noopener"' : ''} class="buy-button">${buyButtonText}</a>` : ''}
        </div>` : ''}
      </div>`).join('\n      ')}
    </div>

    <div class="slide-navigation">
      ${photosData.map((_, i) => `<label for="slide-${i}" class="nav-dot"></label>`).join('\n      ')}
    </div>
  </div>
</body>
</html>`;
    }

    if (displayType === 'lightbox') {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
    }
    .lightbox-gallery {
      display: grid;
      grid-template-columns: repeat(${columns}, 1fr);
      gap: ${gap}px;
      padding: 20px;
      background: ${backgroundColor};
    }
    .lightbox-thumb {
      display: block;
      border-radius: ${borderRadius}px;
      overflow: hidden;
      transition: all 0.3s;
      box-shadow: ${shadowStyles[shadow]};
      text-decoration: none;
    }
    .lightbox-thumb:hover {
      ${hoverEffectStyles[hoverEffect]}
      box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1);
    }
    .lightbox-thumb img {
      width: 100%;
      ${getAspectRatioStyle()}
      display: block;
    }
    .lightbox-modal {
      display: none;
      position: fixed;
      z-index: 9999;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.95);
      align-items: center;
      justify-content: center;
      padding: 20px;
      box-sizing: border-box;
    }
    .lightbox-modal:target {
      display: flex;
    }
    .lightbox-content {
      max-width: 900px;
      text-align: center;
      position: relative;
    }
    .lightbox-content img {
      max-width: 100%;
      max-height: 70vh;
      object-fit: contain;
      border-radius: 8px;
    }
    .lightbox-info {
      color: white;
      margin-top: 20px;
    }
    .lightbox-title {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 10px;
    }
    .lightbox-caption {
      font-size: 16px;
      color: #d1d5db;
      margin-bottom: 10px;
      line-height: 1.5;
    }
    .lightbox-keywords {
      font-size: 14px;
      color: #9ca3af;
      font-style: italic;
      margin-bottom: 10px;
    }
    .lightbox-filename {
      font-size: 12px;
      color: #9ca3af;
      font-family: monospace;
      margin-bottom: 15px;
    }
    .lightbox-buy {
      display: inline-block;
      background: #8b5cf6;
      color: white;
      padding: 12px 30px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      margin-top: 10px;
    }
    .lightbox-buy:hover {
      background: #7c3aed;
    }
    .lightbox-close {
      position: fixed;
      top: 20px;
      right: 30px;
      color: white;
      font-size: 40px;
      text-decoration: none;
      background: rgba(0,0,0,0.5);
      width: 50px;
      height: 50px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }
    .lightbox-close:hover {
      background: rgba(0,0,0,0.8);
    }
    @media (max-width: 736px) {
      .lightbox-gallery {
        grid-template-columns: repeat(${Math.max(1, columns - 1)}, 1fr);
      }
    }
    @media (max-width: 480px) {
      .lightbox-gallery {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="lightbox-gallery">
    ${photosData.map((photo, i) => `
    <a href="#lightbox-${i}" class="lightbox-thumb">
      <img src="${photo.thumbnail}" alt="${photo.title || photo.filename}" loading="lazy" />
    </a>`).join('\n    ')}
  </div>

  ${photosData.map((photo, i) => `
  <div id="lightbox-${i}" class="lightbox-modal">
    <a href="#" class="lightbox-close">&times;</a>
    <div class="lightbox-content">
      <img src="${photo.fullImage}" alt="${photo.title || photo.filename}" />
      ${hasAnyMetadata ? `<div class="lightbox-info">
        ${showTitles && photo.title ? `<h3 class="lightbox-title">${photo.title}</h3>` : ''}
        ${showCaptions && photo.caption ? `<p class="lightbox-caption">${photo.caption}</p>` : ''}
        ${showKeywords && photo.keywords ? `<p class="lightbox-keywords">Keywords: ${photo.keywords}</p>` : ''}
        ${showFilename && photo.filename ? `<p class="lightbox-filename">${photo.filename}</p>` : ''}
        ${showBuyButtons && photo.buyUrl ? `<a href="${photo.buyUrl}"${buyButtonNewTab ? ' target="_blank" rel="noopener"' : ''} class="lightbox-buy">${buyButtonText}</a>` : ''}
      </div>` : ''}
    </div>
  </div>`).join('\n  ')}
</body>
</html>`;
    }

    if (displayType === 'pinterest') {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    .pinterest-grid {
      column-count: ${columns};
      column-gap: ${gap}px;
      padding: 20px;
      background: ${backgroundColor};
    }
    .pinterest-item {
      break-inside: avoid;
      margin-bottom: ${gap}px;
      border-radius: ${borderRadius}px;
      overflow: hidden;
      box-shadow: ${shadowStyles[shadow]};
      transition: all 0.3s;
      background: white;
    }
    .pinterest-item:hover {
      ${hoverEffectStyles[hoverEffect]}
      box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1);
    }
    .pinterest-item img {
      width: 100%;
      display: block;
    }
    .pinterest-info {
      padding: 15px;
    }
    .pinterest-title {
      font-size: 16px;
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 8px 0;
    }
    .pinterest-caption {
      font-size: 14px;
      color: #6b7280;
      margin: 0 0 12px 0;
      line-height: 1.4;
    }
    .pinterest-buy {
      display: inline-block;
      background: #8b5cf6;
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
    }
    @media (max-width: 768px) {
      .pinterest-grid {
        column-count: 2;
      }
    }
  </style>
</head>
<body>
  <div class="pinterest-grid">
    ${photosData.map(photo => `
    <div class="pinterest-item">
      <img src="${photo.thumbnail}" alt="${photo.title}" loading="lazy" />
      <div class="pinterest-info">
        ${showTitles ? `<h3 class="pinterest-title">${photo.title}</h3>` : ''}
        ${showCaptions && photo.caption ? `<p class="pinterest-caption">${photo.caption}</p>` : ''}
        ${showBuyButtons ? `<a href="${photo.buyUrl}" target="_blank" rel="noopener" class="pinterest-buy">Buy Photo</a>` : ''}
      </div>
    </div>`).join('\n    ')}
  </div>
</body>
</html>`;
    }

    if (displayType === 'polaroid') {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    .polaroid-grid {
      display: grid;
      grid-template-columns: repeat(${columns}, 1fr);
      gap: ${gap + 20}px;
      padding: 40px;
      background: ${backgroundColor};
    }
    .polaroid {
      background: white;
      padding: 15px 15px 60px;
      box-shadow: 0 10px 20px rgba(0,0,0,0.2);
      transform: rotate(${Math.random() > 0.5 ? '' : '-'}${Math.floor(Math.random() * 5)}deg);
      transition: all 0.3s;
      cursor: pointer;
    }
    .polaroid:hover {
      transform: rotate(0deg) scale(1.05);
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
      z-index: 10;
    }
    .polaroid img {
      width: 100%;
      display: block;
      border: 1px solid #ddd;
    }
    .polaroid-caption {
      text-align: center;
      margin-top: 15px;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      color: #333;
    }
    @media (max-width: 768px) {
      .polaroid-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  </style>
</head>
<body>
  <div class="polaroid-grid">
    ${photosData.map(photo => `
    <div class="polaroid">
      <img src="${photo.thumbnail}" alt="${photo.title}" loading="lazy" />
      ${showTitles ? `<div class="polaroid-caption">${photo.title}</div>` : ''}
    </div>`).join('\n    ')}
  </div>
</body>
</html>`;
    }

    // Default to carousel for other styles
    return generateEmbedCode('grid');
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

    return `import React, { useState } from 'react';

const SmugMugGallery = () => {
  const photos = ${photosData};
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(${customization.columns}, 1fr)', gap: '${customization.gap}px', padding: '20px' }}>
        {photos.map((photo, index) => (
          <div
            key={photo.imageKey}
            onClick={() => setLightboxIndex(index)}
            style={{
              cursor: 'pointer',
              borderRadius: '${customization.borderRadius}px',
              overflow: 'hidden',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              transition: 'transform 0.3s',
            }}
          >
            <img
              src={photo.thumbnail}
              alt={photo.title}
              style={{ width: '100%', height: '200px', objectFit: 'cover' }}
            />
            ${customization.showTitles ? `
            <div style={{ padding: '15px' }}>
              <h3>{photo.title}</h3>
              ${customization.showCaptions ? `{photo.caption && <p>{photo.caption}</p>}` : ''}
              ${customization.showBuyButtons ? `<a href={photo.buyUrl} target="_blank" rel="noopener">Buy Photo</a>` : ''}
            </div>` : ''}
          </div>
        ))}
      </div>

      {lightboxIndex !== null && (
        <div
          onClick={() => setLightboxIndex(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <img
            src={photos[lightboxIndex].fullImage}
            alt={photos[lightboxIndex].title}
            style={{ maxWidth: '90%', maxHeight: '90vh' }}
          />
        </div>
      )}
    </>
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
Description: Embeds SmugMug galleries with customizable layouts
Version: 2.0
*/

function smugmug_gallery_shortcode($atts) {
    $photos = json_decode('${photosJson}', true);
    $columns = ${customization.columns};
    $gap = ${customization.gap};

    ob_start();
    ?>
    <div class="smugmug-gallery" style="display: grid; grid-template-columns: repeat(<?php echo $columns; ?>, 1fr); gap: <?php echo $gap; ?>px;">
        <?php foreach ($photos as $photo): ?>
        <div class="photo-item" style="border-radius: ${customization.borderRadius}px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <img src="<?php echo esc_url($photo['thumbnail']); ?>" alt="<?php echo esc_attr($photo['title']); ?>" style="width: 100%; height: 200px; object-fit: cover;" />
            ${customization.showTitles || customization.showCaptions || customization.showBuyButtons ? `
            <div style="padding: 15px;">
                ${customization.showTitles ? `<h3><?php echo esc_html($photo['title']); ?></h3>` : ''}
                ${customization.showCaptions ? `<?php if (!empty($photo['caption'])): ?><p><?php echo esc_html($photo['caption']); ?></p><?php endif; ?>` : ''}
                ${customization.showBuyButtons ? `<a href="<?php echo esc_url($photo['buyUrl']); ?>" target="_blank">Buy Photo</a>` : ''}
            </div>` : ''}
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
      customization,
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

  const updatePreview = () => {
    if (!iframeRef.current || !selectedDisplay) return;

    const code = exportFormat === 'html' ? getCodeToExport() : generateEmbedCode(selectedDisplay);
    const iframe = iframeRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;

    if (doc) {
      doc.open();
      doc.write(code);
      doc.close();
    }
  };

  const copyToClipboard = () => {
    const code = getCodeToExport();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadCode = () => {
    const code = getCodeToExport();
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smugmug-gallery-${selectedDisplay}.${exportFormat === 'html' ? 'html' : exportFormat === 'json' ? 'json' : exportFormat === 'wordpress' ? 'php' : 'jsx'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const displayStyles = [
    { id: 'grid' as DisplayStyle, icon: Grid, title: 'Gallery Grid', desc: 'Responsive grid layout perfect for photo galleries' },
    { id: 'lightbox' as DisplayStyle, icon: ImageIcon, title: 'Lightbox Gallery', desc: 'Click to enlarge with full-screen overlay' },
    { id: 'slideshow' as DisplayStyle, icon: Play, title: 'Auto Slideshow', desc: 'Auto-advancing presentation with controls' },
    { id: 'pinterest' as DisplayStyle, icon: Layers, title: 'Pinterest Waterfall', desc: 'Cascading masonry layout like Pinterest' },
    { id: 'polaroid' as DisplayStyle, icon: Camera, title: 'Polaroid Stack', desc: 'Vintage photo stack with rotation effect' },
    { id: 'carousel' as DisplayStyle, icon: LayoutGrid, title: 'Carousel Slider', desc: 'Horizontal slideshow with navigation' },
    { id: 'masonry' as DisplayStyle, icon: Columns, title: 'Masonry Layout', desc: 'Column-based cascading grid' },
    { id: 'justified' as DisplayStyle, icon: Layout, title: 'Justified Grid', desc: 'Row-based justified alignment' },
  ];

  const getDeviceWidth = () => {
    switch (previewDevice) {
      case 'mobile': return '375px';
      case 'tablet': return '768px';
      default: return '100%';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading photos from {albumKeys.length} albums...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ToolboxHeader currentTool="embed-sell" />
      <div className="max-w-7xl mx-auto p-8">

        {/* Instructions */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-gray-800">
              <span className="font-semibold">How to use:</span> Select one or more albums from your SmugMug account → Choose which photos to include → Pick a display layout (Grid, Carousel, or Masonry) → Generate embed code for your website or platform.
            </p>
          </div>
        </div>

        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Multi-Album Selector</h1>
            <p className="text-gray-600">
              {photos.length} photos from {albumKeys.length} album{albumKeys.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Select More Albums
            </button>
            <button
              onClick={selectAll}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Select All
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {photos.map((photo) => {
            const isSelected = selectedPhotos.has(photo.ImageKey);
            return (
              <button
                key={photo.ImageKey}
                onClick={() => togglePhoto(photo.ImageKey)}
                className={`group relative aspect-square overflow-hidden rounded-lg transition-all ${
                  isSelected ? 'ring-4 ring-purple-500' : 'hover:ring-4 hover:ring-purple-300'
                }`}
              >
                <img
                  src={photo.ThumbnailUrl}
                  alt={photo.Title || photo.FileName}
                  className={`w-full h-full object-cover transition-all ${
                    isSelected ? 'opacity-90' : 'group-hover:opacity-90'
                  }`}
                />
                <div className={`absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  isSelected ? 'bg-purple-500' : 'bg-white/80 backdrop-blur-sm'
                }`}>
                  <Check className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-gray-400 opacity-0 group-hover:opacity-100'}`} />
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                  <p className="text-white text-sm font-semibold truncate">
                    {photo.Title || photo.Caption || photo.FileName}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Enhanced Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
            <div className="bg-white rounded-2xl w-full max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="p-6 border-b flex justify-between items-center bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                <div>
                  <h2 className="text-2xl font-bold">Create Embed Code</h2>
                  <p className="text-purple-100 mt-1">{selectedPhotos.size} photos selected</p>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedDisplay(null);
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto">
                {!selectedDisplay ? (
                  <div className="p-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-6">Choose Display Style</h3>
                    <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {displayStyles.map((style) => (
                        <button
                          key={style.id}
                          onClick={() => setSelectedDisplay(style.id)}
                          className="group border-2 border-gray-200 hover:border-purple-500 hover:shadow-lg rounded-xl p-6 transition-all text-left"
                        >
                          <style.icon className="w-12 h-12 text-purple-600 mb-3 group-hover:scale-110 transition-transform" />
                          <h4 className="font-bold text-lg mb-2">{style.title}</h4>
                          <p className="text-sm text-gray-600">{style.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="grid lg:grid-cols-2 h-full">
                    {/* Left Panel: Controls */}
                    <div className="p-6 space-y-6 overflow-y-auto border-r">
                      {/* Style Selected Indicator */}
                      <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 flex items-center gap-3">
                        {displayStyles.find(s => s.id === selectedDisplay)?.icon &&
                          React.createElement(displayStyles.find(s => s.id === selectedDisplay)!.icon, { className: 'w-8 h-8 text-purple-600' })
                        }
                        <div>
                          <h4 className="font-bold text-gray-900">
                            {displayStyles.find(s => s.id === selectedDisplay)?.title}
                          </h4>
                          <button
                            onClick={() => setSelectedDisplay(null)}
                            className="text-sm text-purple-600 hover:text-purple-700"
                          >
                            Change style
                          </button>
                        </div>
                      </div>

                      {/* Customization Controls */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-purple-600" />
                          Customize
                        </h3>

                        {/* Columns */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Columns: {customization.columns}
                          </label>
                          <input
                            type="range"
                            min="1"
                            max="6"
                            value={customization.columns}
                            onChange={(e) => setCustomization({...customization, columns: parseInt(e.target.value)})}
                            className="w-full"
                          />
                        </div>

                        {/* Gap */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Gap: {customization.gap}px
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="50"
                            value={customization.gap}
                            onChange={(e) => setCustomization({...customization, gap: parseInt(e.target.value)})}
                            className="w-full"
                          />
                        </div>

                        {/* Border Radius */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Border Radius: {customization.borderRadius}px
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="30"
                            value={customization.borderRadius}
                            onChange={(e) => setCustomization({...customization, borderRadius: parseInt(e.target.value)})}
                            className="w-full"
                          />
                        </div>

                        {/* Shadow */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Shadow</label>
                          <div className="grid grid-cols-4 gap-2">
                            {(['none', 'sm', 'md', 'lg'] as const).map(size => (
                              <button
                                key={size}
                                onClick={() => setCustomization({...customization, shadow: size})}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  customization.shadow === size
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {size.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Hover Effect */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Hover Effect</label>
                          <div className="grid grid-cols-2 gap-2">
                            {(['zoom', 'fade', 'slide', 'none'] as const).map(effect => (
                              <button
                                key={effect}
                                onClick={() => setCustomization({...customization, hoverEffect: effect})}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  customization.hoverEffect === effect
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {effect.charAt(0).toUpperCase() + effect.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Aspect Ratio */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Aspect Ratio</label>
                          <div className="grid grid-cols-3 gap-2">
                            {(['square', 'native', '16:9', '4:3', '3:2'] as const).map(ratio => (
                              <button
                                key={ratio}
                                onClick={() => setCustomization({...customization, aspectRatio: ratio})}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  customization.aspectRatio === ratio
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {ratio === 'native' ? 'Native' : ratio.charAt(0).toUpperCase() + ratio.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Content Toggles */}
                        <div className="space-y-3 pt-4 border-t">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={customization.showTitles}
                              onChange={(e) => setCustomization({...customization, showTitles: e.target.checked})}
                              className="w-5 h-5 text-purple-600 rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">Show Titles</span>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={customization.showCaptions}
                              onChange={(e) => setCustomization({...customization, showCaptions: e.target.checked})}
                              className="w-5 h-5 text-purple-600 rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">Show Captions</span>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={customization.showKeywords}
                              onChange={(e) => setCustomization({...customization, showKeywords: e.target.checked})}
                              className="w-5 h-5 text-purple-600 rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">Show Keywords</span>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={customization.showFilename}
                              onChange={(e) => setCustomization({...customization, showFilename: e.target.checked})}
                              className="w-5 h-5 text-purple-600 rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">Show Filename</span>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={customization.showBuyButtons}
                              onChange={(e) => setCustomization({...customization, showBuyButtons: e.target.checked})}
                              className="w-5 h-5 text-purple-600 rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">Show Buy Buttons</span>
                          </label>
                        </div>

                        {/* Buy Button Settings */}
                        {customization.showBuyButtons && (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Buy Button Text</label>
                              <input
                                type="text"
                                value={customization.buyButtonText}
                                onChange={(e) => setCustomization({...customization, buyButtonText: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                placeholder="Buy"
                              />
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={customization.buyButtonNewTab}
                                onChange={(e) => setCustomization({...customization, buyButtonNewTab: e.target.checked})}
                                className="w-5 h-5 text-purple-600 rounded"
                              />
                              <span className="text-sm font-medium text-gray-700">Open in New Tab</span>
                            </label>
                          </div>
                        )}

                        {/* Background Color */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Background Color</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={customization.backgroundColor}
                              onChange={(e) => setCustomization({...customization, backgroundColor: e.target.value})}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                              placeholder="#ffffff"
                            />
                            <input
                              type="color"
                              value={customization.backgroundColor}
                              onChange={(e) => setCustomization({...customization, backgroundColor: e.target.value})}
                              className="w-12 h-10 rounded-lg cursor-pointer border border-gray-300"
                            />
                          </div>
                        </div>

                        {/* Image Sizes */}
                        <div className="space-y-4 pt-4 border-t">
                          <h4 className="text-sm font-semibold text-gray-900">SmugMug Image Sizes</h4>

                          {/* Thumbnail Size */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Thumbnail Size (Grid Display)
                            </label>
                            <select
                              value={customization.thumbnailSize}
                              onChange={(e) => setCustomization({...customization, thumbnailSize: e.target.value as SmugMugImageSize})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                            >
                              <option value="Ti">Tiny (100px) - Ti</option>
                              <option value="Th">Thumbnail (150px) - Th</option>
                              <option value="S">Small (400px) - S</option>
                              <option value="M">Medium (600px) - M</option>
                              <option value="L">Large (800px) - L</option>
                              <option value="XL">XLarge (1024px) - XL</option>
                              <option value="X2">X2Large (1280px) - X2</option>
                              <option value="X3">X3Large (1600px) - X3</option>
                              <option value="X4">X4Large (2048px) - X4</option>
                              <option value="X5">X5Large (2560px) - X5</option>
                              <option value="4k">4K (3840px) - 4k</option>
                              <option value="5k">5K (5120px) - 5k</option>
                              <option value="O">Original - O</option>
                            </select>
                          </div>

                          {/* Full Image Size */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Full Image Size (Lightbox/Slideshow)
                            </label>
                            <select
                              value={customization.fullImageSize}
                              onChange={(e) => setCustomization({...customization, fullImageSize: e.target.value as SmugMugImageSize})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                            >
                              <option value="Ti">Tiny (100px) - Ti</option>
                              <option value="Th">Thumbnail (150px) - Th</option>
                              <option value="S">Small (400px) - S</option>
                              <option value="M">Medium (600px) - M</option>
                              <option value="L">Large (800px) - L</option>
                              <option value="XL">XLarge (1024px) - XL</option>
                              <option value="X2">X2Large (1280px) - X2</option>
                              <option value="X3">X3Large (1600px) - X3</option>
                              <option value="X4">X4Large (2048px) - X4</option>
                              <option value="X5">X5Large (2560px) - X5</option>
                              <option value="4k">4K (3840px) - 4k</option>
                              <option value="5k">5K (5120px) - 5k</option>
                              <option value="O">Original - O</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Export Format */}
                      <div className="space-y-3">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                          <Code2 className="w-5 h-5 text-purple-600" />
                          Export Format
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                          {(['html', 'react', 'wordpress', 'json'] as const).map(format => (
                            <button
                              key={format}
                              onClick={() => setExportFormat(format)}
                              className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                                exportFormat === format
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {format === 'html' ? 'HTML & CSS' : format.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-4">
                        <button
                          onClick={copyToClipboard}
                          className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          {copied ? 'Copied!' : 'Copy Code'}
                        </button>
                        <button
                          onClick={downloadCode}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
                        >
                          Download
                        </button>
                      </div>

                      <button
                        onClick={() => setShowTestPlayground(!showTestPlayground)}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
                      >
                        <Code2 className="w-5 h-5" />
                        {showTestPlayground ? 'Hide' : 'Open'} Test Playground
                      </button>
                    </div>

                    {/* Right Panel: Live Preview */}
                    <div className="p-6 bg-gray-50 flex flex-col overflow-hidden">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                          <Eye className="w-5 h-5 text-purple-600" />
                          Live Preview
                        </h3>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setPreviewDevice('desktop')}
                            className={`p-2 rounded-lg transition-colors ${previewDevice === 'desktop' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                            title="Desktop"
                          >
                            <Monitor className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setPreviewDevice('tablet')}
                            className={`p-2 rounded-lg transition-colors ${previewDevice === 'tablet' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                            title="Tablet"
                          >
                            <Tablet className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setPreviewDevice('mobile')}
                            className={`p-2 rounded-lg transition-colors ${previewDevice === 'mobile' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                            title="Mobile"
                          >
                            <Smartphone className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 bg-white rounded-lg border-2 border-gray-200 overflow-auto">
                        <div
                          className="transition-all duration-300 min-h-full"
                          style={{
                            width: previewDevice === 'desktop' ? '100%' : getDeviceWidth(),
                            minWidth: previewDevice === 'desktop' ? '100%' : getDeviceWidth(),
                          }}
                        >
                          <iframe
                            ref={iframeRef}
                            className="w-full border-0"
                            style={{ height: '800px', minHeight: '800px' }}
                            title="Preview"
                            sandbox="allow-scripts allow-same-origin"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Test Playground Modal */}
        {showTestPlayground && selectedDisplay && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={() => setShowTestPlayground(false)}>
            <div className="bg-white rounded-2xl w-full max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b flex justify-between items-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Code2 className="w-6 h-6" />
                  Test Playground
                </h2>
                <button
                  onClick={() => setShowTestPlayground(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-hidden grid lg:grid-cols-2">
                {/* Code Editor */}
                <div className="p-6 border-r overflow-y-auto bg-gray-900">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-white font-bold">Code</h3>
                    <button
                      onClick={copyToClipboard}
                      className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre className="text-green-400 text-sm overflow-x-auto">
                    <code>{getCodeToExport()}</code>
                  </pre>
                </div>

                {/* Live Preview */}
                <div className="p-6 overflow-y-auto bg-gray-50">
                  <h3 className="text-gray-900 font-bold mb-4">Live Preview</h3>
                  <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
                    <iframe
                      srcDoc={exportFormat === 'html' ? getCodeToExport() : generateEmbedCode(selectedDisplay)}
                      className="w-full h-[600px] border-0"
                      title="Test Preview"
                      sandbox="allow-scripts allow-same-origin"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
