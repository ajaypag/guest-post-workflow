'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { sessionStorage } from '@/lib/userStorage';
import { 
  ArrowLeft, 
  FolderOpen,
  Clock,
  ExternalLink,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface AssignedProject {
  id: string;
  name: string;
  description: string | null;
  clientId: string;
  clientName: string;
  icon: string;
  color: string;
  createdAt: string;
  status: string;
  domainCount: number;
  qualifiedCount: number;
  orderGroupId?: string;
  linkCount?: number;
}

export default function AssignedProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<AssignedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [userType, setUserType] = useState<string>('');

  useEffect(() => {
    const session = sessionStorage.getSession();
    if (session) {
      setUserType(session.userType || 'internal');
      if (session.userType !== 'internal' && session.role !== 'admin') {
        router.push('/');
        return;
      }
    } else {
      router.push('/auth/login');
      return;
    }
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/bulk-analysis/assigned-projects?extended=true');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (project: AssignedProject) => {
    if (project.qualifiedCount >= (project.linkCount || 0)) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Ready for selection
        </span>
      );
    } else if (project.domainCount > 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <Clock className="w-3 h-3 mr-1" />
          Analysis in progress
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <AlertCircle className="w-3 h-3 mr-1" />
          Awaiting domains
        </span>
      );
    }
  };

  const filteredProjects = projects.filter(project => {
    if (filter === 'all') return true;
    if (filter === 'pending' && project.domainCount === 0) return true;
    if (filter === 'in_progress' && project.domainCount > 0 && project.qualifiedCount < (project.linkCount || 0)) return true;
    if (filter === 'completed' && project.qualifiedCount >= (project.linkCount || 0)) return true;
    return false;
  });

  if (loading) {
    return (
      <AuthWrapper>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
              <div className="space-y-4">
                <div className="h-32 bg-gray-200 rounded"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
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
                href="/"
                className="inline-flex items-center text-gray-600 hover:text-gray-900 mr-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
            </div>
            
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Assigned Bulk Analysis Projects</h1>
                <p className="text-gray-600 mt-1">Projects created from confirmed orders that need your attention</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex space-x-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({projects.length})
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'pending'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Awaiting Domains ({projects.filter(p => p.domainCount === 0).length})
              </button>
              <button
                onClick={() => setFilter('in_progress')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'in_progress'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                In Progress ({projects.filter(p => p.domainCount > 0 && p.qualifiedCount < (p.linkCount || 0)).length})
              </button>
              <button
                onClick={() => setFilter('completed')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'completed'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Ready ({projects.filter(p => p.qualifiedCount >= (p.linkCount || 0)).length})
              </button>
            </div>
          </div>

          {/* Projects List */}
          {filteredProjects.length > 0 ? (
            <div className="space-y-4">
              {filteredProjects.map((project) => (
                <div key={project.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start">
                        <div 
                          className="w-12 h-12 rounded-lg flex items-center justify-center mr-4"
                          style={{ backgroundColor: project.color + '20' }}
                        >
                          <span className="text-2xl">{project.icon}</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                          <p className="text-sm text-gray-600 mb-1">{project.clientName}</p>
                          {project.description && (
                            <p className="text-sm text-gray-500 mb-2">{project.description}</p>
                          )}
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              Created {new Date(project.createdAt).toLocaleDateString()}
                            </div>
                            {project.linkCount && (
                              <div>
                                Target: {project.linkCount} links
                              </div>
                            )}
                          </div>

                          <div className="flex items-center space-x-6">
                            <div>
                              <span className="text-sm text-gray-500">Domains Added:</span>
                              <span className="ml-2 font-medium">{project.domainCount}</span>
                            </div>
                            <div>
                              <span className="text-sm text-gray-500">Qualified:</span>
                              <span className="ml-2 font-medium text-green-600">{project.qualifiedCount}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-3 ml-4">
                      {getStatusBadge(project)}
                      <Link
                        href={`/clients/${project.clientId}/bulk-analysis/projects/${project.id}`}
                        className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        Open Project
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-500">
                {filter === 'all' 
                  ? 'No assigned projects yet'
                  : `No ${filter.replace('_', ' ')} projects`}
              </p>
            </div>
          )}
        </div>
      </div>
    </AuthWrapper>
  );
}