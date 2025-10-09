'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Power, PowerOff, Ban, RefreshCw, ArrowLeft } from 'lucide-react';
import ToolboxHeader from '@/components/ToolboxHeader';

interface ToolState {
  id: number;
  tool_id: string;
  tool_name: string;
  status: 'on' | 'disabled' | 'off';
  disabled_message: string | null;
  created_at: string;
  updated_at: string;
}

export default function AdminToolsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [tools, setTools] = useState<ToolState[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session && (session.user as any)?.role !== 'admin') {
      router.push('/');
    } else if (session) {
      loadTools();
    }
  }, [session, status, router]);

  const loadTools = async () => {
    try {
      const response = await fetch('/api/tools/states');
      if (response.ok) {
        const data = await response.json();
        setTools(data.tools);
      }
    } catch (error) {
      console.error('Error loading tools:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateToolState = async (toolId: string, newStatus: 'on' | 'disabled' | 'off') => {
    setUpdating(toolId);
    try {
      const response = await fetch('/api/admin/tools', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toolId,
          status: newStatus,
          disabledMessage: newStatus === 'disabled' ? 'This feature is temporarily disabled and will return soon.' : null,
        }),
      });

      if (response.ok) {
        await loadTools();
      } else {
        const error = await response.json();
        alert(`Failed to update tool: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating tool:', error);
      alert('Failed to update tool');
    } finally {
      setUpdating(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'disabled':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'off':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on':
        return <Power className="w-5 h-5 text-green-600" />;
      case 'disabled':
        return <Ban className="w-5 h-5 text-yellow-600" />;
      case 'off':
        return <PowerOff className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  if (status === 'loading' || loading) {
    return (
      <>
        <ToolboxHeader />
        <main className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </main>
      </>
    );
  }

  if (!session || (session.user as any)?.role !== 'admin') {
    return null;
  }

  return (
    <>
      <ToolboxHeader />
      <main className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/admin')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Admin Dashboard</span>
            </button>

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Tool Management</h1>
                <p className="text-gray-600">Control tool availability across the platform</p>
              </div>
              <button
                onClick={loadTools}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          {/* Status Legend */}
          <div className="mb-6 p-4 bg-white rounded-xl border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Status Legend:</h3>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Power className="w-4 h-4 text-green-600" />
                <span className="font-medium">ON:</span> Tool is available and functional
              </div>
              <div className="flex items-center gap-2">
                <Ban className="w-4 h-4 text-yellow-600" />
                <span className="font-medium">DISABLED:</span> Tool is visible but grayed out with hover message
              </div>
              <div className="flex items-center gap-2">
                <PowerOff className="w-4 h-4 text-red-600" />
                <span className="font-medium">OFF:</span> Tool is completely hidden from users
              </div>
            </div>
          </div>

          {/* Tools List */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Tool Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Tool ID</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Current Status</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Actions</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {tools.map((tool) => (
                    <tr key={tool.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{tool.tool_name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">{tool.tool_id}</code>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {getStatusIcon(tool.status)}
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase border ${getStatusColor(tool.status)}`}>
                            {tool.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => updateToolState(tool.tool_id, 'on')}
                            disabled={tool.status === 'on' || updating === tool.tool_id}
                            className="p-2 bg-green-100 hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed text-green-700 rounded-lg transition-colors"
                            title="Turn ON"
                          >
                            <Power className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => updateToolState(tool.tool_id, 'disabled')}
                            disabled={tool.status === 'disabled' || updating === tool.tool_id}
                            className="p-2 bg-yellow-100 hover:bg-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed text-yellow-700 rounded-lg transition-colors"
                            title="Disable (visible but not usable)"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => updateToolState(tool.tool_id, 'off')}
                            disabled={tool.status === 'off' || updating === tool.tool_id}
                            className="p-2 bg-red-100 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed text-red-700 rounded-lg transition-colors"
                            title="Turn OFF (hidden)"
                          >
                            <PowerOff className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-500">
                        {new Date(tool.updated_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
