'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { clientStorage, sessionStorage } from '@/lib/userStorage';
import { Client } from '@/types/user';
import BulkAnalysisTutorial from '@/components/BulkAnalysisTutorial';
import { ProjectCard } from '@/components/bulk-analysis/ProjectCard';
import { 
  ArrowLeft, 
  Folder,
  FolderPlus
} from 'lucide-react';
import { BulkAnalysisProject } from '@/types/bulk-analysis-projects';

export default function BulkAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<BulkAnalysisProject[]>([]);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showArchivedProjects, setShowArchivedProjects] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#6366f1');
  const [newProjectIcon, setNewProjectIcon] = useState('📁');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'info' | 'success' | 'error' | 'warning'>('info');
  const [userType, setUserType] = useState<string>('');

  useEffect(() => {
    // Get user type from session
    const session = sessionStorage.getSession();
    if (session) {
      const userType = session.userType || 'internal';
      setUserType(userType);
      
      // Block account users from accessing bulk analysis
      if (userType === 'account') {
        router.push('/vetted-sites');
        return;
      }
    }
    loadClient();
  }, [params.id, router]);

  useEffect(() => {
    if (client) {
      loadProjects();
    }
  }, [client]);

  const loadClient = async () => {
    try {
      const clientData = await clientStorage.getClient(params.id as string);
      if (!clientData) {
        router.push('/clients');
        return;
      }
      setClient(clientData);
    } catch (error) {
      console.error('Error loading client:', error);
      router.push('/clients');
    }
  };

  const loadProjects = async () => {
    try {
      const response = await fetch(`/api/clients/${params.id}/projects`);
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const createProject = async () => {
    if (!newProjectName.trim()) {
      setMessage('❌ Please enter a project name');
      return;
    }

    try {
      const response = await fetch(`/api/clients/${params.id}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDescription,
          color: newProjectColor,
          icon: newProjectIcon
        })
      });

      if (response.ok) {
        const data = await response.json();
        await loadProjects();
        setShowProjectForm(false);
        setNewProjectName('');
        setNewProjectDescription('');
        setMessage('✅ Project created successfully');
        // Navigate to the new project
        router.push(`/clients/${params.id}/bulk-analysis/projects/${data.project.id}`);
      } else {
        const error = await response.json();
        setMessage(`❌ ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating project:', error);
      setMessage('❌ Failed to create project');
    }
  };

  const deleteProject = async (projectId: string) => {
    try {
      const response = await fetch(`/api/clients/${params.id}/projects/${projectId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadProjects();
        setMessage('✅ Project deleted successfully');
      } else {
        const error = await response.json();
        setMessage(`❌ ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      setMessage('❌ Failed to delete project');
    }
  };

  const archiveProject = async (projectId: string) => {
    try {
      const response = await fetch(`/api/clients/${params.id}/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' })
      });

      if (response.ok) {
        await loadProjects();
        setMessage('✅ Project archived');
      } else {
        const error = await response.json();
        setMessage(`❌ ${error.error}`);
      }
    } catch (error) {
      console.error('Error archiving project:', error);
      setMessage('❌ Failed to archive project');
    }
  };
  
  const unarchiveProject = async (projectId: string) => {
    try {
      const response = await fetch(`/api/clients/${params.id}/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' })
      });

      if (response.ok) {
        await loadProjects();
        setMessage('✅ Project restored');
      } else {
        const error = await response.json();
        setMessage(`❌ ${error.error}`);
      }
    } catch (error) {
      console.error('Error unarchiving project:', error);
      setMessage('❌ Failed to restore project');
    }
  };

  if (!client) {
    return (
      <AuthWrapper>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div>Loading...</div>
          </div>
        </div>
      </AuthWrapper>
    );
  }

  // Block account users from accessing bulk analysis page
  if (userType === 'account') {
    return (
      <AuthWrapper>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Access Restricted</h2>
                <p className="text-gray-600 mb-6">This page is only available to internal users. Account users should use the Vetted Sites page for domain analysis.</p>
                <Link
                  href="/vetted-sites"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
                >
                  Go to Vetted Sites
                </Link>
              </div>
            </div>
          </div>
        </div>
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <Link
                href={`/clients/${client.id}`}
                className="inline-flex items-center text-gray-600 hover:text-gray-900 mr-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to {client.name}
              </Link>
            </div>
            
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Bulk Domain Analysis</h1>
                <p className="text-gray-600 mt-1">Pre-qualify guest post opportunities in bulk</p>
              </div>
            </div>
          </div>

          {/* Tutorial Video */}
          <BulkAnalysisTutorial />

          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.includes('✅') 
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {message}
            </div>
          )}

          {/* Projects View */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold text-gray-900">Projects</h2>
                <label className="flex items-center text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={showArchivedProjects}
                    onChange={(e) => setShowArchivedProjects(e.target.checked)}
                    className="mr-2 rounded"
                  />
                  Show archived
                </label>
              </div>
              {userType === 'internal' && (
                <button
                  onClick={() => setShowProjectForm(true)}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <FolderPlus className="w-4 h-4 mr-2" />
                  New Project
                </button>
              )}
            </div>

            {/* New Project Form */}
            {showProjectForm && (
              <div className="mb-6 p-6 bg-white rounded-lg shadow">
                <h3 className="text-lg font-medium mb-4">Create New Project</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="e.g., Tech Blogs Q1 2024"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={newProjectDescription}
                      onChange={(e) => setNewProjectDescription(e.target.value)}
                      placeholder="Add a description..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                      <input
                        type="text"
                        value={newProjectIcon}
                        onChange={(e) => setNewProjectIcon(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        maxLength={2}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                      <input
                        type="color"
                        value={newProjectColor}
                        onChange={(e) => setNewProjectColor(e.target.value)}
                        className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={createProject}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      Create Project
                    </button>
                    <button
                      onClick={() => {
                        setShowProjectForm(false);
                        setNewProjectName('');
                        setNewProjectDescription('');
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Projects Grid */}
            {(() => {
              const filteredProjects = showArchivedProjects 
                ? projects 
                : projects.filter(p => p.status !== 'archived');
              
              return filteredProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      clientId={params.id as string}
                      onEdit={(project) => {
                        setMessage('🚧 Edit functionality coming soon');
                      }}
                      onDelete={deleteProject}
                      onArchive={archiveProject}
                      onUnarchive={unarchiveProject}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Folder className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-500">
                    {showArchivedProjects && projects.length > 0 
                      ? 'No archived projects' 
                      : 'No projects yet. Create your first project to get started.'}
                  </p>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}