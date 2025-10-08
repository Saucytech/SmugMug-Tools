'use client';

import { useState, useEffect } from 'react';
import { Image as ImageIcon, Folder, Album, User, Search, Upload } from 'lucide-react';

interface EndpointCategory {
  name: string;
  icon: any;
  endpoints: {
    name: string;
    method: string;
    path: string;
    description: string;
    params?: string[];
    example?: string;
  }[];
}

const SMUGMUG_ENDPOINTS: EndpointCategory[] = [
  {
    name: 'Authentication',
    icon: User,
    endpoints: [
      {
        name: 'Get Authenticated User',
        method: 'GET',
        path: '/api/v2!authuser',
        description: 'Returns information about the authenticated user',
        example: 'https://api.smugmug.com/api/v2!authuser',
      },
    ],
  },
  {
    name: 'User',
    icon: User,
    endpoints: [
      {
        name: 'Get User',
        method: 'GET',
        path: '/api/v2/user/{username}',
        description: 'Get user information by username',
        params: ['username'],
        example: 'https://api.smugmug.com/api/v2/user/cmac',
      },
      {
        name: 'Get User Albums',
        method: 'GET',
        path: '/api/v2/user/{username}!albums',
        description: 'Get all albums for a user',
        params: ['username'],
        example: 'https://api.smugmug.com/api/v2/user/cmac!albums',
      },
      {
        name: 'Get User Folders',
        method: 'GET',
        path: '/api/v2/user/{username}!folders',
        description: 'Get all folders for a user',
        params: ['username'],
        example: 'https://api.smugmug.com/api/v2/user/cmac!folders',
      },
    ],
  },
  {
    name: 'Albums',
    icon: Album,
    endpoints: [
      {
        name: 'Get Album',
        method: 'GET',
        path: '/api/v2/album/{albumKey}',
        description: 'Get album information',
        params: ['albumKey'],
        example: 'https://api.smugmug.com/api/v2/album/123abc',
      },
      {
        name: 'Get Album Images',
        method: 'GET',
        path: '/api/v2/album/{albumKey}!images',
        description: 'Get all images in an album',
        params: ['albumKey'],
        example: 'https://api.smugmug.com/api/v2/album/123abc!images',
      },
    ],
  },
  {
    name: 'Images',
    icon: ImageIcon,
    endpoints: [
      {
        name: 'Get Image',
        method: 'GET',
        path: '/api/v2/image/{imageKey}',
        description: 'Get image information',
        params: ['imageKey'],
        example: 'https://api.smugmug.com/api/v2/image/xyz789',
      },
      {
        name: 'Get Image Metadata',
        method: 'GET',
        path: '/api/v2/image/{imageKey}!metadata',
        description: 'Get EXIF and other metadata for an image',
        params: ['imageKey'],
        example: 'https://api.smugmug.com/api/v2/image/xyz789!metadata',
      },
      {
        name: 'Get Image Sizes',
        method: 'GET',
        path: '/api/v2/image/{imageKey}!sizedetails',
        description: 'Get available sizes and URLs for an image',
        params: ['imageKey'],
        example: 'https://api.smugmug.com/api/v2/image/xyz789!sizedetails',
      },
    ],
  },
  {
    name: 'Folders',
    icon: Folder,
    endpoints: [
      {
        name: 'Get Folder',
        method: 'GET',
        path: '/api/v2/folder/{folderId}',
        description: 'Get folder information',
        params: ['folderId'],
        example: 'https://api.smugmug.com/api/v2/folder/abc123',
      },
      {
        name: 'Get Folder Albums',
        method: 'GET',
        path: '/api/v2/folder/{folderId}!albums',
        description: 'Get all albums in a folder',
        params: ['folderId'],
        example: 'https://api.smugmug.com/api/v2/folder/abc123!albums',
      },
    ],
  },
  {
    name: 'Search',
    icon: Search,
    endpoints: [
      {
        name: 'Search Images',
        method: 'GET',
        path: '/api/v2!search',
        description: 'Search for images across SmugMug',
        params: ['q', 'scope'],
        example: 'https://api.smugmug.com/api/v2!search?q=sunset&scope=user',
      },
    ],
  },
  {
    name: 'Upload',
    icon: Upload,
    endpoints: [
      {
        name: 'Upload Image',
        method: 'POST',
        path: '/upload/api/v2/album/{albumKey}',
        description: 'Upload an image to an album',
        params: ['albumKey'],
        example: 'https://upload.smugmug.com/api/v2/album/123abc',
      },
    ],
  },
];

