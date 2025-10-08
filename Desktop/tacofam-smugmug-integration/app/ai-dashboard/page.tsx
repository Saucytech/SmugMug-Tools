'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Sparkles, Coins, Clock, TrendingUp, Activity,
  CheckCircle, XCircle, Loader, Eye, EyeOff, Filter, Download,
  BarChart3, Zap, Search, Trash2, RefreshCw, Code2, Brain, AlertTriangle,
  LayoutGrid, Columns, List
} from 'lucide-react';
import { useAIActivityStore } from '@/stores/aiActivityStore';
import { useCoinBalance } from '@/stores/coinBalanceStore';
import { AVAILABLE_MODELS } from '@/stores/modelPreferencesStore';
import ToolboxHeader from '@/components/ToolboxHeader';

type FilterStatus = 'all' | 'completed' | 'error' | 'processing';
type FilterTool = 'all' | string;
type ViewMode = 'large-card' | 'small-card' | 'list';

// Tool theme colors mapping
const getToolTheme = (toolName: string) => {
  const themes: Record<string, { gradient: string; bg: string; text: string; icon: any }> = {
    'MetaData Monster': {
      gradient: 'from-green-500 to-green-600',
      bg: 'bg-green-100',
      text: 'text-green-700',
      icon: Code2,
    },
    'AI Gallery Creator': {
      gradient: 'from-teal-500 to-cyan-600',
      bg: 'bg-teal-100',
      text: 'text-teal-700',
      icon: Sparkles,
    },
    'Photo Organizer': {
      gradient: 'from-indigo-500 to-purple-600',
      bg: 'bg-indigo-100',
      text: 'text-indigo-700',
      icon: Brain,
    },
    'Sanity Checker': {
      gradient: 'from-orange-500 to-red-600',
      bg: 'bg-orange-100',
      text: 'text-orange-700',
      icon: AlertTriangle,
    },
  };

  return themes[toolName] || {
    gradient: 'from-gray-500 to-gray-600',
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    icon: Activity,
  };
};

