'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Sparkles, FolderTree, Image as ImageIcon, CheckCircle, XCircle, Loader, AlertCircle, Folder, Layers, Plus, Trash2, RefreshCw, Save, Download, BookTemplate, X, Pencil, Check } from 'lucide-react';
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

interface Template {
  id: string;
  name: string;
  description: string;
  category: 'Wedding' | 'Sports' | 'Real Estate' | 'Portrait' | 'Corporate' | 'Custom';
  folders: FolderNode[];
  galleries: GalleryNode[];
  createdAt: string;
  isPrebuilt?: boolean;
}

type CreationStatus = 'idle' | 'planning' | 'confirming' | 'creating' | 'success' | 'error';

// Pre-built templates
const PREBUILT_TEMPLATES: Template[] = [
  {
    id: 'wedding-2024',
    name: 'Wedding Photography 2024',
    description: 'Complete wedding photography structure with ceremony, reception, portraits, and details',
    category: 'Wedding',
    isPrebuilt: true,
    createdAt: new Date().toISOString(),
    folders: [
      { name: 'Ceremony', privacy: 'Private', tempId: 'ceremony' },
      { name: 'Reception', privacy: 'Private', tempId: 'reception' },
      { name: 'Portraits', privacy: 'Private', tempId: 'portraits' },
      { name: 'Details', privacy: 'Private', tempId: 'details' },
    ],
    galleries: [
      { name: 'Getting Ready - Bride', parentFolderName: 'Ceremony', privacy: 'Private', tempId: 'gr-bride' },
      { name: 'Getting Ready - Groom', parentFolderName: 'Ceremony', privacy: 'Private', tempId: 'gr-groom' },
      { name: 'Ceremony', parentFolderName: 'Ceremony', privacy: 'Private', tempId: 'ceremony-main' },
      { name: 'First Look', parentFolderName: 'Portraits', privacy: 'Private', tempId: 'first-look' },
      { name: 'Couple Portraits', parentFolderName: 'Portraits', privacy: 'Private', tempId: 'couple' },
      { name: 'Family Portraits', parentFolderName: 'Portraits', privacy: 'Private', tempId: 'family' },
      { name: 'Bridal Party', parentFolderName: 'Portraits', privacy: 'Private', tempId: 'bridal-party' },
      { name: 'Cocktail Hour', parentFolderName: 'Reception', privacy: 'Private', tempId: 'cocktail' },
      { name: 'Reception', parentFolderName: 'Reception', privacy: 'Private', tempId: 'reception-main' },
      { name: 'Dancing', parentFolderName: 'Reception', privacy: 'Private', tempId: 'dancing' },
      { name: 'Rings & Dress', parentFolderName: 'Details', privacy: 'Private', tempId: 'rings-dress' },
      { name: 'Flowers & Decor', parentFolderName: 'Details', privacy: 'Private', tempId: 'flowers' },
    ],
  },
  {
    id: 'sports-team-season',
    name: 'Sports Team Season',
    description: 'Team photos, individual players, and games throughout the season',
    category: 'Sports',
    isPrebuilt: true,
    createdAt: new Date().toISOString(),
    folders: [
      { name: 'Team Photos', privacy: 'Public', tempId: 'team-photos' },
      { name: 'Individual Players', privacy: 'Public', tempId: 'players' },
      { name: 'Games', privacy: 'Public', tempId: 'games' },
      { name: 'Practice', privacy: 'Private', tempId: 'practice' },
    ],
    galleries: [
      { name: 'Team Photo - Official', parentFolderName: 'Team Photos', privacy: 'Public', tempId: 'team-official' },
      { name: 'Team Photo - Candid', parentFolderName: 'Team Photos', privacy: 'Public', tempId: 'team-candid' },
      { name: 'Game 1', parentFolderName: 'Games', privacy: 'Public', tempId: 'game-1' },
      { name: 'Game 2', parentFolderName: 'Games', privacy: 'Public', tempId: 'game-2' },
      { name: 'Game 3', parentFolderName: 'Games', privacy: 'Public', tempId: 'game-3' },
      { name: 'Playoffs', parentFolderName: 'Games', privacy: 'Public', tempId: 'playoffs' },
      { name: 'Practice Sessions', parentFolderName: 'Practice', privacy: 'Private', tempId: 'practice-sessions' },
    ],
  },
  {
    id: 'real-estate',
    name: 'Real Estate Property',
    description: 'Professional real estate photography organized by property areas',
    category: 'Real Estate',
    isPrebuilt: true,
    createdAt: new Date().toISOString(),
    folders: [
      { name: 'Exterior', privacy: 'Public', tempId: 'exterior' },
      { name: 'Interior', privacy: 'Public', tempId: 'interior' },
      { name: 'Amenities', privacy: 'Public', tempId: 'amenities' },
    ],
    galleries: [
      { name: 'Front & Curb Appeal', parentFolderName: 'Exterior', privacy: 'Public', tempId: 'front' },
      { name: 'Backyard & Outdoor', parentFolderName: 'Exterior', privacy: 'Public', tempId: 'backyard' },
      { name: 'Aerial & Drone', parentFolderName: 'Exterior', privacy: 'Public', tempId: 'aerial' },
      { name: 'Living Room', parentFolderName: 'Interior', privacy: 'Public', tempId: 'living' },
      { name: 'Kitchen', parentFolderName: 'Interior', privacy: 'Public', tempId: 'kitchen' },
      { name: 'Master Bedroom', parentFolderName: 'Interior', privacy: 'Public', tempId: 'master' },
      { name: 'Bathrooms', parentFolderName: 'Interior', privacy: 'Public', tempId: 'bathrooms' },
      { name: 'Additional Bedrooms', parentFolderName: 'Interior', privacy: 'Public', tempId: 'bedrooms' },
      { name: 'Pool & Spa', parentFolderName: 'Amenities', privacy: 'Public', tempId: 'pool' },
      { name: 'Gym & Recreation', parentFolderName: 'Amenities', privacy: 'Public', tempId: 'gym' },
    ],
  },
  {
    id: 'portrait-session',
    name: 'Portrait Session',
    description: 'Family, individual, and group portrait session structure',
    category: 'Portrait',
    isPrebuilt: true,
    createdAt: new Date().toISOString(),
    folders: [
      { name: 'Family Portraits', privacy: 'Private', tempId: 'family' },
      { name: 'Individual Portraits', privacy: 'Private', tempId: 'individual' },
      { name: 'Candid Shots', privacy: 'Private', tempId: 'candid' },
    ],
    galleries: [
      { name: 'Full Family', parentFolderName: 'Family Portraits', privacy: 'Private', tempId: 'full-family' },
      { name: 'Parents', parentFolderName: 'Family Portraits', privacy: 'Private', tempId: 'parents' },
      { name: 'Siblings', parentFolderName: 'Family Portraits', privacy: 'Private', tempId: 'siblings' },
      { name: 'Portraits - Subject 1', parentFolderName: 'Individual Portraits', privacy: 'Private', tempId: 'subject-1' },
      { name: 'Portraits - Subject 2', parentFolderName: 'Individual Portraits', privacy: 'Private', tempId: 'subject-2' },
      { name: 'Lifestyle & Candid', parentFolderName: 'Candid Shots', privacy: 'Private', tempId: 'lifestyle' },
    ],
  },
  {
    id: 'corporate-event',
    name: 'Corporate Event',
    description: 'Conference, seminar, or corporate event photography structure',
    category: 'Corporate',
    isPrebuilt: true,
    createdAt: new Date().toISOString(),
    folders: [
      { name: 'Keynotes & Presentations', privacy: 'Public', tempId: 'keynotes' },
      { name: 'Networking', privacy: 'Public', tempId: 'networking' },
      { name: 'Headshots', privacy: 'Private', tempId: 'headshots' },
      { name: 'Venue & Details', privacy: 'Public', tempId: 'venue' },
    ],
    galleries: [
      { name: 'Opening Keynote', parentFolderName: 'Keynotes & Presentations', privacy: 'Public', tempId: 'opening' },
      { name: 'Panel Discussions', parentFolderName: 'Keynotes & Presentations', privacy: 'Public', tempId: 'panels' },
      { name: 'Workshops', parentFolderName: 'Keynotes & Presentations', privacy: 'Public', tempId: 'workshops' },
      { name: 'Networking Reception', parentFolderName: 'Networking', privacy: 'Public', tempId: 'reception' },
      { name: 'Candid Interactions', parentFolderName: 'Networking', privacy: 'Public', tempId: 'candid' },
      { name: 'Executive Headshots', parentFolderName: 'Headshots', privacy: 'Private', tempId: 'exec-headshots' },
      { name: 'Venue Setup', parentFolderName: 'Venue & Details', privacy: 'Public', tempId: 'setup' },
      { name: 'Branding & Signage', parentFolderName: 'Venue & Details', privacy: 'Public', tempId: 'branding' },
    ],
  },
];

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

  // Template system state
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showTemplateBrowser, setShowTemplateBrowser] = useState(false);
  const [userTemplates, setUserTemplates] = useState<Template[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateCategory, setTemplateCategory] = useState<Template['category']>('Custom');
  const [activeTemplateTab, setActiveTemplateTab] = useState<'prebuilt' | 'custom'>('prebuilt');

  // Edit state for inline editing
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingGalleryId, setEditingGalleryId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    checkAuthAndInitialize();
  }, [router]);

  const checkAuthAndInitialize = async () => {
    try {
      const authCheck = await fetch('/api/smugmug/user', {
        credentials: 'include'
      });

      if (!authCheck.ok) {
        console.error('AI Gallery Creator: Not authenticated');
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
    } catch (error) {
      console.error('AI Gallery Creator: Auth check failed:', error);
      router.push('/');
    }
  };

  const loadSmugmugFolders = async () => {
    setIsLoadingFolders(true);
    try {
      const response = await fetch('/api/smugmug/folders', {
        credentials: 'include'
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
      const response = await fetch('/api/smugmug/album-templates', {
        credentials: 'include'
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
        },
        credentials: 'include',
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

  const startEditingFolder = (tempId: string, currentName: string) => {
    setEditingFolderId(tempId);
    setEditValue(currentName);
  };

  const startEditingGallery = (tempId: string, currentName: string) => {
    setEditingGalleryId(tempId);
    setEditValue(currentName);
  };

  const saveEditFolder = (tempId: string) => {
    if (editValue.trim()) {
      setManualFolders(prev => prev.map(f =>
        f.tempId === tempId ? { ...f, name: editValue.trim() } : f
      ));
    }
    setEditingFolderId(null);
    setEditValue('');
  };

  const saveEditGallery = (tempId: string) => {
    if (editValue.trim()) {
      setManualGalleries(prev => prev.map(g =>
        g.tempId === tempId ? { ...g, name: editValue.trim() } : g
      ));
    }
    setEditingGalleryId(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingFolderId(null);
    setEditingGalleryId(null);
    setEditValue('');
  };

  const clearAll = () => {
    if (confirm('Are you sure you want to clear all folders and galleries?')) {
      setManualFolders([]);
      setManualGalleries([]);
    }
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
        },
        credentials: 'include',
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

  // Template management functions
  const saveAsTemplate = () => {
    if (!templateName.trim()) {
      alert('Please enter a template name');
      return;
    }

    const newTemplate: Template = {
      id: Date.now().toString(),
      name: templateName,
      description: templateDescription || `Custom template created on ${new Date().toLocaleDateString()}`,
      category: templateCategory,
      folders: manualFolders,
      galleries: manualGalleries,
      createdAt: new Date().toISOString(),
      isPrebuilt: false,
    };

    const updated = [...userTemplates, newTemplate];
    setUserTemplates(updated);
    localStorage.setItem('ai-gallery-templates', JSON.stringify(updated));

    setTemplateName('');
    setTemplateDescription('');
    setTemplateCategory('Custom');
    setShowTemplateModal(false);

    alert(`✅ Template "${newTemplate.name}" saved successfully!`);
  };

  const loadTemplate = (template: Template) => {
    setManualFolders(template.folders);
    setManualGalleries(template.galleries);
    setShowTemplateBrowser(false);
    alert(`✅ Template "${template.name}" loaded!`);
  };

  const deleteTemplate = (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    const updated = userTemplates.filter(t => t.id !== templateId);
    setUserTemplates(updated);
    localStorage.setItem('ai-gallery-templates', JSON.stringify(updated));
    alert('✅ Template deleted');
  };

  // Load user templates from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('ai-gallery-templates');
    if (saved) {
      try {
        setUserTemplates(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading templates:', error);
      }
    }
  }, []);

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
        <div className="flex gap-2 mt-3 pt-3 border-t border-teal-200">
          <button
            onClick={handleConfirmPlan}
            disabled={status === 'creating'}
            className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white px-2 py-1 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
          >
            <CheckCircle className="w-3 h-3" />
            {status === 'creating' ? 'Creating...' : 'Create'}
          </button>
          <button
            onClick={handleRejectPlan}
            disabled={status === 'creating'}
            className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
          >
            <XCircle className="w-3 h-3" />
            Modify
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen">
      <ToolboxHeader currentTool="ai-gallery-creator" />
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50">

        {/* Instructions */}
        <div className="max-w-full mx-auto px-8 pt-6">
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-gray-800">
                <span className="font-semibold">How to use:</span> Describe what galleries and folders you want to create (AI understands natural language) → Review the visual hierarchy of your structure → Execute to create all folders and galleries on SmugMug with real-time progress tracking.
              </p>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="border-b border-gray-200 bg-white/80 backdrop-blur-sm mt-6">
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

        {/* Split Layout: 40% Chat | 60% Manual Tools */}
        <div className="flex" style={{ height: 'calc(100vh - 140px)' }}>
          {/* LEFT: AI Chat Sidebar (40%) */}
          <div className="w-[40%] border-r border-gray-200 bg-white flex flex-col">
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
                  className="bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-1 text-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: Manual Creation Tools (60%) */}
          <div className="w-[60%] bg-gradient-to-br from-gray-50 to-gray-100 overflow-y-auto">
            <div className="p-8">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <FolderTree className="w-6 h-6 text-teal-600" />
                  Manual Creation Tools
                </h2>

                {/* Template Management - Always Visible at Top */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <BookTemplate className="w-5 h-5 text-purple-600" />
                    Template Management
                  </h3>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowTemplateBrowser(true)}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                    >
                      <BookTemplate className="w-4 h-4" />
                      Load Template
                    </button>
                    <button
                      onClick={() => setShowTemplateModal(true)}
                      disabled={manualFolders.length === 0 && manualGalleries.length === 0}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Save as Template
                    </button>
                  </div>
                </div>

                {/* Preview Structure */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-teal-600" />
                      Preview Structure
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">
                        {manualFolders.length} folders, {manualGalleries.length} galleries
                      </span>
                      {(manualFolders.length > 0 || manualGalleries.length > 0) && (
                        <button
                          onClick={clearAll}
                          className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-lg transition-colors font-medium"
                        >
                          Clear All
                        </button>
                      )}
                    </div>
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
                            <div className="flex items-center gap-2 flex-1">
                              <Folder className="w-4 h-4 text-teal-600" />
                              {editingFolderId === folder.tempId ? (
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveEditFolder(folder.tempId!);
                                    if (e.key === 'Escape') cancelEdit();
                                  }}
                                  className="flex-1 px-2 py-1 border border-teal-300 rounded font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                  autoFocus
                                />
                              ) : (
                                <>
                                  <span className="font-medium text-gray-900">{folder.name}</span>
                                  {folder.parentFolderName && (
                                    <span className="text-xs text-gray-500">in {folder.parentFolderName}</span>
                                  )}
                                  <span className="text-xs text-gray-500">({folder.privacy})</span>
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {editingFolderId === folder.tempId ? (
                                <>
                                  <button
                                    onClick={() => saveEditFolder(folder.tempId!)}
                                    className="text-green-600 hover:text-green-700 transition-colors"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    className="text-gray-600 hover:text-gray-700 transition-colors"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => startEditingFolder(folder.tempId!, folder.name)}
                                    className="text-teal-600 hover:text-teal-700 transition-colors"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => removeManualFolder(folder.tempId!)}
                                    className="text-red-600 hover:text-red-700 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
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
                            <div className="flex items-center gap-2 flex-1">
                              <ImageIcon className="w-4 h-4 text-cyan-600" />
                              {editingGalleryId === gallery.tempId ? (
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveEditGallery(gallery.tempId!);
                                    if (e.key === 'Escape') cancelEdit();
                                  }}
                                  className="flex-1 px-2 py-1 border border-cyan-300 rounded font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                  autoFocus
                                />
                              ) : (
                                <>
                                  <span className="font-medium text-gray-900">{gallery.name}</span>
                                  {gallery.parentFolderName && (
                                    <span className="text-xs text-gray-500">in {gallery.parentFolderName}</span>
                                  )}
                                  <span className="text-xs text-gray-500">({gallery.privacy})</span>
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {editingGalleryId === gallery.tempId ? (
                                <>
                                  <button
                                    onClick={() => saveEditGallery(gallery.tempId!)}
                                    className="text-green-600 hover:text-green-700 transition-colors"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    className="text-gray-600 hover:text-gray-700 transition-colors"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => startEditingGallery(gallery.tempId!, gallery.name)}
                                    className="text-cyan-600 hover:text-cyan-700 transition-colors"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => removeManualGallery(gallery.tempId!)}
                                    className="text-red-600 hover:text-red-700 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
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
                      <p className="text-sm">Use the form below to add items.</p>
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

                {/* Add Folder/Gallery Form - Moved Down */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-teal-600" />
                    Add Folders & Galleries
                  </h3>

                  <div className="grid grid-cols-2 gap-6">
                    {/* Left Column: Add Folder */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                        <Folder className="w-4 h-4 text-teal-600" />
                        Add Folder
                      </h4>
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
                      <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-teal-600" />
                        Add Gallery
                      </h4>
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
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-semibold text-gray-700">
                            Parent Folder (optional)
                          </label>
                          <button
                            onClick={loadSmugmugFolders}
                            disabled={isLoadingFolders}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded transition-colors disabled:opacity-50"
                            title="Sync folder structure from SmugMug"
                          >
                            <RefreshCw className={`w-3 h-3 ${isLoadingFolders ? 'animate-spin' : ''}`} />
                            {isLoadingFolders ? 'Syncing...' : 'Manual Sync'}
                          </button>
                        </div>
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
                          Privacy (applies to all)
                        </label>
                        <select
                          value={selectedPrivacy}
                          onChange={(e) => {
                            const newPrivacy = e.target.value as 'Public' | 'Private' | 'Unlisted';
                            setSelectedPrivacy(newPrivacy);
                            // Auto-apply to all existing folders and galleries
                            setManualFolders(prev => prev.map(f => ({ ...f, privacy: newPrivacy })));
                            setManualGalleries(prev => prev.map(g => ({ ...g, privacy: newPrivacy })));
                          }}
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
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Save className="w-5 h-5 text-blue-600" />
                Save as Template
              </h3>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Wedding Photography 2024"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Describe this template..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={templateCategory}
                  onChange={(e) => setTemplateCategory(e.target.value as Template['category'])}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Custom">Custom</option>
                  <option value="Wedding">Wedding</option>
                  <option value="Sports">Sports</option>
                  <option value="Real Estate">Real Estate</option>
                  <option value="Portrait">Portrait</option>
                  <option value="Corporate">Corporate</option>
                </select>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Structure to save:</strong><br />
                  {manualFolders.length} folder(s), {manualGalleries.length} gallery/ies
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveAsTemplate}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Save Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template Browser Modal */}
      {showTemplateBrowser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <BookTemplate className="w-5 h-5 text-purple-600" />
                Load Template
              </h3>
              <button
                onClick={() => setShowTemplateBrowser(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTemplateTab('prebuilt')}
                className={`flex-1 px-6 py-3 font-medium transition-colors ${
                  activeTemplateTab === 'prebuilt'
                    ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Pre-built Templates ({PREBUILT_TEMPLATES.length})
              </button>
              <button
                onClick={() => setActiveTemplateTab('custom')}
                className={`flex-1 px-6 py-3 font-medium transition-colors ${
                  activeTemplateTab === 'custom'
                    ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                My Templates ({userTemplates.length})
              </button>
            </div>

            {/* Template List */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTemplateTab === 'prebuilt' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {PREBUILT_TEMPLATES.map((template) => (
                    <div
                      key={template.id}
                      className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-200 hover:border-purple-400 transition-all cursor-pointer"
                      onClick={() => loadTemplate(template)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-bold text-gray-900">{template.name}</h4>
                        <span className="px-2 py-1 bg-purple-600 text-white text-xs font-semibold rounded-full">
                          {template.category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Folder className="w-3 h-3" />
                          {template.folders.length} folders
                        </span>
                        <span className="flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          {template.galleries.length} galleries
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTemplateTab === 'custom' && (
                <>
                  {userTemplates.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <BookTemplate className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      <p className="font-semibold mb-2">No custom templates yet</p>
                      <p className="text-sm">Create a structure and save it as a template to get started.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {userTemplates.map((template) => (
                        <div
                          key={template.id}
                          className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200 hover:border-blue-400 transition-all"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-bold text-gray-900">{template.name}</h4>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
                                {template.category}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteTemplate(template.id);
                                }}
                                className="text-red-600 hover:text-red-700 transition-colors"
                                title="Delete template"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Folder className="w-3 h-3" />
                                {template.folders.length} folders
                              </span>
                              <span className="flex items-center gap-1">
                                <ImageIcon className="w-3 h-3" />
                                {template.galleries.length} galleries
                              </span>
                            </div>
                            <button
                              onClick={() => loadTemplate(template)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                            >
                              Load
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
