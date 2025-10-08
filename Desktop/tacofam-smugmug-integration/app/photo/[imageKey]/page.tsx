'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Copy, Check, Edit2, Save, X, Code } from 'lucide-react';

interface ImageMetadata {
  Response?: {
    Image?: any;
    ImageMetadata?: any;
    [key: string]: any;
  };
}

export default function PhotoDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const imageKey = params.imageKey as string;

  const [metadata, setMetadata] = useState<ImageMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Editable fields
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [keywords, setKeywords] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Embed code state
  const [showEmbedCode, setShowEmbedCode] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);

  const accessToken = searchParams.get('access_token');
  const accessTokenSecret = searchParams.get('access_token_secret');
  const albumName = searchParams.get('albumName');
  const albumKey = searchParams.get('albumKey');

  useEffect(() => {
    const fetchMetadata = async () => {
      if (!accessToken || !accessTokenSecret) {
        router.push('/');
        return;
      }

      // Always fetch fresh data from SmugMug API
      try {
        const response = await fetch(`/api/smugmug/image/${imageKey}`, {
          headers: {
            'X-Access-Token': accessToken,
            'X-Access-Token-Secret': accessTokenSecret,
          },
        });

        if (!response.ok) {
          // If API fails, fall back to cached data
          const cachedPhoto = sessionStorage.getItem('currentPhoto');
          if (cachedPhoto) {
            const photo = JSON.parse(cachedPhoto);
            setMetadata({ Response: { Image: photo } });
            setTitle(photo.Title || '');
            setCaption(photo.Caption || '');
            setKeywords(photo.Keywords || '');
          } else {
            throw new Error('Failed to fetch image data');
          }
        } else {
          const data = await response.json();
          setMetadata(data);

          // Initialize editable fields from fresh data
          const image = data.Response?.Image;
          if (image) {
            setTitle(image.Title || '');
            setCaption(image.Caption || '');
            setKeywords(image.Keywords || '');

            // Update cache with fresh data
            sessionStorage.setItem('currentPhoto', JSON.stringify(image));
          }
        }
      } catch (_err) {
        console.error('Error fetching metadata:', _err);
        setError('Failed to load photo metadata. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [imageKey, accessToken, accessTokenSecret, router]);

  const copyMetadata = () => {
    if (metadata) {
      navigator.clipboard.writeText(JSON.stringify(metadata, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = async () => {
    if (!accessToken || !accessTokenSecret) return;

    setSaving(true);
    setError('');

    try {
      // Save to SmugMug using PUT method
      const response = await fetch(`/api/smugmug/image/${imageKey}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Access-Token': accessToken,
          'X-Access-Token-Secret': accessTokenSecret,
        },
        body: JSON.stringify({
          Title: title,
          Caption: caption,
          Keywords: keywords,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save metadata');
      }

      const _data = await response.json();

      // Update local metadata state with saved values
      if (metadata?.Response?.Image) {
        const updatedMetadata = {
          ...metadata,
          Response: {
            ...metadata.Response,
            Image: {
              ...metadata.Response.Image,
              Title: title,
              Caption: caption,
              Keywords: keywords,
            }
          }
        };
        setMetadata(updatedMetadata);
      }

      setIsEditing(false);

      // Update sessionStorage with new values
      const cachedPhoto = sessionStorage.getItem('currentPhoto');
      if (cachedPhoto) {
        const photo = JSON.parse(cachedPhoto);
        photo.Title = title;
        photo.Caption = caption;
        photo.Keywords = keywords;
        sessionStorage.setItem('currentPhoto', JSON.stringify(photo));
      }

      console.log('Metadata saved successfully to SmugMug');
    } catch (_err) {
      console.error('Error saving metadata:', _err);
      setError(err instanceof Error ? err.message : 'Failed to save metadata. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to original values
    const image = metadata?.Response?.Image;
    setTitle(image?.Title || '');
    setCaption(image?.Caption || '');
    setKeywords(image?.Keywords || '');
    setIsEditing(false);
  };

  const generateEmbedCode = () => {
    const image = metadata?.Response?.Image;
    if (!image) return '';

    const imageUrl = image.ArchivedUri || image.ThumbnailUrl || '';
    const webUri = image.WebUri || '';
    const buyUrl = webUri ? `${webUri}/buy` : '';
    const photoTitle = image.Title || image.FileName || 'Photo';

    // Generate HTML embed code
    const embedHtml = `<!-- SmugMug Photo Embed with Buy Button -->
<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
  <img src="${imageUrl}" alt="${photoTitle}" style="width: 100%; height: auto; display: block;">
  <div style="padding: 16px; background: #f9fafb;">
    <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #111827;">${photoTitle}</h3>
    ${caption ? `<p style="margin: 0 0 12px 0; font-size: 14px; color: #6b7280;">${caption}</p>` : ''}
    <a href="${buyUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">Buy This Photo</a>
  </div>
</div>`;

    return embedHtml;
  };

  const copyEmbedCode = () => {
    const embedCode = generateEmbedCode();
    navigator.clipboard.writeText(embedCode);
    setEmbedCopied(true);
    setTimeout(() => setEmbedCopied(false), 2000);
  };

  const renderMetadataSection = (title: string, data: any) => {
    if (!data || Object.keys(data).length === 0) return null;

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">{title}</h3>
        <div className="space-y-3">
          {Object.entries(data).map(([key, value]) => {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              return (
                <div key={key} className="pl-4 border-l-2 border-gray-200">
                  {renderMetadataSection(key, value)}
                </div>
              );
            }
            if (key === 'Uri' || key === 'UriDescription' || key === 'Locator') return null;

            return (
              <div key={key} className="grid grid-cols-3 gap-4 py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm font-medium text-gray-600">{key}</span>
                <span className="col-span-2 text-sm text-gray-900 font-mono break-all">
                  {String(value)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading photo details...</div>
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

  const image = metadata?.Response?.Image;
  const exifData = metadata?.Response?.ImageMetadata;

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
          {albumKey && albumName ? (
            <>
              <button
                onClick={() => router.push(`/albums/${albumKey}?albumName=${encodeURIComponent(albumName)}`)}
                className="hover:text-blue-600 transition-colors"
              >
                {albumName}
              </button>
              <span>/</span>
            </>
          ) : null}
          <span className="text-gray-900 font-semibold">{image?.FileName || imageKey}</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (albumKey && albumName) {
                  router.push(`/albums/${albumKey}?albumName=${encodeURIComponent(albumName)}`);
                } else {
                  router.push('/');
                }
              }}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {image?.Title || image?.FileName || 'Photo Details'}
              </h1>
              <p className="text-gray-600 text-sm">Image Key: {imageKey}</p>
            </div>
          </div>

          <div className="flex gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Edit Metadata
              </button>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </>
            )}
            <button
              onClick={() => setShowEmbedCode(!showEmbedCode)}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Code className="w-4 h-4" />
              Get Embed Code
            </button>
            <button
              onClick={copyMetadata}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Metadata'}
            </button>
          </div>
        </div>

        {/* Embed Code Section */}
        {showEmbedCode && (
          <div className="mb-8 bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Embed Code with Buy Button</h2>
              <button
                onClick={copyEmbedCode}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {embedCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {embedCopied ? 'Copied!' : 'Copy Code'}
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Copy and paste this code into your website to embed this image with a buy button.
            </p>

            {/* Preview */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Preview:</h3>
              <div
                className="bg-gray-50 p-4 rounded border border-gray-200"
                dangerouslySetInnerHTML={{ __html: generateEmbedCode() }}
              />
            </div>

            {/* Code Display */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">HTML Code:</h3>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded text-xs overflow-x-auto">
                {generateEmbedCode()}
              </pre>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Image Preview */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <img
                src={image?.ArchivedUri || image?.ThumbnailUrl}
                alt={image?.Title || image?.FileName}
                className="w-full h-auto rounded-lg"
              />
            </div>

            {/* Editable Metadata */}
            {image && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">
                  {isEditing ? 'Edit Metadata' : 'Photo Metadata'}
                </h3>
                <div className="space-y-4">
                  {/* File Name - Read Only */}
                  {image.FileName && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        File Name
                      </label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900">
                        {image.FileName}
                      </div>
                    </div>
                  )}

                  {/* Format - Read Only */}
                  {image.Format && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Format
                      </label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900">
                        {image.Format}
                      </div>
                    </div>
                  )}

                  {/* Title - Editable */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Title
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="Enter title..."
                      />
                    ) : (
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900">
                        {title || <span className="text-gray-400">No title</span>}
                      </div>
                    )}
                  </div>

                  {/* Caption - Editable */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Caption
                    </label>
                    {isEditing ? (
                      <textarea
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="Enter caption..."
                      />
                    ) : (
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900">
                        {caption || <span className="text-gray-400">No caption</span>}
                      </div>
                    )}
                  </div>

                  {/* Keywords - Editable */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Keywords
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={keywords}
                        onChange={(e) => setKeywords(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="Enter keywords (comma separated)..."
                      />
                    ) : (
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900">
                        {keywords || <span className="text-gray-400">No keywords</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Metadata Sections */}
          <div className="space-y-6">
            {/* Image Information */}
            {image && renderMetadataSection('Image Information', {
              ...image,
              FileName: undefined,
              Format: undefined,
              Caption: undefined,
              Keywords: undefined,
              Title: undefined,
            })}

            {/* EXIF Metadata */}
            {exifData && renderMetadataSection('EXIF Data', exifData)}

            {/* Other Metadata */}
            {metadata?.Response && Object.entries(metadata.Response).map(([key, value]) => {
              if (key !== 'Image' && key !== 'ImageMetadata' && key !== 'Uri' && key !== 'UriDescription') {
                return renderMetadataSection(key, value);
              }
              return null;
            })}

            {/* Raw JSON */}
            <details className="bg-white rounded-lg border border-gray-200 p-6">
              <summary className="cursor-pointer font-semibold text-gray-900 mb-4">
                View Raw JSON
              </summary>
              <pre className="bg-gray-50 p-4 rounded text-xs overflow-auto max-h-96 border border-gray-200">
                {JSON.stringify(metadata, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
