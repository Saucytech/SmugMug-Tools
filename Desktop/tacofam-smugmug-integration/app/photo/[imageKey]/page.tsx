'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Download, Copy, Check } from 'lucide-react';

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

      try {
        const response = await fetch(`/api/smugmug/image/${imageKey}`, {
          headers: {
            'x-access-token': accessToken,
            'x-access-token-secret': accessTokenSecret,
          },
        });

        if (!response.ok) throw new Error('Failed to fetch photo metadata');

        const data = await response.json();
        setMetadata(data);
      } catch (err: any) {
        setError(err.message);
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

          <button
            onClick={copyMetadata}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Metadata'}
          </button>
        </div>

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

            {/* Quick Info */}
            {image && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Quick Info</h3>
                <div className="space-y-2">
                  {image.FileName && (
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-600">File Name</span>
                      <span className="text-sm text-gray-900">{image.FileName}</span>
                    </div>
                  )}
                  {image.Format && (
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-600">Format</span>
                      <span className="text-sm text-gray-900">{image.Format}</span>
                    </div>
                  )}
                  {image.Caption && (
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-600">Caption</span>
                      <span className="text-sm text-gray-900">{image.Caption}</span>
                    </div>
                  )}
                  {image.Keywords && (
                    <div className="flex justify-between py-2">
                      <span className="text-sm font-medium text-gray-600">Keywords</span>
                      <span className="text-sm text-gray-900">{image.Keywords}</span>
                    </div>
                  )}
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
