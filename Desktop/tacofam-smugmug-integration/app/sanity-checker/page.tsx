'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ToolboxHeader from '@/components/ToolboxHeader';
import SystemPromptViewer from '@/components/SystemPromptViewer';
import { tokenStorage } from '@/lib/smugmug-client';
import { useModelPreferences, AVAILABLE_MODELS } from '@/stores/modelPreferencesStore';
import { useAIActivityStore } from '@/stores/aiActivityStore';
import { galleryCache } from '@/lib/galleryCache';
import CacheFreshnessIndicator from '@/components/CacheFreshnessIndicator';
import {
  ClipboardCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader,
  Play,
  ThumbsDown,
  Zap,
  Image as ImageIcon,
  FolderTree,
  Info,
  TrendingUp
} from 'lucide-react';

interface GalleryIndexEntry {
  albumKey: string;
  albumName: string;
  imageCount: number;
  images: Array<{
    ImageKey: string;
    FileName: string;
    Title?: string;
    Caption?: string;
    Keywords?: string;
    [key: string]: any;
  }>;
  indexedAt: number;
}

interface Finding {
  id: string;
  severity: 'critical' | 'optimization' | 'suggestion';
  category: string;
  title: string;
  description: string;
  affectedItems: string[];
  suggestion: string;
  autoFixAvailable: boolean;
  action?: {
    type: string;
    params: any;
  };
}

interface AnalysisStats {
  totalGalleries: number;
  totalImages: number;
  galleriesScanned: number;
  imagesScanned: number;
  criticalIssues: number;
  optimizations: number;
  suggestions: number;
}

