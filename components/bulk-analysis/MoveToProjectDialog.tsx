'use client';

import { useState, useEffect } from 'react';
import { X, ArrowRight, Folder } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  analyzedCount: number;
  pendingCount: number;
}

interface MoveToProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  currentProjectId: string;
  domainCount: number;
  onConfirm: (targetProjectId: string) => void;
}

export default function MoveToProjectDialog({
  isOpen,
  onClose,
  clientId,
  currentProjectId,
  domainCount,
  onConfirm
}: MoveToProjectDialogProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen, clientId]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/clients/${clientId}/projects`);
      if (!response.ok) throw new Error('Failed to load projects');
      
      const data = await response.json();
      // Filter out current project
      const availableProjects = data.filter((p: Project) => p.id !== currentProjectId);
      setProjects(availableProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (selectedProjectId) {
      onConfirm(selectedProjectId);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold">Move to Project</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-600 mb-4">
            Move {domainCount} selected domain{domainCount !== 1 ? 's' : ''} to another project.
          </p>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No other projects available. Create a new project first.
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {projects.map((project) => (
                <label
                  key={project.id}
                  className={`flex items-center p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedProjectId === project.id
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="project"
                    value={project.id}
                    checked={selectedProjectId === project.id}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: project.color }}
                    >
                      <span className="text-lg">{project.icon}</span>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{project.name}</div>
                      {project.description && (
                        <div className="text-sm text-gray-500">{project.description}</div>
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        {project.analyzedCount} analyzed • {project.pendingCount} pending
                      </div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedProjectId || loading}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowRight className="w-4 h-4 mr-2" />
            Move to Project
          </button>
        </div>
      </div>
    </div>
  );
}