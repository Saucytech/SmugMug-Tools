'use client';

import { useState, useEffect } from 'react';
import { tokenStorage } from '@/lib/smugmug-client';
import { Upload, Copy, CheckCircle, RefreshCw, FolderPlus, UserPlus, Trash2, ArrowLeft, Users, Link2 } from 'lucide-react';
import ToolboxHeader from '@/components/ToolboxHeader';

interface Person {
  id: string;
  name: string;
  albumKey: string;
  albumName: string;
  albumUri: string;
  uploadUrl: string;
  uploadKey: string;
  photoCount: number;
  webUri?: string;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  createdAt: string;
  people: Person[];
  folderUri?: string; // URI of the project's folder on SmugMug
  folderKey?: string; // Key of the project's folder on SmugMug
  status?: 'pending' | 'creating' | 'ready' | 'error'; // Status of project setup
}

export default function GuestUploadManager() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [userNickname, setUserNickname] = useState<string>('');
  const [projectsFolderUri, setProjectsFolderUri] = useState<string>('');

  // UI state
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showAddPersonModal, setShowAddPersonModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newPersonName, setNewPersonName] = useState('');
  const [creating, setCreating] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  useEffect(() => {
    const tokens = tokenStorage.getTokens();
    if (!tokens) {
      window.location.href = '/';
      return;
    }
    initialize();
  }, []);

  const initialize = async () => {
    setLoading(true);
    try {
      const tokens = tokenStorage.getTokens();
      if (!tokens) return;

      // Fetch user info
      const userResponse = await fetch('/api/smugmug/user', {
        headers: {
          'X-Access-Token': tokens.accessToken,
          'X-Access-Token-Secret': tokens.accessTokenSecret,
        },
      });
      const userData = await userResponse.json();
      const nickname = userData.user?.NickName || '';
      setUserNickname(nickname);

      // Get or create "Guest Upload Projects" folder
      const folderResponse = await fetch('/api/smugmug/guest-upload-folder', {
        method: 'POST',
        headers: {
          'X-Access-Token': tokens.accessToken,
          'X-Access-Token-Secret': tokens.accessTokenSecret,
        },
      });
      const folderData = await folderResponse.json();
      setProjectsFolderUri(folderData.folder.Uri);

      // Load projects from localStorage
      loadProjects();
    } catch (error) {
      console.error('Error initializing:', error);
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

  const saveProjects = (updatedProjects: Project[]) => {
    localStorage.setItem('guest-upload-projects', JSON.stringify(updatedProjects));
    setProjects(updatedProjects);
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
      status: 'creating', // Yellow status - working on it
    };

    const tempProjects = [...projects, tempProject];
    setProjects(tempProjects);
    setNewProjectName('');
    setShowNewProjectModal(false);

    try {
      const tokens = tokenStorage.getTokens();
      if (!tokens) {
        throw new Error('Not authenticated');
      }

      // Step 1: Ensure "Guest Upload Projects" folder exists
      if (!projectsFolderUri) {
        const folderResponse = await fetch('/api/smugmug/guest-upload-folder', {
          method: 'POST',
          headers: {
            'X-Access-Token': tokens.accessToken,
            'X-Access-Token-Secret': tokens.accessTokenSecret,
          },
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
          'X-Access-Token': tokens.accessToken,
          'X-Access-Token-Secret': tokens.accessTokenSecret,
        },
        body: JSON.stringify({
          parentFolderUri: projectsFolderUri || '/api/v2/node/BQZL5k', // Use the stored URI
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
        status: 'ready', // Green status - ready for people
      };

      const updatedProjects = projects.map(p =>
        p.id === tempProject.id ? finalProject : p
      );
      saveProjects(updatedProjects);

    } catch (error) {
      console.error('Error creating project:', error);

      // Update project with error status
      const errorProject: Project = {
        ...tempProject,
        status: 'error', // Red status - not ready
      };

      const updatedProjects = projects.map(p =>
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
      const tokens = tokenStorage.getTokens();
      if (!tokens) return;

      // If project doesn't have a folder URI (old projects), create one
      if (!selectedProject.folderUri) {
        const createFolderResponse = await fetch('/api/smugmug/create-folder', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Access-Token': tokens.accessToken,
            'X-Access-Token-Secret': tokens.accessTokenSecret,
          },
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

      // Create gallery in the project's folder (not the main folder)
      const galleryName = newPersonName.trim();
      const createGalleryResponse = await fetch('/api/smugmug/create-gallery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Access-Token': tokens.accessToken,
          'X-Access-Token-Secret': tokens.accessTokenSecret,
        },
        body: JSON.stringify({
          folderUri: selectedProject.folderUri,
          galleryName,
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
          'X-Access-Token': tokens.accessToken,
          'X-Access-Token-Secret': tokens.accessTokenSecret,
        },
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
        name: newPersonName.trim(),
        albumKey: album.AlbumKey,
        albumName: galleryName,
        albumUri: album.Uri,
        uploadUrl: `https://${userNickname}.smugmug.com/upload/${album.AlbumKey}/${uploadKey}/`,
        uploadKey,
        photoCount: 0,
        webUri: album.WebUri,
        createdAt: new Date().toISOString(),
      };

      // Update project
      const updatedProjects = projects.map(p => {
        if (p.id === selectedProject.id) {
          return {
            ...p,
            people: [...p.people, newPerson],
          };
        }
        return p;
      });

      saveProjects(updatedProjects);
      setSelectedProject(updatedProjects.find(p => p.id === selectedProject.id) || null);
      setNewPersonName('');
      setShowAddPersonModal(false);
    } catch (error) {
      console.error('Error adding person:', error);
      alert('Failed to add person. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const deletePerson = (personId: string) => {
    if (!selectedProject) return;
    if (!confirm('Remove this person from the project? This will not delete the gallery on SmugMug.')) return;

    const updatedProjects = projects.map(p => {
      if (p.id === selectedProject.id) {
        return {
          ...p,
          people: p.people.filter(person => person.id !== personId),
        };
      }
      return p;
    });

    saveProjects(updatedProjects);
    setSelectedProject(updatedProjects.find(p => p.id === selectedProject.id) || null);
  };

  const refreshPhotoCounts = async () => {
    if (!selectedProject) return;

    const tokens = tokenStorage.getTokens();
    if (!tokens) return;

    for (const person of selectedProject.people) {
      try {
        const response = await fetch(`/api/smugmug/albums/${person.albumKey}/images?limit=1`, {
          headers: {
            'X-Access-Token': tokens.accessToken,
            'X-Access-Token-Secret': tokens.accessTokenSecret,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const count = data.total || 0;

          // Update photo count
          const updatedProjects = projects.map(p => {
            if (p.id === selectedProject.id) {
              return {
                ...p,
                people: p.people.map(per =>
                  per.id === person.id ? { ...per, photoCount: count } : per
                ),
              };
            }
            return p;
          });

          saveProjects(updatedProjects);
          setSelectedProject(updatedProjects.find(p => p.id === selectedProject.id) || null);
        }
      } catch (error) {
        console.error('Error refreshing photo count for', person.name, error);
      }
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const exportAllLinks = () => {
    if (!selectedProject) return;

    const linksText = selectedProject.people
      .map(person => `${person.name}\nUpload URL: ${person.uploadUrl}\n`)
      .join('\n');

    navigator.clipboard.writeText(linksText);
    alert(`Copied ${selectedProject.people.length} upload links to clipboard!`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <ToolboxHeader currentTool="guest-upload-manager" />

      <div className="max-w-7xl mx-auto py-12 px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Upload className="w-12 h-12 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Guest Upload Manager</h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Create projects to organize guest upload links. Perfect for events, school photos, and group sessions.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : selectedProject ? (
          /* Project Detail View */
          <div className="space-y-6">
            {/* Back button */}
            <button
              onClick={() => setSelectedProject(null)}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Projects
            </button>

            {/* Project header */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedProject.name}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedProject.people.length} {selectedProject.people.length === 1 ? 'person' : 'people'} • Created {new Date(selectedProject.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={refreshPhotoCounts}
                    className="flex items-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh Counts
                  </button>
                  {selectedProject.people.length > 0 && (
                    <button
                      onClick={exportAllLinks}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                      Export All Links
                    </button>
                  )}
                  <button
                    onClick={() => setShowAddPersonModal(true)}
                    disabled={selectedProject.status !== 'ready'}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedProject.status === 'ready'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    title={selectedProject.status !== 'ready' ? 'Project setup must complete before adding people' : 'Add a person to this project'}
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Person
                  </button>
                </div>
              </div>
            </div>

            {/* People list */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">People in this Project</h3>

              {selectedProject.people.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">No people added yet</p>
                  <p className="text-sm">Click "Add Person" to create a gallery and guest upload link</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedProject.people.map((person) => (
                    <div
                      key={person.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 text-lg mb-2">{person.name}</h4>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-600">Upload URL:</span>
                              <code className="text-sm bg-gray-100 px-2 py-1 rounded flex-1 font-mono text-gray-900">
                                {person.uploadUrl}
                              </code>
                              <button
                                onClick={() => copyToClipboard(person.uploadUrl, person.id)}
                                className="text-blue-600 hover:text-blue-700 p-1"
                                title="Copy URL"
                              >
                                {copiedLink === person.id ? (
                                  <CheckCircle className="w-5 h-5 text-green-600" />
                                ) : (
                                  <Copy className="w-5 h-5" />
                                )}
                              </button>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>📸 {person.photoCount} photos</span>
                              {person.webUri && (
                                <a
                                  href={person.webUri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  View Gallery →
                                </a>
                              )}
                              <span className="text-xs text-gray-400">
                                Added {new Date(person.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => deletePerson(person.id)}
                          className="text-red-600 hover:text-red-700 p-2 ml-4"
                          title="Remove person"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Project List View */
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Your Projects</h2>
              <button
                onClick={() => setShowNewProjectModal(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <FolderPlus className="w-4 h-4" />
                New Project
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FolderPlus className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg">No projects yet</p>
                <p className="text-sm">Create a project to start organizing guest upload links</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors cursor-pointer"
                    onClick={() => setSelectedProject(project)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 text-lg">{project.name}</h3>
                        {/* Status indicator */}
                        <div className="flex items-center" title={
                          project.status === 'ready' ? 'Ready for people' :
                          project.status === 'creating' ? 'Setting up project...' :
                          project.status === 'error' ? 'Setup failed - try again' :
                          'Pending'
                        }>
                          {project.status === 'ready' ? (
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                          ) : project.status === 'creating' ? (
                            <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
                          ) : project.status === 'error' ? (
                            <div className="w-3 h-3 bg-red-500 rounded-full" />
                          ) : (
                            <div className="w-3 h-3 bg-gray-400 rounded-full" />
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteProject(project.id);
                        }}
                        className="text-red-600 hover:text-red-700 p-1"
                        title="Delete project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-sm text-gray-600 space-y-1">
                      <p>👥 {project.people.length} {project.people.length === 1 ? 'person' : 'people'}</p>
                      {project.status === 'error' && (
                        <p className="text-red-600 text-xs font-medium">⚠️ Setup failed - click to retry</p>
                      )}
                      {project.status === 'creating' && (
                        <p className="text-yellow-600 text-xs font-medium">⏳ Setting up folders...</p>
                      )}
                      <p className="text-xs text-gray-400">
                        Created {new Date(project.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* New Project Modal */}
        {showNewProjectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Create New Project</h3>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Project name (e.g., Smith Wedding 2025)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
                onKeyDown={(e) => e.key === 'Enter' && createProject()}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowNewProjectModal(false);
                    setNewProjectName('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  onClick={createProject}
                  disabled={!newProjectName.trim() || creating}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium"
                >
                  {creating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Person Modal */}
        {showAddPersonModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Add Person to {selectedProject?.name}</h3>
              <p className="text-sm text-gray-600 mb-4">
                This will create a new gallery and guest upload link for this person.
              </p>
              <input
                type="text"
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                placeholder="Person's name (e.g., John Doe)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
                onKeyDown={(e) => e.key === 'Enter' && addPersonToProject()}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowAddPersonModal(false);
                    setNewPersonName('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  onClick={addPersonToProject}
                  disabled={!newPersonName.trim() || creating}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium"
                >
                  {creating ? 'Creating...' : 'Add Person'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
