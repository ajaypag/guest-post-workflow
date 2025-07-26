'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Folder, MoveRight, Trash2, CheckCircle } from 'lucide-react';
import { clientStorage } from '@/lib/userStorage';
import { BulkAnalysisDomain } from '@/types/bulk-analysis';
import { BulkAnalysisProject } from '@/types/bulk-analysis-projects';
import { Client } from '@/types/user';

export default function OrphanedDomainsPage() {
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [orphanedDomains, setOrphanedDomains] = useState<BulkAnalysisDomain[]>([]);
  const [projects, setProjects] = useState<BulkAnalysisProject[]>([]);
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(new Set());
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [assigningDomains, setAssigningDomains] = useState(false);

  useEffect(() => {
    loadData();
  }, [params.id]);

  const loadData = async () => {
    try {
      // Load client
      const clientData = await clientStorage.getClient(params.id as string);
      if (!clientData) {
        router.push('/clients');
        return;
      }
      setClient(clientData);

      // Load orphaned domains
      const domainsResponse = await fetch(`/api/clients/${params.id}/bulk-analysis?projectId=null`);
      if (domainsResponse.ok) {
        const domainsData = await domainsResponse.json();
        setOrphanedDomains(domainsData.domains || []);
      }

      // Load projects
      const projectsResponse = await fetch(`/api/clients/${params.id}/projects`);
      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json();
        setProjects(projectsData.projects || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const toggleDomainSelection = (domainId: string) => {
    const newSelection = new Set(selectedDomains);
    if (newSelection.has(domainId)) {
      newSelection.delete(domainId);
    } else {
      newSelection.add(domainId);
    }
    setSelectedDomains(newSelection);
  };

  const selectAll = () => {
    setSelectedDomains(new Set(orphanedDomains.map(d => d.id)));
  };

  const clearSelection = () => {
    setSelectedDomains(new Set());
  };

  const assignToProject = async () => {
    if (!selectedProject) {
      setMessage('Please select a project');
      return;
    }

    if (selectedDomains.size === 0) {
      setMessage('Please select domains to assign');
      return;
    }

    setAssigningDomains(true);
    setMessage('');

    try {
      const response = await fetch(`/api/clients/${params.id}/bulk-analysis/assign-project`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainIds: Array.from(selectedDomains),
          projectId: selectedProject
        })
      });

      if (response.ok) {
        const result = await response.json();
        setMessage(`✅ Successfully assigned ${result.count} domains to project`);
        
        // Reload orphaned domains
        await loadData();
        clearSelection();
        
        // If no more orphaned domains, redirect back
        if (orphanedDomains.length - selectedDomains.size === 0) {
          setTimeout(() => {
            router.push(`/clients/${params.id}/bulk-analysis`);
          }, 1500);
        }
      } else {
        throw new Error('Failed to assign domains');
      }
    } catch (error) {
      console.error('Error assigning domains:', error);
      setMessage('❌ Failed to assign domains to project');
    } finally {
      setAssigningDomains(false);
    }
  };

  const deleteOrphanedDomains = async () => {
    if (selectedDomains.size === 0) {
      setMessage('Please select domains to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedDomains.size} domains? This cannot be undone.`)) {
      return;
    }

    setAssigningDomains(true);
    try {
      const response = await fetch(`/api/clients/${params.id}/bulk-analysis/bulk`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainIds: Array.from(selectedDomains)
        })
      });

      if (response.ok) {
        setMessage(`✅ Deleted ${selectedDomains.size} domains`);
        await loadData();
        clearSelection();
      } else {
        throw new Error('Failed to delete domains');
      }
    } catch (error) {
      console.error('Error deleting domains:', error);
      setMessage('❌ Failed to delete domains');
    } finally {
      setAssigningDomains(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orphaned domains...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href={`/clients/${params.id}/bulk-analysis`}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Projects
        </Link>
        
        <h1 className="text-3xl font-bold mb-2">Orphaned Domains</h1>
        <p className="text-gray-600">
          These domains were added before the project system was implemented. 
          Assign them to a project to organize your analysis.
        </p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.includes('✅') ? 'bg-green-50 text-green-800' : 
          message.includes('❌') ? 'bg-red-50 text-red-800' : 
          'bg-blue-50 text-blue-800'
        }`}>
          {message}
        </div>
      )}

      {orphanedDomains.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
          <h2 className="text-xl font-semibold mb-2">All domains are organized!</h2>
          <p className="text-gray-600 mb-6">
            There are no orphaned domains. All domains have been assigned to projects.
          </p>
          <Link
            href={`/clients/${params.id}/bulk-analysis`}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Link>
        </div>
      ) : (
        <>
          {/* Action Bar */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  {selectedDomains.size} of {orphanedDomains.length} selected
                </span>
                <button
                  onClick={selectAll}
                  className="text-sm text-indigo-600 hover:text-indigo-700"
                >
                  Select All
                </button>
                <button
                  onClick={clearSelection}
                  className="text-sm text-gray-600 hover:text-gray-700"
                >
                  Clear Selection
                </button>
              </div>

              {selectedDomains.size > 0 && (
                <div className="flex items-center gap-4">
                  <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select a project...</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.icon} {project.name}
                      </option>
                    ))}
                  </select>
                  
                  <button
                    onClick={assignToProject}
                    disabled={!selectedProject || assigningDomains}
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <MoveRight className="w-4 h-4 mr-2" />
                    Assign to Project
                  </button>
                  
                  <button
                    onClick={deleteOrphanedDomains}
                    disabled={assigningDomains}
                    className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Selected
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Domains List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedDomains.size === orphanedDomains.length && orphanedDomains.length > 0}
                        onChange={() => {
                          if (selectedDomains.size === orphanedDomains.length) {
                            clearSelection();
                          } else {
                            selectAll();
                          }
                        }}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Domain
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Keywords
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Added
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orphanedDomains.map((domain) => (
                    <tr key={domain.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedDomains.has(domain.id)}
                          onChange={() => toggleDomainSelection(domain.id)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {domain.domain}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          domain.qualificationStatus === 'high_quality' ? 'bg-green-100 text-green-800' :
                          domain.qualificationStatus === 'average_quality' ? 'bg-yellow-100 text-yellow-800' :
                          domain.qualificationStatus === 'disqualified' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {domain.qualificationStatus.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {domain.keywordCount || 0}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {domain.createdAt ? new Date(domain.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}