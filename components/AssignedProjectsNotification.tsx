'use client';

import { useState, useEffect } from 'react';
import { Clock, FolderOpen, ExternalLink, X } from 'lucide-react';
import Link from 'next/link';
import { sessionStorage } from '@/lib/userStorage';

interface AssignedProject {
  id: string;
  name: string;
  description: string | null;
  clientId: string;
  clientName: string;
  icon: string;
  color: string;
  createdAt: string;
  orderGroupId?: string;
  linkCount?: number;
}

export default function AssignedProjectsNotification() {
  const [assignedProjects, setAssignedProjects] = useState<AssignedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<string>('');
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    const session = sessionStorage.getSession();
    if (session) {
      setUserType(session.userType || 'internal');
      if (session.userType === 'internal' || session.role === 'admin') {
        loadAssignedProjects();
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const loadAssignedProjects = async () => {
    try {
      const response = await fetch('/api/bulk-analysis/assigned-projects');
      if (response.ok) {
        const data = await response.json();
        setAssignedProjects(data.projects || []);
        
        // Load dismissed projects from localStorage
        const dismissedProjects = localStorage.getItem('dismissedProjects');
        if (dismissedProjects) {
          setDismissed(JSON.parse(dismissedProjects));
        }
      }
    } catch (error) {
      console.error('Error loading assigned projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const dismissProject = (projectId: string) => {
    const newDismissed = [...dismissed, projectId];
    setDismissed(newDismissed);
    localStorage.setItem('dismissedProjects', JSON.stringify(newDismissed));
  };

  if (loading || userType !== 'internal') {
    return null;
  }

  const visibleProjects = assignedProjects.filter(p => !dismissed.includes(p.id));

  if (visibleProjects.length === 0) {
    return null;
  }

  const recentProjects = visibleProjects
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  return (
    <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">New Bulk Analysis Projects</h3>
            <p className="text-sm text-gray-600">
              {visibleProjects.length} project{visibleProjects.length !== 1 ? 's' : ''} assigned to you from confirmed orders
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {recentProjects.map((project) => (
          <div key={project.id} className="bg-white rounded-lg p-3 border border-gray-200 hover:border-blue-300 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-1">
                  <span className="text-lg mr-2">{project.icon}</span>
                  <h4 className="font-medium text-gray-900">{project.name}</h4>
                  {project.linkCount && (
                    <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {project.linkCount} links
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-1">{project.clientName}</p>
                {project.description && (
                  <p className="text-sm text-gray-500">{project.description}</p>
                )}
                <div className="flex items-center mt-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3 mr-1" />
                  {new Date(project.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center ml-3">
                <Link
                  href={`/clients/${project.clientId}/bulk-analysis/projects/${project.id}`}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Open project"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => dismissProject(project.id)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors ml-1"
                  title="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {visibleProjects.length > 3 && (
        <div className="mt-3 text-center">
          <Link
            href="/bulk-analysis"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View all {visibleProjects.length} assigned projects →
          </Link>
        </div>
      )}
    </div>
  );
}