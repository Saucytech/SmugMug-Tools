'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Copy, CheckCircle, RefreshCw, FolderPlus, UserPlus, Trash2, ArrowLeft, Users, Link2, Save, X } from 'lucide-react';
import ToolboxHeader from '@/components/ToolboxHeader';

interface Person {
  id: string;
  name: string;
  albumKey?: string;
  albumName?: string;
  albumUri?: string;
  uploadUrl?: string;
  uploadKey?: string;
  photoCount?: number;
  webUri?: string;
  createdAt: string;
  isTemplate?: boolean; // If true, this is a template person in the library
}

interface Project {
  id: string;
  name: string;
  createdAt: string;
  people: Person[];
  pendingPeople?: Person[]; // People dragged in but not yet created on SmugMug
  folderUri?: string;
  folderKey?: string;
  status?: 'pending' | 'creating' | 'ready' | 'error';
}

export default function GuestUploadManager() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [peopleLibrary, setPeopleLibrary] = useState<Person[]>([]); // Saved people templates
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [userNickname, setUserNickname] = useState<string>('');
  const [projectsFolderUri, setProjectsFolderUri] = useState<string>('');

  // UI state
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showAddPersonModal, setShowAddPersonModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newPersonName, setNewPersonName] = useState('');
  const [saveToLibrary, setSaveToLibrary] = useState(true); // Default to saving
  const [creating, setCreating] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Drag and drop state
  const [draggedPerson, setDraggedPerson] = useState<Person | null>(null);
  const [dragOverProject, setDragOverProject] = useState<string | null>(null);

  useEffect(() => {
    checkAuthAndInitialize();
  }, []);

  const checkAuthAndInitialize = async () => {
    try {
      const authCheck = await fetch('/api/smugmug/user', {
        credentials: 'include'
      });

      if (!authCheck.ok) {
        console.error('Guest Upload Manager: Not authenticated');
        router.push('/');
        return;
      }

      await initialize();
    } catch (_error) {
      console.error('Guest Upload Manager: Auth check failed:', _error);
      router.push('/');
    }
  };

  const initialize = async () => {
    setLoading(true);
    try {
      // Fetch user info
      const userResponse = await fetch('/api/smugmug/user', {
        credentials: 'include'
      });
      const userData = await userResponse.json();
      const nickname = userData.user?.NickName || '';
      setUserNickname(nickname);

      // Ensure "Guest Upload Projects" folder exists
      const folderResponse = await fetch('/api/smugmug/guest-upload-folder', {
        method: 'POST',
        credentials: 'include'
      });

      if (folderResponse.ok) {
        const folderData = await folderResponse.json();
        setProjectsFolderUri(folderData.folder.Uri);
      }

      // Load projects and people library from localStorage
      loadProjects();
      loadPeopleLibrary();
    } catch (_error) {
      console.error('Error initializing:', _error);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = () => {
    const stored = localStorage.getItem('guest-upload-projects');
    if (stored) {
      setProjects(JSON.parse(stored));
    }
  };

  const loadPeopleLibrary = () => {
    const stored = localStorage.getItem('guest-upload-people-library');
    if (stored) {
      setPeopleLibrary(JSON.parse(stored));
    }
  };

  const saveProjects = (updatedProjects: Project[]) => {
    localStorage.setItem('guest-upload-projects', JSON.stringify(updatedProjects));
    setProjects(updatedProjects);
  };

  const savePeopleLibrary = (updatedLibrary: Person[]) => {
    localStorage.setItem('guest-upload-people-library', JSON.stringify(updatedLibrary));
    setPeopleLibrary(updatedLibrary);
  };

  const createProject = async () => {
    if (!newProjectName.trim()) return;

    setCreating(true);

    // Create project with "creating" status immediately
    const tempProject: Project = {
      id: `project-${Date.now()}`,
      name: newProjectName.trim(),
      createdAt: new Date().toISOString(),
      people: [],
      pendingPeople: [],
      status: 'creating',
    };

    const tempProjects = [...projects, tempProject];
    setProjects(tempProjects);
    setNewProjectName('');
    setShowNewProjectModal(false);

    try {
      // Step 1: Ensure "Guest Upload Projects" folder exists
      if (!projectsFolderUri) {
        const folderResponse = await fetch('/api/smugmug/guest-upload-folder', {
          method: 'POST',
          credentials: 'include'
        });

        if (!folderResponse.ok) {
          throw new Error('Failed to create/get Guest Upload Projects folder');
        }

        const folderData = await folderResponse.json();
        setProjectsFolderUri(folderData.folder.Uri);
      }

      // Step 2: Create project folder inside Guest Upload Projects
      const createFolderResponse = await fetch('/api/smugmug/create-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          parentFolderUri: projectsFolderUri || '/api/v2/node/BQZL5k',
          folderName: tempProject.name,
        }),
      });

      const folderData = await createFolderResponse.json();

      if (!createFolderResponse.ok && !folderData.existing) {
        console.error('Failed to create project folder:', folderData);
        throw new Error(folderData.error || 'Failed to create project folder');
      }

      const folder = folderData.folder;

      // Update project with folder info and ready status
      const finalProject: Project = {
        ...tempProject,
        folderUri: folder.Uri,
        folderKey: folder.NodeID || folder.UrlPath,
        status: 'ready',
      };

      // Use tempProjects (which includes the tempProject) instead of projects
      const updatedProjects = tempProjects.map(p =>
        p.id === tempProject.id ? finalProject : p
      );
      saveProjects(updatedProjects);

    } catch (_error) {
      console.error('Error creating project:', _error);

      // Update project with error status
      const errorProject: Project = {
        ...tempProject,
        status: 'error',
      };

      // Use tempProjects (which includes the tempProject) instead of projects
      const updatedProjects = tempProjects.map(p =>
        p.id === tempProject.id ? errorProject : p
      );
      saveProjects(updatedProjects);

      alert('Failed to create project folder. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const deleteProject = (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This will not delete the galleries on SmugMug.')) return;

    const updatedProjects = projects.filter(p => p.id !== projectId);
    saveProjects(updatedProjects);

    if (selectedProject?.id === projectId) {
      setSelectedProject(null);
    }
  };

  const addPersonToProject = async () => {
    if (!selectedProject || !newPersonName.trim()) return;

    setCreating(true);
    try {
      const personName = newPersonName.trim();

      // Save to library if requested
      if (saveToLibrary) {
        const libraryPerson: Person = {
          id: `template-${Date.now()}`,
          name: personName,
          createdAt: new Date().toISOString(),
          isTemplate: true,
        };
        const updatedLibrary = [...peopleLibrary, libraryPerson];
        savePeopleLibrary(updatedLibrary);
      }

      // If project doesn't have a folder URI (old projects), create one
      if (!selectedProject.folderUri) {
        const createFolderResponse = await fetch('/api/smugmug/create-folder', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            parentFolderUri: projectsFolderUri,
            folderName: selectedProject.name,
          }),
        });

        const folderData = await createFolderResponse.json();

        if (!createFolderResponse.ok) {
          console.error('Failed to create project folder:', folderData);
          throw new Error(folderData.error || 'Failed to create project folder');
        }
        selectedProject.folderUri = folderData.folder.Uri;
        selectedProject.folderKey = folderData.folder.NodeID || folderData.folder.UrlPath;

        // Update the project with folder info
        const updatedProjects = projects.map(p =>
          p.id === selectedProject.id ? selectedProject : p
        );
        saveProjects(updatedProjects);
      }

      // Create gallery in the project's folder
      const createGalleryResponse = await fetch('/api/smugmug/create-gallery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          folderUri: selectedProject.folderUri,
          galleryName: personName,
        }),
      });

      if (!createGalleryResponse.ok) {
        throw new Error('Failed to create gallery');
      }

      const galleryData = await createGalleryResponse.json();
      const album = galleryData.album;

      // Generate upload key
      const uploadKey = Math.random().toString(36).substring(2, 18);

      // Enable guest uploads on the gallery
      const enableUploadResponse = await fetch(`/api/smugmug/album/${album.AlbumKey}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          albumUri: album.Uri,
          updates: {
            UploadKey: uploadKey,
          },
        }),
      });

      if (!enableUploadResponse.ok) {
        throw new Error('Failed to enable guest uploads');
      }

      // Create person object
      const newPerson: Person = {
        id: `person-${Date.now()}`,
        name: personName,
        albumKey: album.AlbumKey,
        albumName: personName,
        albumUri: album.Uri,
        uploadUrl: `https://${userNickname}.smugmug.com/upload/${album.AlbumKey}/${uploadKey}/`,
        uploadKey,
        photoCount: 0,
        webUri: album.WebUri,
        createdAt: new Date().toISOString(),
      };

      // Add person to project
      const updatedProject = {
        ...selectedProject,
        people: [...selectedProject.people, newPerson],
      };

      const updatedProjects = projects.map(p =>
        p.id === selectedProject.id ? updatedProject : p
      );
      saveProjects(updatedProjects);
      setSelectedProject(updatedProject);
      setNewPersonName('');
      setShowAddPersonModal(false);
      setSaveToLibrary(true); // Reset to default

      alert(`Gallery created successfully!\nUpload URL: ${newPerson.uploadUrl}`);
    } catch (_error) {
      console.error('Error adding person:', _error);
      alert('Failed to add person. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const removePerson = (projectId: string, personId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    if (!confirm('Remove this person from the project? The gallery will remain on SmugMug.')) return;

    const updatedProject = {
      ...project,
      people: project.people.filter(p => p.id !== personId),
      pendingPeople: project.pendingPeople?.filter(p => p.id !== personId) || [],
    };

    const updatedProjects = projects.map(p =>
      p.id === projectId ? updatedProject : p
    );
    saveProjects(updatedProjects);

    if (selectedProject?.id === projectId) {
      setSelectedProject(updatedProject);
    }
  };

  const deleteFromLibrary = (personId: string) => {
    if (!confirm('Remove this person from the library?')) return;
    const updatedLibrary = peopleLibrary.filter(p => p.id !== personId);
    savePeopleLibrary(updatedLibrary);
  };

  const copyUploadLink = (uploadUrl: string) => {
    navigator.clipboard.writeText(uploadUrl);
    setCopiedLink(uploadUrl);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  // Drag and drop handlers
  const handleDragStart = (person: Person) => {
    setDraggedPerson(person);
  };

  const handleDragEnd = () => {
    setDraggedPerson(null);
    setDragOverProject(null);
  };

  const handleDragOver = (e: React.DragEvent, projectId: string) => {
    e.preventDefault();
    setDragOverProject(projectId);
  };

  const handleDragLeave = () => {
    setDragOverProject(null);
  };

  const handleDrop = async (e: React.DragEvent, projectId: string) => {
    e.preventDefault();
    setDragOverProject(null);

    if (!draggedPerson) return;

    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    // Check if person already exists in project
    const existingPerson = [...project.people, ...(project.pendingPeople || [])]
      .find(p => p.name === draggedPerson.name);

    if (existingPerson) {
      alert(`${draggedPerson.name} is already in this project.`);
      return;
    }

    // Add to pending people (will be created when executing)
    const pendingPerson: Person = {
      ...draggedPerson,
      id: `pending-${Date.now()}`,
      isTemplate: false,
    };

    const updatedProject = {
      ...project,
      pendingPeople: [...(project.pendingPeople || []), pendingPerson],
    };

    const updatedProjects = projects.map(p =>
      p.id === projectId ? updatedProject : p
    );
    saveProjects(updatedProjects);

    if (selectedProject?.id === projectId) {
      setSelectedProject(updatedProject);
    }
  };

  const executeProjectPeople = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project || !project.pendingPeople?.length) return;

    setCreating(true);
    const createdPeople: Person[] = [];
    const failedPeople: Person[] = [];

    try {
      // Ensure project has a folder
      if (!project.folderUri) {
        const createFolderResponse = await fetch('/api/smugmug/create-folder', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            parentFolderUri: projectsFolderUri,
            folderName: project.name,
          }),
        });

        const folderData = await createFolderResponse.json();
        if (!createFolderResponse.ok) {
          throw new Error('Failed to create project folder');
        }
        project.folderUri = folderData.folder.Uri;
        project.folderKey = folderData.folder.NodeID || folderData.folder.UrlPath;
      }

      // Create galleries for each pending person
      for (const person of project.pendingPeople) {
        try {
          const createGalleryResponse = await fetch('/api/smugmug/create-gallery', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              folderUri: project.folderUri,
              galleryName: person.name,
            }),
          });

          if (!createGalleryResponse.ok) {
            failedPeople.push(person);
            continue;
          }

          const galleryData = await createGalleryResponse.json();
          const album = galleryData.album;

          // Generate upload key
          const uploadKey = Math.random().toString(36).substring(2, 18);

          // Enable guest uploads
          const enableUploadResponse = await fetch(`/api/smugmug/album/${album.AlbumKey}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              albumUri: album.Uri,
              updates: {
                UploadKey: uploadKey,
              },
            }),
          });

          if (enableUploadResponse.ok) {
            const newPerson: Person = {
              ...person,
              id: `person-${Date.now()}-${Math.random()}`,
              albumKey: album.AlbumKey,
              albumName: person.name,
              albumUri: album.Uri,
              uploadUrl: `https://${userNickname}.smugmug.com/upload/${album.AlbumKey}/${uploadKey}/`,
              uploadKey,
              photoCount: 0,
              webUri: album.WebUri,
              createdAt: new Date().toISOString(),
            };
            createdPeople.push(newPerson);
          } else {
            failedPeople.push(person);
          }
        } catch (_error) {
          console.error(`Failed to create gallery for ${person.name}:`, _error);
          failedPeople.push(person);
        }
      }

      // Update project with created people
      const updatedProject = {
        ...project,
        people: [...project.people, ...createdPeople],
        pendingPeople: failedPeople,
      };

      const updatedProjects = projects.map(p =>
        p.id === projectId ? updatedProject : p
      );
      saveProjects(updatedProjects);

      if (selectedProject?.id === projectId) {
        setSelectedProject(updatedProject);
      }

      if (createdPeople.length > 0) {
        alert(`Successfully created ${createdPeople.length} galleries!${failedPeople.length > 0 ? `\n${failedPeople.length} failed.` : ''}`);
      } else {
        alert('Failed to create galleries. Please try again.');
      }
    } catch (_error) {
      console.error('Error executing project:', _error);
      alert('Failed to execute project. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading Guest Upload Manager...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <ToolboxHeader currentTool="guest-upload" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Instructions */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-gray-800">
              <span className="font-semibold">How to use:</span> Add people to your library (reusable templates) → Create projects and drag people from the library into them → Click "Execute Pending" to create galleries and generate upload links for your clients.
            </p>
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

          {/* Left Sidebar - People Library */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  People
                </h2>
                <button
                  onClick={() => setShowAddPersonModal(true)}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  title="Create Person Template"
                >
                  <UserPlus className="h-4 w-4" />
                </button>
              </div>

              {peopleLibrary.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-8">
                  No saved people yet. Create templates to reuse across projects.
                </p>
              ) : (
                <div className="space-y-2">
                  {peopleLibrary.map(person => {
                    // Calculate how many projects this person is in
                    const projectCount = projects.filter(project =>
                      project.people.some(p => p.email === person.email) ||
                      project.pendingPeople?.some(p => p.email === person.email)
                    ).length;

                    return (
                      <div
                        key={person.id}
                        draggable
                        onDragStart={() => handleDragStart(person)}
                        onDragEnd={handleDragEnd}
                        className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 cursor-move hover:shadow-md transition-shadow relative group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {person.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {person.email}
                            </div>
                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
                              {projectCount === 0 ? 'Not in any projects' :
                               projectCount === 1 ? '1 project' :
                               `${projectCount} projects`}
                            </div>
                          </div>
                          {projectCount > 0 && (
                            <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-blue-600 rounded-full">
                              {projectCount}
                            </span>
                          )}
                          <button
                            onClick={() => deleteFromLibrary(person.id)}
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3 text-red-500 hover:text-red-600" />
                          </button>
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-2 italic">
                          Drag to project →
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Main Area - Projects */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Projects</h2>
                <button
                  onClick={() => setShowNewProjectModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  disabled={creating}
                >
                  <FolderPlus className="h-4 w-4" />
                  New Project
                </button>
              </div>

              {projects.length === 0 ? (
                <div className="text-center py-12">
                  <FolderPlus className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No projects yet
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Create your first project to get started with guest uploads
                  </p>
                  <button
                    onClick={() => setShowNewProjectModal(true)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create First Project
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {projects.map(project => (
                    <div
                      key={project.id}
                      onDragOver={(e) => handleDragOver(e, project.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, project.id)}
                      className={`relative p-5 rounded-lg cursor-pointer transition-all ${
                        selectedProject?.id === project.id
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500 shadow-lg'
                          : dragOverProject === project.id
                          ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-500 shadow-lg'
                          : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 hover:shadow-md'
                      }`}
                      onClick={() => setSelectedProject(project)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                            {project.name}
                            {project.status === 'creating' && (
                              <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                                Creating...
                              </span>
                            )}
                            {project.status === 'error' && (
                              <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                                Error
                              </span>
                            )}
                            {project.status === 'ready' && (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Created {new Date(project.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteProject(project.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-white dark:bg-gray-800 rounded p-2">
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {project.people.length}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Active Links
                          </div>
                        </div>
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded p-2">
                          <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                            {project.pendingPeople?.length || 0}
                          </div>
                          <div className="text-xs text-yellow-600 dark:text-yellow-500">
                            Pending
                          </div>
                        </div>
                      </div>

                      {/* Execute Button */}
                      {project.pendingPeople && project.pendingPeople.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            executeProjectPeople(project.id);
                          }}
                          className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                        >
                          Execute {project.pendingPeople.length} Pending
                        </button>
                      )}

                      {/* People Preview */}
                      {project.people.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                          <div className="flex flex-wrap gap-1">
                            {project.people.slice(0, 3).map(person => (
                              <span
                                key={person.id}
                                className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded"
                              >
                                {person.name}
                              </span>
                            ))}
                            {project.people.length > 3 && (
                              <span className="text-xs px-2 py-1 text-gray-500 dark:text-gray-400">
                                +{project.people.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Project Details */}
            {selectedProject && (
              <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  {selectedProject.name} - Details
                </h3>

                {/* Pending People */}
                {selectedProject.pendingPeople && selectedProject.pendingPeople.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Pending People (Not Created Yet)
                    </h4>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                        {selectedProject.pendingPeople.map(person => (
                          <div key={person.id} className="flex items-center justify-between bg-white dark:bg-gray-700 rounded px-3 py-2">
                            <span className="text-sm text-gray-900 dark:text-white">{person.name}</span>
                            <button
                              onClick={() => removePerson(selectedProject.id, person.id)}
                              className="ml-2 text-red-500 hover:text-red-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => executeProjectPeople(selectedProject.id)}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        disabled={creating}
                      >
                        Create All Pending Galleries
                      </button>
                    </div>
                  </div>
                )}

                {/* Active People */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Active Guest Upload Links
                  </h4>
                  {selectedProject.people.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                      {selectedProject.pendingPeople?.length ?
                        'Execute pending people to create their galleries.' :
                        'No people added yet. Drag from the People library to add.'
                      }
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedProject.people.map(person => (
                        <div key={person.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-medium text-gray-900 dark:text-white">
                              {person.name}
                            </h5>
                            <button
                              onClick={() => removePerson(selectedProject.id, person.id)}
                              className="p-1 text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                            {person.photoCount || 0} photos uploaded
                          </p>
                          {person.uploadUrl && (
                            <div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={person.uploadUrl}
                                  readOnly
                                  className="flex-1 text-xs p-2 bg-white dark:bg-gray-600 rounded border border-gray-300 dark:border-gray-600"
                                />
                                <button
                                  onClick={() => copyUploadLink(person.uploadUrl!)}
                                  className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                  {copiedLink === person.uploadUrl ? (
                                    <CheckCircle className="h-4 w-4" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                              {person.webUri && (
                                <a
                                  href={person.webUri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2"
                                >
                                  <Link2 className="h-3 w-3" />
                                  View Gallery
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Create New Project
            </h3>
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Project name"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowNewProjectModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                disabled={creating}
              >
                Cancel
              </button>
              <button
                onClick={createProject}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                disabled={creating || !newProjectName.trim()}
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Person Modal */}
      {showAddPersonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {selectedProject ? 'Add Person to Project' : 'Create Person Template'}
            </h3>
            <input
              type="text"
              value={newPersonName}
              onChange={(e) => setNewPersonName(e.target.value)}
              placeholder="Person name"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
              autoFocus
            />
            {selectedProject && (
              <label className="flex items-center gap-2 mt-3">
                <input
                  type="checkbox"
                  checked={saveToLibrary}
                  onChange={(e) => setSaveToLibrary(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Save to People Library
                </span>
              </label>
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowAddPersonModal(false);
                  setNewPersonName('');
                  setSaveToLibrary(true);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                disabled={creating}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedProject) {
                    addPersonToProject();
                  } else {
                    // Just add to library
                    if (newPersonName.trim()) {
                      const libraryPerson: Person = {
                        id: `template-${Date.now()}`,
                        name: newPersonName.trim(),
                        createdAt: new Date().toISOString(),
                        isTemplate: true,
                      };
                      const updatedLibrary = [...peopleLibrary, libraryPerson];
                      savePeopleLibrary(updatedLibrary);
                      setNewPersonName('');
                      setShowAddPersonModal(false);
                    }
                  }
                }}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                disabled={creating || !newPersonName.trim()}
              >
                {creating ? 'Creating...' : selectedProject ? 'Add & Create Gallery' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}