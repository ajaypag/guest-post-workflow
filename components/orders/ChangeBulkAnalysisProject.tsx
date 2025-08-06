'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Loader2, ExternalLink, AlertCircle } from 'lucide-react';

interface ChangeBulkAnalysisProjectProps {
  orderGroupId: string;
  orderId: string;
  clientId: string;
  clientName: string;
  currentProjectId?: string;
  onProjectChanged?: () => void;
}

interface BulkAnalysisProject {
  id: string;
  projectName: string;
  status: string;
  createdAt: string;
  targetPageCount?: number;
  domainCount?: number;
}

export default function ChangeBulkAnalysisProject({
  orderGroupId,
  orderId,
  clientId,
  clientName,
  currentProjectId,
  onProjectChanged
}: ChangeBulkAnalysisProjectProps) {
  const [projects, setProjects] = useState<BulkAnalysisProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(currentProjectId || '');
  const [loading, setLoading] = useState(false);
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (showDropdown) {
      loadProjects();
    }
  }, [showDropdown, clientId]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch all bulk analysis projects for this client
      const response = await fetch(`/api/clients/${clientId}/bulk-analysis/projects`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to load projects');
      }
      
      const data = await response.json();
      setProjects(data.projects || []);
      
    } catch (error: any) {
      console.error('Error loading projects:', error);
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeProject = async () => {
    if (!selectedProjectId || selectedProjectId === currentProjectId) {
      setShowDropdown(false);
      return;
    }

    try {
      setChanging(true);
      setError('');

      const response = await fetch(
        `/api/orders/${orderId}/groups/${orderGroupId}/change-project`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ projectId: selectedProjectId })
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to change project');
      }

      // Success!
      setShowDropdown(false);
      onProjectChanged?.();
      
    } catch (error: any) {
      console.error('Error changing project:', error);
      setError(error.message || 'Failed to change project');
    } finally {
      setChanging(false);
    }
  };

  return (
    <div className="inline-flex items-center gap-2">
      {currentProjectId && (
        <a
          href={`/clients/${clientId}/bulk-analysis/projects/${currentProjectId}`}
          className="inline-flex items-center px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink className="w-3 h-3 mr-1" />
          View Project
        </a>
      )}
      
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="inline-flex items-center px-2 py-1 border border-gray-300 text-gray-700 text-xs rounded hover:bg-gray-50"
        title={currentProjectId ? "Change bulk analysis project" : "Link bulk analysis project"}
      >
        <RefreshCw className="w-3 h-3 mr-1" />
        {currentProjectId ? 'Change' : 'Link'} Project
      </button>

      {showDropdown && (
        <div className="absolute z-50 mt-8 bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-[300px]">
          <div className="mb-3">
            <h4 className="text-sm font-medium text-gray-900">
              Select Bulk Analysis Project
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">
              For {clientName}
            </p>
          </div>

          {error && (
            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded flex items-start">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
              <p className="text-xs text-red-800">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            </div>
          ) : projects.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-sm text-gray-500">No projects found for this client</p>
              <a
                href={`/clients/${clientId}/bulk-analysis`}
                className="text-xs text-blue-600 hover:underline mt-2 inline-block"
                target="_blank"
              >
                Create a new project →
              </a>
            </div>
          ) : (
            <>
              <div className="max-h-[200px] overflow-y-auto">
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                  disabled={changing}
                >
                  <option value="">No project linked</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.projectName || 'Untitled Project'}
                      {project.id === currentProjectId && ' (current)'}
                      {project.domainCount ? ` - ${project.domainCount} domains` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setShowDropdown(false)}
                  disabled={changing}
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangeProject}
                  disabled={changing || (!selectedProjectId && !currentProjectId) || selectedProjectId === currentProjectId}
                  className="flex-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {changing ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Changing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3 h-3 mr-1" />
                      {selectedProjectId ? 'Change' : 'Remove'} Project
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}