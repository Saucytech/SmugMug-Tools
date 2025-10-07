'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { tokenStorage } from '@/lib/smugmug-client';
import ToolboxHeader from '@/components/ToolboxHeader';
import {
  ClipboardCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader,
  Play,
  ThumbsUp,
  ThumbsDown,
  Zap,
  Settings,
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

  useEffect(() => {
    if (tokenStorage.hasTokens()) {
      setIsAuthenticated(true);
    } else {
      router.push('/');
    }
  }, [router]);

  // Load cached index data from Photo Organizer
  const loadCachedIndexData = (): GalleryIndexEntry[] => {
    try {
      const cached = localStorage.getItem('photo-organizer-index');
      if (!cached) return [];

      // Photo Organizer stores data as an array directly, not wrapped in an object
      const indexData = JSON.parse(cached);

      // Check if it's already an array
      if (Array.isArray(indexData)) {
        return indexData;
      }

      // Fallback if data structure changes
      return indexData.galleries || [];
    } catch (error) {
      console.error('Error loading cached index:', error);
      return [];
    }
  };

  // Start comprehensive scan
  const startScan = async () => {
    setScanning(true);
    setScanProgress(0);
    setCurrentTask('Loading cached gallery data...');
    setFindings([]);

    try {
      // Load cached data
      const cachedGalleries = loadCachedIndexData();

      if (cachedGalleries.length === 0) {
        alert('No cached gallery data found. Please index galleries in the Photo Organizer tool first.');
        setScanning(false);
        return;
      }

      const totalImages = cachedGalleries.reduce((sum, g) => sum + g.imageCount, 0);
      setStats(prev => ({
        ...prev,
        totalGalleries: cachedGalleries.length,
        totalImages: totalImages,
      }));

      // Collect all data for analysis
      setCurrentTask('Analyzing gallery structure...');
      setScanProgress(20);

      const analysisData = {
        galleries: cachedGalleries.map(g => ({
          albumKey: g.albumKey,
          albumName: g.albumName,
          imageCount: g.imageCount,
          images: g.images,
        })),
      };

      // Send to AI for analysis
      setCurrentTask('Running AI analysis...');
      setScanProgress(50);

      const tokens = tokenStorage.getTokens();
      if (!tokens) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/ai/analyze-sanity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Access-Token': tokens.accessToken,
          'X-Access-Token-Secret': tokens.accessTokenSecret,
        },
        body: JSON.stringify(analysisData),
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const result = await response.json();

      setCurrentTask('Processing findings...');
      setScanProgress(90);

      // Process findings
      const processedFindings: Finding[] = result.findings || [];
      setFindings(processedFindings);

      // Update stats
      setStats({
        totalGalleries: cachedGalleries.length,
        totalImages: totalImages,
        galleriesScanned: cachedGalleries.length,
        imagesScanned: totalImages,
        criticalIssues: processedFindings.filter(f => f.severity === 'critical').length,
        optimizations: processedFindings.filter(f => f.severity === 'optimization').length,
        suggestions: processedFindings.filter(f => f.severity === 'suggestion').length,
      });

      setScanProgress(100);
      setCurrentTask('Analysis complete!');

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
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-gradient-to-br from-orange-500 to-red-600 w-16 h-16 rounded-xl flex items-center justify-center">
                <ClipboardCheck className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Sanity Checker</h1>
                <p className="text-gray-600">Comprehensive account analysis and optimization</p>
              </div>
            </div>
          </div>

          {/* Stats Overview */}
          {stats.totalGalleries > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl p-6 border-2 border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <FolderTree className="w-8 h-8 text-purple-600" />
                  <span className="text-2xl font-bold text-gray-900">{stats.galleriesScanned}</span>
                </div>
                <div className="text-sm text-gray-600">Galleries Scanned</div>
              </div>

              <div className="bg-white rounded-xl p-6 border-2 border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <ImageIcon className="w-8 h-8 text-blue-600" />
                  <span className="text-2xl font-bold text-gray-900">{stats.imagesScanned.toLocaleString()}</span>
                </div>
                <div className="text-sm text-gray-600">Images Analyzed</div>
              </div>

              <div className="bg-white rounded-xl p-6 border-2 border-red-300 bg-red-50">
                <div className="flex items-center justify-between mb-2">
                  <XCircle className="w-8 h-8 text-red-600" />
                  <span className="text-2xl font-bold text-red-700">{stats.criticalIssues}</span>
                </div>
                <div className="text-sm text-red-600 font-medium">Critical Issues</div>
              </div>

              <div className="bg-white rounded-xl p-6 border-2 border-yellow-300 bg-yellow-50">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-8 h-8 text-yellow-600" />
                  <span className="text-2xl font-bold text-yellow-700">{stats.optimizations + stats.suggestions}</span>
                </div>
                <div className="text-sm text-yellow-600 font-medium">Opportunities</div>
              </div>
            </div>
          )}

          {/* Scan Button */}
          {!scanning && findings.length === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center border-2 border-gray-200">
              <ClipboardCheck className="w-20 h-20 text-orange-500 mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Analyze Your SmugMug Account</h2>
              <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                This tool will analyze your galleries, images, metadata, and settings to find optimization opportunities and potential issues.
                It uses cached data from the Photo Organizer to speed up the analysis.
              </p>
              <button
                onClick={startScan}
                className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-all shadow-lg hover:shadow-xl flex items-center gap-3 mx-auto"
              >
                <Play className="w-6 h-6" />
                Start Full Scan
              </button>
            </div>
          )}

          {/* Scanning Progress */}
          {scanning && (
            <div className="bg-white rounded-2xl p-12 border-2 border-orange-300">
              <div className="flex items-center justify-center mb-6">
                <Loader className="w-12 h-12 text-orange-600 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">Scanning Your Account...</h2>
              <div className="max-w-xl mx-auto">
                <div className="bg-gray-200 rounded-full h-4 mb-4 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-red-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
                <p className="text-center text-gray-600">{currentTask}</p>
              </div>
            </div>
          )}

          {/* Findings */}
          {!scanning && findings.length > 0 && (
            <>
              {/* Filter Tabs */}
              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => setSelectedSeverity('all')}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    selectedSeverity === 'all'
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  All ({findings.length})
                </button>
                <button
                  onClick={() => setSelectedSeverity('critical')}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    selectedSeverity === 'critical'
                      ? 'bg-red-600 text-white'
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-red-400'
                  }`}
                >
                  Critical ({stats.criticalIssues})
                </button>
                <button
                  onClick={() => setSelectedSeverity('optimization')}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    selectedSeverity === 'optimization'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-yellow-400'
                  }`}
                >
                  Optimizations ({stats.optimizations})
                </button>
                <button
                  onClick={() => setSelectedSeverity('suggestion')}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    selectedSeverity === 'suggestion'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-400'
                  }`}
                >
                  Suggestions ({stats.suggestions})
                </button>
              </div>

              {/* Findings List */}
              <div className="space-y-4">
                {filteredFindings.map((finding) => (
                  <div
                    key={finding.id}
                    className={`bg-white rounded-xl p-6 border-2 ${getSeverityColor(finding.severity)}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="mt-1">
                          {getSeverityIcon(finding.severity)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-gray-900">{finding.title}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getSeverityColor(finding.severity)}`}>
                              {finding.category}
                            </span>
                          </div>
                          <p className="text-gray-700 mb-3">{finding.description}</p>
                          <div className="bg-gray-50 rounded-lg p-4 mb-3">
                            <div className="font-semibold text-sm text-gray-700 mb-2">💡 Suggestion:</div>
                            <p className="text-sm text-gray-600">{finding.suggestion}</p>
                          </div>
                          {finding.affectedItems.length > 0 && (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Affected:</span> {finding.affectedItems.slice(0, 3).join(', ')}
                              {finding.affectedItems.length > 3 && ` +${finding.affectedItems.length - 3} more`}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
                      {finding.autoFixAvailable && (
                        <button
                          onClick={() => executeAction(finding)}
                          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                          <Zap className="w-4 h-4" />
                          Auto-Fix
                        </button>
                      )}
                      <button
                        onClick={() => ignoreFinding(finding.id)}
                        className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
                      >
                        <ThumbsDown className="w-4 h-4" />
                        Ignore
                      </button>
                    </div>
                  </div>
                ))}

                {filteredFindings.length === 0 && (
                  <div className="bg-white rounded-xl p-12 text-center border-2 border-gray-200">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">No Issues Found</h3>
                    <p className="text-gray-600">Everything looks good in this category!</p>
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </main>
    </>
  );
}
