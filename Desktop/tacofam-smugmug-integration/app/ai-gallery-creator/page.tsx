'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Sparkles, FolderTree, Image as ImageIcon, CheckCircle, XCircle, Loader, AlertCircle, Folder, Layers, Plus, Trash2, ChevronLeft, ChevronRight, Minimize2, Maximize2, ExternalLink } from 'lucide-react';
import { tokenStorage } from '@/lib/smugmug-client';
import ToolboxHeader from '@/components/ToolboxHeader';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface FolderNode {
  name: string;
  parentFolderName?: string;
  parentFolderId?: string;
  urlName?: string;
  privacy?: 'Public' | 'Private' | 'Unlisted';
  tempId?: string;
}

interface GalleryNode {
  name: string;
  parentFolderName?: string;
  parentFolderId?: string;
  urlName?: string;
  description?: string;
  keywords?: string[];
  privacy?: 'Public' | 'Private' | 'Unlisted';
  albumTemplateUri?: string;
  tempId?: string;
}

interface AlbumTemplate {
  Uri: string;
  Name: string;
  AlbumTemplateKey: string;
}

interface SmugMugFolder {
  NodeID: string;
  Name: string;
  Uri: string;
  UrlName: string;
}

interface CreationPlan {
  folders: FolderNode[];
  galleries: GalleryNode[];
  summary: string;
  reasoning?: string;
}

type CreationStatus = 'idle' | 'planning' | 'confirming' | 'creating' | 'success' | 'error';