export default function SanityChecker() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState('');

  const [findings, setFindings] = useState<Finding[]>([]);
  const [stats, setStats] = useState<AnalysisStats>({
    totalGalleries: 0,
    totalImages: 0,
    galleriesScanned: 0,
    imagesScanned: 0,
    criticalIssues: 0,
    optimizations: 0,
    suggestions: 0,
  });

  const [selectedSeverity, setSelectedSeverity] = useState<'all' | 'critical' | 'optimization' | 'suggestion'>('all');
  const [ignoredFindings, setIgnoredFindings] = useState<Set<string>>(new Set());
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [cachedGalleries, setCachedGalleries] = useState<GalleryIndexEntry[]>([]);

  // AI Model & Activity Tracking
  const { getModel } = useModelPreferences();
  const { addJob, completeJob, failJob } = useAIActivityStore();
  const selectedModel = getModel('sanity-checker');

  useEffect(() => {
    checkAuth();
  }, [router]);

  const checkAuth = async () => {
    try {
      const authCheck = await fetch('/api/smugmug/user', {
        credentials: 'include'
      });

      if (!authCheck.ok) {
        console.error('Sanity Checker: Not authenticated');
        router.push('/');
        return;
      }

      setIsAuthenticated(true);
    } catch (_error) {
      console.error('Sanity Checker: Auth check failed:', _error);
      router.push('/');
    }
  };

  // Load cached gallery data from unified cache
  const loadCachedIndexData = (): GalleryIndexEntry[] => {
    try {
      // Load from unified cache service
      const cachedGalleries = galleryCache.getAllGalleries();

      // Map CachedGallery to GalleryIndexEntry format
      const indexData: GalleryIndexEntry[] = cachedGalleries.map(gallery => ({
        albumKey: gallery.albumKey,
        albumName: gallery.albumName,
        imageCount: gallery.imageCount,
        images: gallery.images,
        indexedAt: gallery.lastRefreshed,
      }));

      return indexData;
    } catch (_error) {
      console.error('Error loading cached gallery data:', _error);
      return [];
    }
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTerminalLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  // Start comprehensive scan
  const startScan = async () => {
    setScanning(true);
    setScanProgress(0);
    setCurrentTask('Loading cached gallery data...');
    setFindings([]);
    setTerminalLogs([]);

    try {
      addLog('🔍 Starting Sanity Checker scan...');
      // Load cached data
      const loadedGalleries = loadCachedIndexData();

      if (loadedGalleries.length === 0) {
        addLog('❌ No cached gallery data found');
        alert('No gallery data available. Please index galleries using the Photo Organizer tool to populate the cache.');
        setScanning(false);
        return;
      }

      // Store galleries in state for creating links later
      setCachedGalleries(loadedGalleries);

      const totalImages = loadedGalleries.reduce((sum, g) => sum + g.imageCount, 0);
      addLog(`✓ Loaded ${loadedGalleries.length} galleries with ${totalImages} total images`);

      setStats(prev => ({
        ...prev,
        totalGalleries: loadedGalleries.length,
        totalImages: totalImages,
      }));

      // Collect all data for analysis
      setCurrentTask('Analyzing gallery structure...');
      setScanProgress(20);
      addLog('📊 Preparing data for AI analysis...');

      const analysisData = {
        galleries: loadedGalleries.map(g => ({
          albumKey: g.albumKey,
          albumName: g.albumName,
          imageCount: g.imageCount,
          images: g.images,
        })),
      };

      // Send to AI for analysis
      setCurrentTask('Running AI analysis...');
      setScanProgress(50);
      addLog('🤖 Sending data to Claude AI for deep analysis...');

      const tokens = tokenStorage.getTokens();
      if (!tokens) {
        throw new Error('Not authenticated');
      }

      // Create unique job ID and register AI activity
      const jobId = `sanity-check-${Date.now()}`;
      const modelInfo = AVAILABLE_MODELS[selectedModel];

      addJob({
        id: jobId,
        tool: 'Sanity Checker',
        toolPath: '/sanity-checker',
        status: 'processing',
        startTime: new Date(),
        message: `Analyzing ${loadedGalleries.length} galleries`,
        model: selectedModel,
        modelName: modelInfo.name,
      });

      try {
        const response = await fetch('/api/ai/analyze-sanity', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Access-Token': tokens.accessToken,
            'X-Access-Token-Secret': tokens.accessTokenSecret,
          },
          body: JSON.stringify({
            ...analysisData,
            model: selectedModel, // Pass selected model
          }),
        });

        if (!response.ok) {
          addLog('❌ AI analysis request failed');
          failJob(jobId, 'AI analysis request failed');
          throw new Error('Analysis failed');
        }

        const result = await response.json();
        addLog('✓ AI analysis completed successfully');

        // Complete the job with token usage
        const inputTokens = result.usage?.input_tokens || 0;
        const outputTokens = result.usage?.output_tokens || 0;
        const totalTokens = inputTokens + outputTokens;
        completeJob(jobId, totalTokens, inputTokens, outputTokens);

        setCurrentTask('Processing findings...');
        setScanProgress(90);
        addLog('📋 Processing and categorizing findings...');

        // Process findings
        const processedFindings: Finding[] = result.findings || [];
        setFindings(processedFindings);

        // Update stats
        const criticalCount = processedFindings.filter(f => f.severity === 'critical').length;
        const optimizationCount = processedFindings.filter(f => f.severity === 'optimization').length;
        const suggestionCount = processedFindings.filter(f => f.severity === 'suggestion').length;

        setStats({
          totalGalleries: loadedGalleries.length,
          totalImages: totalImages,
          galleriesScanned: loadedGalleries.length,
          imagesScanned: totalImages,
          criticalIssues: criticalCount,
          optimizations: optimizationCount,
          suggestions: suggestionCount,
        });

        addLog(`✓ Found ${criticalCount} critical issues, ${optimizationCount} optimizations, ${suggestionCount} suggestions`);

        setScanProgress(100);
        setCurrentTask('Analysis complete!');
        addLog('✅ Scan complete!');
      } catch (aiError) {
        console.error('AI analysis error:', aiError);
        failJob(jobId, aiError instanceof Error ? aiError.message : 'Unknown error');
        throw aiError;
      }

    } catch (error: any) {
      console.error('Scan error:', error);
      alert(`Scan failed: ${error.message}`);
    } finally {
      setTimeout(() => setScanning(false), 500);
    }
  };

  // Execute a finding's auto-fix action
  const executeAction = async (finding: Finding) => {
    if (!finding.autoFixAvailable || !finding.action) {
      return;
    }

    try {
      const tokens = tokenStorage.getTokens();
      if (!tokens) {
        throw new Error('Not authenticated');
      }

      // TODO: Implement action execution based on finding.action.type
      console.log('Executing action:', finding.action);

      // Remove from findings after execution
      setFindings(prev => prev.filter(f => f.id !== finding.id));

    } catch (error: any) {
      console.error('Action execution failed:', error);
      alert(`Failed to execute action: ${error.message}`);
    }
  };

  // Ignore a finding
  const ignoreFinding = (findingId: string) => {
    setIgnoredFindings(prev => new Set([...prev, findingId]));
  };

  // Filter findings
  const filteredFindings = findings.filter(f => {
    if (ignoredFindings.has(f.id)) return false;
    if (selectedSeverity === 'all') return true;
    return f.severity === selectedSeverity;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'optimization':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'suggestion':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-5 h-5" />;
      case 'optimization':
        return <AlertTriangle className="w-5 h-5" />;
      case 'suggestion':
        return <Info className="w-5 h-5" />;
      default:
        return <CheckCircle className="w-5 h-5" />;
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <ToolboxHeader currentTool="sanity-checker" />
      <main className="min-h-screen bg-gray-50 p-3 sm:p-8">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="mb-4 sm:mb-8">
            <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-4">
              <div className="bg-gradient-to-br from-orange-500 to-red-600 w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl flex items-center justify-center">
                <ClipboardCheck className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-4xl font-bold text-gray-900">Sanity Checker</h1>
                <p className="text-sm sm:text-base text-gray-600">Comprehensive account analysis and optimization</p>
              </div>
            </div>
          </div>

          {/* Stats Overview */}
          {stats.totalGalleries > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-4 sm:mb-8">
              <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-6 border-2 border-gray-200">
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <FolderTree className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
                  <span className="text-xl sm:text-2xl font-bold text-gray-900">{stats.galleriesScanned}</span>
                </div>
                <div className="text-xs sm:text-sm text-gray-600">Galleries Scanned</div>
              </div>

              <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-6 border-2 border-gray-200">
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <ImageIcon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                  <span className="text-xl sm:text-2xl font-bold text-gray-900">{stats.imagesScanned.toLocaleString()}</span>
                </div>
                <div className="text-xs sm:text-sm text-gray-600">Images Analyzed</div>
              </div>

              <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-6 border-2 border-red-300 bg-red-50">
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <XCircle className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" />
                  <span className="text-xl sm:text-2xl font-bold text-red-700">{stats.criticalIssues}</span>
                </div>
                <div className="text-xs sm:text-sm text-red-600 font-medium">Critical Issues</div>
              </div>

              <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-6 border-2 border-yellow-300 bg-yellow-50">
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600" />
                  <span className="text-xl sm:text-2xl font-bold text-yellow-700">{stats.optimizations + stats.suggestions}</span>
                </div>
                <div className="text-xs sm:text-sm text-yellow-600 font-medium">Opportunities</div>
              </div>
            </div>
          )}

          {/* Scan Button */}
          {!scanning && findings.length === 0 && (
            <div className="bg-white rounded-lg sm:rounded-2xl p-6 sm:p-12 text-center border-2 border-gray-200">
              <ClipboardCheck className="w-16 h-16 sm:w-20 sm:h-20 text-orange-500 mx-auto mb-3 sm:mb-6" />
              <h2 className="text-xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-4">Ready to Analyze Your SmugMug Account</h2>
              <p className="text-sm sm:text-base text-gray-600 mb-4 max-w-2xl mx-auto leading-snug sm:leading-relaxed">
                This tool will analyze your galleries, images, metadata, and settings to find optimization opportunities and potential issues.
                It uses cached data from the Photo Organizer to speed up the analysis.
              </p>

              {/* Cache Status */}
              <div className="mb-4 sm:mb-8 flex justify-center">
                <CacheFreshnessIndicator showAll={true} compact={false} />
              </div>

              <button
                onClick={startScan}
                className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 active:scale-[0.98] text-white font-bold py-3 sm:py-4 px-6 sm:px-8 rounded-lg text-base sm:text-lg transition-all shadow-lg hover:shadow-xl flex items-center gap-2 sm:gap-3 mx-auto"
              >
                <Play className="w-5 h-5 sm:w-6 sm:h-6" />
                Start Full Scan
              </button>
            </div>
          )}

          {/* Scanning Progress */}
          {scanning && (
            <div className="bg-white rounded-lg sm:rounded-2xl p-6 sm:p-12 border-2 border-orange-300">
              <div className="flex items-center justify-center mb-3 sm:mb-6">
                <Loader className="w-10 h-10 sm:w-12 sm:h-12 text-orange-600 animate-spin" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-2 sm:mb-4">Scanning Your Account...</h2>
              <div className="max-w-xl mx-auto">
                <div className="bg-gray-200 rounded-full h-3 sm:h-4 mb-2 sm:mb-4 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-red-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
                <p className="text-center text-sm sm:text-base text-gray-600">{currentTask}</p>
              </div>

              {/* Terminal Log */}
              {terminalLogs.length > 0 && (
                <div className="mt-4 sm:mt-8">
                  <div className="bg-gray-900 rounded-lg sm:rounded-xl p-3 sm:p-4 font-mono text-xs text-green-400 max-h-[300px] sm:max-h-[400px] overflow-y-auto">
                    <div className="flex items-center gap-2 mb-2 sm:mb-3 pb-2 border-b border-gray-700">
                      <div className="flex gap-1 sm:gap-1.5">
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500"></div>
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500"></div>
                      </div>
                      <span className="text-gray-400 text-xs">sanity-checker.log</span>
                    </div>
                    {terminalLogs.map((log, idx) => (
                      <div key={idx} className="whitespace-pre-wrap leading-snug sm:leading-relaxed">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Findings */}
          {!scanning && findings.length > 0 && (
            <>
              {/* Filter Tabs */}
              <div className="flex gap-2 sm:gap-4 mb-4 sm:mb-6 overflow-x-auto pb-2">
                <button
                  onClick={() => setSelectedSeverity('all')}
                  className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors whitespace-nowrap active:scale-[0.98] ${
                    selectedSeverity === 'all'
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  All ({findings.length})
                </button>
                <button
                  onClick={() => setSelectedSeverity('critical')}
                  className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors whitespace-nowrap active:scale-[0.98] ${
                    selectedSeverity === 'critical'
                      ? 'bg-red-600 text-white'
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-red-400'
                  }`}
                >
                  Critical ({stats.criticalIssues})
                </button>
                <button
                  onClick={() => setSelectedSeverity('optimization')}
                  className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors whitespace-nowrap active:scale-[0.98] ${
                    selectedSeverity === 'optimization'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-yellow-400'
                  }`}
                >
                  Optimizations ({stats.optimizations})
                </button>
                <button
                  onClick={() => setSelectedSeverity('suggestion')}
                  className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors whitespace-nowrap active:scale-[0.98] ${
                    selectedSeverity === 'suggestion'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-400'
                  }`}
                >
                  Suggestions ({stats.suggestions})
                </button>
              </div>

              {/* Findings List */}
              <div className="space-y-3 sm:space-y-4">
                {filteredFindings.map((finding) => (
                  <div
                    key={finding.id}
                    className={`bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 border-2 ${getSeverityColor(finding.severity)}`}
                  >
                    <div className="flex items-start justify-between mb-2 sm:mb-4">
                      <div className="flex items-start gap-2 sm:gap-4 flex-1">
                        <div className="mt-0.5 sm:mt-1">
                          {getSeverityIcon(finding.severity)}
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900">{finding.title}</h3>
                            <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-semibold ${getSeverityColor(finding.severity)}`}>
                              {finding.category}
                            </span>
                          </div>
                          <p className="text-sm sm:text-base text-gray-700 mb-2 sm:mb-3 leading-snug sm:leading-relaxed">{finding.description}</p>
                          <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-2 sm:mb-3">
                            <div className="font-semibold text-xs sm:text-sm text-gray-700 mb-1 sm:mb-2">💡 Suggestion:</div>
                            <p className="text-xs sm:text-sm text-gray-600 leading-snug sm:leading-relaxed">{finding.suggestion}</p>
                          </div>
                          {finding.affectedItems.length > 0 && (
                            <div className="text-xs sm:text-sm text-gray-600">
                              <span className="font-medium">Affected:</span>{' '}
                              {finding.affectedItems.slice(0, 3).map((item, idx) => {
                                // Try to find matching gallery to create link
                                const matchingGallery = cachedGalleries.find(g =>
                                  g?.albumName && item && (
                                    g.albumName === item ||
                                    g.albumName.includes(item) ||
                                    item.includes(g.albumName)
                                  )
                                );

                                // Convert album name to URL-friendly slug
                                const albumSlug = matchingGallery?.albumName
                                  .toLowerCase()
                                  .replace(/\s+/g, '-')
                                  .replace(/[^a-z0-9-]/g, '');

                                return (
                                  <span key={idx}>
                                    {matchingGallery ? (
                                      <Link
                                        href={`/albums/${matchingGallery.albumKey}`}
                                        className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                      >
                                        /{albumSlug}
                                      </Link>
                                    ) : (
                                      <span>{item}</span>
                                    )}
                                    {idx < Math.min(2, finding.affectedItems.length - 1) && ', '}
                                  </span>
                                );
                              })}
                              {finding.affectedItems.length > 3 && ` +${finding.affectedItems.length - 3} more`}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 sm:gap-3 mt-2 sm:mt-4 pt-2 sm:pt-4 border-t border-gray-200">
                      {finding.autoFixAvailable && (
                        <button
                          onClick={() => executeAction(finding)}
                          className="flex items-center gap-1.5 sm:gap-2 bg-green-600 hover:bg-green-700 active:scale-[0.98] text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-all text-sm sm:text-base"
                        >
                          <Zap className="w-4 h-4" />
                          Auto-Fix
                        </button>
                      )}
                      <button
                        onClick={() => ignoreFinding(finding.id)}
                        className="flex items-center gap-1.5 sm:gap-2 bg-gray-200 hover:bg-gray-300 active:scale-[0.98] text-gray-700 px-3 sm:px-4 py-2 rounded-lg font-medium transition-all text-sm sm:text-base"
                      >
                        <ThumbsDown className="w-4 h-4" />
                        Ignore
                      </button>
                    </div>
                  </div>
                ))}

                {filteredFindings.length === 0 && (
                  <div className="bg-white rounded-lg sm:rounded-xl p-6 sm:p-12 text-center border-2 border-gray-200">
                    <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-green-500 mx-auto mb-2 sm:mb-4" />
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">No Issues Found</h3>
                    <p className="text-sm sm:text-base text-gray-600">Everything looks good in this category!</p>
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </main>

      {/* System Prompt Viewer */}
      <SystemPromptViewer toolName="Sanity Checker" apiEndpoint="/api/ai/analyze-sanity" toolId="sanity-checker" />
    </>
  );
}
