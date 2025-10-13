"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FolderTree,
  Upload,
  Sparkles,
  Settings,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader,
  Brain,
  Archive,
  RefreshCw,
  EyeOff,
  ChevronRight,
  ChevronDown,
  Folder,
  Image as ImageIcon,
  X,
  Cloud,
  FileImage,
  Info,
  Zap,
  Filter,
  Star,
  Trash2,
  Download,
  BarChart3,
  Check,
  Camera,
  AlertCircle,
} from "lucide-react";
import ToolboxHeader from "@/components/ToolboxHeader";
import SystemPromptViewer from "@/components/SystemPromptViewer";
import { analysisStorage, AnalysisSession, AnalyzedPhoto } from "@/lib/analysis-storage";
import { useModelPreferences, AVAILABLE_MODELS } from '@/stores/modelPreferencesStore';
import { useAIActivityStore } from '@/stores/aiActivityStore';
import { galleryCache, type CachedGallery } from '@/lib/galleryCache';
import CacheFreshnessIndicator from '@/components/CacheFreshnessIndicator';
import { CacheSyncButton } from '@/components/CacheSyncButton';

interface GalleryIndex {
  albumKey: string;
  name: string;
  nodeId: string;
  themes: string[];
  dateRange: string;
  location?: string;
  imageCount: number;
  lastIndexed: string;
  sampleImages: string[];
  summary?: string;
  photoStyle?: string;
  subjects?: string[];
  tokensUsed?: number;
}

interface OrganizeTask {
  imageUrl: string;
  imageName: string;
  imageUri: string;
  sourceGallery: string;
  suggestedGallery: string;
  confidence: number;
  reasoning: string;
  status:
    | "auto-approved"
    | "needs-review"
    | "skipped"
    | "approved"
    | "rejected";
  manualGallery?: string; // User's manual override
  isSelected?: boolean; // For bulk operations
}

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  base64: string;
  status: "pending" | "analyzing" | "complete" | "error";
  suggestedGallery?: string;
  confidence?: number;
  reasoning?: string;
  visualAnalysis?: string;
}

interface UploadSortTask {
  fileId: string;
  fileName: string;
  preview: string;
  suggestedGallery: string;
  confidence: number;
  reasoning: string;
  visualAnalysis: string;
  status: "auto-approved" | "needs-review" | "skipped" | "rejected";
  manualGallery?: string; // User's manual override
  isSelected?: boolean; // For bulk operations
}

// Intelligent Culling interfaces
interface CullingPhoto {
  imageKey: string;
  imageUrl: string;
  imageName: string;
  thumbnailUrl: string;
  albumKey?: string;
  albumName?: string;
  qualityScore: number;
  cullingStatus: "keep" | "reject" | "pick" | "unprocessed";
  technicalIssues: {
    blur: boolean;
    exposure: "underexposed" | "overexposed" | "good";
    noise: boolean;
    focus: "sharp" | "soft" | "blurry";
  };
  compositionIssues: {
    horizon: "straight" | "tilted";
    framing: "good" | "tight" | "loose" | "cropped";
    ruleOfThirds: boolean;
  };
  subjectIssues: {
    eyesClosed: boolean;
    awkwardExpression: boolean;
    partiallyVisible: boolean;
    backTurned: boolean;
  };
  overallAssessment: string;
  keepRecommendation: "keep" | "reject" | "review";
  isPortfolioWorthy: boolean;
  keyMoment: string | null;
  similarityHash?: string;
  isBestInGroup?: boolean;
  groupSize?: number;
  groupRank?: number;
  confidence: number;
}

interface CullingStatistics {
  total: number;
  keeps: number;
  rejects: number;
  picks: number;
  keepRatio: number;
  portfolioWorthy: number;
  keyMoments: number;
  technicalIssuesCount: number;
  avgQualityScore: string;
  estimatedTimeSavedMinutes: number;
  qualityDistribution: {
    excellent: number;
    good: number;
    average: number;
    poor: number;
  };
}

