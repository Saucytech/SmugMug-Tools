'use client';

import { useState, useEffect } from 'react';
import { Sparkles, X, Edit2, Save, RotateCcw, Zap, Info } from 'lucide-react';
import { useModelPreferences, AVAILABLE_MODELS, ModelId, ModelPreferences } from '@/stores/modelPreferencesStore';

interface SystemPromptViewerProps {
  toolName: string;
  apiEndpoint: string;
  toolId?: keyof ModelPreferences; // Optional for backward compatibility
}

export default function SystemPromptViewer({ toolName, apiEndpoint, toolId }: SystemPromptViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [defaultPrompt, setDefaultPrompt] = useState<string>('');
  const [editedPrompt, setEditedPrompt] = useState<string>('');
  const [modelName, setModelName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasCustomPrompt, setHasCustomPrompt] = useState(false);

  // Model preferences (optional)
  const { preferences, setModel } = useModelPreferences();
  const selectedModel = toolId ? preferences[toolId] : null;
  const modelInfo = selectedModel ? AVAILABLE_MODELS[selectedModel] : null;

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
        const model = data.model || 'Model information not available';
        setDefaultPrompt(systemPrompt);
        setModelName(model);

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
        setModelName('Unknown');
      }
    } catch {
      setDefaultPrompt('Error loading system prompt');
      setEditedPrompt('Error loading system prompt');
      setModelName('Unknown');
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

  const handleModelChange = (newModel: ModelId) => {
    if (toolId) {
      setModel(toolId, newModel);
    }
  };

  const currentPrompt = editedPrompt || defaultPrompt;

  return (
    <>
      {/* Fixed bottom-right button group */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
        {/* Model Selector Card - Only show if toolId is provided */}
        {toolId && modelInfo && (
          <div className="bg-white rounded-lg shadow-lg border-2 border-purple-200 p-3 min-w-[200px]">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-bold text-gray-700">AI Model</span>
            </div>

            <select
              value={selectedModel || undefined}
              onChange={(e) => handleModelChange(e.target.value as ModelId)}
              className="w-full text-xs border border-gray-300 rounded px-2 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
            >
              {Object.entries(AVAILABLE_MODELS).map(([id, info]) => (
                <option key={id} value={id}>
                  {info.name} - {info.description}
                </option>
              ))}
            </select>

            {modelInfo && (
              <>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-purple-50 px-2 py-1 rounded">
                    <div className="text-gray-500">Speed</div>
                    <div className="font-semibold text-purple-700">{modelInfo.speed}</div>
                  </div>
                  <div className="bg-purple-50 px-2 py-1 rounded">
                    <div className="text-gray-500">Quality</div>
                    <div className="font-semibold text-purple-700">{modelInfo.quality}</div>
                  </div>
                </div>

                <div className="mt-2 text-xs text-gray-600 bg-yellow-50 px-2 py-1 rounded border border-yellow-200 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-yellow-600" />
                  <span className="font-semibold">~{modelInfo.coinsPerOperation} coins</span> per operation
                </div>
              </>
            )}
          </div>
        )}

        {/* System Prompt Button */}
        <button
          onClick={handleOpen}
          className={`bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg shadow-lg transition-all hover:scale-105 group ${
            hasCustomPrompt ? 'ring-2 ring-yellow-400 ring-offset-2' : ''
          }`}
          title={hasCustomPrompt ? 'View Custom AI Prompt' : 'View AI System Prompt'}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <span className="text-sm font-semibold">AI Prompt</span>
          </div>
          {hasCustomPrompt && (
            <span className="absolute -top-1 -left-1 bg-yellow-400 text-xs font-bold text-gray-900 rounded-full w-5 h-5 flex items-center justify-center">
              !
            </span>
          )}
        </button>
      </div>

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
                  <div className="flex items-center gap-2 mt-1">
                    {modelName && (
                      <p className="text-xs text-gray-600 font-mono bg-gray-100 px-2 py-1 rounded">
                        Default Model: {modelName}
                      </p>
                    )}
                    {modelInfo && (
                      <p className="text-xs text-purple-600 font-mono bg-purple-100 px-2 py-1 rounded">
                        Selected: {modelInfo.name}
                      </p>
                    )}
                    {hasCustomPrompt && (
                      <p className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
                        ⚡ Custom Prompt
                      </p>
                    )}
                  </div>
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
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-blue-900">
                        <strong>Tip:</strong> Modify the prompt to change how the AI analyzes content.
                        Your custom prompt will be saved locally in your browser{modelInfo && <> and used with the <strong>{modelInfo.name}</strong> model</>}.
                      </p>
                    </div>
                  </div>
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