export default function APIReferencePage() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<any>(null);
  const [testUrl, setTestUrl] = useState('');
  const [testResponse, setTestResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testEndpoint = async () => {
    if (!testUrl) return;

    setLoading(true);
    setTestResponse(null);

    try {
      // Extract the path after /api/v2
      const urlPath = testUrl.replace('https://api.smugmug.com', '');

      // This is a simplified test - in production you'd route through your API
      setTestResponse({
        info: 'Direct SmugMug API testing requires authentication tokens. Use the main app to test authenticated endpoints.',
        url: testUrl,
      });
    } catch (_error) {
      setTestResponse({ error: 'Failed to test endpoint' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">SmugMug API Reference</h1>
        <p className="text-gray-400 mb-8">
          Interactive reference for all SmugMug API v2 endpoints
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Endpoints List */}
          <div className="md:col-span-1 space-y-4">
            {SMUGMUG_ENDPOINTS.map((category) => (
              <div key={category.name} className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <category.icon className="w-5 h-5 text-blue-400" />
                  <h2 className="text-lg font-semibold">{category.name}</h2>
                </div>
                <div className="space-y-2">
                  {category.endpoints.map((endpoint) => (
                    <button
                      key={endpoint.path}
                      onClick={() => {
                        setSelectedEndpoint(endpoint);
                        setTestUrl(endpoint.example || '');
                      }}
                      className={`w-full text-left p-2 rounded transition-colors ${
                        selectedEndpoint?.path === endpoint.path
                          ? 'bg-blue-600'
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono bg-gray-900 px-2 py-0.5 rounded">
                          {endpoint.method}
                        </span>
                        <span className="text-sm truncate">{endpoint.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Endpoint Details */}
          <div className="md:col-span-2 bg-gray-800 rounded-lg p-6">
            {selectedEndpoint ? (
              <>
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs font-mono bg-blue-600 px-3 py-1 rounded">
                      {selectedEndpoint.method}
                    </span>
                    <h3 className="text-2xl font-bold">{selectedEndpoint.name}</h3>
                  </div>
                  <p className="text-gray-300 mb-4">{selectedEndpoint.description}</p>

                  <div className="bg-gray-900 rounded p-4 mb-4">
                    <p className="text-xs text-gray-400 mb-2">Endpoint Path:</p>
                    <code className="text-blue-400 font-mono">
                      {selectedEndpoint.path}
                    </code>
                  </div>

                  {selectedEndpoint.params && (
                    <div className="bg-gray-900 rounded p-4 mb-4">
                      <p className="text-xs text-gray-400 mb-2">Parameters:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedEndpoint.params.map((param: string) => (
                          <span
                            key={param}
                            className="text-xs bg-purple-600 px-2 py-1 rounded font-mono"
                          >
                            {param}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedEndpoint.example && (
                    <div className="bg-gray-900 rounded p-4 mb-4">
                      <p className="text-xs text-gray-400 mb-2">Example URL:</p>
                      <code className="text-green-400 font-mono text-sm break-all">
                        {selectedEndpoint.example}
                      </code>
                    </div>
                  )}
                </div>

                {/* Test Interface */}
                <div className="border-t border-gray-700 pt-6">
                  <h4 className="text-lg font-semibold mb-3">Test Endpoint</h4>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={testUrl}
                      onChange={(e) => setTestUrl(e.target.value)}
                      placeholder="Enter full API URL..."
                      className="w-full bg-gray-900 text-white px-4 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none font-mono text-sm"
                    />
                    <button
                      onClick={testEndpoint}
                      disabled={loading || !testUrl}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-2 rounded font-semibold transition-colors"
                    >
                      {loading ? 'Testing...' : 'Test Request'}
                    </button>

                    {testResponse && (
                      <div className="bg-gray-900 rounded p-4">
                        <p className="text-xs text-gray-400 mb-2">Response:</p>
                        <pre className="text-xs text-gray-300 overflow-auto">
                          {JSON.stringify(testResponse, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p>Select an endpoint to view details</p>
              </div>
            )}
          </div>
        </div>

        {/* Documentation Links */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Additional Resources</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <a
              href="https://api.smugmug.com/api/v2/doc"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-700 hover:bg-gray-600 p-4 rounded transition-colors"
            >
              <h4 className="font-semibold mb-1">Official API Docs</h4>
              <p className="text-sm text-gray-400">Complete SmugMug API documentation</p>
            </a>
            <a
              href="https://api.smugmug.com/api/developer"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-700 hover:bg-gray-600 p-4 rounded transition-colors"
            >
              <h4 className="font-semibold mb-1">Developer Portal</h4>
              <p className="text-sm text-gray-400">Manage your API keys and apps</p>
            </a>
            <a
              href="/"
              className="bg-blue-600 hover:bg-blue-700 p-4 rounded transition-colors"
            >
              <h4 className="font-semibold mb-1">Back to App</h4>
              <p className="text-sm text-blue-200">Return to main application</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