export default function AIDashboard() {
  const router = useRouter();
  const { getAllJobs, clearAll, clearCompleted } = useAIActivityStore();
  const { getTransactions } = useCoinBalance();
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterTool, setFilterTool] = useState<FilterTool>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [showRequestData, setShowRequestData] = useState<{[key: string]: boolean}>({});
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('large-card');

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const allJobs = mounted ? getAllJobs() : [];
  const coinTransactions = mounted ? getTransactions(100) : [];

  // Get unique tools
  const uniqueTools = useMemo(() => {
    const tools = new Set(allJobs.map(j => j.tool));
    return Array.from(tools);
  }, [allJobs]);

  // Filter jobs
  const filteredJobs = useMemo(() => {
    return allJobs.filter(job => {
      // Status filter
      if (filterStatus !== 'all' && job.status !== filterStatus) return false;

      // Tool filter
      if (filterTool !== 'all' && job.tool !== filterTool) return false;

      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesMessage = job.message?.toLowerCase().includes(query);
        const matchesTool = job.tool.toLowerCase().includes(query);
        const matchesSummary = job.taskSummary?.toLowerCase().includes(query);
        if (!matchesMessage && !matchesTool && !matchesSummary) return false;
      }

      return true;
    });
  }, [allJobs, filterStatus, filterTool, searchQuery]);

  // Calculate statistics
  const stats = useMemo(() => {
    const completed = allJobs.filter(j => j.status === 'completed');
    const errors = allJobs.filter(j => j.status === 'error');
    const processing = allJobs.filter(j => j.status === 'processing');

    const totalCoins = completed.reduce((sum, j) => sum + (j.coinsSpent || 0), 0);
    const totalInputTokens = completed.reduce((sum, j) => sum + (j.inputTokens || 0), 0);
    const totalOutputTokens = completed.reduce((sum, j) => sum + (j.outputTokens || 0), 0);

    const avgCoinsPerOp = completed.length > 0 ? totalCoins / completed.length : 0;
    const avgDuration = completed.length > 0
      ? completed.reduce((sum, j) => {
          if (j.endTime && j.startTime) {
            return sum + (j.endTime.getTime() - j.startTime.getTime()) / 1000;
          }
          return sum;
        }, 0) / completed.length
      : 0;

    return {
      total: allJobs.length,
      completed: completed.length,
      errors: errors.length,
      processing: processing.length,
      totalCoins,
      totalInputTokens,
      totalOutputTokens,
      avgCoinsPerOp,
      avgDuration,
    };
  }, [allJobs]);

  const toggleRequestData = (jobId: string) => {
    setShowRequestData(prev => ({
      ...prev,
      [jobId]: !prev[jobId],
    }));
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const exportToCSV = () => {
    const headers = [
      'Timestamp',
      'Tool',
      'Status',
      'Duration (s)',
      'Input Tokens',
      'Output Tokens',
      'Total Tokens',
      'Coins Spent',
      'Model',
      'Task Summary',
      'Error'
    ];

    const rows = filteredJobs.map(job => {
      const duration = job.endTime && job.startTime
        ? (job.endTime.getTime() - job.startTime.getTime()) / 1000
        : 0;

      return [
        job.startTime.toISOString(),
        job.tool,
        job.status,
        duration.toFixed(2),
        job.inputTokens || 0,
        job.outputTokens || 0,
        (job.inputTokens || 0) + (job.outputTokens || 0),
        job.coinsSpent || 0,
        job.modelName || 'N/A',
        (job.taskSummary || job.message || '').replace(/,/g, ';'),
        (job.error || '').replace(/,/g, ';'),
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-dashboard-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Show loading state during hydration
  if (!mounted) {
    return (
      <>
        <ToolboxHeader currentTool="ai-dashboard" />
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center py-20">
              <Loader className="w-8 h-8 text-purple-600 animate-spin" />
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <ToolboxHeader currentTool="ai-dashboard" />
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-purple-600" />
                AI Operations Dashboard
              </h1>
              <p className="text-gray-600">Track all AI requests, responses, tokens, and costs</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={() => {
                  if (confirm('Clear all AI operation history?')) {
                    clearAll();
                  }
                }}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Clear All
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-blue-600" />
                <p className="text-sm text-gray-600">Total Ops</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>

            <div className="bg-white rounded-xl p-4 sm:p-6 shadow border border-green-200 bg-green-50">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-sm text-green-700">Completed</p>
              </div>
              <p className="text-3xl font-bold text-green-700">{stats.completed}</p>
            </div>

            <div className="bg-white rounded-xl p-4 sm:p-6 shadow border border-red-200 bg-red-50">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <p className="text-sm text-red-700">Errors</p>
              </div>
              <p className="text-3xl font-bold text-red-700">{stats.errors}</p>
            </div>

            <div className="bg-white rounded-xl p-4 sm:p-6 shadow border border-yellow-200 bg-yellow-50">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="w-5 h-5 text-yellow-600" />
                <p className="text-sm text-yellow-700">Total Coins</p>
              </div>
              <p className="text-3xl font-bold text-yellow-700">{stats.totalCoins.toLocaleString()}</p>
            </div>

            <div className="bg-white rounded-xl p-4 sm:p-6 shadow border border-purple-200 bg-purple-50">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <p className="text-sm text-purple-700">Avg Coins/Op</p>
              </div>
              <p className="text-3xl font-bold text-purple-700">{Math.round(stats.avgCoinsPerOp)}</p>
            </div>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl p-6 shadow border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Token Usage</h3>
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Input:</span>
                  <span className="font-bold text-gray-900">{stats.totalInputTokens.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Output:</span>
                  <span className="font-bold text-gray-900">{stats.totalOutputTokens.toLocaleString()}</span>
                </div>
                <div className="h-px bg-gray-200"></div>
                <div className="flex justify-between">
                  <span className="text-gray-700 font-medium">Total:</span>
                  <span className="font-bold text-purple-700">
                    {(stats.totalInputTokens + stats.totalOutputTokens).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Performance</h3>
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Duration:</span>
                  <span className="font-bold text-gray-900">{formatDuration(stats.avgDuration)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Success Rate:</span>
                  <span className="font-bold text-green-700">
                    {stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Cost Analysis</h3>
                <Coins className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">USD Spent:</span>
                  <span className="font-bold text-gray-900">${(stats.totalCoins * 0.001).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg USD/Op:</span>
                  <span className="font-bold text-gray-900">${(stats.avgCoinsPerOp * 0.001).toFixed(3)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow border border-gray-200 mb-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search operations..."
                  className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="error">Error</option>
                <option value="processing">Processing</option>
              </select>

              <select
                value={filterTool}
                onChange={(e) => setFilterTool(e.target.value)}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
              >
                <option value="all">All Tools</option>
                {uniqueTools.map(tool => (
                  <option key={tool} value={tool}>{tool}</option>
                ))}
              </select>

              {/* View Mode Toggle */}
              <div className="flex gap-2 border-2 border-gray-300 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('large-card')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'large-card'
                      ? 'bg-purple-600 text-white'
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  title="Large Card View"
                >
                  <LayoutGrid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('small-card')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'small-card'
                      ? 'bg-purple-600 text-white'
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  title="Small Card View (3 columns)"
                >
                  <Columns className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'list'
                      ? 'bg-purple-600 text-white'
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  title="List View (Compact)"
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="mt-4 flex justify-between items-center text-sm">
              <span className="text-gray-600">
                Showing {filteredJobs.length} of {allJobs.length} operations
              </span>
              <span className="text-gray-500">
                View: {viewMode === 'large-card' ? 'Large Card' : viewMode === 'small-card' ? 'Small Card' : 'List'}
              </span>
            </div>
          </div>

          {/* Operations List */}
          {filteredJobs.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border-2 border-dashed border-gray-300">
              <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No operations found</h3>
              <p className="text-gray-500">Start using AI tools to see them tracked here</p>
            </div>
          ) : (
            <>
              {/* Large Card View */}
              {viewMode === 'large-card' && (
                <div className="space-y-4">
                  {filteredJobs.map((job) => {
                    const duration = job.endTime && job.startTime
                      ? (job.endTime.getTime() - job.startTime.getTime()) / 1000
                      : 0;
                    const toolTheme = getToolTheme(job.tool);
                    const ToolIcon = toolTheme.icon;

                    return (
                      <div
                        key={job.id}
                        className={`bg-white rounded-xl shadow border-2 overflow-hidden transition-all ${
                          job.status === 'completed' ? 'border-green-200' :
                          job.status === 'error' ? 'border-red-200' :
                          'border-blue-200'
                        }`}
                      >
                        <div className="p-6">
                      {/* Job Header */}
                      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            {/* Tool Badge with gradient */}
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-br ${toolTheme.gradient}`}>
                              <ToolIcon className="w-5 h-5 text-white" />
                              <span className="text-base font-bold text-white">{job.tool}</span>
                            </div>
                            {job.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-600" />}
                            {job.status === 'error' && <XCircle className="w-5 h-5 text-red-600" />}
                            {job.status === 'processing' && <Loader className="w-5 h-5 text-blue-600 animate-spin" />}
                          </div>
                          <p className="text-sm text-gray-600">
                            {job.taskSummary || job.message || 'AI operation'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {job.startTime.toLocaleString()}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          {job.modelName && (
                            <div className="flex items-center gap-1 px-3 py-1 bg-purple-100 rounded-full">
                              <Zap className="w-3 h-3 text-purple-600" />
                              <span className="text-xs font-semibold text-purple-700">{job.modelName}</span>
                            </div>
                          )}
                          {job.coinsSpent !== undefined && (
                            <div className="flex items-center gap-1 px-3 py-1 bg-yellow-100 rounded-full">
                              <Coins className="w-3 h-3 text-yellow-600" />
                              <span className="text-xs font-bold text-yellow-700">{job.coinsSpent} coins</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500">Duration</p>
                          <p className="text-sm font-bold text-gray-900">{formatDuration(duration)}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500">Input Tokens</p>
                          <p className={`text-sm font-bold ${job.inputTokens ? 'text-gray-900' : 'text-gray-400'}`}>
                            {job.inputTokens?.toLocaleString() || 'N/A'}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500">Output Tokens</p>
                          <p className={`text-sm font-bold ${job.outputTokens ? 'text-gray-900' : 'text-gray-400'}`}>
                            {job.outputTokens?.toLocaleString() || 'N/A'}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500">Total Tokens</p>
                          <p className={`text-sm font-bold ${(job.inputTokens && job.outputTokens) ? 'text-purple-700' : 'text-gray-400'}`}>
                            {(job.inputTokens && job.outputTokens)
                              ? ((job.inputTokens || 0) + (job.outputTokens || 0)).toLocaleString()
                              : 'N/A'}
                          </p>
                        </div>
                      </div>

                      {/* Warning for old operations without token data */}
                      {!job.inputTokens && !job.outputTokens && job.status === 'completed' && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                          <Activity className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-yellow-900">
                            <strong>Old Operation:</strong> This operation was completed before token tracking was enabled.
                            Run a new operation to see token usage data.
                          </p>
                        </div>
                      )}

                      {/* Error Message */}
                      {job.error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                          <p className="text-sm text-red-900 font-semibold mb-1">Error:</p>
                          <p className="text-sm text-red-700">{job.error}</p>
                        </div>
                      )}

                      {/* Request/Response Data */}
                      {(job.requestData || job.responseData) && (
                        <div className="border-t border-gray-200 pt-4">
                          <button
                            onClick={() => toggleRequestData(job.id)}
                            className="flex items-center gap-2 text-sm font-semibold text-purple-600 hover:text-purple-700"
                          >
                            {showRequestData[job.id] ? (
                              <>
                                <EyeOff className="w-4 h-4" />
                                Hide Details
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4" />
                                Show Request/Response Data
                              </>
                            )}
                          </button>

                          {showRequestData[job.id] && (
                            <div className="mt-4 space-y-4">
                              {job.requestData && (
                                <div>
                                  <h4 className="text-sm font-bold text-gray-700 mb-2">Request Data:</h4>
                                  <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto">
                                    {JSON.stringify(job.requestData, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {job.responseData && (
                                <div>
                                  <h4 className="text-sm font-bold text-gray-700 mb-2">Response Data:</h4>
                                  <pre className="bg-gray-900 text-blue-400 p-4 rounded-lg text-xs overflow-x-auto">
                                    {JSON.stringify(job.responseData, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Small Card View - 3 Columns */}
          {viewMode === 'small-card' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredJobs.map((job) => {
                const duration = job.endTime && job.startTime
                  ? (job.endTime.getTime() - job.startTime.getTime()) / 1000
                  : 0;
                const toolTheme = getToolTheme(job.tool);
                const ToolIcon = toolTheme.icon;

                return (
                  <div
                    key={job.id}
                    className={`bg-white rounded-lg shadow border-2 p-4 transition-all hover:shadow-lg ${
                      job.status === 'completed' ? 'border-green-200' :
                      job.status === 'error' ? 'border-red-200' :
                      'border-blue-200'
                    }`}
                  >
                    {/* Tool Badge */}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-br ${toolTheme.gradient} mb-3`}>
                      <ToolIcon className="w-4 h-4 text-white" />
                      <span className="text-sm font-bold text-white truncate">{job.tool}</span>
                      {job.status === 'completed' && <CheckCircle className="w-4 h-4 text-white ml-auto flex-shrink-0" />}
                      {job.status === 'error' && <XCircle className="w-4 h-4 text-white ml-auto flex-shrink-0" />}
                      {job.status === 'processing' && <Loader className="w-4 h-4 text-white ml-auto flex-shrink-0 animate-spin" />}
                    </div>

                    {/* Key Metrics */}
                    <div className="space-y-2 text-sm mb-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tokens:</span>
                        <span className="font-bold text-purple-700">
                          {((job.inputTokens || 0) + (job.outputTokens || 0)).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Coins:</span>
                        <span className="font-bold text-yellow-700">{job.coinsSpent || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Duration:</span>
                        <span className="font-bold text-gray-900">{formatDuration(duration)}</span>
                      </div>
                    </div>

                    {/* Timestamp */}
                    <p className="text-xs text-gray-500">{job.startTime.toLocaleString()}</p>

                    {/* Error if present */}
                    {job.error && (
                      <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                        Error: {job.error.substring(0, 50)}...
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* List View - Compact Single Row */}
          {viewMode === 'list' && (
            <div className="space-y-1">
              {filteredJobs.map((job) => {
                const duration = job.endTime && job.startTime
                  ? (job.endTime.getTime() - job.startTime.getTime()) / 1000
                  : 0;
                const toolTheme = getToolTheme(job.tool);
                const ToolIcon = toolTheme.icon;

                return (
                  <div
                    key={job.id}
                    className={`bg-white rounded-lg shadow border-l-4 p-3 flex items-center gap-3 hover:shadow-md transition-all ${
                      job.status === 'completed' ? 'border-green-500' :
                      job.status === 'error' ? 'border-red-500' :
                      'border-blue-500'
                    }`}
                  >
                    {/* Tool Badge - Compact */}
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded bg-gradient-to-br ${toolTheme.gradient} flex-shrink-0`}>
                      <ToolIcon className="w-3 h-3 text-white" />
                      <span className="text-xs font-bold text-white">{job.tool}</span>
                    </div>

                    {/* Status Icon */}
                    <div className="flex-shrink-0">
                      {job.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-600" />}
                      {job.status === 'error' && <XCircle className="w-4 h-4 text-red-600" />}
                      {job.status === 'processing' && <Loader className="w-4 h-4 text-blue-600 animate-spin" />}
                    </div>

                    {/* Timestamp - Compact */}
                    <span className="text-xs text-gray-600 w-32 flex-shrink-0">
                      {job.startTime.toLocaleTimeString()}
                    </span>

                    {/* Metrics - All in one row */}
                    <div className="flex items-center gap-4 text-xs flex-shrink-0">
                      <div className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-purple-600" />
                        <span className="font-semibold text-purple-700">
                          {((job.inputTokens || 0) + (job.outputTokens || 0)).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Coins className="w-3 h-3 text-yellow-600" />
                        <span className="font-semibold text-yellow-700">{job.coinsSpent || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-600" />
                        <span className="font-semibold text-gray-700">{formatDuration(duration)}</span>
                      </div>
                    </div>

                    {/* Model */}
                    {job.modelName && (
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 rounded-full flex-shrink-0">
                        <Zap className="w-3 h-3 text-purple-600" />
                        <span className="text-xs font-medium text-purple-700">{job.modelName}</span>
                      </div>
                    )}

                    {/* Task Summary - Truncated */}
                    <span className="text-xs text-gray-600 flex-1 truncate">
                      {job.taskSummary || job.message || 'AI operation'}
                    </span>

                    {/* Error indicator */}
                    {job.error && (
                      <div className="flex-shrink-0 px-2 py-1 bg-red-100 rounded text-xs text-red-700">
                        Error
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

        </div>
      </div>
    </>
  );
}