export default function AIGalleryCreatorPage() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<CreationStatus>('idle');
  const [currentPlan, setCurrentPlan] = useState<CreationPlan | null>(null);
  const [creationProgress, setCreationProgress] = useState<string[]>([]);

  // Manual creation state
  const [manualFolders, setManualFolders] = useState<FolderNode[]>([]);
  const [manualGalleries, setManualGalleries] = useState<GalleryNode[]>([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [newGalleryName, setNewGalleryName] = useState('');
  const [selectedParentFolder, setSelectedParentFolder] = useState<string>('');
  const [selectedPrivacy, setSelectedPrivacy] = useState<'Public' | 'Private' | 'Unlisted'>('Private');
  const [albumTemplates, setAlbumTemplates] = useState<AlbumTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [smugmugFolders, setSmugmugFolders] = useState<SmugMugFolder[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [enableGuestUpload, setEnableGuestUpload] = useState(false);
  const [guestUploadPassword, setGuestUploadPassword] = useState('');

  // Chat panel state
  const [chatPanelState, setChatPanelState] = useState<'open' | 'collapsed' | 'hidden' | 'popped'>('open');
  const [chatWidth, setChatWidth] = useState(30); // percentage

  useEffect(() => {
    // Check auth
    const tokens = tokenStorage.getTokens();
    if (!tokens) {
      router.push('/');
      return;
    }

    // Welcome message
    setMessages([
      {
        role: 'assistant',
        content: "👋 Hi! I'm your AI assistant for creating SmugMug folders and galleries.\n\nI can help you:\n• Create new folder structures from scratch\n• Add galleries to your existing folders\n• Organize complex event hierarchies\n\n**Examples:**\n• \"Create a wedding event structure\"\n• \"Add 5 galleries to my Wedding Events folder\"\n• \"Look for the Sports folder and create team galleries inside\"\n• \"Set up my 2025 portfolio with folders for different types of shoots\"",
        timestamp: new Date(),
      },
    ]);

    // Load album templates and folders
    loadAlbumTemplates();
    loadSmugmugFolders();
  }, [router]);

  const loadSmugmugFolders = async () => {
    setIsLoadingFolders(true);
    try {
      const tokens = tokenStorage.getTokens();
      if (!tokens) return;

      const response = await fetch('/api/smugmug/folders', {
        headers: {
          'X-Access-Token': tokens.accessToken || '',
          'X-Access-Token-Secret': tokens.accessTokenSecret || '',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const folders = data.folders || [];
        setSmugmugFolders(folders);
      }
    } catch (error) {
      console.error('Error loading folders:', error);
    } finally {
      setIsLoadingFolders(false);
    }
  };

  const loadAlbumTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const tokens = tokenStorage.getTokens();
      if (!tokens) return;

      const response = await fetch('/api/smugmug/album-templates', {
        headers: {
          'X-Access-Token': tokens.accessToken || '',
          'X-Access-Token-Secret': tokens.accessTokenSecret || '',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const templates = data.Response?.AlbumTemplate || [];
        setAlbumTemplates(templates);
      }
    } catch (error) {
      console.error('Error loading album templates:', error);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setStatus('planning');

    try {
      // Call Claude AI to generate plan
      const response = await fetch('/api/ai/generate-gallery-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputMessage,
          conversationHistory: messages,
          existingFolders: smugmugFolders, // Pass existing folders to AI
        }),
      });

      const data = await response.json();

      if (data.plan) {
        // AI generated a creation plan
        setCurrentPlan(data.plan);
        setStatus('confirming');

        const assistantMessage: Message = {
          role: 'assistant',
          content: data.message || "Here's what I propose:",
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        // AI needs more information or is clarifying
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setStatus('idle');
      }
    } catch (error) {
      console.error('Error generating plan:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "I'm sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
        },
      ]);
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmPlan = async () => {
    if (!currentPlan) return;

    setStatus('creating');
    setCreationProgress(['Starting creation process...']);

    try {
      // Execute the plan
      const response = await fetch('/api/smugmug/create-structure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Access-Token': tokenStorage.getTokens()?.accessToken || '',
          'X-Access-Token-Secret': tokenStorage.getTokens()?.accessTokenSecret || '',
        },
        body: JSON.stringify({ plan: currentPlan }),
      });

      const result = await response.json();

      if (result.success) {
        setStatus('success');
        let successMessage = `✅ Successfully created ${result.foldersCreated} folder(s) and ${result.galleriesCreated} gallery/galleries!`;

        // Add upload URLs if any were created
        if (result.uploadUrls && result.uploadUrls.length > 0) {
          successMessage += '\n\n📤 Guest Upload Links:\n';
          result.uploadUrls.forEach((item: { galleryName: string; uploadUrl: string }) => {
            successMessage += `\n**${item.galleryName}**\n${item.uploadUrl}\n`;
          });
          successMessage += '\nShare these links with guests to allow photo uploads!';
        }

        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: successMessage,
            timestamp: new Date(),
          },
        ]);
        setCurrentPlan(null);
      } else if (result.errors && result.errors.length > 0) {
        // Partial success - some items created, some failed
        setStatus('error');
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `⚠️ Partial success: Created ${result.foldersCreated} folder(s) and ${result.galleriesCreated} gallery/galleries.\n\nErrors:\n${result.errors.map((e: string) => `• ${e}`).join('\n')}`,
            timestamp: new Date(),
          },
        ]);
        setCurrentPlan(null);
      } else {
        throw new Error(result.error || 'Creation failed');
      }
    } catch (error) {
      console.error('Error creating structure:', error);
      setStatus('error');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to create structure'}`,
          timestamp: new Date(),
        },
      ]);
    }
  };

  const handleRejectPlan = () => {
    setCurrentPlan(null);
    setStatus('idle');
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: "No problem! What would you like to change?",
        timestamp: new Date(),
      },
    ]);
  };

  // Manual creation handlers
  const addManualFolder = () => {
    if (!newFolderName.trim()) return;

    // Check if selected parent is a NodeID (existing folder) or a folder name (newly created)
    const isNodeId = selectedParentFolder && smugmugFolders.some(f => f.NodeID === selectedParentFolder);

    const newFolder: FolderNode = {
      name: newFolderName,
      parentFolderId: isNodeId ? selectedParentFolder : undefined,
      parentFolderName: !isNodeId && selectedParentFolder ? selectedParentFolder : undefined,
      privacy: selectedPrivacy,
      tempId: `folder-${Date.now()}`,
    };

    setManualFolders((prev) => [...prev, newFolder]);
    setNewFolderName('');
  };

  const addManualGallery = () => {
    if (!newGalleryName.trim()) return;

    // Check if selected parent is a NodeID (existing folder) or a folder name (newly created)
    const isNodeId = selectedParentFolder && smugmugFolders.some(f => f.NodeID === selectedParentFolder);

    const newGallery: GalleryNode = {
      name: newGalleryName,
      parentFolderId: isNodeId ? selectedParentFolder : undefined,
      parentFolderName: !isNodeId && selectedParentFolder ? selectedParentFolder : undefined,
      privacy: selectedPrivacy,
      albumTemplateUri: selectedTemplate || undefined,
      enableGuestUploads: enableGuestUpload,
      guestUploadPassword: enableGuestUpload && guestUploadPassword ? guestUploadPassword : undefined,
      tempId: `gallery-${Date.now()}`,
    };

    setManualGalleries((prev) => [...prev, newGallery]);
    setNewGalleryName('');
    setSelectedTemplate('');
    setEnableGuestUpload(false);
    setGuestUploadPassword('');
  };

  const removeManualFolder = (tempId: string) => {
    setManualFolders((prev) => prev.filter(f => f.tempId !== tempId));
  };

  const removeManualGallery = (tempId: string) => {
    setManualGalleries((prev) => prev.filter(g => g.tempId !== tempId));
  };

  const executeManualCreation = async () => {
    if (manualFolders.length === 0 && manualGalleries.length === 0) {
      alert('Please add at least one folder or gallery');
      return;
    }

    setStatus('creating');

    const plan: CreationPlan = {
      folders: manualFolders,
      galleries: manualGalleries,
      summary: `Manual creation: ${manualFolders.length} folders, ${manualGalleries.length} galleries`,
    };

    try {
      const response = await fetch('/api/smugmug/create-structure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Access-Token': tokenStorage.getTokens()?.accessToken || '',
          'X-Access-Token-Secret': tokenStorage.getTokens()?.accessTokenSecret || '',
        },
        body: JSON.stringify({ plan }),
      });

      const result = await response.json();

      if (result.success) {
        setStatus('success');
        let alertMessage = `✅ Successfully created ${result.foldersCreated} folder(s) and ${result.galleriesCreated} gallery/galleries!`;

        if (result.uploadUrls && result.uploadUrls.length > 0) {
          alertMessage += '\n\n📤 Guest Upload Links:\n';
          result.uploadUrls.forEach((item: { galleryName: string; uploadUrl: string }) => {
            alertMessage += `\n${item.galleryName}:\n${item.uploadUrl}\n`;
          });
        }

        alert(alertMessage);
        setManualFolders([]);
        setManualGalleries([]);
      } else if (result.errors && result.errors.length > 0) {
        setStatus('error');
        alert(`⚠️ Partial success: Created ${result.foldersCreated} folder(s) and ${result.galleriesCreated} gallery/galleries.\n\nErrors:\n${result.errors.join('\n')}`);
      } else {
        throw new Error(result.error || 'Creation failed');
      }
    } catch (error) {
      console.error('Error creating structure:', error);
      setStatus('error');
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Failed to create structure'}`);
    } finally {
      setStatus('idle');
    }
  };

  const renderPlanPreview = (plan: CreationPlan) => {
    // Build a hierarchical tree structure
    const buildTree = () => {
      const rootItems: any[] = [];
      const itemsMap = new Map<string, any>();

      // Add all folders to map
      plan.folders.forEach(folder => {
        const item = {
          type: 'folder',
          name: folder.name,
          privacy: folder.privacy,
          parentName: folder.parentFolderName,
          parentId: folder.parentFolderId,
          children: []
        };
        itemsMap.set(folder.name, item);
      });

      // Add all galleries to map
      plan.galleries.forEach(gallery => {
        const item = {
          type: 'gallery',
          name: gallery.name,
          privacy: gallery.privacy,
          description: gallery.description,
          parentName: gallery.parentFolderName,
          parentId: gallery.parentFolderId,
          children: []
        };
        if (gallery.parentFolderName) {
          const parent = itemsMap.get(gallery.parentFolderName);
          if (parent) parent.children.push(item);
        } else if (gallery.parentFolderId) {
          // Existing folder - show as root with note
          rootItems.push(item);
        } else {
          rootItems.push(item);
        }
      });

      // Organize folders into tree
      itemsMap.forEach((item, name) => {
        if (item.type === 'folder') {
          if (item.parentName) {
            const parent = itemsMap.get(item.parentName);
            if (parent) parent.children.push(item);
          } else if (item.parentId) {
            // Existing folder - show as root with note
            rootItems.push(item);
          } else {
            rootItems.push(item);
          }
        }
      });

      return rootItems;
    };

    const renderTreeNode = (node: any, depth: number = 0, isLast: boolean = false) => {
      const indent = depth * 20;
      const Icon = node.type === 'folder' ? Folder : ImageIcon;
      const color = node.type === 'folder' ? 'text-teal-600' : 'text-cyan-600';

      return (
        <div key={`${node.type}-${node.name}`}>
          <div
            className="text-sm text-gray-700 flex items-center gap-2 py-1"
            style={{ marginLeft: `${indent}px` }}
          >
            {depth > 0 && (
              <span className="text-gray-400 text-xs">
                {isLast ? '└─' : '├─'}
              </span>
            )}
            <Icon className={`w-4 h-4 ${color}`} />
            <span className="font-medium">{node.name}</span>
            {node.privacy && <span className="text-xs text-gray-500">({node.privacy})</span>}
            {node.description && <span className="text-xs text-gray-500">- {node.description}</span>}
            {node.parentId && <span className="text-xs text-gray-400">(in existing folder)</span>}
          </div>
          {node.children && node.children.map((child: any, idx: number) =>
            renderTreeNode(child, depth + 1, idx === node.children.length - 1)
          )}
        </div>
      );
    };

    const tree = buildTree();

    return (
      <div className="bg-teal-50 border-2 border-teal-200 rounded-xl p-4 my-4">
        <h4 className="font-bold text-teal-900 mb-3 flex items-center gap-2">
          <FolderTree className="w-5 h-5" />
          Proposed Structure
        </h4>

        {tree.length > 0 ? (
          <div className="space-y-1">
            {tree.map((node, idx) => renderTreeNode(node, 0, idx === tree.length - 1))}
          </div>
        ) : (
          <p className="text-sm text-gray-600">No items to create</p>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-4 pt-4 border-t border-teal-200">
          <button
            onClick={handleConfirmPlan}
            disabled={status === 'creating'}
            className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            {status === 'creating' ? 'Creating...' : 'Create This Structure'}
          </button>
          <button
            onClick={handleRejectPlan}
            disabled={status === 'creating'}
            className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            Make Changes
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <ToolboxHeader currentTool="ai-gallery-creator" />
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
          <div className="max-w-full mx-auto px-8 py-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-teal-500 to-cyan-600 w-10 h-10 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">AI Gallery Creator</h1>
                <p className="text-sm text-gray-600">Chat with AI or create manually</p>
              </div>
            </div>
          </div>
        </div>

        {/* Split Layout with Resizable Chat */}
        <div className="flex relative" style={{ height: 'calc(100vh - 140px)' }}>
          {/* LEFT: AI Chat Sidebar - Resizable */}
          {chatPanelState !== 'hidden' && chatPanelState !== 'popped' && (
            <div
              className="border-r border-gray-200 bg-white flex flex-col relative"
              style={{
                width: chatPanelState === 'collapsed' ? '48px' : `${chatWidth}%`,
                transition: chatPanelState === 'collapsed' ? 'width 0.2s ease' : 'none'
              }}
            >
              {/* Chat Controls Header */}
              <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-gray-50">
                {chatPanelState !== 'collapsed' && (
                  <span className="text-xs font-semibold text-gray-600 ml-1">AI Chat</span>
                )}
                <div className="flex items-center gap-1 ml-auto">
                  {chatPanelState !== 'collapsed' && (
                    <>
                      <button
                        onClick={() => window.open(`/ai-gallery-creator?chat-only=true`, '_blank', 'width=500,height=800')}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        title="Pop out to new window"
                      >
                        <ExternalLink className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => setChatPanelState('collapsed')}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        title="Collapse chat"
                      >
                        <ChevronLeft className="w-4 h-4 text-gray-600" />
                      </button>
                    </>
                  )}
                  {chatPanelState === 'collapsed' && (
                    <button
                      onClick={() => setChatPanelState('open')}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                      title="Expand chat"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </button>
                  )}
                  <button
                    onClick={() => setChatPanelState('hidden')}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    title="Hide chat"
                  >
                    <Minimize2 className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>

              {chatPanelState !== 'collapsed' && (
                <>
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((message, idx) => (
                <div
                  key={idx}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                      message.role === 'user'
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.role === 'assistant' && currentPlan && idx === messages.length - 1 && (
                      renderPlanPreview(currentPlan)
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-xl px-3 py-2 flex items-center gap-2 text-sm">
                    <Loader className="w-4 h-4 animate-spin text-teal-600" />
                    <span className="text-gray-600">Thinking...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="border-t border-gray-200 p-3 bg-gray-50">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask AI to create..."
                  disabled={isLoading || status === 'creating'}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-100 disabled:text-gray-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading || status === 'creating'}
                  className="bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
                </>
              )}
            </div>
          )}

          {/* Chat Panel Hidden - Show Button */}
          {chatPanelState === 'hidden' && (
            <button
              onClick={() => setChatPanelState('open')}
              className="absolute top-4 left-4 z-10 bg-teal-600 hover:bg-teal-700 text-white p-2 rounded-lg shadow-lg transition-colors flex items-center gap-2"
              title="Show AI Chat"
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Show AI Chat</span>
            </button>
          )}

          {/* RIGHT: Manual Creation Tools */}
          <div
            className="bg-gradient-to-br from-gray-50 to-gray-100 overflow-y-auto"
            style={{
              width: chatPanelState === 'hidden' || chatPanelState === 'popped'
                ? '100%'
                : chatPanelState === 'collapsed'
                ? 'calc(100% - 48px)'
                : `${100 - chatWidth}%`
            }}
          >
            <div className="p-8">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <FolderTree className="w-6 h-6 text-teal-600" />
                  Manual Creation Tools
                </h2>

                {/* Creation Form */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left Column: Add Folder */}
                    <div className="space-y-4">
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Folder className="w-5 h-5 text-teal-600" />
                        Add Folder
                      </h3>
                      <input
                        type="text"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder="Folder name"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                      <button
                        onClick={addManualFolder}
                        disabled={!newFolderName.trim()}
                        className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Folder
                      </button>
                    </div>

                    {/* Right Column: Add Gallery */}
                    <div className="space-y-4">
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-teal-600" />
                        Add Gallery
                      </h3>
                      <input
                        type="text"
                        value={newGalleryName}
                        onChange={(e) => setNewGalleryName(e.target.value)}
                        placeholder="Gallery name"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Gallery Preset (optional)
                        </label>
                        <select
                          value={selectedTemplate}
                          onChange={(e) => setSelectedTemplate(e.target.value)}
                          disabled={isLoadingTemplates}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-100"
                        >
                          <option value="">Default</option>
                          {albumTemplates.map((template) => (
                            <option key={template.AlbumTemplateKey} value={template.Uri}>
                              {template.Name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={enableGuestUpload}
                            onChange={(e) => setEnableGuestUpload(e.target.checked)}
                            className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                          />
                          <span className="text-sm font-semibold text-gray-700">
                            Enable Guest Uploads
                          </span>
                        </label>
                        {enableGuestUpload && (
                          <input
                            type="text"
                            value={guestUploadPassword}
                            onChange={(e) => setGuestUploadPassword(e.target.value)}
                            placeholder="Password (optional, auto-generated if empty)"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                          />
                        )}
                      </div>
                      <button
                        onClick={addManualGallery}
                        disabled={!newGalleryName.trim()}
                        className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Gallery
                      </button>
                    </div>
                  </div>

                  {/* Shared Options */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Parent Folder (optional)
                        </label>
                        <select
                          value={selectedParentFolder}
                          onChange={(e) => setSelectedParentFolder(e.target.value)}
                          disabled={isLoadingFolders}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-100"
                        >
                          <option value="">Root (No Parent)</option>
                          {isLoadingFolders && <option disabled>Loading folders...</option>}
                          {!isLoadingFolders && (
                            <>
                              <optgroup label="Your SmugMug Folders">
                                {smugmugFolders.map((folder) => (
                                  <option key={folder.NodeID} value={folder.NodeID}>
                                    {folder.Name}
                                  </option>
                                ))}
                              </optgroup>
                              {manualFolders.length > 0 && (
                                <optgroup label="Newly Created Folders">
                                  {manualFolders.map((folder) => (
                                    <option key={folder.tempId} value={folder.name}>
                                      {folder.name} (new)
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                            </>
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Privacy
                        </label>
                        <select
                          value={selectedPrivacy}
                          onChange={(e) => setSelectedPrivacy(e.target.value as 'Public' | 'Private' | 'Unlisted')}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                          <option value="Private">Private</option>
                          <option value="Public">Public</option>
                          <option value="Unlisted">Unlisted</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview & Execute */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-teal-600" />
                      Preview Structure
                    </span>
                    <span className="text-sm text-gray-500">
                      {manualFolders.length} folders, {manualGalleries.length} galleries
                    </span>
                  </h3>

                  {/* Folders List */}
                  {manualFolders.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-gray-700 mb-2">📁 Folders</p>
                      <div className="space-y-2">
                        {manualFolders.map((folder) => (
                          <div
                            key={folder.tempId}
                            className="flex items-center justify-between bg-teal-50 px-4 py-2 rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <Folder className="w-4 h-4 text-teal-600" />
                              <span className="font-medium text-gray-900">{folder.name}</span>
                              {folder.parentFolderName && (
                                <span className="text-xs text-gray-500">in {folder.parentFolderName}</span>
                              )}
                              <span className="text-xs text-gray-500">({folder.privacy})</span>
                            </div>
                            <button
                              onClick={() => removeManualFolder(folder.tempId!)}
                              className="text-red-600 hover:text-red-700 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Galleries List */}
                  {manualGalleries.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-gray-700 mb-2">📷 Galleries</p>
                      <div className="space-y-2">
                        {manualGalleries.map((gallery) => (
                          <div
                            key={gallery.tempId}
                            className="flex items-center justify-between bg-cyan-50 px-4 py-2 rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <ImageIcon className="w-4 h-4 text-cyan-600" />
                              <span className="font-medium text-gray-900">{gallery.name}</span>
                              {gallery.parentFolderName && (
                                <span className="text-xs text-gray-500">in {gallery.parentFolderName}</span>
                              )}
                              <span className="text-xs text-gray-500">({gallery.privacy})</span>
                            </div>
                            <button
                              onClick={() => removeManualGallery(gallery.tempId!)}
                              className="text-red-600 hover:text-red-700 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty State */}
                  {manualFolders.length === 0 && manualGalleries.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <FolderTree className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No folders or galleries added yet.</p>
                      <p className="text-sm">Use the form above to add items.</p>
                    </div>
                  )}

                  {/* Execute Button */}
                  <button
                    onClick={executeManualCreation}
                    disabled={status === 'creating' || (manualFolders.length === 0 && manualGalleries.length === 0)}
                    className="w-full mt-4 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 disabled:from-gray-300 disabled:to-gray-400 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <CheckCircle className="w-5 h-5" />
                    {status === 'creating' ? 'Creating...' : 'Create All Now'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
