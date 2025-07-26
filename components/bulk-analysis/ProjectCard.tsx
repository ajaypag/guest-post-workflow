'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  Archive,
  Eye,
  ChevronRight,
  Globe,
  Target,
  Workflow,
  Clock,
  TrendingUp
} from 'lucide-react';
import { BulkAnalysisProject } from '@/types/bulk-analysis-projects';

interface ProjectCardProps {
  project: BulkAnalysisProject & {
    analyzedCount?: number;
    pendingCount?: number;
  };
  clientId: string;
  onEdit?: (project: BulkAnalysisProject) => void;
  onDelete?: (projectId: string) => void;
  onArchive?: (projectId: string) => void;
}

export function ProjectCard({ 
  project, 
  clientId,
  onEdit,
  onDelete,
  onArchive
}: ProjectCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!onDelete) return;
    
    if (confirm(`Are you sure you want to delete "${project.name}"? This will also delete all domains in this project.`)) {
      setIsDeleting(true);
      try {
        await onDelete(project.id);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressPercentage = () => {
    const total = project.domainCount || 0;
    const qualified = project.qualifiedCount || 0;
    return total > 0 ? Math.round((qualified / total) * 100) : 0;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-200">
      <Link href={`/clients/${clientId}/bulk-analysis/projects/${project.id}`}>
        <div className="p-6 cursor-pointer">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                style={{ backgroundColor: project.color + '20' }}
              >
                {project.icon || '📁'}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                {project.description && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{project.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2" onClick={(e) => e.preventDefault()}>
              <Badge className={getStatusColor(project.status)}>
                {project.status}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit?.(project)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Project
                  </DropdownMenuItem>
                  {project.status !== 'archived' && (
                    <DropdownMenuItem onClick={() => onArchive?.(project.id)}>
                      <Archive className="mr-2 h-4 w-4" />
                      Archive Project
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleDelete}
                    className="text-red-600"
                    disabled={isDeleting}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isDeleting ? 'Deleting...' : 'Delete Project'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="space-y-1">
              <div className="flex items-center text-gray-500 text-sm">
                <Globe className="w-4 h-4 mr-1" />
                Domains
              </div>
              <p className="text-2xl font-semibold">{project.domainCount || 0}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center text-gray-500 text-sm">
                <Target className="w-4 h-4 mr-1" />
                Qualified
              </div>
              <p className="text-2xl font-semibold text-green-600">
                {project.qualifiedCount || 0}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center text-gray-500 text-sm">
                <TrendingUp className="w-4 h-4 mr-1" />
                Analyzed
              </div>
              <p className="text-2xl font-semibold text-blue-600">
                {project.analyzedCount || 0}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center text-gray-500 text-sm">
                <Workflow className="w-4 h-4 mr-1" />
                Workflows
              </div>
              <p className="text-2xl font-semibold">{project.workflowCount || 0}</p>
            </div>
          </div>

          {project.domainCount > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Progress</span>
                <span>{getProgressPercentage()}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
            </div>
          )}

          {project.tags && project.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {project.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              {project.lastActivityAt ? (
                <>Updated {formatDistanceToNow(new Date(project.lastActivityAt))} ago</>
              ) : (
                <>Created {formatDistanceToNow(new Date(project.createdAt))} ago</>
              )}
            </div>
            <div className="flex items-center text-blue-600">
              <span className="mr-1">View Details</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}