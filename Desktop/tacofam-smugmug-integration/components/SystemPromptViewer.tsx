'use client';

import { useState, useEffect } from 'react';
import { Sparkles, X, Edit2, Save, RotateCcw } from 'lucide-react';

interface SystemPromptViewerProps {
  toolName: string;
  apiEndpoint: string;
}

export default function SystemPromptViewer({ toolName, apiEndpoint }: SystemPromptViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [defaultPrompt, setDefaultPrompt] = useState<string>('');
  const [editedPrompt, setEditedPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasCustomPrompt, setHasCustomPrompt] = useState(false);

  // Storage key for this specific tool's custom prompt
  const storageKey = `customPrompt_${apiEndpoint.replace(/\//g, '_')}`;

  useEffect(() => {
    // Load custom prompt from localStorage if it exists (client-side only)
    if (typeof window !== 'undefined') {
      const customPrompt = localStorage.getItem(storageKey);
      if (customPrompt) {
        setEditedPrompt(customPrompt);
        setHasCustomPrompt(true);
      } else {
        setHasCustomPrompt(false);
      }
    }
  }, [storageKey]);

  const fetchPrompt = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${apiEndpoint}?getSystemPrompt=true`);
      if (response.ok) {
        const data = await response.json();
        const systemPrompt = data.systemPrompt || 'System prompt not available';
        setDefaultPrompt(systemPrompt);

        // Use custom prompt if exists, otherwise use default
        if (typeof window !== 'undefined') {
          const customPrompt = localStorage.getItem(storageKey);
          if (!customPrompt) {
            setEditedPrompt(systemPrompt);
          }
        } else {
          setEditedPrompt(systemPrompt);
        }
      } else {
        setDefaultPrompt('Failed to load system prompt');
        setEditedPrompt('Failed to load system prompt');
      }
    } catch {
      setDefaultPrompt('Error loading system prompt');
      setEditedPrompt('Error loading system prompt');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    if (!defaultPrompt) {
      fetchPrompt();
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, editedPrompt);
      setHasCustomPrompt(true);
    }
    setTimeout(() => {
      setIsSaving(false);
      setIsEditing(false);
    }, 300);
  };

  const handleReset = () => {
    // Reset to default prompt
    if (confirm('Are you sure you want to reset to the default prompt? This will discard your custom prompt.')) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(storageKey);
        setHasCustomPrompt(false);
      }
      setEditedPrompt(defaultPrompt);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    // Revert to saved version (either custom or default)
    if (typeof window !== 'undefined') {
      const savedCustom = localStorage.getItem(storageKey);
      if (savedCustom) {
        setEditedPrompt(savedCustom);
      } else {
        setEditedPrompt(defaultPrompt);
      }
    }
    setIsEditing(false);
  };

  const currentPrompt = editedPrompt || defaultPrompt;

  return (
    <>
      {/* AI Icon Button */}
      <button
        onClick={handleOpen}
        className={`fixed bottom-6 right-6 bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg transition-all hover:scale-110 z-40 group ${
          hasCustomPrompt ? 'ring-2 ring-yellow-400 ring-offset-2' : ''
        }`}
        title={hasCustomPrompt ? 'View Custom AI Prompt' : 'View AI System Prompt'}
      >
        <Sparkles className="w-5 h-5" />
        {hasCustomPrompt && (
          <span className="absolute -top-1 -right-1 bg-yellow-400 text-xs font-bold text-gray-900 rounded-full w-4 h-4 flex items-center justify-center">
            !
          </span>
        )}
        <span className="absolute -top-10 right-0 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          {hasCustomPrompt ? 'Custom AI Prompt' : 'View AI Prompt'}
        </span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-purple-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    AI System Prompt: {toolName}
                  </h2>
                  {hasCustomPrompt && (
                    <p className="text-xs text-yellow-600 mt-1">
                      ⚡ Using custom prompt
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsEditing(false);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                </div>
              ) : isEditing ? (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Edit System Prompt
                  </label>
                  <textarea
                    value={editedPrompt}
                    onChange={(e) => setEditedPrompt(e.target.value)}
                    className="w-full h-96 text-sm text-gray-700 font-mono bg-white p-4 rounded-lg border-2 border-purple-300 focus:border-purple-500 focus:outline-none resize-none"
                    placeholder="Enter your custom system prompt..."
                  />
                  <p className="text-xs text-gray-500">
                    💡 Tip: Modify the prompt to change how the AI analyzes photos. Your custom prompt will be saved locally in your browser.
                  </p>
                </div>
              ) : (
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 p-4 rounded-lg border border-gray-200">
                  {currentPrompt}
                </pre>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-gray-500 flex-1">
                  {isEditing
                    ? 'Edit the prompt to customize AI behavior. Click Save to apply changes.'
                    : 'This is the system prompt that guides the AI\'s behavior. Click Edit to customize it.'}
                </p>

                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleCancel}
                        disabled={isSaving}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        {isSaving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Save Custom Prompt
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      {hasCustomPrompt && (
                        <button
                          onClick={handleReset}
                          className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Reset to Default
                        </button>
                      )}
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit Prompt
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