export default function PhotoOrganizer() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "build-index" | "sort-existing" | "upload-sort" | "intelligent-culling"
  >("build-index");
  const [galleries, setGalleries] = useState<any[]>([]);
  const [galleryIndex, setGalleryIndex] = useState<GalleryIndex[]>([]);
  const [selectedGalleries, setSelectedGalleries] = useState<string[]>([]);
  const [isIndexing, setIsIndexing] = useState(false);
  const [isSorting, setIsSorting] = useState(false);
  const [organizeTasks, setOrganizeTasks] = useState<OrganizeTask[]>([]);
  const [showDryRun, setShowDryRun] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(90);
  const [manualReview, setManualReview] = useState(false);
  const [indexingProgress, setIndexingProgress] = useState<{
    current: number;
    total: number;
    galleryName: string;
  } | null>(null);
  const [viewingIndex, setViewingIndex] = useState<string | null>(null);
  const [_sourceGallery, _setSourceGallery] = useState<string>("");
  const [sortingProgress, setSortingProgress] = useState<{
    current: number;
    total: number;
    imageName: string;
  } | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [copyMode, setCopyMode] = useState<boolean>(true); // true = copy/collect, false = move
  const [_isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState<{
    current: number;
    total: number;
    taskName: string;
  } | null>(null);
  const [hideEmptyGalleries, setHideEmptyGalleries] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Multi-select state for Sort Existing Photos
  const [folders, setFolders] = useState<any[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(
    new Set(),
  );
  const [selectedSourceGalleries, setSelectedSourceGalleries] = useState<
    Set<string>
  >(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );
  const [loadedPhotos, setLoadedPhotos] = useState<any[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [showPhotoSelector, setShowPhotoSelector] = useState(false);

  // Analysis session state
  const [currentAnalysisSession, setCurrentAnalysisSession] = useState<string | null>(null);
  const [currentSessionData, setCurrentSessionData] = useState<AnalysisSession | null>(null);
  const [currentSessionStats, setCurrentSessionStats] = useState<{
    total: number;
    pending: number;
    moved: number;
    copied: number;
    ignored: number;
    percentComplete: number;
  } | null>(null);
  const [allAnalysisSessions, setAllAnalysisSessions] = useState<AnalysisSession[]>([]);
  const [selectedPhotoKeys, setSelectedPhotoKeys] = useState<Set<string>>(new Set());
  const [refreshCounter, setRefreshCounter] = useState(0); // Force re-render when photo actions taken

  // Upload & Sort state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isAnalyzingUploads, setIsAnalyzingUploads] = useState(false);
  const [uploadSortTasks, setUploadSortTasks] = useState<UploadSortTask[]>([]);
  const [showUploadDryRun, setShowUploadDryRun] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
    fileName: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Intelligent Culling state
  const [selectedCullingAlbums, setSelectedCullingAlbums] = useState<
    Set<string>
  >(new Set());
  const [cullingPhotos, setCullingPhotos] = useState<CullingPhoto[]>([]);
  const [cullingStatistics, setCullingStatistics] =
    useState<CullingStatistics | null>(null);
  const [isAnalyzingPhotos, setIsAnalyzingPhotos] = useState(false);
  const [cullingProgress, setCullingProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [showSimilarGroups, setShowSimilarGroups] = useState(false);
  const [autoRejectThreshold, setAutoRejectThreshold] = useState(4);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"grid" | "single">("grid");
  const [filterMode, setFilterMode] = useState<
    "all" | "keeps" | "rejects" | "picks" | "review"
  >("all");
  const [showKeyMomentsOnly, setShowKeyMomentsOnly] = useState(false);
  const [showPortfolioOnly, setShowPortfolioOnly] = useState(false);

  // AI Model & Activity Tracking
  const { getModel } = useModelPreferences();
  const { addJob, completeJob, failJob } = useAIActivityStore();
  const indexModel = getModel('photo-organizer-index');
  const uploadModel = getModel('photo-organizer-upload');
  const cullingModel = getModel('photo-organizer-culling');

  useEffect(() => {
    checkAuthAndInitialize();
  }, [router]); // Add router as dependency since we use it

  // Load all analysis sessions
  useEffect(() => {
    const loadAllSessions = async () => {
      const sessions = await analysisStorage.getAllSessions();
      setAllAnalysisSessions(sessions);
    };

    loadAllSessions();
  }, [refreshCounter]); // Reload when refresh is triggered

  // Load analysis session data when currentAnalysisSession changes
  useEffect(() => {
    const loadSessionData = async () => {
      if (!currentAnalysisSession) {
        setCurrentSessionData(null);
        setCurrentSessionStats(null);
        return;
      }

      const session = await analysisStorage.getSession(currentAnalysisSession);
      if (!session) {
        setCurrentAnalysisSession(null);
        setCurrentSessionData(null);
        setCurrentSessionStats(null);
        return;
      }

      const stats = await analysisStorage.getSessionStats(currentAnalysisSession);
      setCurrentSessionData(session);
      setCurrentSessionStats(stats);
    };

    loadSessionData();
  }, [currentAnalysisSession, refreshCounter]); // Reload when session changes or refresh is triggered

  const checkAuthAndInitialize = async () => {
    try {
      const authCheck = await fetch("/api/smugmug/user", {
        credentials: "include",
      });

      if (!authCheck.ok) {
        console.error("Photo Organizer: Not authenticated");
        router.push("/");
        return;
      }

      loadGalleries();
      loadGalleryIndex();
      loadFolders();

      // Auto-refresh galleries every 3 minutes to check for updates
      const refreshInterval = setInterval(
        () => {
          loadGalleries();
        },
        3 * 60 * 1000,
      ); // 3 minutes

      return () => clearInterval(refreshInterval);
    } catch (_error) {
      console.error("Photo Organizer: Auth check failed:", _error);
      router.push("/");
    }
  };

  const loadGalleries = async () => {
    try {
      const response = await fetch("/api/smugmug/albums", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        const fetchedGalleries = data.albums || [];
        setGalleries(fetchedGalleries);

        // Clean up cached galleries - remove any that no longer exist on SmugMug
        try {
          const cachedGalleries = galleryCache.getAllGalleries();
          const validAlbumKeys = new Set(
            fetchedGalleries.map((g: any) => g.AlbumKey),
          );

          let removedCount = 0;
          cachedGalleries.forEach(cached => {
            if (!validAlbumKeys.has(cached.albumKey)) {
              galleryCache.removeGallery(cached.albumKey);
              removedCount++;
            }
          });

          if (removedCount > 0) {
            console.log(
              `🧹 Cleaned up ${removedCount} deleted galleries from cache`,
            );
            // Reload the gallery index to reflect changes
            loadGalleryIndex();
          }
        } catch (_error) {
          console.error("Error cleaning gallery cache:", _error);
        }
      }
    } catch (_error) {
      console.error("Error loading galleries:", _error);
    }
  };

  const loadGalleryIndex = () => {
    try {
      // Load from unified cache
      const cachedGalleries = galleryCache.getAllGalleries();

      // Map CachedGallery to GalleryIndex format
      const index: GalleryIndex[] = cachedGalleries
        .filter(g => g.metadata?.themes) // Only galleries with AI analysis
        .map(g => ({
          albumKey: g.albumKey,
          name: g.albumName,
          nodeId: g.metadata?.nodeId || '',
          themes: g.metadata?.themes || [],
          dateRange: g.metadata?.dateRange || '',
          location: g.metadata?.location,
          imageCount: g.imageCount,
          lastIndexed: new Date(g.lastRefreshed).toISOString(),
          sampleImages: g.metadata?.sampleImages || [],
          summary: g.metadata?.summary,
          photoStyle: g.metadata?.photoStyle,
          subjects: g.metadata?.subjects,
          tokensUsed: g.metadata?.tokensUsed,
        }));

      setGalleryIndex(index);
    } catch (_error) {
      console.error("Error loading index:", _error);
    }
  };

  const saveGalleryIndex = (index: GalleryIndex[]) => {
    // Note: Individual galleries are now saved directly to cache during indexing
    // This function just updates the React state for UI
    setGalleryIndex(index);
  };

  const loadFolders = async () => {
    try {
      const response = await fetch("/api/smugmug/folders", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setFolders(data.folders || []);
      }
    } catch (_error) {
      console.error("Error loading folders:", _error);
    }
  };

  // Helper: Get all galleries in a folder (recursively)
  const getGalleriesInFolder = (folderId: string): string[] => {
    const folder = folders.find((f) => f.NodeID === folderId);
    if (!folder) return [];

    const galleriesInFolder = galleries
      .filter(
        (g) =>
          g.NodeID?.startsWith(folder.UrlPath) ||
          g.ParentNode?.NodeID === folderId,
      )
      .map((g) => g.AlbumKey);

    // Also get galleries from child folders
    const childFolders = folders.filter(
      (f) => f.ParentNode?.NodeID === folderId,
    );
    childFolders.forEach((childFolder) => {
      galleriesInFolder.push(...getGalleriesInFolder(childFolder.NodeID));
    });

    return galleriesInFolder;
  };

  // Toggle folder selection
  const toggleFolderSelection = (folderId: string) => {
    const newSelectedFolders = new Set(selectedFolders);
    const newSelectedGalleries = new Set(selectedSourceGalleries);

    if (newSelectedFolders.has(folderId)) {
      // Deselect folder and all its galleries
      newSelectedFolders.delete(folderId);
      const galleriesInFolder = getGalleriesInFolder(folderId);
      galleriesInFolder.forEach((g) => newSelectedGalleries.delete(g));
    } else {
      // Select folder and all its galleries
      newSelectedFolders.add(folderId);
      const galleriesInFolder = getGalleriesInFolder(folderId);
      galleriesInFolder.forEach((g) => newSelectedGalleries.add(g));
    }

    setSelectedFolders(newSelectedFolders);
    setSelectedSourceGalleries(newSelectedGalleries);
  };

  // Toggle folder expand/collapse
  const toggleFolderExpand = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  // Toggle single gallery selection
  const toggleGallerySelection = (galleryKey: string) => {
    const newSelected = new Set(selectedSourceGalleries);
    if (newSelected.has(galleryKey)) {
      newSelected.delete(galleryKey);
    } else {
      newSelected.add(galleryKey);
    }
    setSelectedSourceGalleries(newSelected);
  };

  // Load photos from all selected galleries
  const loadPhotosFromSelection = async () => {
    if (selectedSourceGalleries.size === 0) {
      alert("Please select at least one gallery first");
      return;
    }

    setShowPhotoSelector(true);
    setLoadedPhotos([]);

    const allPhotos: any[] = [];

    for (const galleryKey of Array.from(selectedSourceGalleries)) {
      try {
        const response = await fetch(
          `/api/smugmug/albums/${galleryKey}/images`,
          {
            credentials: "include",
          },
        );

        if (response.ok) {
          const data = await response.json();
          const photos = (data.images || []).map((img: any) => ({
            ...img,
            sourceGalleryKey: galleryKey,
            sourceGalleryName:
              galleries.find((g) => g.AlbumKey === galleryKey)?.Name ||
              "Unknown",
          }));
          allPhotos.push(...photos);
        }
      } catch (_error) {
        console.error(
          `Error loading photos from gallery ${galleryKey}:`,
          _error,
        );
      }
    }

    setLoadedPhotos(allPhotos);
  };

  // Toggle photo selection
  const togglePhotoSelection = (imageKey: string) => {
    const newSelected = new Set(selectedPhotos);
    if (newSelected.has(imageKey)) {
      newSelected.delete(imageKey);
    } else {
      newSelected.add(imageKey);
    }
    setSelectedPhotos(newSelected);
  };

  // Select all photos
  const selectAllPhotos = () => {
    const allPhotoKeys = loadedPhotos.map((p) => p.ImageKey);
    setSelectedPhotos(new Set(allPhotoKeys));
  };

  // Deselect all photos
  const deselectAllPhotos = () => {
    setSelectedPhotos(new Set());
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTerminalLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  // Upload & Sort functions
  const processUploadedFiles = async (files: File[]) => {
    const newUploadedFiles: UploadedFile[] = [];

    for (const file of files) {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const preview = URL.createObjectURL(file);

      // Convert to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      newUploadedFiles.push({
        id,
        file,
        preview,
        base64,
        status: "pending",
      });
    }

    setUploadedFiles((prev) => [...prev, ...newUploadedFiles]);
  };

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/"),
    );

    if (files.length === 0) {
      alert("Please upload image files only");
      return;
    }

    processUploadedFiles(files);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((file) =>
      file.type.startsWith("image/"),
    );

    if (files.length === 0) {
      alert("Please select image files only");
      return;
    }

    processUploadedFiles(files);
  };

  const removeUploadedFile = (fileId: string) => {
    const file = uploadedFiles.find((f) => f.id === fileId);
    if (file) {
      URL.revokeObjectURL(file.preview);
    }
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const analyzeUploadedPhotos = async () => {
    if (uploadedFiles.length === 0) {
      alert("Please upload photos first");
      return;
    }

    if (galleryIndex.length === 0) {
      alert('Please build an index first! Go to "Build Index" tab.');
      return;
    }

    setIsAnalyzingUploads(true);
    setUploadProgress({
      current: 0,
      total: uploadedFiles.length,
      fileName: "",
    });
    setTerminalLogs([]);

    const tasks: UploadSortTask[] = [];

    try {
      addLog("🚀 Starting uploaded photo analysis...");
      addLog(
        `📊 Using AI knowledge base with ${galleryIndex.length} indexed galleries`,
      );
      addLog(`📸 Analyzing ${uploadedFiles.length} uploaded photos`);

      for (let i = 0; i < uploadedFiles.length; i++) {
        const uploadedFile = uploadedFiles[i];

        setUploadProgress({
          current: i + 1,
          total: uploadedFiles.length,
          fileName: uploadedFile.file.name,
        });

        // Update status to analyzing
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id ? { ...f, status: "analyzing" } : f,
          ),
        );

        addLog(
          `\n🔍 Analyzing ${i + 1}/${uploadedFiles.length}: "${uploadedFile.file.name}"`,
        );
        addLog(
          `   📊 File size: ${(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB`,
        );
        addLog(`   🤖 Sending to Claude AI Vision for analysis...`);

        // Create unique job ID and register AI activity
        const jobId = `upload-${uploadedFile.id}-${Date.now()}`;
        const modelInfo = AVAILABLE_MODELS[uploadModel];

        addJob({
          id: jobId,
          tool: 'Photo Organizer',
          toolPath: '/photo-organizer',
          status: 'processing',
          startTime: new Date(),
          message: `Analyzing "${uploadedFile.file.name}"`,
          model: uploadModel,
          modelName: modelInfo.name,
        });

        try {
          const response = await fetch("/api/ai/analyze-uploaded-photo", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              imageBase64: uploadedFile.base64,
              metadata: {
                filename: uploadedFile.file.name,
                size: uploadedFile.file.size,
                type: uploadedFile.file.type,
                date: uploadedFile.file.lastModified
                  ? new Date(uploadedFile.file.lastModified).toISOString()
                  : null,
              },
              galleryIndex,
              model: uploadModel, // Pass selected model
            }),
          });

          if (response.ok) {
            const analysis = await response.json();

            const inputTokens = analysis.usage?.input_tokens || 0;
            const outputTokens = analysis.usage?.output_tokens || 0;
            const totalTokens = inputTokens + outputTokens;

            addLog(
              `   ✨ AI Vision analysis complete (${totalTokens} tokens used)`,
            );

            // Complete the job with token usage
            completeJob(jobId, totalTokens, inputTokens, outputTokens);
            addLog(
              `   👁️ Visual: ${analysis.visualAnalysis?.substring(0, 100)}...`,
            );
            addLog(`   🎯 Suggested: "${analysis.suggestedGallery}"`);
            addLog(`   📊 Confidence: ${analysis.confidence}%`);
            addLog(`   💡 Reasoning: ${analysis.reasoning}`);

            // Update uploaded file with results
            setUploadedFiles((prev) =>
              prev.map((f) =>
                f.id === uploadedFile.id
                  ? {
                      ...f,
                      status: "complete",
                      suggestedGallery: analysis.suggestedGallery,
                      confidence: analysis.confidence,
                      reasoning: analysis.reasoning,
                      visualAnalysis: analysis.visualAnalysis,
                    }
                  : f,
              ),
            );

            // Determine task status
            let status: UploadSortTask["status"] = "skipped";
            if (analysis.confidence >= confidenceThreshold) {
              status = "auto-approved";
              addLog(
                `   ✅ AUTO-APPROVED (confidence ≥ ${confidenceThreshold}%)`,
              );
            } else if (analysis.confidence >= 70) {
              status = "needs-review";
              addLog(
                `   ⚠️ NEEDS REVIEW (confidence 70-${confidenceThreshold - 1}%)`,
              );
            } else {
              addLog(`   ⏭️ SKIPPED (confidence < 70%)`);
            }

            tasks.push({
              fileId: uploadedFile.id,
              fileName: uploadedFile.file.name,
              preview: uploadedFile.preview,
              suggestedGallery: analysis.suggestedGallery,
              confidence: analysis.confidence,
              reasoning: analysis.reasoning,
              visualAnalysis: analysis.visualAnalysis,
              status,
            });
          } else {
            addLog(`   ❌ AI analysis failed for this photo`);
            failJob(jobId, 'AI analysis failed');
            setUploadedFiles((prev) =>
              prev.map((f) =>
                f.id === uploadedFile.id ? { ...f, status: "error" } : f,
              ),
            );
          }
        } catch (_error) {
          console.error("Error analyzing photo:", _error);
          addLog(`   ❌ Error: ${_error}`);
          failJob(jobId, _error instanceof Error ? _error.message : 'Unknown error');
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.id === uploadedFile.id ? { ...f, status: "error" } : f,
            ),
          );
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      addLog(`\n🎉 Analysis complete!`);
      addLog(`📋 Results summary:`);
      addLog(`   • Total photos analyzed: ${uploadedFiles.length}`);
      addLog(
        `   • Auto-approved: ${tasks.filter((t) => t.status === "auto-approved").length}`,
      );
      addLog(
        `   • Needs review: ${tasks.filter((t) => t.status === "needs-review").length}`,
      );
      addLog(
        `   • Skipped: ${tasks.filter((t) => t.status === "skipped").length}`,
      );

      if (tasks.length === 0) {
        addLog("⚠️ No suggestions generated");
        alert("No suggestions generated. Please try again.");
        return;
      }

      addLog("✅ Opening review modal...");
      setUploadSortTasks(tasks);
      setShowUploadDryRun(true);
    } catch (_error) {
      console.error("Error analyzing uploads:", _error);
      alert("Failed to analyze photos. Check console for details.");
    } finally {
      setIsAnalyzingUploads(false);
      setUploadProgress(null);
    }
  };

  const handleExecuteUploadSort = async () => {
    const tasksToExecute = uploadSortTasks.filter(
      (t) => (t.status === "auto-approved" || t.status === "needs-review") && t.status !== "rejected",
    );

    if (tasksToExecute.length === 0) {
      alert("No tasks to execute");
      return;
    }

    // Build task summary showing manual overrides
    const summary = tasksToExecute.map(t => {
      const finalGallery = t.manualGallery || t.suggestedGallery;
      const isOverridden = t.manualGallery && t.manualGallery !== t.suggestedGallery;
      return `• ${t.fileName} → ${finalGallery}${isOverridden ? ' (manual override)' : ''}`;
    }).join('\n');

    alert(
      `Upload to SmugMug feature coming soon!\n\nThis will upload ${tasksToExecute.length} photos:\n\n${summary}\n\nNote: Manual overrides will be respected!`,
    );

    // For now, just close the modal
    setShowUploadDryRun(false);

    // Clear uploaded files after "execution"
    uploadedFiles.forEach((file) => URL.revokeObjectURL(file.preview));
    setUploadedFiles([]);
    setUploadSortTasks([]);
  };

  const handleBuildIndex = async () => {
    if (selectedGalleries.length === 0) {
      alert("Please select at least one gallery to index");
      return;
    }

    setIsIndexing(true);
    setTerminalLogs([]);
    setIndexingProgress({
      current: 0,
      total: selectedGalleries.length,
      galleryName: "",
    });

    addLog("🚀 Starting gallery indexing process...");
    addLog(`📊 Processing ${selectedGalleries.length} galleries`);

    const newIndexEntries: GalleryIndex[] = [];

    try {
      for (let i = 0; i < selectedGalleries.length; i++) {
        const albumKey = selectedGalleries[i];
        const gallery = galleries.find((g) => g.AlbumKey === albumKey);

        if (!gallery) continue;

        setIndexingProgress({
          current: i + 1,
          total: selectedGalleries.length,
          galleryName: gallery.Name,
        });

        addLog(
          `\n📁 Gallery ${i + 1}/${selectedGalleries.length}: "${gallery.Name}"`,
        );
        addLog("   → Fetching images from SmugMug API...");

        // Fetch images from this album
        const imagesResponse = await fetch(
          `/api/smugmug/albums/${albumKey}/images`,
          {
            credentials: "include",
          },
        );

        if (!imagesResponse.ok) {
          addLog("   ❌ Failed to fetch images");
          console.error(`Failed to fetch images for ${gallery.Name}`);
          continue;
        }

        const imagesData = await imagesResponse.json();
        const images = imagesData.images || [];

        if (images.length === 0) {
          addLog("   ⚠️  No images found, skipping...");
          console.log(`Skipping ${gallery.Name} - no images`);
          continue;
        }

        addLog(`   ✓ Found ${images.length} images`);
        addLog(
          "   → Extracting metadata (titles, captions, keywords, dates)...",
        );

        // Get SmallUrl from each image (400px - perfect for AI analysis)
        const imageUrls = images
          .map((img: any) => img.Uris?.SmallUrl || img.ArchivedUri)
          .filter(Boolean);

        if (imageUrls.length === 0) {
          addLog("   ❌ No valid image URLs found");
          console.log(`Skipping ${gallery.Name} - no image URLs available`);
          continue;
        }

        addLog(
          `   ✓ Metadata extracted from ${Math.min(images.length, 20)} images`,
        );
        addLog("   → Sending to Claude AI for analysis...");

        // Create unique job ID and register AI activity
        const jobId = `index-${albumKey}-${Date.now()}`;
        const modelInfo = AVAILABLE_MODELS[indexModel];

        addJob({
          id: jobId,
          tool: 'Photo Organizer',
          toolPath: '/photo-organizer',
          status: 'processing',
          startTime: new Date(),
          message: `Analyzing "${gallery.Name}"`,
          model: indexModel,
          modelName: modelInfo.name,
        });

        let analysisData;
        try {
          // Call AI analysis endpoint
          const analysisResponse = await fetch("/api/ai/analyze-gallery", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              images: images,
              galleryName: gallery.Name,
              albumKey: albumKey,
              model: indexModel, // Pass selected model
            }),
          });

          if (!analysisResponse.ok) {
            addLog("   ❌ AI analysis failed");
            console.error(`Failed to analyze ${gallery.Name}`);
            failJob(jobId, 'AI analysis failed');
            continue;
          }

          analysisData = await analysisResponse.json();

          const inputTokens = analysisData.usage?.input_tokens || 0;
          const outputTokens = analysisData.usage?.output_tokens || 0;
          const totalTokens = inputTokens + outputTokens;

          addLog(
            `   ✓ AI analysis complete (${totalTokens} tokens used)`,
          );

          // Complete the job with token usage
          completeJob(jobId, totalTokens, inputTokens, outputTokens);
        } catch (error) {
          addLog("   ❌ AI analysis error");
          console.error(`Error analyzing ${gallery.Name}:`, error);
          failJob(jobId, error instanceof Error ? error.message : 'Unknown error');
          continue;
        }

        // Create index entry
        const indexEntry: GalleryIndex = {
          albumKey: albumKey,
          name: gallery.Name,
          nodeId: gallery.NodeID || "",
          themes: analysisData.analysis.themes || [],
          dateRange: analysisData.analysis.dateRange || "",
          location: analysisData.analysis.location || undefined,
          imageCount: images.length,
          lastIndexed: new Date().toISOString(),
          sampleImages: analysisData.analysis.sampleImages || [],
          summary: analysisData.analysis.summary || "",
          photoStyle: analysisData.analysis.photoStyle || "",
          subjects: analysisData.analysis.subjects || [],
          tokensUsed: analysisData.tokensUsed || 0,
        };

        // Save complete gallery data to unified cache
        const cachedGallery: CachedGallery = {
          albumKey: albumKey,
          albumName: gallery.Name,
          albumUri: gallery.Uri,
          imageCount: images.length,
          images: images.map((img: any) => ({
            ImageKey: img.ImageKey,
            FileName: img.FileName,
            Title: img.Title,
            Caption: img.Caption,
            Keywords: img.Keywords,
            ArchivedUri: img.ArchivedUri,
            ThumbnailUrl: img.ThumbnailUrl,
            WebUri: img.WebUri,
          })),
          cachedAt: Date.now(),
          lastRefreshed: Date.now(),
          metadata: {
            nodeId: gallery.NodeID || "",
            themes: indexEntry.themes,
            dateRange: indexEntry.dateRange,
            location: indexEntry.location,
            sampleImages: indexEntry.sampleImages,
            summary: indexEntry.summary,
            photoStyle: indexEntry.photoStyle,
            subjects: indexEntry.subjects,
            tokensUsed: indexEntry.tokensUsed,
          },
        };

        galleryCache.setGallery(cachedGallery);
        addLog(`   💾 Saved to unified cache`);

        addLog(`   ✓ Gallery "${gallery.Name}" indexed successfully`);
        addLog(`   📝 Themes: ${indexEntry.themes.join(", ")}`);
        if (indexEntry.subjects && indexEntry.subjects.length > 0) {
          addLog(`   📝 Subjects: ${indexEntry.subjects.join(", ")}`);
        }

        newIndexEntries.push(indexEntry);
      }

      addLog("\n💾 Updating index state...");

      // Merge with existing index (update if exists, add if new)
      const updatedIndex = [...galleryIndex];
      newIndexEntries.forEach((newEntry) => {
        const existingIndex = updatedIndex.findIndex(
          (e) => e.albumKey === newEntry.albumKey,
        );
        if (existingIndex >= 0) {
          updatedIndex[existingIndex] = newEntry;
        } else {
          updatedIndex.push(newEntry);
        }
      });

      saveGalleryIndex(updatedIndex);

      addLog(
        `✅ Index saved! ${newIndexEntries.length} galleries successfully indexed`,
      );
      addLog(`📊 Total galleries in index: ${updatedIndex.length}`);

      alert(`✅ Successfully indexed ${newIndexEntries.length} galleries!`);
      setSelectedGalleries([]);
    } catch (_error) {
      addLog(`\n❌ Error: ${error}`);
      console.error("Error building index:", _error);
      alert("Failed to build index. Check console for details.");
    } finally {
      setIsIndexing(false);
      setIndexingProgress(null);
    }
  };

  const handleDeleteGalleries = async () => {
    if (selectedGalleries.length === 0) {
      alert("Please select at least one gallery to delete");
      return;
    }

    // Show confirmation dialog
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    setTerminalLogs([]);

    addLog(`🗑️  Starting deletion of ${selectedGalleries.length} galleries`);
    addLog(`⚠️  This action cannot be undone!`);

    try {
      const response = await fetch('/api/smugmug/albums/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          albumKeys: selectedGalleries,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete galleries');
      }

      const result = await response.json();

      addLog(`\n✅ Successfully deleted: ${result.deleted} galleries`);
      if (result.failed > 0) {
        addLog(`❌ Failed to delete: ${result.failed} galleries`);
      }

      // Log details for each gallery
      result.results.forEach((r: any) => {
        const gallery = galleries.find((g) => g.AlbumKey === r.albumKey);
        const galleryName = gallery?.Name || r.albumKey;
        if (r.success) {
          addLog(`   ✓ Deleted: ${galleryName}`);
        } else {
          addLog(`   ✗ Failed: ${galleryName} - ${r.error}`);
        }
      });

      // Remove deleted galleries from the local state
      const deletedKeys = result.results
        .filter((r: any) => r.success)
        .map((r: any) => r.albumKey);

      setGalleries((prev) => prev.filter((g) => !deletedKeys.includes(g.AlbumKey)));
      setSelectedGalleries([]);

      // Remove from cache and index
      deletedKeys.forEach(key => galleryCache.removeGallery(key));
      setGalleryIndex((prev) => prev.filter((g) => !deletedKeys.includes(g.albumKey)));

      alert(`✅ Deleted ${result.deleted} of ${selectedGalleries.length} galleries`);
    } catch (error) {
      addLog(`\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Error deleting galleries:', error);
      alert('Failed to delete galleries. Check console for details.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSortExisting = async () => {
    // Check if we have any selection
    if (selectedSourceGalleries.size === 0 && selectedPhotos.size === 0) {
      alert(
        "Please select folders, galleries, or individual photos to analyze",
      );
      return;
    }

    if (galleryIndex.length === 0) {
      alert('Please build an index first! Go to "Build Index" tab.');
      return;
    }

    // Check for existing incomplete analysis for these galleries
    const galleryKeys = Array.from(selectedSourceGalleries);
    const existingSession = await analysisStorage.getRecentIncompleteSession(galleryKeys);

    if (existingSession) {
      const resumeAnalysis = confirm(
        `You have an incomplete analysis for these galleries from ${new Date(existingSession.analyzed_at).toLocaleString()}.\n\n` +
        `Progress: ${existingSession.total_photos - existingSession.pending_count}/${existingSession.total_photos} photos processed\n\n` +
        `Would you like to resume that analysis instead of starting a new one?`
      );

      if (resumeAnalysis) {
        setCurrentAnalysisSession(existingSession.session_id);
        return;
      }
    }

    // Clear previous logs
    setTerminalLogs([]);

    const addLog = (message: string) => {
      const timestamp = new Date().toLocaleTimeString();
      setTerminalLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
    };

    setIsSorting(true);
    setSortingProgress({ current: 0, total: 0, imageName: "" });

    try {
      addLog("🚀 Starting photo analysis workflow...");
      addLog(
        `📊 Using AI knowledge base with ${galleryIndex.length} indexed galleries`,
      );

      let images: any[] = [];

      // Determine what to analyze
      if (selectedPhotos.size > 0) {
        // Analyze only selected photos
        addLog(
          `📸 Analyzing ${selectedPhotos.size} selected ${selectedPhotos.size === 1 ? "photo" : "photos"}`,
        );
        images = loadedPhotos.filter((p) => selectedPhotos.has(p.ImageKey));
      } else {
        // Analyze all photos from selected galleries
        addLog(
          `📁 Analyzing all photos from ${selectedSourceGalleries.size} selected ${selectedSourceGalleries.size === 1 ? "gallery" : "galleries"}`,
        );

        for (const galleryKey of Array.from(selectedSourceGalleries)) {
          const galleryInfo = galleries.find((g) => g.AlbumKey === galleryKey);
          addLog(
            `📡 Fetching images from "${galleryInfo?.Name || galleryKey}"...`,
          );

          const imagesResponse = await fetch(
            `/api/smugmug/albums/${galleryKey}/images`,
            {
              credentials: "include",
            },
          );

          if (imagesResponse.ok) {
            const imagesData = await imagesResponse.json();
            const galleryImages = (imagesData.images || []).map((img: any) => ({
              ...img,
              sourceGalleryKey: galleryKey,
              sourceGalleryName: galleryInfo?.Name || "Unknown",
            }));
            images.push(...galleryImages);
            addLog(`   ✅ Found ${galleryImages.length} images`);
          } else {
            addLog(
              `   ⚠️  Failed to fetch images from "${galleryInfo?.Name || galleryKey}"`,
            );
          }
        }
      }

      if (images.length === 0) {
        addLog("❌ No images found in selection");
        alert("No images found in selection");
        setIsSorting(false);
        setSortingProgress(null);
        return;
      }

      addLog(`✅ Total: ${images.length} images to analyze`);
      setSortingProgress({
        current: 0,
        total: images.length,
        imageName: "Analyzing...",
      });

      const tasks: OrganizeTask[] = [];

      // Analyze each image
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const imageName = image.FileName || image.Title || `Image ${i + 1}`;

        setSortingProgress({
          current: i + 1,
          total: images.length,
          imageName,
        });

        addLog(`\n🔍 Analyzing ${i + 1}/${images.length}: "${imageName}"`);

        // Extract metadata
        const metadata = {
          title: image.Title || "",
          caption: image.Caption || "",
          keywords: image.Keywords || "",
          filename: image.FileName || "",
          date: image.Date || "",
        };

        addLog(`   📝 Metadata extracted:`);
        if (metadata.title) addLog(`      • Title: ${metadata.title}`);
        if (metadata.keywords) addLog(`      • Keywords: ${metadata.keywords}`);
        if (metadata.caption)
          addLog(
            `      • Caption: ${metadata.caption.substring(0, 50)}${metadata.caption.length > 50 ? "..." : ""}`,
          );
        if (metadata.date) addLog(`      • Date: ${metadata.date}`);

        addLog(`   🤖 Sending to Claude AI for gallery suggestion...`);
        addLog(
          `   💭 Prompt: "Analyze metadata and suggest best gallery from ${galleryIndex.length} options"`,
        );

        // Use AI to suggest best gallery
        const suggestionResponse = await fetch("/api/ai/suggest-gallery", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            metadata,
            galleryIndex,
          }),
        });

        if (suggestionResponse.ok) {
          const suggestion = await suggestionResponse.json();

          addLog(
            `   ✨ AI Response received (${suggestion.tokensUsed || "N/A"} tokens used)`,
          );
          addLog(`   🎯 Suggested: "${suggestion.suggestedGallery}"`);
          addLog(`   📊 Confidence: ${suggestion.confidence}%`);
          addLog(`   💡 Reasoning: ${suggestion.reasoning}`);

          let status: OrganizeTask["status"] = "skipped";
          if (suggestion.confidence >= 90) {
            status = "auto-approved";
            addLog(`   ✅ AUTO-APPROVED (confidence ≥ 90%)`);
          } else if (suggestion.confidence >= 70) {
            status = "needs-review";
            addLog(`   ⚠️  NEEDS REVIEW (confidence 70-89%)`);
          } else {
            addLog(`   ⏭️  SKIPPED (confidence < 70%)`);
          }

          tasks.push({
            imageUrl: image.ThumbnailUrl || image.ArchivedUri || "",
            imageName,
            imageUri: image.Uris?.Image?.Uri || image.Uri || "",
            sourceGallery: image.sourceGalleryName || "Unknown",
            suggestedGallery: suggestion.suggestedGallery,
            confidence: suggestion.confidence,
            reasoning: suggestion.reasoning,
            status,
          });
        } else {
          addLog(`   ❌ AI suggestion failed for this image`);
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      addLog(`\n🎉 Analysis complete!`);
      addLog(`📋 Results summary:`);
      addLog(`   • Total images analyzed: ${images.length}`);
      addLog(`   • Tasks created: ${tasks.length}`);
      addLog(
        `   • Auto-approved: ${tasks.filter((t) => t.status === "auto-approved").length}`,
      );
      addLog(
        `   • Needs review: ${tasks.filter((t) => t.status === "needs-review").length}`,
      );
      addLog(
        `   • Skipped: ${tasks.filter((t) => t.status === "skipped").length}`,
      );

      console.log("Analysis complete. Tasks created:", tasks.length);
      console.log("Tasks:", tasks);

      if (tasks.length === 0) {
        addLog("⚠️  No suggestions generated - images may lack metadata");
        alert(
          "No suggestions generated. Images may not have enough metadata to analyze.",
        );
        return;
      }

      // Convert tasks to analyzed photos format
      const analyzedPhotos: AnalyzedPhoto[] = tasks.map((task) => {
        const sourceImage = images.find((img) =>
          (img.FileName || img.Title || `Image`) === task.imageName
        );
        const destGallery = galleryIndex.find(g => g.name === task.suggestedGallery);

        return {
          imageKey: sourceImage?.ImageKey || '',
          fileName: task.imageName,
          thumbnailUrl: task.imageUrl,
          title: sourceImage?.Title,
          caption: sourceImage?.Caption,
          keywords: sourceImage?.Keywords ? sourceImage.Keywords.split(',').map((k: string) => k.trim()) : [],
          sourceGallery: {
            key: sourceImage?.sourceGalleryKey || '',
            name: task.sourceGallery,
          },
          suggestedDestination: {
            key: destGallery?.albumKey || '',
            name: task.suggestedGallery,
            path: destGallery?.name || task.suggestedGallery,
          },
          confidence: task.confidence,
          reasoning: task.reasoning,
          status: 'pending',
        };
      });

      // Get source gallery keys and names
      const sourceGalleryKeys = Array.from(selectedSourceGalleries);
      const sourceGalleryNames = sourceGalleryKeys.map(key => {
        const gallery = galleries.find(g => g.AlbumKey === key);
        return gallery?.Name || 'Unknown';
      });

      // Save analysis session to database
      addLog("💾 Saving analysis to database...");
      const analysisSession = await analysisStorage.createSession({
        source_gallery_keys: sourceGalleryKeys,
        source_gallery_names: sourceGalleryNames,
        analysis_type: 'sort',
        photos: analyzedPhotos,
        total_photos: analyzedPhotos.length,
      });

      if (!analysisSession) {
        throw new Error('Failed to create analysis session');
      }

      addLog(`✅ Analysis saved with ID: ${analysisSession.session_id}`);
      addLog("🎨 Opening photo-by-photo review interface...");

      // Set current session and show review interface
      setCurrentAnalysisSession(analysisSession.session_id);
      setOrganizeTasks(tasks); // Keep for backward compatibility with dry run modal
      setShowDryRun(false); // Don't show old dry run modal
    } catch (_error) {
      console.error("Error sorting photos:", _error);
      alert("Failed to sort photos. Check console for details.");
    } finally {
      setIsSorting(false);
      setSortingProgress(null);
    }
  };

  const toggleIndexGallerySelection = (albumKey: string) => {
    setSelectedGalleries((prev) =>
      prev.includes(albumKey)
        ? prev.filter((k) => k !== albumKey)
        : [...prev, albumKey],
    );
  };

  const handleExecuteOrganize = async () => {
    if (!tokens) return;

    const tasksToExecute = organizeTasks.filter(
      (t) => t.status === "auto-approved" || t.status === "needs-review",
    );

    if (tasksToExecute.length === 0) {
      alert("No tasks to execute");
      return;
    }

    const confirmMessage = copyMode
      ? `Copy ${tasksToExecute.length} images to suggested galleries?\n\nThis will create collected copies in the destination galleries.`
      : `Move ${tasksToExecute.length} images to suggested galleries?\n\nThis will relocate images to the destination galleries.`;

    if (!confirm(confirmMessage)) return;

    setShowDryRun(false);
    setIsExecuting(true);

    try {
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < tasksToExecute.length; i++) {
        const task = tasksToExecute[i];
        setExecutionProgress({
          current: i + 1,
          total: tasksToExecute.length,
          taskName: task.imageName,
        });

        try {
          // Find destination album key
          const destGallery = galleryIndex.find(
            (g) => g.name === task.suggestedGallery,
          );
          if (!destGallery) {
            console.error(
              "Destination gallery not found in index:",
              task.suggestedGallery,
            );
            addLog(
              `   ❌ Destination gallery "${task.suggestedGallery}" not found in index`,
            );
            failCount++;
            continue;
          }

          // Verify destination album still exists on SmugMug
          const verifyResponse = await fetch(
            `/api/smugmug/albums/${destGallery.albumKey}/images?limit=1`,
            {
              method: "GET",
              credentials: "include",
            },
          );

          if (!verifyResponse.ok) {
            console.error(
              "Destination album not found on SmugMug:",
              destGallery.albumKey,
            );
            addLog(
              `   ❌ Album "${task.suggestedGallery}" (${destGallery.albumKey}) no longer exists on SmugMug`,
            );
            addLog(`      💡 Re-index your galleries to update deleted albums`);
            failCount++;
            continue;
          }

          addLog(
            `   📤 ${copyMode ? "Copying" : "Moving"} "${task.imageName}" to "${task.suggestedGallery}" (${destGallery.albumKey})`,
          );

          if (copyMode) {
            // Copy/collect image to destination album
            const response = await fetch("/api/smugmug/collect-image", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
              body: JSON.stringify({
                imageUri: task.imageUri,
                albumKey: destGallery.albumKey,
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              console.error("Failed to copy image:", task.imageName, errorData);
              addLog(
                `   ❌ Failed to copy: ${errorData.error || "Unknown error"}`,
              );
              failCount++;
            } else {
              addLog(`   ✅ Successfully copied`);
              successCount++;
            }
          } else {
            // Move logic - would need a different API endpoint
            // For now, placeholder
            console.log("Move logic not yet implemented");
            failCount++;
          }

          // Small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (_error) {
          console.error("Error processing task:", _error);
          failCount++;
        }
      }

      alert(
        `${copyMode ? "Copy" : "Move"} complete!\n\n` +
          `✅ Success: ${successCount}\n` +
          `❌ Failed: ${failCount}`,
      );

      // Clear tasks after execution
      setOrganizeTasks([]);
    } catch (_error) {
      console.error("Error executing organize:", _error);
      alert("Failed to execute. Check console for details.");
    } finally {
      setIsExecuting(false);
      setExecutionProgress(null);
    }
  };

  // Intelligent Culling functions
  const loadPhotosForCulling = useCallback(
    async (albumKeys: Set<string>) => {
      const albumKeysArray = Array.from(albumKeys);
      console.log(
        "🔍 loadPhotosForCulling called with albums:",
        albumKeysArray,
      );

      if (albumKeysArray.length === 0) {
        console.log("⚠️ No albums selected");
        alert("Please select at least one album first");
        return;
      }

      console.log(
        `🎯 Starting Intelligent Culling for ${albumKeysArray.length} album(s)`,
      );
      setIsAnalyzingPhotos(true);
      setCullingProgress({ current: 0, total: 0 });
      setCullingPhotos([]);
      setCullingStatistics(null);

      try {
        // Fetch photos from all selected albums
        const allImages: any[] = [];

        for (const albumKey of albumKeysArray) {
          console.log(`📥 Fetching images from album: ${albumKey}`);
          const response = await fetch(
            `/api/smugmug/albums/${albumKey}/images`,
            {
              credentials: "include",
            },
          );

          console.log(`📡 Response status for ${albumKey}: ${response.status}`);

          if (!response.ok) {
            const errorText = await response.text();
            console.error(
              `❌ Failed to fetch photos from ${albumKey}: ${response.status}`,
              errorText,
            );
            continue; // Skip this album but continue with others
          }

          const data = await response.json();
          const images = data.images || [];
          console.log(`📷 Found ${images.length} images in album ${albumKey}`);

          // Add album info to each image for context
          const imagesWithAlbum = images.map((img: any) => ({
            ...img,
            _albumKey: albumKey,
            _albumName:
              galleries.find((g) => g.AlbumKey === albumKey)?.Name || albumKey,
          }));

          allImages.push(...imagesWithAlbum);
        }

        console.log(`📷 Total images across all albums: ${allImages.length}`);

        if (allImages.length === 0) {
          alert("No photos found in selected albums");
          setIsAnalyzingPhotos(false);
          return;
        }

        // Prepare photos for analysis
        const photosToAnalyze = allImages.map((img: any) => ({
          imageKey: img.ImageKey,
          imageUrl: img.ArchivedUri,
          imageName: img.FileName || "Unnamed",
          thumbnailUrl: img.ThumbnailUrl,
          albumKey: img._albumKey,
          albumName: img._albumName,
          cullingStatus: "unprocessed" as const,
        }));

        console.log(
          `✅ Prepared ${photosToAnalyze.length} photos for analysis`,
        );

        setCullingPhotos(photosToAnalyze);
        setCullingProgress({ current: 0, total: allImages.length });

        // Analyze photos in batches
        const batchSize = 5;
        const analyses: any[] = [];

        console.log(`🔄 Starting analysis in batches of ${batchSize}`);

        for (let i = 0; i < allImages.length; i += batchSize) {
          const batch = allImages.slice(i, i + batchSize);
          console.log(
            `📊 Processing batch ${Math.floor(i / batchSize) + 1}: photos ${i + 1}-${Math.min(i + batchSize, allImages.length)}`,
          );
          setCullingProgress({ current: i, total: allImages.length });

          // Create unique job ID and register AI activity for this batch
          const jobId = `culling-batch-${Math.floor(i / batchSize) + 1}-${Date.now()}`;
          const modelInfo = AVAILABLE_MODELS[cullingModel];

          addJob({
            id: jobId,
            tool: 'Photo Organizer',
            toolPath: '/photo-organizer',
            status: 'processing',
            startTime: new Date(),
            message: `Analyzing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allImages.length / batchSize)} (${batch.length} photos)`,
            model: cullingModel,
            modelName: modelInfo.name,
          });

          try {
            const analysisResponse = await fetch(
              "/api/ai/analyze-photo-quality",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  images: batch.map((img: any) => ({
                    url: img.ArchivedUri,
                    id: img.ImageKey,
                    name: img.FileName,
                  })),
                  albumContext: `Multiple albums: ${albumKeysArray.map((k) => galleries.find((g) => g.AlbumKey === k)?.Name || k).join(", ")}`,
                  autoRejectThreshold,
                  detectKeyMoments: true,
                  model: cullingModel, // Pass selected model
                }),
              },
            );

            console.log(
              `📡 Analysis API response status: ${analysisResponse.status}`,
            );

            if (analysisResponse.ok) {
              const result = await analysisResponse.json();
              console.log(
                `✅ Received ${result.analyses?.length || 0} analyses from batch`,
              );
              analyses.push(...(result.analyses || []));

              // Complete the job with token usage
              const inputTokens = result.usage?.input_tokens || 0;
              const outputTokens = result.usage?.output_tokens || 0;
              const totalTokens = inputTokens + outputTokens;
              completeJob(jobId, totalTokens, inputTokens, outputTokens);
            } else {
              const errorText = await analysisResponse.text();
              console.error(`❌ Analysis failed for batch:`, errorText);
              failJob(jobId, `Analysis failed: ${errorText.substring(0, 100)}`);
            }
          } catch (error) {
            console.error(`❌ Error analyzing batch:`, error);
            failJob(jobId, error instanceof Error ? error.message : 'Unknown error');
          }
        }

        // Update photos with analysis results
        const analyzedPhotos = photosToAnalyze.map((photo: any) => {
          const analysis = analyses.find(
            (a: any) => a.imageUrl === photo.imageUrl,
          );
          if (analysis) {
            return {
              ...photo,
              ...analysis,
              cullingStatus:
                analysis.keepRecommendation === "keep"
                  ? "keep"
                  : analysis.keepRecommendation === "reject"
                    ? "reject"
                    : "unprocessed",
            };
          }
          return photo;
        });

        setCullingPhotos(analyzedPhotos);

        // Calculate statistics
        updateCullingStatistics(analyzedPhotos);

        setIsAnalyzingPhotos(false);
        setCullingProgress(null);
      } catch (_error) {
        console.error("Error loading photos for culling:", _error);
        alert("Failed to load and analyze photos. Check console for details.");
        setIsAnalyzingPhotos(false);
        setCullingProgress(null);
      }
    },
    [galleries, autoRejectThreshold],
  );

  const updateCullingStatistics = (photos: CullingPhoto[]) => {
    const total = photos.length;
    const keeps = photos.filter((p) => p.cullingStatus === "keep").length;
    const rejects = photos.filter((p) => p.cullingStatus === "reject").length;
    const picks = photos.filter((p) => p.cullingStatus === "pick").length;
    const portfolioWorthy = photos.filter((p) => p.isPortfolioWorthy).length;
    const keyMoments = photos.filter((p) => p.keyMoment !== null).length;

    const technicalIssuesCount = photos.filter(
      (p) =>
        p.technicalIssues?.blur ||
        p.technicalIssues?.exposure !== "good" ||
        p.technicalIssues?.noise ||
        p.technicalIssues?.focus === "blurry",
    ).length;

    const totalScore = photos.reduce(
      (sum, p) => sum + (p.qualityScore || 0),
      0,
    );
    const avgQualityScore = total > 0 ? (totalScore / total).toFixed(1) : "0";

    const qualityDistribution = {
      excellent: photos.filter((p) => p.qualityScore >= 9).length,
      good: photos.filter((p) => p.qualityScore >= 7 && p.qualityScore < 9)
        .length,
      average: photos.filter((p) => p.qualityScore >= 5 && p.qualityScore < 7)
        .length,
      poor: photos.filter((p) => p.qualityScore < 5).length,
    };

    setCullingStatistics({
      total,
      keeps,
      rejects,
      picks,
      keepRatio: total > 0 ? Math.round((keeps / total) * 100) : 0,
      portfolioWorthy,
      keyMoments,
      technicalIssuesCount,
      avgQualityScore,
      estimatedTimeSavedMinutes: Math.round((total * 4) / 60),
      qualityDistribution,
    });
  };

  const updatePhotoStatus = (
    index: number,
    status: "keep" | "reject" | "pick",
  ) => {
    setCullingPhotos((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], cullingStatus: status };
      updateCullingStatistics(updated);
      return updated;
    });
  };

  const handleKeyPress = useCallback(
    (e: KeyboardEvent) => {
      if (activeTab !== "intelligent-culling" || viewMode !== "single") return;

      switch (e.key) {
        case "ArrowRight":
          setSelectedPhotoIndex((prev) =>
            Math.min(prev + 1, cullingPhotos.length - 1),
          );
          break;
        case "ArrowLeft":
          setSelectedPhotoIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "p":
        case "P":
          updatePhotoStatus(selectedPhotoIndex, "pick");
          break;
        case "x":
        case "X":
          updatePhotoStatus(selectedPhotoIndex, "reject");
          break;
        case "k":
        case "K":
          updatePhotoStatus(selectedPhotoIndex, "keep");
          break;
        case "u":
        case "U":
          updatePhotoStatus(selectedPhotoIndex, "unprocessed" as any);
          break;
        case "g":
        case "G":
          setShowSimilarGroups((prev) => !prev);
          break;
      }
    },
    [activeTab, viewMode, selectedPhotoIndex, cullingPhotos],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [handleKeyPress]);

  const autoRejectIssues = () => {
    setCullingPhotos((prev) => {
      const updated = prev.map((photo) => {
        const hasIssues =
          photo.technicalIssues?.blur ||
          photo.technicalIssues?.exposure !== "good" ||
          photo.technicalIssues?.focus === "blurry" ||
          photo.subjectIssues?.eyesClosed ||
          photo.qualityScore < autoRejectThreshold;

        if (hasIssues && photo.cullingStatus !== "pick") {
          return { ...photo, cullingStatus: "reject" as const };
        }
        return photo;
      });
      updateCullingStatistics(updated);
      return updated;
    });
  };

  const keepBestFromGroups = () => {
    setCullingPhotos((prev) => {
      const groups = new Map<string, CullingPhoto[]>();

      prev.forEach((photo) => {
        const hash = photo.similarityHash || `unique-${photo.imageKey}`;
        if (!groups.has(hash)) {
          groups.set(hash, []);
        }
        groups.get(hash)!.push(photo);
      });

      const updated = [...prev];
      groups.forEach((group) => {
        if (group.length > 1) {
          // Sort by quality score
          group.sort((a, b) => b.qualityScore - a.qualityScore);

          // Keep the best, reject others
          group.forEach((photo, index) => {
            const photoIndex = updated.findIndex(
              (p) => p.imageKey === photo.imageKey,
            );
            if (photoIndex !== -1) {
              if (index === 0) {
                updated[photoIndex] = {
                  ...updated[photoIndex],
                  cullingStatus: "keep",
                };
              } else if (updated[photoIndex].cullingStatus !== "pick") {
                updated[photoIndex] = {
                  ...updated[photoIndex],
                  cullingStatus: "reject",
                };
              }
            }
          });
        }
      });

      updateCullingStatistics(updated);
      return updated;
    });
  };

  const resetCullingSelections = () => {
    setCullingPhotos((prev) => {
      const updated = prev.map((photo) => ({
        ...photo,
        cullingStatus: "unprocessed" as const,
      }));
      updateCullingStatistics(updated);
      return updated;
    });
  };

  const exportCullingReport = () => {
    const csv = [
      [
        "Image Name",
        "Quality Score",
        "Status",
        "Keep Recommendation",
        "Issues",
        "Assessment",
        "Key Moment",
        "Portfolio Worthy",
      ],
      ...cullingPhotos.map((photo) => [
        photo.imageName,
        photo.qualityScore,
        photo.cullingStatus,
        photo.keepRecommendation,
        [
          photo.technicalIssues?.blur && "blur",
          photo.technicalIssues?.exposure !== "good" &&
            `${photo.technicalIssues?.exposure}`,
          photo.technicalIssues?.noise && "noise",
          photo.subjectIssues?.eyesClosed && "eyes closed",
        ]
          .filter(Boolean)
          .join(", ") || "None",
        photo.overallAssessment,
        photo.keyMoment || "",
        photo.isPortfolioWorthy ? "Yes" : "No",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `culling-report-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const applyCulling = async () => {
    const rejects = cullingPhotos.filter((p) => p.cullingStatus === "reject");

    if (rejects.length === 0) {
      alert("No photos marked for rejection");
      return;
    }

    const confirmed = confirm(
      `This will permanently delete ${rejects.length} photos from SmugMug. Are you sure?`,
    );
    if (!confirmed) return;

    // In production, you would implement the actual deletion logic here
    // For now, we'll show a message
    alert(
      `Would delete ${rejects.length} photos. This feature requires additional SmugMug API permissions.`,
    );
  };

  const getFilteredPhotos = () => {
    let filtered = cullingPhotos;

    if (filterMode !== "all") {
      filtered = filtered.filter((p) => {
        if (filterMode === "review") return p.keepRecommendation === "review";
        return p.cullingStatus === filterMode;
      });
    }

    if (showKeyMomentsOnly) {
      filtered = filtered.filter((p) => p.keyMoment !== null);
    }

    if (showPortfolioOnly) {
      filtered = filtered.filter((p) => p.isPortfolioWorthy);
    }

    if (showSimilarGroups) {
      // Group by similarity hash and show only best from each group
      const groups = new Map<string, CullingPhoto>();
      filtered.forEach((photo) => {
        const hash = photo.similarityHash || `unique-${photo.imageKey}`;
        if (
          !groups.has(hash) ||
          photo.qualityScore > groups.get(hash)!.qualityScore
        ) {
          groups.set(hash, photo);
        }
      });
      filtered = Array.from(groups.values());
    }

    return filtered;
  };

  const viewingIndexData = viewingIndex
    ? galleryIndex.find((idx) => idx.albumKey === viewingIndex)
    : null;

  // Helper function to get gallery analysis status
  const getGalleryAnalysisStatus = async (albumKey: string) => {
    const sessions = await analysisStorage.getAllSessions();
    const gallerySessions = sessions.filter(s =>
      s.source_gallery_keys.includes(albumKey)
    );

    if (gallerySessions.length === 0) {
      return null;
    }

    // Find most recent session
    const mostRecentSession = gallerySessions.sort((a, b) =>
      new Date(b.analyzed_at).getTime() - new Date(a.analyzed_at).getTime()
    )[0];

    const stats = await analysisStorage.getSessionStats(mostRecentSession.session_id);
    if (!stats) return null;

    return {
      sessionId: mostRecentSession.session_id,
      isComplete: !!mostRecentSession.completed_at,
      percentComplete: stats.percentComplete,
      totalPhotos: stats.total,
      pendingPhotos: stats.pending,
      analyzedAt: new Date(mostRecentSession.analyzed_at),
    };
  };

  // Render photo review interface when analysis session exists
  const renderPhotoReviewInterface = () => {
    if (!currentAnalysisSession || !currentSessionData) return null;

    const session = currentSessionData;
    const stats = currentSessionStats;

    const handlePhotoAction = async (imageKey: string, action: 'move' | 'copy' | 'ignore') => {
      const status = action === 'ignore' ? 'ignored' : (action === 'copy' ? 'copied' : 'moved');
      await analysisStorage.updatePhotoStatus(currentAnalysisSession!, imageKey, status);
      await analysisStorage.touchSession(currentAnalysisSession!);
      // Trigger re-render
      setRefreshCounter(prev => prev + 1);
    };

    const handleBulkAction = async (action: 'move' | 'copy' | 'ignore') => {
      if (selectedPhotoKeys.size === 0) return;
      const status = action === 'ignore' ? 'ignored' : (action === 'copy' ? 'copied' : 'moved');
      await analysisStorage.updatePhotoStatusBulk(
        currentAnalysisSession!,
        Array.from(selectedPhotoKeys),
        status
      );
      setSelectedPhotoKeys(new Set());
      // Trigger re-render
      setRefreshCounter(prev => prev + 1);
    };

    const togglePhotoSelection = (imageKey: string) => {
      const newSelection = new Set(selectedPhotoKeys);
      if (newSelection.has(imageKey)) {
        newSelection.delete(imageKey);
      } else {
        newSelection.add(imageKey);
      }
      setSelectedPhotoKeys(newSelection);
    };

    const selectAll = () => {
      const pendingPhotos = session.photos.filter(p => p.status === 'pending');
      setSelectedPhotoKeys(new Set(pendingPhotos.map(p => p.imageKey)));
    };

    const deselectAll = () => {
      setSelectedPhotoKeys(new Set());
    };

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Review Analysis Results
            </h2>
            <p className="text-gray-600">
              From: {session.source_gallery_names.join(', ')}
            </p>
          </div>
          <button
            onClick={() => {
              if (session.pendingCount > 0) {
                const confirmClose = confirm(
                  `You still have ${session.pendingCount} pending photos.\n\nYour progress is saved and you can resume anytime.`
                );
                if (!confirmClose) return;
              }
              setCurrentAnalysisSession(null);
            }}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            Close Review
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="text-xs text-gray-600 mb-1">Total Photos</div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-xs text-blue-600 mb-1">Pending</div>
              <div className="text-2xl font-bold text-blue-700">{stats.pending}</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="text-xs text-green-600 mb-1">Moved</div>
              <div className="text-2xl font-bold text-green-700">{stats.moved}</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="text-xs text-purple-600 mb-1">Copied</div>
              <div className="text-2xl font-bold text-purple-700">{stats.copied}</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-xs text-gray-600 mb-1">Ignored</div>
              <div className="text-2xl font-bold text-gray-700">{stats.ignored}</div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {stats && (
          <div className="bg-white border border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <span className="text-sm font-medium text-gray-700">Progress</span>
              <span className="text-sm font-bold text-indigo-600">{stats.percentComplete}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all"
                style={{ width: `${stats.percentComplete}%` }}
              />
            </div>
          </div>
        )}

        {/* Bulk Actions */}
        {session.pendingCount > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="text-sm font-medium text-gray-700">
                {selectedPhotoKeys.size} selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  Select All Pending
                </button>
                <button
                  onClick={deselectAll}
                  className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  Deselect All
                </button>
              </div>
              {selectedPhotoKeys.size > 0 && (
                <>
                  <div className="h-6 w-px bg-gray-300" />
                  <button
                    onClick={() => handleBulkAction('move')}
                    className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                  >
                    Move Selected ({selectedPhotoKeys.size})
                  </button>
                  <button
                    onClick={() => handleBulkAction('copy')}
                    className="px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
                  >
                    Copy Selected ({selectedPhotoKeys.size})
                  </button>
                  <button
                    onClick={() => handleBulkAction('ignore')}
                    className="px-3 py-1.5 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium"
                  >
                    Ignore Selected ({selectedPhotoKeys.size})
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Photos Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {session.photos.filter(p => p.status === 'pending').map((photo) => (
            <div
              key={photo.imageKey}
              className={`bg-white border rounded-lg overflow-hidden transition-all ${
                selectedPhotoKeys.has(photo.imageKey)
                  ? 'border-indigo-500 ring-2 ring-indigo-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="relative">
                <img
                  src={photo.thumbnailUrl}
                  alt={photo.fileName}
                  className="w-full aspect-square object-cover"
                />
                <input
                  type="checkbox"
                  checked={selectedPhotoKeys.has(photo.imageKey)}
                  onChange={() => togglePhotoSelection(photo.imageKey)}
                  className="absolute top-2 left-2 w-5 h-5 rounded"
                />
                <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 text-white text-xs font-semibold rounded">
                  {photo.confidence}%
                </div>
              </div>
              <div className="p-3 space-y-2">
                <div className="text-sm font-semibold text-gray-900 truncate">
                  {photo.fileName}
                </div>
                <div className="text-xs text-gray-600">
                  <div><span className="font-medium">From:</span> {photo.sourceGallery.name}</div>
                  <div className="mt-1"><span className="font-medium">Suggested:</span> {photo.suggestedDestination.name}</div>
                </div>
                <div className="text-xs text-gray-500 line-clamp-2">
                  {photo.reasoning}
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handlePhotoAction(photo.imageKey, 'move')}
                    className="flex-1 px-2 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors font-medium"
                  >
                    Move
                  </button>
                  <button
                    onClick={() => handlePhotoAction(photo.imageKey, 'copy')}
                    className="flex-1 px-2 py-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors font-medium"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => handlePhotoAction(photo.imageKey, 'ignore')}
                    className="px-2 py-1.5 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors font-medium"
                  >
                    Skip
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Completion Message */}
        {session.pendingCount === 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg sm:rounded-xl p-4 sm:p-6 text-center">
            <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-green-600 mx-auto mb-2 sm:mb-3" />
            <h3 className="text-base sm:text-lg font-bold text-green-900 mb-1 sm:mb-2">
              All Photos Reviewed!
            </h3>
            <p className="text-sm sm:text-base text-green-700 mb-3 sm:mb-4">
              You've processed all {session.totalPhotos} photos in this analysis.
            </p>
            <button
              onClick={() => setCurrentAnalysisSession(null)}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
            >
              Close Review
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen">
      <ToolboxHeader currentTool="photo-organizer" />

      {/* Instructions */}
      <div className="max-w-7xl mx-auto px-8 pt-6">
        <div className="bg-orange-50 border border-orange-200 rounded-lg sm:rounded-xl p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <svg
              className="w-5 h-5 text-orange-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-gray-800">
              <span className="font-semibold">How to use:</span> Choose
              galleries to analyze (AI suggests better organization based on
              photo content) → Review suggestions with confidence scores and
              reasoning → Apply approved changes to reorganize your photos with
              progress tracking.
            </p>
          </div>
        </div>
      </div>

      {/* View Index Modal */}
      {viewingIndex && viewingIndexData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-[95vw] sm:max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex-1 min-w-0 truncate">
                AI Gallery Analysis
              </h2>
              <button
                onClick={() => setViewingIndex(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Gallery Info */}
              <div>
                <h3 className="font-bold text-lg text-gray-900">
                  {viewingIndexData.name}
                </h3>
                <div className="text-sm text-gray-600 mt-1">
                  {viewingIndexData.imageCount} images • Last indexed:{" "}
                  {new Date(viewingIndexData.lastIndexed).toLocaleString()}
                </div>
              </div>

              {/* Summary */}
              {viewingIndexData.summary && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Summary</h4>
                  <p className="text-gray-700 leading-relaxed">
                    {viewingIndexData.summary}
                  </p>
                </div>
              )}

              {/* Themes */}
              {viewingIndexData.themes &&
                viewingIndexData.themes.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Themes</h4>
                    <div className="flex flex-wrap gap-2">
                      {viewingIndexData.themes.map((theme, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium"
                        >
                          {theme}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {/* Subjects */}
              {viewingIndexData.subjects &&
                viewingIndexData.subjects.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Subjects
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {viewingIndexData.subjects.map((subject, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                        >
                          {subject}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {/* Date Range */}
              {viewingIndexData.dateRange && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Date Range
                  </h4>
                  <p className="text-gray-700">{viewingIndexData.dateRange}</p>
                </div>
              )}

              {/* Location */}
              {viewingIndexData.location && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Location</h4>
                  <p className="text-gray-700">{viewingIndexData.location}</p>
                </div>
              )}

              {/* Photo Style */}
              {viewingIndexData.photoStyle && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Photo Style
                  </h4>
                  <p className="text-gray-700">{viewingIndexData.photoStyle}</p>
                </div>
              )}

              {/* Sample Images */}
              {viewingIndexData.sampleImages &&
                viewingIndexData.sampleImages.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Sample Images Analyzed
                    </h4>
                    <div className="grid grid-cols-5 gap-2">
                      {viewingIndexData.sampleImages
                        .slice(0, 10)
                        .map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt={`Sample ${i + 1}`}
                            className="w-full h-20 object-cover rounded border border-gray-200"
                          />
                        ))}
                    </div>
                  </div>
                )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => setViewingIndex(null)}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        {/* Compact Header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Photo Organizer</h1>
          <p className="text-sm sm:text-base text-gray-600 mb-6">
            AI-powered photo organization with smart gallery indexing
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="flex gap-2 border-b border-gray-200 overflow-x-auto pb-px">
            <button
              onClick={() => setActiveTab("build-index")}
              className={`px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base font-medium transition-colors whitespace-nowrap ${
                activeTab === "build-index"
                  ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50"
                  : "text-gray-600 hover:text-gray-900 active:text-gray-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <Archive className="w-4 h-4" />
                Build Index
              </div>
            </button>
            <button
              onClick={() => setActiveTab("sort-existing")}
              className={`px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base font-medium transition-colors whitespace-nowrap ${
                activeTab === "sort-existing"
                  ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50"
                  : "text-gray-600 hover:text-gray-900 active:text-gray-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <FolderTree className="w-4 h-4" />
                Sort Existing Photos
              </div>
            </button>
            <button
              onClick={() => setActiveTab("upload-sort")}
              className={`px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base font-medium transition-colors whitespace-nowrap ${
                activeTab === "upload-sort"
                  ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50"
                  : "text-gray-600 hover:text-gray-900 active:text-gray-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload & Sort
              </div>
            </button>
            <button
              onClick={() => setActiveTab("intelligent-culling")}
              className={`px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base font-medium transition-colors whitespace-nowrap ${
                activeTab === "intelligent-culling"
                  ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50"
                  : "text-gray-600 hover:text-gray-900 active:text-gray-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Intelligent Culling
              </div>
            </button>
          </div>

          {/* Settings Panel - Below Tabs */}
          <div className="mt-4">
            <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="w-4 h-4 text-gray-600" />
                <span className="font-semibold text-sm text-gray-900">Settings</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Auto-approve threshold */}
                <div>
                  <label className="text-xs text-gray-600 block mb-1">
                    Auto-approve threshold
                  </label>
                  <select
                    value={confidenceThreshold}
                    onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm min-h-[44px]"
                    disabled={manualReview}
                  >
                    <option value={95}>95%+ (Very Conservative)</option>
                    <option value={90}>90%+ (Recommended)</option>
                    <option value={85}>85%+ (Balanced)</option>
                    <option value={80}>80%+ (Aggressive)</option>
                  </select>
                </div>

                {/* Manual review checkbox */}
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-xs cursor-pointer min-h-[44px] pb-2">
                    <input
                      type="checkbox"
                      checked={manualReview}
                      onChange={(e) => setManualReview(e.target.checked)}
                      className="w-5 h-5 min-w-[20px] min-h-[20px] rounded flex-shrink-0"
                    />
                    <span className="text-gray-700">Review all moves manually</span>
                  </label>
                </div>

                {/* Operation mode */}
                <div>
                  <label className="text-xs text-gray-600 block mb-1">
                    Operation mode
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCopyMode(true)}
                      className={`flex-1 px-4 py-2 text-sm min-h-[44px] rounded font-medium transition-all ${
                        copyMode
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300"
                      }`}
                    >
                      📋 Copy
                    </button>
                    <button
                      onClick={() => setCopyMode(false)}
                      className={`flex-1 px-4 py-2 text-sm min-h-[44px] rounded font-medium transition-all ${
                        !copyMode
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300"
                      }`}
                    >
                      ↔️ Move
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {copyMode
                      ? "Create collected copies in suggested galleries"
                      : "Move photos to suggested galleries"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 sm:py-8">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-8">
            {activeTab === "build-index" && (
              <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
                {/* Left Sidebar - Indexed Galleries */}
                {galleryIndex.length > 0 && (
                  <div className="w-80 flex-shrink-0">
                    <div className="sticky top-8">
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3 mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <h3 className="font-semibold text-gray-900">
                            Index Progress
                          </h3>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Indexed:</span>
                            <span className="font-semibold text-green-700">
                              {galleryIndex.length}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Not Indexed:</span>
                            <span className="font-semibold text-gray-700">
                              {galleries.length - galleryIndex.length}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Progress:</span>
                            <span className="font-semibold text-indigo-600">
                              {galleries.length > 0
                                ? Math.round(
                                    (galleryIndex.length / galleries.length) *
                                      100,
                                  )
                                : 0}
                              %
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div
                            className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${galleries.length > 0 ? (galleryIndex.length / galleries.length) * 100 : 0}%`,
                            }}
                          />
                        </div>

                        {/* Cost Estimation */}
                        {(() => {
                          const indexedWithTokens = galleryIndex.filter(
                            (g) => g.tokensUsed && g.tokensUsed > 0,
                          );
                          if (indexedWithTokens.length === 0) return null;

                          const totalTokens = indexedWithTokens.reduce(
                            (sum, g) => sum + (g.tokensUsed || 0),
                            0,
                          );
                          const avgTokens = Math.round(
                            totalTokens / indexedWithTokens.length,
                          );
                          const remainingGalleries =
                            galleries.length - galleryIndex.length;
                          const estimatedTokens =
                            avgTokens * remainingGalleries;

                          // Claude Haiku pricing (per million tokens)
                          // Assume 50/50 split between input and output
                          const inputCost = 0.8; // per million
                          const outputCost = 4.0; // per million
                          const avgCostPerMillionTokens =
                            (inputCost + outputCost) / 2;
                          const estimatedCost =
                            (estimatedTokens / 1000000) *
                            avgCostPerMillionTokens;

                          return (
                            <div className="pt-2 mt-2 border-t border-green-300">
                              <div className="text-xs font-semibold text-gray-700 mb-1">
                                💰 Cost Estimation
                              </div>
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">
                                    Avg tokens/gallery:
                                  </span>
                                  <span className="font-semibold text-gray-900">
                                    {avgTokens.toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">
                                    Est. remaining tokens:
                                  </span>
                                  <span className="font-semibold text-gray-900">
                                    {estimatedTokens.toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">
                                    Est. remaining cost:
                                  </span>
                                  <span className="font-semibold text-green-700">
                                    ${estimatedCost.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Based on {indexedWithTokens.length} indexed{" "}
                                {indexedWithTokens.length === 1
                                  ? "gallery"
                                  : "galleries"}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                      <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                        {galleryIndex.map((index) => (
                          <div
                            key={index.albumKey}
                            className="bg-white border border-green-200 rounded-lg p-3 hover:shadow-sm transition-shadow"
                          >
                            <div className="font-semibold text-sm text-gray-900 truncate">
                              {index.name}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {index.imageCount} images
                            </div>
                            {index.themes && index.themes.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {index.themes.slice(0, 2).map((theme, i) => (
                                  <span
                                    key={i}
                                    className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded"
                                  >
                                    {theme}
                                  </span>
                                ))}
                                {index.themes.length > 2 && (
                                  <span className="text-xs text-gray-500">
                                    +{index.themes.length - 2}
                                  </span>
                                )}
                              </div>
                            )}
                            <button
                              onClick={() => setViewingIndex(index.albumKey)}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium mt-2"
                            >
                              View Details
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Main Content Area */}
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Archive className="w-5 h-5 text-indigo-600" />
                    Build Gallery Index
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                    Index your existing galleries to build AI knowledge. This is
                    a one-time process that helps the AI understand your gallery
                    structure.
                  </p>

                  {/* Gallery Selection */}
                  <div className="mb-4 sm:mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 text-sm">
                        Select Galleries to Index
                      </h3>
                      <div className="flex flex-wrap gap-1">
                        <button
                          onClick={loadGalleries}
                          className="px-1.5 py-1 text-[11px] bg-blue-100 hover:bg-blue-200 active:bg-blue-300 text-blue-700 rounded font-medium transition-colors flex items-center gap-0.5"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span className="hidden sm:inline">Refresh</span>
                        </button>
                        <button
                          onClick={() =>
                            setHideEmptyGalleries(!hideEmptyGalleries)
                          }
                          className={`px-1.5 py-1 text-[11px] rounded font-medium transition-colors flex items-center gap-0.5 ${
                            hideEmptyGalleries
                              ? "bg-orange-100 text-orange-700 hover:bg-orange-200 active:bg-orange-300"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300"
                          }`}
                        >
                          <EyeOff className="w-3 h-3" />
                          <span className="hidden sm:inline">{hideEmptyGalleries ? "Show" : "Hide"}</span>
                        </button>
                        <button
                          onClick={() =>
                            setSelectedGalleries(
                              galleries.map((g) => g.AlbumKey),
                            )
                          }
                          className="px-1.5 py-1 text-[11px] bg-indigo-100 hover:bg-indigo-200 active:bg-indigo-300 text-indigo-700 rounded font-medium transition-colors whitespace-nowrap"
                        >
                          Select All
                        </button>
                        <button
                          onClick={() => setSelectedGalleries([])}
                          className="px-1.5 py-1 text-[11px] bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 rounded font-medium transition-colors whitespace-nowrap"
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 max-h-[600px] overflow-y-auto border border-gray-200 rounded-lg p-2">
                      {galleries
                        .filter(
                          (gallery) =>
                            !hideEmptyGalleries ||
                            (gallery.ImageCount && gallery.ImageCount > 0),
                        )
                        .map((gallery) => {
                          const indexEntry = galleryIndex.find(
                            (idx) => idx.albumKey === gallery.AlbumKey,
                          );
                          const isIndexed = !!indexEntry;

                          // Calculate index completion percentage
                          const currentImageCount = gallery.ImageCount || 0;
                          const indexedImageCount = indexEntry?.imageCount || 0;
                          const indexPercentage =
                            currentImageCount > 0
                              ? Math.round(
                                  (indexedImageCount / currentImageCount) * 100,
                                )
                              : 0;

                          // Determine status color
                          let statusColor = "gray"; // not indexed
                          let statusBg = "white";
                          let statusBorder = "gray-300";

                          if (isIndexed) {
                            if (indexPercentage >= 95) {
                              statusColor = "green";
                              statusBg = "from-green-50 to-green-100";
                              statusBorder = "green-400";
                            } else if (indexPercentage >= 70) {
                              statusColor = "yellow";
                              statusBg = "from-yellow-50 to-yellow-100";
                              statusBorder = "yellow-400";
                            } else {
                              statusColor = "red";
                              statusBg = "from-red-50 to-red-100";
                              statusBorder = "red-400";
                            }
                          }

                          // Get analysis status for this gallery
                          const analysisStatus = getGalleryAnalysisStatus(gallery.AlbumKey);

                          return (
                            <div
                              key={gallery.AlbumKey}
                              className={`flex items-center gap-2 border rounded px-2 py-1.5 transition-all hover:shadow-md ${
                                isIndexed
                                  ? `border-${statusBorder} bg-gradient-to-r ${statusBg}`
                                  : "border-gray-300 bg-white hover:border-indigo-400"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedGalleries.includes(
                                  gallery.AlbumKey,
                                )}
                                onChange={() =>
                                  toggleIndexGallerySelection(
                                    gallery.AlbumKey,
                                  )
                                }
                                className="rounded w-4 h-4 min-w-[16px] min-h-[16px] flex-shrink-0"
                              />

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="font-semibold text-gray-900 text-sm truncate leading-tight">
                                    {gallery.Name}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {isIndexed && (
                                      <div
                                        className={`flex items-center gap-0.5 text-[10px] font-semibold whitespace-nowrap flex-shrink-0 ${
                                          statusColor === "green"
                                            ? "text-green-700"
                                            : statusColor === "yellow"
                                              ? "text-yellow-700"
                                              : statusColor === "red"
                                                ? "text-red-700"
                                                : "text-gray-700"
                                        }`}
                                      >
                                        <CheckCircle className="w-3 h-3 flex-shrink-0" />
                                        <span>{indexPercentage}%</span>
                                      </div>
                                    )}
                                    {analysisStatus && (
                                      <div
                                        className={`flex items-center gap-0.5 text-[10px] font-semibold whitespace-nowrap flex-shrink-0 px-1.5 py-0.5 rounded ${
                                          analysisStatus.isComplete
                                            ? "bg-purple-100 text-purple-700"
                                            : "bg-blue-100 text-blue-700"
                                        }`}
                                        title={`Analysis ${analysisStatus.isComplete ? 'completed' : 'in progress'}: ${analysisStatus.percentComplete}% (${analysisStatus.totalPhotos - analysisStatus.pendingPhotos}/${analysisStatus.totalPhotos} photos)`}
                                      >
                                        <Brain className="w-3 h-3 flex-shrink-0" />
                                        <span>{analysisStatus.percentComplete}%</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="text-[10px] text-gray-600 leading-tight">
                                  {gallery.ImageCount || 0} images
                                  {analysisStatus && (
                                    <span className="ml-1 text-purple-600 font-medium">
                                      • {analysisStatus.pendingPhotos} pending review
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Progress Indicator */}
                  {indexingProgress && (
                    <div className="mb-4 sm:mb-6 bg-indigo-50 border border-indigo-200 rounded-lg sm:rounded-xl p-3 sm:p-4">
                      <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                        <Loader className="w-5 h-5 text-indigo-600 animate-spin" />
                        <div className="flex-1">
                          <div className="font-semibold text-indigo-900">
                            Analyzing gallery {indexingProgress.current} of{" "}
                            {indexingProgress.total}
                          </div>
                          <div className="text-sm text-indigo-700">
                            {indexingProgress.galleryName}
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-indigo-600">
                          {Math.round(
                            (indexingProgress.current /
                              indexingProgress.total) *
                              100,
                          )}
                          %
                        </div>
                      </div>
                      <div className="w-full bg-indigo-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${(indexingProgress.current / indexingProgress.total) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Terminal Log */}
                  {terminalLogs.length > 0 && (
                    <div className="bg-gray-900 rounded-lg sm:rounded-xl p-3 sm:p-4 font-mono text-xs text-green-400 max-h-[400px] overflow-y-auto">
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-700">
                        <div className="flex gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        </div>
                        <span className="text-gray-400">process.log</span>
                      </div>
                      {terminalLogs.map((log, idx) => (
                        <div
                          key={idx}
                          className="whitespace-pre-wrap leading-relaxed"
                        >
                          {log}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <button
                      onClick={handleBuildIndex}
                      disabled={isIndexing || isDeleting || selectedGalleries.length === 0}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 text-white px-6 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg"
                    >
                      {isIndexing ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" />
                          Building Index...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Build Index ({selectedGalleries.length} galleries
                          selected)
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleDeleteGalleries}
                      disabled={isIndexing || isDeleting || selectedGalleries.length === 0}
                      className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-300 disabled:to-gray-400 text-white px-6 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg"
                    >
                      {isDeleting ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-5 h-5" />
                          Delete Selected ({selectedGalleries.length} galleries)
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "sort-existing" && (
              <div className="space-y-6">
                {/* Photo Review Interface - shown when analysis session exists */}
                {renderPhotoReviewInterface()}

                {/* Normal Sort Existing Photos UI - only show when no active session */}
                {!currentAnalysisSession && (
                  <>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-2">
                        Sort Existing Photos
                      </h2>
                      <p className="text-gray-600">
                        Analyze photos in a gallery and AI will suggest which
                        indexed gallery each photo belongs in.
                      </p>
                    </div>

                {/* Analysis History */}
                {(() => {
                  const incompleteSessions = allAnalysisSessions.filter(s => !s.completed_at);
                  const completedSessions = allAnalysisSessions.filter(s => s.completed_at);

                  if (allAnalysisSessions.length === 0) return null;

                  return (
                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-lg sm:rounded-xl p-4 sm:p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Brain className="w-5 h-5 text-purple-600" />
                          <h3 className="font-bold text-gray-900">Analysis History</h3>
                        </div>
                        <div className="text-sm text-gray-600">
                          {incompleteSessions.length > 0 && (
                            <span className="text-blue-600 font-semibold">
                              {incompleteSessions.length} in progress
                            </span>
                          )}
                          {incompleteSessions.length > 0 && completedSessions.length > 0 && (
                            <span className="mx-2">•</span>
                          )}
                          {completedSessions.length > 0 && (
                            <span className="text-purple-600 font-semibold">
                              {completedSessions.length} completed
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Incomplete Sessions */}
                      {incompleteSessions.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-blue-700 mb-2">📋 In Progress</h4>
                          <div className="space-y-2">
                            {incompleteSessions
                              .sort((a, b) => new Date(b.last_viewed_at).getTime() - new Date(a.last_viewed_at).getTime())
                              .slice(0, 3)
                              .map(session => {
                                // Calculate stats inline from session data
                                const stats = {
                                  total: session.total_photos,
                                  pending: session.pending_count,
                                  moved: session.moved_count,
                                  copied: session.copied_count,
                                  ignored: session.ignored_count,
                                  percentComplete: Math.round(
                                    ((session.moved_count + session.copied_count + session.ignored_count) / session.total_photos) * 100
                                  ),
                                };
                                return (
                                  <div
                                    key={session.session_id}
                                    className="bg-white border border-blue-200 rounded-lg p-3 hover:shadow-md transition-shadow"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium text-gray-900 text-sm mb-1">
                                          {session.source_gallery_names.join(', ')}
                                        </div>
                                        <div className="text-xs text-gray-600 mb-2">
                                          Started {new Date(session.analyzed_at).toLocaleDateString()} at {new Date(session.analyzed_at).toLocaleTimeString()}
                                        </div>
                                        {stats && (
                                          <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                <div
                                                  className="bg-blue-500 h-2 rounded-full transition-all"
                                                  style={{ width: `${stats.percentComplete}%` }}
                                                />
                                              </div>
                                              <span className="text-xs font-semibold text-blue-700">
                                                {stats.percentComplete}%
                                              </span>
                                            </div>
                                            <div className="text-xs text-gray-600">
                                              {stats.total - stats.pending} of {stats.total} photos processed
                                              {stats.pending > 0 && (
                                                <span className="text-blue-600 font-medium ml-1">
                                                  • {stats.pending} pending
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex gap-1">
                                        <button
                                          onClick={async () => {
                                            setCurrentAnalysisSession(session.session_id);
                                            await analysisStorage.touchSession(session.session_id);
                                          }}
                                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded transition-colors"
                                        >
                                          Resume
                                        </button>
                                        <button
                                          onClick={async () => {
                                            if (confirm(`Delete this analysis session?\n\nThis will remove all analysis data for:\n${session.source_gallery_names.join(', ')}\n\nThis action cannot be undone.`)) {
                                              const success = await analysisStorage.deleteSession(session.session_id);
                                              if (success) {
                                                setCurrentAnalysisSession(null);
                                                setRefreshCounter(prev => prev + 1);
                                              } else {
                                                alert('Failed to delete session. Please try again.');
                                              }
                                            }
                                          }}
                                          className="px-2 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold rounded transition-colors"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Completed Sessions */}
                      {completedSessions.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-purple-700 mb-2">✅ Completed</h4>
                          <div className="space-y-2">
                            {completedSessions
                              .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())
                              .slice(0, 3)
                              .map(session => {
                                // Calculate stats inline from session data
                                const stats = {
                                  total: session.total_photos,
                                  pending: session.pending_count,
                                  moved: session.moved_count,
                                  copied: session.copied_count,
                                  ignored: session.ignored_count,
                                };
                                return (
                                  <div
                                    key={session.session_id}
                                    className="bg-white border border-purple-200 rounded-lg p-3 hover:shadow-md transition-shadow"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium text-gray-900 text-sm mb-1">
                                          {session.source_gallery_names.join(', ')}
                                        </div>
                                        <div className="text-xs text-gray-600 mb-1">
                                          Completed {new Date(session.completed_at!).toLocaleDateString()} at {new Date(session.completed_at!).toLocaleTimeString()}
                                        </div>
                                        {stats && (
                                          <div className="text-xs text-gray-600">
                                            {stats.total} photos analyzed
                                            {stats.moved > 0 && (
                                              <span className="text-green-600 font-medium ml-1">
                                                • {stats.moved} moved
                                              </span>
                                            )}
                                            {stats.copied > 0 && (
                                              <span className="text-blue-600 font-medium ml-1">
                                                • {stats.copied} copied
                                              </span>
                                            )}
                                            {stats.ignored > 0 && (
                                              <span className="text-gray-500 font-medium ml-1">
                                                • {stats.ignored} skipped
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex gap-1">
                                        <button
                                          onClick={async () => {
                                            setCurrentAnalysisSession(session.session_id);
                                            await analysisStorage.touchSession(session.session_id);
                                          }}
                                          className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs font-semibold rounded transition-colors"
                                        >
                                          View
                                        </button>
                                        <button
                                          onClick={async () => {
                                            if (confirm(`Delete this completed analysis?\n\nThis will remove all analysis data for:\n${session.source_gallery_names.join(', ')}\n\nThis action cannot be undone.`)) {
                                              const success = await analysisStorage.deleteSession(session.session_id);
                                              if (success) {
                                                setCurrentAnalysisSession(null);
                                                setRefreshCounter(prev => prev + 1);
                                              } else {
                                                alert('Failed to delete session. Please try again.');
                                              }
                                            }
                                          }}
                                          className="px-2 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold rounded transition-colors"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Show All Button */}
                      {allAnalysisSessions.length > 6 && (
                        <button
                          onClick={() => {
                            alert('Full analysis history browser coming soon!');
                          }}
                          className="w-full mt-3 px-4 py-2 bg-white hover:bg-gray-50 border border-purple-300 text-purple-700 text-sm font-medium rounded-lg transition-colors"
                        >
                          View All {allAnalysisSessions.length} Sessions
                        </button>
                      )}

                      {/* Cleanup Button */}
                      {completedSessions.length > 10 && (
                        <button
                          onClick={async () => {
                            if (confirm(`Clean up old completed sessions?\n\nThis will keep the 10 most recent completed sessions and delete ${completedSessions.length - 10} older ones.\n\nIncomplete sessions will not be affected.`)) {
                              await analysisStorage.cleanupOldSessions();
                              setCurrentAnalysisSession(null);
                              setRefreshCounter(prev => prev + 1);
                            }
                          }}
                          className="w-full mt-2 px-4 py-2 bg-orange-50 hover:bg-orange-100 border border-orange-300 text-orange-700 text-sm font-medium rounded-lg transition-colors"
                        >
                          Clean Up Old Sessions
                        </button>
                      )}
                    </div>
                  );
                })()}

                {/* Status Check */}
                {galleryIndex.length === 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <div className="font-semibold mb-1">No index found!</div>
                      <div>
                        Please go to &quot;Build Index&quot; tab and index some
                        galleries first.
                      </div>
                    </div>
                  </div>
                )}

                {galleryIndex.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center justify-between gap-2 text-sm text-green-800">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="font-semibold">Index ready!</span>
                        <span>{galleryIndex.length} galleries indexed</span>
                      </div>
                      <CacheFreshnessIndicator showAll={true} compact={false} />
                    </div>
                  </div>
                )}

                {/* Multi-Level Selector */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-semibold text-gray-700">
                      Select Folders, Galleries, or Individual Photos
                    </label>
                    <div className="text-sm text-gray-600">
                      {selectedSourceGalleries.size}{" "}
                      {selectedSourceGalleries.size === 1
                        ? "gallery"
                        : "galleries"}{" "}
                      selected
                      {selectedPhotos.size > 0 &&
                        ` • ${selectedPhotos.size} ${selectedPhotos.size === 1 ? "photo" : "photos"} selected`}
                    </div>
                  </div>

                  {/* Folders & Galleries Tree */}
                  <div className="bg-white border border-gray-300 rounded-xl p-4 max-h-96 overflow-y-auto">
                    {folders.length === 0 && galleries.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <FolderTree className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p>Loading folders and galleries...</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {/* Root folders */}
                        {folders
                          .filter(
                            (f) =>
                              !f.ParentNode || f.ParentNode.NodeID === null,
                          )
                          .map((folder) => (
                            <div key={folder.NodeID}>
                              <div className="flex items-center gap-2 py-2 px-2 hover:bg-gray-50 rounded-lg">
                                <button
                                  onClick={() =>
                                    toggleFolderExpand(folder.NodeID)
                                  }
                                  className="p-1 hover:bg-gray-200 rounded"
                                >
                                  {expandedFolders.has(folder.NodeID) ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </button>
                                <input
                                  type="checkbox"
                                  checked={selectedFolders.has(folder.NodeID)}
                                  onChange={() =>
                                    toggleFolderSelection(folder.NodeID)
                                  }
                                  className="w-4 h-4 text-indigo-600 rounded"
                                />
                                <Folder className="w-4 h-4 text-yellow-600" />
                                <span className="text-sm font-medium text-gray-900">
                                  {folder.Name}
                                </span>
                              </div>

                              {/* Child items */}
                              {expandedFolders.has(folder.NodeID) && (
                                <div className="ml-6 space-y-1">
                                  {/* Child folders */}
                                  {folders
                                    .filter(
                                      (f) =>
                                        f.ParentNode?.NodeID === folder.NodeID,
                                    )
                                    .map((childFolder) => (
                                      <div
                                        key={childFolder.NodeID}
                                        className="flex items-center gap-2 py-2 px-2 hover:bg-gray-50 rounded-lg"
                                      >
                                        <button
                                          onClick={() =>
                                            toggleFolderExpand(
                                              childFolder.NodeID,
                                            )
                                          }
                                          className="p-1 hover:bg-gray-200 rounded"
                                        >
                                          {expandedFolders.has(
                                            childFolder.NodeID,
                                          ) ? (
                                            <ChevronDown className="w-4 h-4" />
                                          ) : (
                                            <ChevronRight className="w-4 h-4" />
                                          )}
                                        </button>
                                        <input
                                          type="checkbox"
                                          checked={selectedFolders.has(
                                            childFolder.NodeID,
                                          )}
                                          onChange={() =>
                                            toggleFolderSelection(
                                              childFolder.NodeID,
                                            )
                                          }
                                          className="w-4 h-4 text-indigo-600 rounded"
                                        />
                                        <Folder className="w-4 h-4 text-yellow-600" />
                                        <span className="text-sm text-gray-900">
                                          {childFolder.Name}
                                        </span>
                                      </div>
                                    ))}

                                  {/* Galleries in this folder */}
                                  {galleries
                                    .filter(
                                      (g) =>
                                        g.ParentNode?.NodeID === folder.NodeID,
                                    )
                                    .map((gallery) => {
                                      const isIndexed = galleryIndex.some(
                                        (idx) =>
                                          idx.albumKey === gallery.AlbumKey,
                                      );
                                      return (
                                        <div
                                          key={gallery.AlbumKey}
                                          className="flex items-center gap-2 py-2 px-2 hover:bg-gray-50 rounded-lg ml-6"
                                        >
                                          <div className="w-6" />{" "}
                                          {/* Spacer for alignment */}
                                          <input
                                            type="checkbox"
                                            checked={selectedSourceGalleries.has(
                                              gallery.AlbumKey,
                                            )}
                                            onChange={() =>
                                              toggleGallerySelection(
                                                gallery.AlbumKey,
                                              )
                                            }
                                            className="w-4 h-4 text-indigo-600 rounded"
                                          />
                                          <ImageIcon className="w-4 h-4 text-blue-600" />
                                          <span className="text-sm text-gray-700">
                                            {gallery.Name}
                                          </span>
                                          <span className="text-xs text-gray-500">
                                            ({gallery.ImageCount || 0})
                                          </span>
                                          {isIndexed ? (
                                            <span className="ml-auto px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium flex items-center gap-1">
                                              <CheckCircle className="w-3 h-3" />
                                              Indexed
                                            </span>
                                          ) : (
                                            <span className="ml-auto px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full flex items-center gap-1">
                                              <Info className="w-3 h-3" />
                                              Not indexed
                                            </span>
                                          )}
                                          {!isIndexed && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedGalleries([
                                                  gallery.AlbumKey,
                                                ]);
                                                setActiveTab("build-index");
                                              }}
                                              className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
                                            >
                                              Index now
                                            </button>
                                          )}
                                        </div>
                                      );
                                    })}
                                </div>
                              )}
                            </div>
                          ))}

                        {/* Galleries without folders */}
                        {galleries
                          .filter(
                            (g) =>
                              !g.ParentNode ||
                              !folders.find(
                                (f) => f.NodeID === g.ParentNode?.NodeID,
                              ),
                          )
                          .map((gallery) => {
                            const isIndexed = galleryIndex.some(
                              (idx) => idx.albumKey === gallery.AlbumKey,
                            );
                            return (
                              <div
                                key={gallery.AlbumKey}
                                className="flex items-center gap-2 py-2 px-2 hover:bg-gray-50 rounded-lg"
                              >
                                <div className="w-6" /> {/* Spacer */}
                                <input
                                  type="checkbox"
                                  checked={selectedSourceGalleries.has(
                                    gallery.AlbumKey,
                                  )}
                                  onChange={() =>
                                    toggleGallerySelection(gallery.AlbumKey)
                                  }
                                  className="w-4 h-4 text-indigo-600 rounded"
                                />
                                <ImageIcon className="w-4 h-4 text-blue-600" />
                                <span className="text-sm text-gray-900">
                                  {gallery.Name}
                                </span>
                                <span className="text-xs text-gray-500">
                                  ({gallery.ImageCount || 0})
                                </span>
                                {isIndexed ? (
                                  <span className="ml-auto px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" />
                                    Indexed
                                  </span>
                                ) : (
                                  <span className="ml-auto px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full flex items-center gap-1">
                                    <Info className="w-3 h-3" />
                                    Not indexed
                                  </span>
                                )}
                                {!isIndexed && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedGalleries([gallery.AlbumKey]);
                                      setActiveTab("build-index");
                                    }}
                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
                                  >
                                    Index now
                                  </button>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  {/* Load Photos Button */}
                  {selectedSourceGalleries.size > 0 && (
                    <button
                      onClick={loadPhotosFromSelection}
                      disabled={isSorting}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <ImageIcon className="w-5 h-5" />
                      {showPhotoSelector
                        ? "Reload Photos"
                        : `Load Photos from ${selectedSourceGalleries.size} ${selectedSourceGalleries.size === 1 ? "Gallery" : "Galleries"}`}
                    </button>
                  )}

                  {/* Photo Selector */}
                  {showPhotoSelector && loadedPhotos.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-semibold text-gray-700">
                          Select Photos to Analyze ({loadedPhotos.length}{" "}
                          loaded)
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={selectAllPhotos}
                            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                          >
                            Select All
                          </button>
                          <button
                            onClick={deselectAllPhotos}
                            className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                          >
                            Deselect All
                          </button>
                        </div>
                      </div>

                      <div className="bg-white border border-gray-300 rounded-lg sm:rounded-xl p-3 sm:p-4 max-h-96 overflow-y-auto">
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
                          {loadedPhotos.map((photo) => (
                            <div
                              key={photo.ImageKey}
                              onClick={() =>
                                togglePhotoSelection(photo.ImageKey)
                              }
                              className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                                selectedPhotos.has(photo.ImageKey)
                                  ? "border-indigo-600 ring-2 ring-indigo-600"
                                  : "border-gray-200 hover:border-gray-400"
                              }`}
                            >
                              <img
                                src={photo.ThumbnailUrl}
                                alt={photo.FileName}
                                className="w-full h-32 object-cover"
                              />
                              <div className="absolute top-2 right-2">
                                <input
                                  type="checkbox"
                                  checked={selectedPhotos.has(photo.ImageKey)}
                                  onChange={() => {}}
                                  className="w-5 h-5 text-indigo-600 rounded"
                                />
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                                <p className="text-xs text-white truncate">
                                  {photo.FileName}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Progress */}
                {sortingProgress && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg sm:rounded-xl p-3 sm:p-4 space-y-2 sm:space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-indigo-900">
                          Analyzing image {sortingProgress.current} of{" "}
                          {sortingProgress.total}
                        </div>
                        <div className="text-sm text-indigo-700">
                          {sortingProgress.imageName}
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-indigo-600">
                        {Math.round(
                          (sortingProgress.current / sortingProgress.total) *
                            100,
                        )}
                        %
                      </div>
                    </div>
                    <div className="w-full bg-indigo-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${(sortingProgress.current / sortingProgress.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Execution Progress */}
                {executionProgress && (
                  <div className="bg-green-50 border border-green-200 rounded-lg sm:rounded-xl p-3 sm:p-4 space-y-2 sm:space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-green-900">
                          {copyMode ? "Copying" : "Moving"} image{" "}
                          {executionProgress.current} of{" "}
                          {executionProgress.total}
                        </div>
                        <div className="text-sm text-green-700">
                          {executionProgress.taskName}
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-green-600">
                        {Math.round(
                          (executionProgress.current /
                            executionProgress.total) *
                            100,
                        )}
                        %
                      </div>
                    </div>
                    <div className="w-full bg-green-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${(executionProgress.current / executionProgress.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Terminal Log */}
                {terminalLogs.length > 0 && (
                  <div className="bg-gray-900 rounded-lg sm:rounded-xl p-3 sm:p-4 font-mono text-xs text-green-400 max-h-[400px] overflow-y-auto">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-700">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      </div>
                      <span className="text-gray-400">photo-organizer.log</span>
                    </div>
                    {terminalLogs.map((log, idx) => (
                      <div
                        key={idx}
                        className="whitespace-pre-wrap leading-relaxed"
                      >
                        {log}
                      </div>
                    ))}
                  </div>
                )}

                {/* Analyze Button */}
                <button
                  onClick={handleSortExisting}
                  disabled={
                    isSorting ||
                    (selectedSourceGalleries.size === 0 &&
                      selectedPhotos.size === 0) ||
                    galleryIndex.length === 0
                  }
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-300 disabled:to-gray-400 text-white px-6 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  {isSorting ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Analyzing Selection...
                    </>
                  ) : (
                    <>
                      <Brain className="w-5 h-5" />
                      Analyze Selection
                      {selectedPhotos.size > 0
                        ? ` (${selectedPhotos.size} ${selectedPhotos.size === 1 ? "Photo" : "Photos"})`
                        : selectedSourceGalleries.size > 0
                          ? ` (${selectedSourceGalleries.size} ${selectedSourceGalleries.size === 1 ? "Gallery" : "Galleries"})`
                          : ""}
                    </>
                  )}
                </button>
                  </>
                )}
              </div>
            )}

            {activeTab === "upload-sort" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-indigo-600" />
                    Upload & Sort
                  </h2>
                  <p className="text-gray-600">
                    Upload new photos from your computer and AI will suggest the
                    best gallery for each based on visual content.
                  </p>
                </div>

                {/* Status Check */}
                {galleryIndex.length === 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <div className="font-semibold mb-1">No index found!</div>
                      <div>
                        Please go to &quot;Build Index&quot; tab and index some
                        galleries first.
                      </div>
                    </div>
                  </div>
                )}

                {galleryIndex.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center justify-between gap-2 text-sm text-green-800">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="font-semibold">Index ready!</span>
                        <span>
                          {galleryIndex.length} galleries available for AI
                          matching
                        </span>
                      </div>
                      <CacheFreshnessIndicator showAll={true} compact={false} />
                    </div>
                  </div>
                )}

                {/* Drag & Drop Zone */}
                <div
                  className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 transition-all ${
                    isDragging
                      ? "border-indigo-600 bg-indigo-50"
                      : "border-gray-300 bg-gray-50 hover:border-gray-400"
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragging(false);
                  }}
                  onDrop={handleFileDrop}
                >
                  <div className="text-center">
                    <Cloud
                      className={`w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-4 ${
                        isDragging ? "text-indigo-600" : "text-gray-400"
                      }`}
                    />
                    <p className="text-base sm:text-lg font-semibold text-gray-700 mb-1 sm:mb-2">
                      {isDragging
                        ? "Drop photos here"
                        : "Drag & drop photos here"}
                    </p>
                    <p className="text-sm text-gray-500 mb-3 sm:mb-4">or</p>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <span className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg font-medium inline-block transition-colors min-h-[44px] flex items-center">
                        Browse Files
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 mt-4">
                      Supports JPG, PNG, GIF, and other image formats
                    </p>
                  </div>
                </div>

                {/* Uploaded Photos Grid */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">
                        Uploaded Photos ({uploadedFiles.length})
                      </h3>
                      {uploadedFiles.length > 0 && (
                        <button
                          onClick={() => {
                            uploadedFiles.forEach((file) =>
                              URL.revokeObjectURL(file.preview),
                            );
                            setUploadedFiles([]);
                          }}
                          className="text-sm text-red-600 hover:text-red-700 font-medium"
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4 max-h-96 overflow-y-auto bg-white border border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-4">
                      {uploadedFiles.map((file) => (
                        <div
                          key={file.id}
                          className="relative group rounded-lg overflow-hidden border-2 border-gray-200 hover:border-indigo-400 transition-all"
                        >
                          <img
                            src={file.preview}
                            alt={file.file.name}
                            className="w-full h-32 object-cover"
                          />

                          {/* Status Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent p-2 flex flex-col justify-end">
                            <p className="text-xs text-white truncate mb-1">
                              {file.file.name}
                            </p>

                            {file.status === "pending" && (
                              <div className="flex items-center gap-1 text-xs text-gray-300">
                                <FileImage className="w-3 h-3" />
                                <span>Ready to analyze</span>
                              </div>
                            )}

                            {file.status === "analyzing" && (
                              <div className="flex items-center gap-1 text-xs text-yellow-300">
                                <Loader className="w-3 h-3 animate-spin" />
                                <span>Analyzing...</span>
                              </div>
                            )}

                            {file.status === "complete" && (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-xs text-green-300">
                                  <CheckCircle className="w-3 h-3" />
                                  <span className="truncate">
                                    {file.suggestedGallery}
                                  </span>
                                </div>
                                <div className="text-xs text-green-200">
                                  {file.confidence}% confidence
                                </div>
                              </div>
                            )}

                            {file.status === "error" && (
                              <div className="flex items-center gap-1 text-xs text-red-300">
                                <XCircle className="w-3 h-3" />
                                <span>Analysis failed</span>
                              </div>
                            )}
                          </div>

                          {/* Remove button */}
                          <button
                            onClick={() => removeUploadedFile(file.id)}
                            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Progress Indicator */}
                {uploadProgress && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg sm:rounded-xl p-3 sm:p-4 space-y-2 sm:space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-indigo-900">
                          Analyzing photo {uploadProgress.current} of{" "}
                          {uploadProgress.total}
                        </div>
                        <div className="text-sm text-indigo-700">
                          {uploadProgress.fileName}
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-indigo-600">
                        {Math.round(
                          (uploadProgress.current / uploadProgress.total) * 100,
                        )}
                        %
                      </div>
                    </div>
                    <div className="w-full bg-indigo-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${(uploadProgress.current / uploadProgress.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Terminal Log */}
                {terminalLogs.length > 0 && (
                  <div className="bg-gray-900 rounded-lg sm:rounded-xl p-3 sm:p-4 font-mono text-xs text-green-400 max-h-[400px] overflow-y-auto">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-700">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      </div>
                      <span className="text-gray-400">upload-analysis.log</span>
                    </div>
                    {terminalLogs.map((log, idx) => (
                      <div
                        key={idx}
                        className="whitespace-pre-wrap leading-relaxed"
                      >
                        {log}
                      </div>
                    ))}
                  </div>
                )}

                {/* Analyze Button */}
                {uploadedFiles.length > 0 && (
                  <button
                    onClick={analyzeUploadedPhotos}
                    disabled={isAnalyzingUploads || galleryIndex.length === 0}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-300 disabled:to-gray-400 text-white px-6 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    {isAnalyzingUploads ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        Analyzing {uploadedFiles.length} Photos...
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5" />
                        Analyze & Suggest Galleries ({uploadedFiles.length}{" "}
                        photos)
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Intelligent Culling Tab */}
            {activeTab === "intelligent-culling" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <Filter className="w-5 h-5 text-indigo-600" />
                    Intelligent Culling Assistant
                  </h2>
                  <p className="text-gray-600">
                    AI-powered photo culling that analyzes quality, composition,
                    and detects issues. Turn hours of culling into minutes!
                  </p>
                </div>

                {/* Album Selection */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-purple-200">
                  <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <Camera className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-1">
                        Select Albums to Cull
                      </h3>
                      <p className="text-sm text-gray-600">
                        Choose one or more albums to analyze and cull photos
                        from
                      </p>
                    </div>
                  </div>

                  {/* Albums Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4 max-h-96 overflow-y-auto p-1">
                    {galleries.map((gallery) => {
                      const isSelected = selectedCullingAlbums.has(
                        gallery.AlbumKey,
                      );
                      return (
                        <button
                          key={gallery.AlbumKey}
                          onClick={() => {
                            const newSelection = new Set(selectedCullingAlbums);
                            if (isSelected) {
                              newSelection.delete(gallery.AlbumKey);
                            } else {
                              newSelection.add(gallery.AlbumKey);
                            }
                            setSelectedCullingAlbums(newSelection);
                          }}
                          className={`bg-white border-2 rounded-lg p-4 hover:shadow-lg cursor-pointer transition-all text-left relative ${
                            isSelected
                              ? "border-purple-500 ring-2 ring-purple-200 bg-purple-50"
                              : "border-gray-200 hover:border-purple-300"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 truncate">
                                {gallery.Name}
                              </h4>
                              <p className="text-sm text-gray-500">
                                {gallery.ImageCount} photos
                              </p>
                            </div>
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                                isSelected ? "bg-purple-500" : "bg-gray-200"
                              }`}
                            >
                              <Check
                                className={`w-4 h-4 ${isSelected ? "text-white" : "text-gray-400"}`}
                              />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Load & Analyze Button */}
                  <div className="flex items-center justify-between gap-3 sm:gap-4 pt-3 sm:pt-4 border-t border-purple-200">
                    <div className="text-sm text-gray-600">
                      {selectedCullingAlbums.size === 0
                        ? "Select albums to analyze"
                        : `${selectedCullingAlbums.size} album${selectedCullingAlbums.size !== 1 ? "s" : ""} selected`}
                    </div>
                    <button
                      onClick={() =>
                        loadPhotosForCulling(selectedCullingAlbums)
                      }
                      disabled={
                        selectedCullingAlbums.size === 0 || isAnalyzingPhotos
                      }
                      className={`px-6 py-3 font-bold rounded-lg transition-all flex items-center gap-2 ${
                        selectedCullingAlbums.size > 0 && !isAnalyzingPhotos
                          ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
                          : "bg-gray-200 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      {isAnalyzingPhotos ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" />
                          Analyzing...{" "}
                          {cullingProgress
                            ? `${cullingProgress.current}/${cullingProgress.total}`
                            : ""}
                        </>
                      ) : (
                        <>
                          <Brain className="w-5 h-5" />
                          Load & Analyze
                        </>
                      )}
                    </button>
                  </div>

                  {/* Auto-Cull Settings */}
                  <div className="mt-4 p-4 bg-white rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">
                        Auto-Reject Threshold (Quality Score)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={autoRejectThreshold}
                          onChange={(e) =>
                            setAutoRejectThreshold(Number(e.target.value))
                          }
                          className="w-32"
                        />
                        <span className="text-sm font-bold text-purple-600 w-8">
                          {autoRejectThreshold}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Photos scoring below {autoRejectThreshold}/10 will be
                      flagged for rejection
                    </p>
                  </div>
                </div>

                {/* Statistics Panel */}
                {cullingStatistics && (
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg sm:rounded-xl p-4 sm:p-6 text-white">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Culling Statistics
                      </h3>
                      <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
                        ⏱ ~{cullingStatistics.estimatedTimeSavedMinutes}{" "}
                        minutes saved
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
                      <div>
                        <div className="text-3xl font-bold">
                          {cullingStatistics.total}
                        </div>
                        <div className="text-sm text-white/80">
                          Total Photos
                        </div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-green-300">
                          {cullingStatistics.keeps}
                        </div>
                        <div className="text-sm text-white/80">
                          Keeps ({cullingStatistics.keepRatio}%)
                        </div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-red-300">
                          {cullingStatistics.rejects}
                        </div>
                        <div className="text-sm text-white/80">Rejects</div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-yellow-300">
                          {cullingStatistics.picks}
                        </div>
                        <div className="text-sm text-white/80">Picks ⭐</div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold">
                          {cullingStatistics.avgQualityScore}
                        </div>
                        <div className="text-sm text-white/80">Avg Quality</div>
                      </div>
                    </div>

                    <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/20">
                      <div className="flex items-center justify-between text-sm">
                        <span>
                          {cullingStatistics.technicalIssuesCount} technical
                          issues
                        </span>
                        <span>{cullingStatistics.keyMoments} key moments</span>
                        <span>
                          {cullingStatistics.portfolioWorthy} portfolio worthy
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Bar */}
                {cullingPhotos.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex flex-wrap items-center gap-3">
                      {/* View Controls */}
                      <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-300 p-1">
                        <button
                          onClick={() => setViewMode("grid")}
                          className={`px-4 py-2 min-h-[44px] rounded text-sm ${viewMode === "grid" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100 active:bg-gray-200"}`}
                        >
                          Grid
                        </button>
                        <button
                          onClick={() => setViewMode("single")}
                          className={`px-4 py-2 min-h-[44px] rounded text-sm ${viewMode === "single" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100 active:bg-gray-200"}`}
                        >
                          Single
                        </button>
                      </div>

                      {/* Filter Controls */}
                      <select
                        value={filterMode}
                        onChange={(e) => setFilterMode(e.target.value as any)}
                        className="px-3 py-2 border border-gray-300 rounded-lg bg-white"
                      >
                        <option value="all">All Photos</option>
                        <option value="keeps">Keeps Only</option>
                        <option value="rejects">Rejects Only</option>
                        <option value="picks">Picks Only</option>
                        <option value="review">Needs Review</option>
                      </select>

                      {/* Toggle Filters */}
                      <button
                        onClick={() => setShowSimilarGroups(!showSimilarGroups)}
                        className={`px-3 py-2 rounded-lg border ${showSimilarGroups ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-700 border-gray-300"}`}
                      >
                        Group Similar
                      </button>
                      <button
                        onClick={() =>
                          setShowKeyMomentsOnly(!showKeyMomentsOnly)
                        }
                        className={`px-3 py-2 rounded-lg border ${showKeyMomentsOnly ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-700 border-gray-300"}`}
                      >
                        Key Moments
                      </button>
                      <button
                        onClick={() => setShowPortfolioOnly(!showPortfolioOnly)}
                        className={`px-3 py-2 rounded-lg border ${showPortfolioOnly ? "bg-yellow-600 text-white border-yellow-600" : "bg-white text-gray-700 border-gray-300"}`}
                      >
                        Portfolio
                      </button>

                      <div className="flex-1" />

                      {/* Batch Actions */}
                      <button
                        onClick={autoRejectIssues}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                      >
                        <AlertCircle className="w-4 h-4" />
                        Auto-Reject Issues
                      </button>
                      <button
                        onClick={keepBestFromGroups}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        Keep Best from Groups
                      </button>
                      <button
                        onClick={resetCullingSelections}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Reset
                      </button>
                      <button
                        onClick={exportCullingReport}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Export Report
                      </button>
                      <button
                        onClick={applyCulling}
                        className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg hover:from-red-700 hover:to-orange-700 transition-all shadow-lg flex items-center gap-2 font-bold"
                      >
                        <Trash2 className="w-4 h-4" />
                        Apply Culling
                      </button>
                    </div>

                    {/* Keyboard Shortcuts */}
                    {viewMode === "single" && (
                      <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
                        <span className="font-semibold">
                          Keyboard Shortcuts:
                        </span>{" "}
                        ← → Navigate • P Pick/Star • X Reject • K Keep • U Undo
                        • G Toggle Groups
                      </div>
                    )}
                  </div>
                )}

                {/* Photo Grid */}
                {cullingPhotos.length > 0 && viewMode === "grid" && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                    {getFilteredPhotos().map((photo, index) => {
                      const getBorderColor = () => {
                        if (photo.cullingStatus === "pick")
                          return "ring-4 ring-yellow-400";
                        if (photo.cullingStatus === "keep")
                          return "ring-4 ring-green-500";
                        if (photo.cullingStatus === "reject")
                          return "ring-4 ring-red-500 opacity-50";
                        return "ring-1 ring-gray-300";
                      };

                      const hasIssues =
                        photo.technicalIssues?.blur ||
                        photo.technicalIssues?.exposure !== "good" ||
                        photo.technicalIssues?.focus === "blurry" ||
                        photo.subjectIssues?.eyesClosed;

                      return (
                        <div
                          key={photo.imageKey}
                          className={`relative group cursor-pointer rounded-lg overflow-hidden ${getBorderColor()} transition-all hover:scale-105`}
                          onClick={() => {
                            setSelectedPhotoIndex(index);
                            setViewMode("single");
                          }}
                        >
                          <img
                            src={photo.thumbnailUrl}
                            alt={photo.imageName}
                            className="w-full h-48 object-cover"
                          />

                          {/* Status Overlay */}
                          {photo.cullingStatus === "reject" && (
                            <div className="absolute inset-0 bg-red-500 bg-opacity-30 flex items-center justify-center">
                              <X className="w-12 h-12 text-white" />
                            </div>
                          )}

                          {/* Badges */}
                          <div className="absolute top-2 left-2 right-2 flex flex-wrap gap-1">
                            {photo.cullingStatus === "pick" && (
                              <span className="bg-yellow-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                                ⭐ PICK
                              </span>
                            )}
                            {photo.isPortfolioWorthy && (
                              <span className="bg-purple-600 text-white px-2 py-0.5 rounded-full text-xs">
                                Portfolio
                              </span>
                            )}
                            {photo.keyMoment && (
                              <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-xs">
                                Key
                              </span>
                            )}
                            {hasIssues && (
                              <span className="bg-red-600 text-white px-2 py-0.5 rounded-full text-xs">
                                Issues
                              </span>
                            )}
                            {photo.isBestInGroup &&
                              photo.groupSize &&
                              photo.groupSize > 1 && (
                                <span className="bg-green-600 text-white px-2 py-0.5 rounded-full text-xs">
                                  Best of {photo.groupSize}
                                </span>
                              )}
                          </div>

                          {/* Quality Score */}
                          <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-bold">
                            {photo.qualityScore}/10
                          </div>

                          {/* Quick Actions */}
                          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updatePhotoStatus(index, "pick");
                              }}
                              className="bg-yellow-500 text-white p-1.5 rounded hover:bg-yellow-600"
                            >
                              <Star className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updatePhotoStatus(index, "keep");
                              }}
                              className="bg-green-500 text-white p-1.5 rounded hover:bg-green-600"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updatePhotoStatus(index, "reject");
                              }}
                              className="bg-red-500 text-white p-1.5 rounded hover:bg-red-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Single Photo View */}
                {cullingPhotos.length > 0 && viewMode === "single" && (
                  <div className="bg-gray-900 rounded-lg sm:rounded-xl p-4 sm:p-6">
                    <div className="flex items-start gap-6">
                      {/* Main Photo */}
                      <div className="flex-1">
                        <img
                          src={
                            getFilteredPhotos()[selectedPhotoIndex]?.imageUrl ||
                            getFilteredPhotos()[selectedPhotoIndex]
                              ?.thumbnailUrl
                          }
                          alt={
                            getFilteredPhotos()[selectedPhotoIndex]?.imageName
                          }
                          className="w-full rounded-lg"
                        />
                      </div>

                      {/* Photo Details */}
                      <div className="w-96 bg-white rounded-lg p-6 space-y-4">
                        <div>
                          <h3 className="font-bold text-lg text-gray-900 mb-2">
                            {getFilteredPhotos()[selectedPhotoIndex]?.imageName}
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className="text-3xl font-bold text-indigo-600">
                              {
                                getFilteredPhotos()[selectedPhotoIndex]
                                  ?.qualityScore
                              }
                              /10
                            </span>
                            <span className="text-sm text-gray-500">
                              Quality Score
                            </span>
                          </div>
                        </div>

                        {/* Assessment */}
                        <div>
                          <h4 className="font-semibold text-gray-700 mb-1">
                            AI Assessment
                          </h4>
                          <p className="text-sm text-gray-600">
                            {
                              getFilteredPhotos()[selectedPhotoIndex]
                                ?.overallAssessment
                            }
                          </p>
                        </div>

                        {/* Issues */}
                        <div>
                          <h4 className="font-semibold text-gray-700 mb-2">
                            Detected Issues
                          </h4>
                          <div className="space-y-1">
                            {getFilteredPhotos()[selectedPhotoIndex]
                              ?.technicalIssues?.blur && (
                              <div className="text-sm text-red-600">
                                • Motion blur detected
                              </div>
                            )}
                            {getFilteredPhotos()[selectedPhotoIndex]
                              ?.technicalIssues?.exposure !== "good" && (
                              <div className="text-sm text-red-600">
                                •{" "}
                                {
                                  getFilteredPhotos()[selectedPhotoIndex]
                                    ?.technicalIssues?.exposure
                                }
                              </div>
                            )}
                            {getFilteredPhotos()[selectedPhotoIndex]
                              ?.technicalIssues?.noise && (
                              <div className="text-sm text-red-600">
                                • Excessive noise/grain
                              </div>
                            )}
                            {getFilteredPhotos()[selectedPhotoIndex]
                              ?.subjectIssues?.eyesClosed && (
                              <div className="text-sm text-red-600">
                                • Eyes closed
                              </div>
                            )}
                            {getFilteredPhotos()[selectedPhotoIndex]
                              ?.subjectIssues?.awkwardExpression && (
                              <div className="text-sm text-red-600">
                                • Awkward expression
                              </div>
                            )}
                          </div>
                          {!getFilteredPhotos()[selectedPhotoIndex]
                            ?.technicalIssues?.blur &&
                            getFilteredPhotos()[selectedPhotoIndex]
                              ?.technicalIssues?.exposure === "good" &&
                            !getFilteredPhotos()[selectedPhotoIndex]
                              ?.subjectIssues?.eyesClosed && (
                              <div className="text-sm text-green-600">
                                No major issues detected
                              </div>
                            )}
                        </div>

                        {/* Special Markers */}
                        <div className="flex flex-wrap gap-2">
                          {getFilteredPhotos()[selectedPhotoIndex]
                            ?.isPortfolioWorthy && (
                            <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                              Portfolio Worthy
                            </span>
                          )}
                          {getFilteredPhotos()[selectedPhotoIndex]
                            ?.keyMoment && (
                            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                              {
                                getFilteredPhotos()[selectedPhotoIndex]
                                  ?.keyMoment
                              }
                            </span>
                          )}
                          {getFilteredPhotos()[selectedPhotoIndex]
                            ?.isBestInGroup && (
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                              Best of{" "}
                              {
                                getFilteredPhotos()[selectedPhotoIndex]
                                  ?.groupSize
                              }
                            </span>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-3 sm:pt-4 border-t border-gray-200">
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              onClick={() =>
                                updatePhotoStatus(selectedPhotoIndex, "pick")
                              }
                              className={`py-2 rounded-lg font-medium transition-colors ${
                                getFilteredPhotos()[selectedPhotoIndex]
                                  ?.cullingStatus === "pick"
                                  ? "bg-yellow-500 text-white"
                                  : "bg-gray-100 text-gray-700 hover:bg-yellow-100"
                              }`}
                            >
                              ⭐ Pick
                            </button>
                            <button
                              onClick={() =>
                                updatePhotoStatus(selectedPhotoIndex, "keep")
                              }
                              className={`py-2 rounded-lg font-medium transition-colors ${
                                getFilteredPhotos()[selectedPhotoIndex]
                                  ?.cullingStatus === "keep"
                                  ? "bg-green-500 text-white"
                                  : "bg-gray-100 text-gray-700 hover:bg-green-100"
                              }`}
                            >
                              ✓ Keep
                            </button>
                            <button
                              onClick={() =>
                                updatePhotoStatus(selectedPhotoIndex, "reject")
                              }
                              className={`py-2 rounded-lg font-medium transition-colors ${
                                getFilteredPhotos()[selectedPhotoIndex]
                                  ?.cullingStatus === "reject"
                                  ? "bg-red-500 text-white"
                                  : "bg-gray-100 text-gray-700 hover:bg-red-100"
                              }`}
                            >
                              ✗ Reject
                            </button>
                          </div>
                        </div>

                        {/* Navigation */}
                        <div className="flex items-center justify-between pt-4">
                          <button
                            onClick={() =>
                              setSelectedPhotoIndex(
                                Math.max(0, selectedPhotoIndex - 1),
                              )
                            }
                            disabled={selectedPhotoIndex === 0}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            ← Previous
                          </button>
                          <span className="text-sm text-gray-500">
                            {selectedPhotoIndex + 1} /{" "}
                            {getFilteredPhotos().length}
                          </span>
                          <button
                            onClick={() =>
                              setSelectedPhotoIndex(
                                Math.min(
                                  getFilteredPhotos().length - 1,
                                  selectedPhotoIndex + 1,
                                ),
                              )
                            }
                            disabled={
                              selectedPhotoIndex ===
                              getFilteredPhotos().length - 1
                            }
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next →
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {!isAnalyzingPhotos && cullingPhotos.length === 0 && (
                  <div className="text-center py-8 sm:py-12">
                    <Camera className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-2 sm:mb-4" />
                    <p className="text-sm sm:text-base text-gray-500">
                      Select an album and click &quot;Load & Analyze&quot; to
                      start culling
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dry Run Review Modal */}
      {showDryRun && organizeTasks.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-[95vw] sm:max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex flex-wrap items-center gap-2">
                  Review Suggested {copyMode ? "Copies" : "Moves"}
                  <span className="text-sm font-normal px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                    {copyMode ? "📋 Copy Mode" : "↔️ Move Mode"}
                  </span>
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {
                    organizeTasks.filter((t) => t.status === "auto-approved")
                      .length
                  }{" "}
                  auto-approved ·{" "}
                  {
                    organizeTasks.filter((t) => t.status === "needs-review")
                      .length
                  }{" "}
                  need review ·{" "}
                  {organizeTasks.filter((t) => t.status === "skipped").length}{" "}
                  skipped
                </p>
              </div>
              <button
                onClick={() => setShowDryRun(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {organizeTasks.map((task, idx) => (
                <div
                  key={idx}
                  className={`border-2 rounded-lg sm:rounded-xl p-3 sm:p-4 ${
                    task.status === "auto-approved"
                      ? "border-green-300 bg-green-50"
                      : task.status === "needs-review"
                        ? "border-yellow-300 bg-yellow-50"
                        : "border-gray-300 bg-gray-50"
                  }`}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* Thumbnail */}
                    {task.imageUrl && (
                      <img
                        src={task.imageUrl}
                        alt={task.imageName}
                        className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                      />
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">
                        {task.imageName}
                      </div>
                      <div className="text-sm mt-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 font-medium">
                            FROM:
                          </span>
                          <span className="font-semibold text-gray-700">
                            {task.sourceGallery}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 font-medium">
                            {copyMode ? "COPY TO:" : "MOVE TO:"}
                          </span>
                          <span className="font-semibold text-indigo-600">
                            {task.suggestedGallery}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {task.reasoning}
                      </div>
                    </div>

                    {/* Confidence Badge */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          task.confidence >= 90
                            ? "bg-green-200 text-green-800"
                            : task.confidence >= 70
                              ? "bg-yellow-200 text-yellow-800"
                              : "bg-gray-200 text-gray-800"
                        }`}
                      >
                        {task.confidence}% confidence
                      </div>
                      {task.status === "auto-approved" && (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                      {task.status === "needs-review" && (
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      )}
                      {task.status === "skipped" && (
                        <XCircle className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Actions */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
              <button
                onClick={() => setShowDryRun(false)}
                className="px-6 py-3 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteOrganize}
                className="px-8 py-3 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                {copyMode ? "Execute Copies" : "Execute Moves"} (
                {
                  organizeTasks.filter(
                    (t) =>
                      t.status === "auto-approved" ||
                      t.status === "needs-review",
                  ).length
                }
                )
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Dry Run Review Modal */}
      {showUploadDryRun && uploadSortTasks.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-[95vw] sm:max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex flex-wrap items-center gap-2">
                  Review Upload Suggestions
                  <span className="text-sm font-normal px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                    🎨 AI Vision Analysis
                  </span>
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {
                    uploadSortTasks.filter((t) => t.status === "auto-approved")
                      .length
                  }{" "}
                  auto-approved ·{" "}
                  {
                    uploadSortTasks.filter((t) => t.status === "needs-review")
                      .length
                  }{" "}
                  need review ·{" "}
                  {uploadSortTasks.filter((t) => t.status === "skipped").length}{" "}
                  skipped
                </p>
              </div>
              <button
                onClick={() => setShowUploadDryRun(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {/* Select All Control */}
              <div className="flex items-center justify-between bg-gray-100 rounded-lg p-3 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={uploadSortTasks.every(t => t.isSelected)}
                    onChange={(e) => {
                      setUploadSortTasks(uploadSortTasks.map(t => ({
                        ...t,
                        isSelected: e.target.checked
                      })));
                    }}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="font-medium text-gray-700">Select All ({uploadSortTasks.filter(t => t.isSelected).length}/{uploadSortTasks.length})</span>
                </label>
                <button
                  onClick={() => {
                    const selectedTasks = uploadSortTasks.filter(t => t.isSelected);
                    if (selectedTasks.length > 0) {
                      setUploadSortTasks(uploadSortTasks.map(t =>
                        t.isSelected ? { ...t, status: "auto-approved" as const } : t
                      ));
                    }
                  }}
                  disabled={!uploadSortTasks.some(t => t.isSelected)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Approve Selected
                </button>
              </div>

              {uploadSortTasks.map((task, idx) => (
                <div
                  key={idx}
                  className={`border-2 rounded-lg sm:rounded-xl p-3 sm:p-4 ${
                    task.status === "auto-approved"
                      ? "border-green-300 bg-green-50"
                      : task.status === "needs-review"
                        ? "border-yellow-300 bg-yellow-50"
                        : task.status === "rejected"
                          ? "border-red-300 bg-red-50"
                          : "border-gray-300 bg-gray-50"
                  }`}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={task.isSelected || false}
                      onChange={(e) => {
                        setUploadSortTasks(uploadSortTasks.map((t, i) =>
                          i === idx ? { ...t, isSelected: e.target.checked } : t
                        ));
                      }}
                      className="w-5 h-5 mt-1 rounded border-gray-300"
                    />

                    {/* Thumbnail */}
                    <img
                      src={task.preview}
                      alt={task.fileName}
                      className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">
                        {task.fileName}
                      </div>
                      <div className="text-sm mt-2 space-y-2">
                        <div>
                          <span className="text-gray-500 font-medium">
                            Visual Analysis:
                          </span>
                          <p className="text-gray-700 text-xs mt-0.5">
                            {task.visualAnalysis}
                          </p>
                        </div>

                        {/* Gallery Selection - AI Suggestion + Manual Override */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 font-medium">
                              AI Suggested:
                            </span>
                            <span className="font-semibold text-indigo-600">
                              {task.suggestedGallery}
                            </span>
                          </div>

                          {/* Manual Gallery Selection Dropdown */}
                          <div className="flex items-center gap-2">
                            <label className="text-gray-500 font-medium text-xs">
                              Override:
                            </label>
                            <select
                              value={task.manualGallery || ''}
                              onChange={(e) => {
                                setUploadSortTasks(uploadSortTasks.map((t, i) =>
                                  i === idx ? { ...t, manualGallery: e.target.value, status: e.target.value ? "auto-approved" as const : t.status } : t
                                ));
                              }}
                              className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-1 bg-white"
                            >
                              <option value="">Use AI suggestion</option>
                              {galleryIndex.map((g) => (
                                <option key={g.albumKey} value={g.name}>
                                  {g.name} ({g.imageCount} photos)
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="text-xs text-gray-600">
                          {task.reasoning}
                        </div>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          task.confidence >= 90
                            ? "bg-green-200 text-green-800"
                            : task.confidence >= 70
                              ? "bg-yellow-200 text-yellow-800"
                              : "bg-gray-200 text-gray-800"
                        }`}
                      >
                        {task.confidence}% confidence
                      </div>

                      {/* Status Icons */}
                      <div className="flex items-center gap-1">
                        {task.status === "auto-approved" && (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )}
                        {task.status === "needs-review" && (
                          <AlertTriangle className="w-5 h-5 text-yellow-600" />
                        )}
                        {task.status === "skipped" && (
                          <XCircle className="w-5 h-5 text-gray-400" />
                        )}
                        {task.status === "rejected" && (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-1 w-full">
                        {task.status !== "rejected" && (
                          <button
                            onClick={() => {
                              setUploadSortTasks(uploadSortTasks.map((t, i) =>
                                i === idx ? { ...t, status: "rejected" as const } : t
                              ));
                            }}
                            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-medium transition-colors"
                          >
                            Reject
                          </button>
                        )}
                        {task.status === "rejected" && (
                          <button
                            onClick={() => {
                              setUploadSortTasks(uploadSortTasks.map((t, i) =>
                                i === idx ? { ...t, status: "auto-approved" as const } : t
                              ));
                            }}
                            className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded text-xs font-medium transition-colors"
                          >
                            Approve
                          </button>
                        )}
                        <button
                          onClick={() => {
                            // Individual upload for this photo
                            const finalGallery = task.manualGallery || task.suggestedGallery;
                            const destGallery = galleryIndex.find(g => g.name === finalGallery);
                            if (destGallery) {
                              // Handle individual upload
                              alert(`Uploading ${task.fileName} to ${finalGallery}`);
                            }
                          }}
                          disabled={task.status === "rejected"}
                          className="px-3 py-1 bg-indigo-100 hover:bg-indigo-200 disabled:bg-gray-200 disabled:text-gray-400 text-indigo-700 rounded text-xs font-medium transition-colors"
                        >
                          Upload Now
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Actions */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
              <button
                onClick={() => setShowUploadDryRun(false)}
                className="px-6 py-3 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteUploadSort}
                className="px-8 py-3 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"
              >
                <Cloud className="w-5 h-5" />
                Upload to SmugMug (
                {
                  uploadSortTasks.filter(
                    (t) =>
                      (t.status === "auto-approved" ||
                      t.status === "needs-review") &&
                      t.status !== "rejected"
                  ).length
                }
                )
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Delete {selectedGalleries.length} {selectedGalleries.length === 1 ? 'Gallery' : 'Galleries'}?
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  This action cannot be undone
                </p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800 font-medium mb-2">
                ⚠️ Warning: This will permanently delete:
              </p>
              <ul className="text-sm text-red-700 space-y-1 ml-4">
                <li>• {selectedGalleries.length} {selectedGalleries.length === 1 ? 'gallery' : 'galleries'}</li>
                <li>• All photos in {selectedGalleries.length === 1 ? 'this gallery' : 'these galleries'}</li>
                <li>• All metadata and settings</li>
              </ul>
              <p className="text-sm text-red-800 font-semibold mt-3">
                This action is irreversible!
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* System Prompt Viewer */}
      <SystemPromptViewer
        toolName="Intelligent Culling Assistant"
        apiEndpoint="/api/ai/analyze-photo-quality"
        toolId="photo-organizer-culling"
      />
    </div>
  );
}
