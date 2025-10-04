'use client';

import { useState } from 'react';
import { Search, Image as ImageIcon, Info } from 'lucide-react';

export default function MetadataPage() {
  const [imageKey, setImageKey] = useState('');
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchMetadata = async () => {
    if (!imageKey) return;

    setLoading(true);
    setError('');
    setMetadata(null);

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const accessToken = urlParams.get('access_token');
      const accessTokenSecret = urlParams.get('access_token_secret');

      if (!accessToken || !accessTokenSecret) {
        throw new Error('Not authenticated. Please connect your SmugMug account first.');
      }

      const response = await fetch(`/api/smugmug/image/${imageKey}`, {
        headers: {
          'x-access-token': accessToken,
          'x-access-token-secret': accessTokenSecret,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch metadata');
      }

      const data = await response.json();
      setMetadata(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch metadata');
    } finally {
      setLoading(false);
    }
  };

  const renderMetadataSection = (title: string, data: any) => {
    if (!data) return null;

    return (
      <div className="bg-gray-800 rounded-lg p-4 mb-4">
        <h3 className="text-lg font-semibold mb-3 text-blue-400">{title}</h3>
        <div className="space-y-2">
          {Object.entries(data).map(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
              return (
                <div key={key} className="ml-4">
                  {renderMetadataSection(key, value)}
                </div>
              );
            }
            return (
              <div key={key} className="flex justify-between items-start py-1">
                <span className="text-gray-400 font-mono text-sm">{key}:</span>
                <span className="text-white font-mono text-sm ml-4 text-right break-all">
                  {String(value)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Photo Metadata Viewer</h1>
          <p className="text-gray-400">
            View complete EXIF and metadata for any SmugMug image
          </p>
        </div>

        {/* Search Interface */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={imageKey}
                onChange={(e) => setImageKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchMetadata()}
                placeholder="Enter SmugMug Image Key (e.g., xyz789)"
                className="w-full bg-gray-900 text-white px-4 py-3 pl-12 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            </div>
            <button
              onClick={fetchMetadata}
              disabled={loading || !imageKey}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-8 py-3 rounded font-semibold transition-colors flex items-center gap-2"
            >
              <ImageIcon className="w-5 h-5" />
              {loading ? 'Loading...' : 'Fetch Metadata'}
            </button>
          </div>

          {error && (
            <div className="mt-4 bg-red-900/30 border border-red-500 text-red-200 px-4 py-3 rounded">
              {error}
            </div>
          )}
        </div>

        {/* How to Find Image Key */}
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-300 mb-1">How to find an Image Key:</h3>
              <ol className="text-sm text-gray-300 space-y-1 ml-4 list-decimal">
                <li>Go to the main app and browse your albums</li>
                <li>Click on any image to view details</li>
                <li>Look for the "ImageKey" field in the photo data</li>
                <li>Copy and paste it here to see full metadata</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Metadata Display */}
        {metadata && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Image Metadata</h2>

            {/* Response Structure */}
            {metadata.Response && (
              <>
                {/* Image Info */}
                {metadata.Response.Image && renderMetadataSection('Image Information', metadata.Response.Image)}

                {/* EXIF Data */}
                {metadata.Response.ImageMetadata && renderMetadataSection('EXIF Metadata', metadata.Response.ImageMetadata)}

                {/* Other metadata */}
                {Object.entries(metadata.Response).map(([key, value]) => {
                  if (key !== 'Image' && key !== 'ImageMetadata' && key !== 'Uri' && key !== 'UriDescription') {
                    return renderMetadataSection(key, value);
                  }
                  return null;
                })}
              </>
            )}

            {/* Raw JSON View */}
            <details className="bg-gray-800 rounded-lg p-4">
              <summary className="cursor-pointer font-semibold text-lg mb-2">
                View Raw JSON Response
              </summary>
              <pre className="bg-gray-900 p-4 rounded overflow-auto text-xs">
                {JSON.stringify(metadata, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex gap-4">
          <a
            href="/"
            className="bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded font-semibold transition-colors"
          >
            ← Back to App
          </a>
          <a
            href="/api-reference"
            className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded font-semibold transition-colors"
          >
            View API Reference
          </a>
        </div>
      </div>
    </div>
  );
}
