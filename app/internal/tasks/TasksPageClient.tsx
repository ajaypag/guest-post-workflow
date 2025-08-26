'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Search, 
  Filter, 
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ExternalLink,
  User,
  Package,
  FileText,
  MoreVertical,
  List,
  LayoutGrid,
  X,
  SlidersHorizontal,
  Inbox,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import type { 
  TasksResponse, 
  UnifiedTask, 
  TaskType,
  TaskStatus,
  isOrderTask,
  isWorkflowTask,
  isLineItemTask
} from '@/lib/types/tasks';

interface InternalUser {
  id: string;
  name: string | null;
  email: string;
  taskCount?: number;
  activeTaskCount?: number;
}

interface TasksPageClientProps {
  initialData: TasksResponse;
  currentUserId: string;
  currentUserName: string;
  currentUserEmail: string;
  internalUsers: InternalUser[];
}

// Filter state interface for localStorage
interface FilterState {
  selectedUser: string;
  selectedTypes: TaskType[];
  selectedStatuses: TaskStatus[];
  dateRange: string;
  showLineItems: boolean;
  groupByDeadline: boolean;
  showCompleted: boolean;
  customDateStart?: string;
  customDateEnd?: string;
}

const FILTER_STORAGE_KEY = 'internal-tasks-filters';

export default function TasksPageClient({
  initialData,
  currentUserId,
  currentUserName,
  currentUserEmail,
  internalUsers
}: TasksPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [data, setData] = useState<TasksResponse>(initialData);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  
  // Load filters from URL first, then localStorage as fallback
  const loadFiltersFromURL = (): Partial<FilterState> => {
    const urlFilters: Partial<FilterState> = {};
    
    // Read URL parameters
    const userParam = searchParams.get('user');
    if (userParam) urlFilters.selectedUser = userParam;
    
    const typesParam = searchParams.get('types');
    if (typesParam) urlFilters.selectedTypes = typesParam.split(',') as TaskType[];
    
    const statusesParam = searchParams.get('statuses');
    if (statusesParam) urlFilters.selectedStatuses = statusesParam.split(',') as TaskStatus[];
    
    const dateRangeParam = searchParams.get('dateRange');
    if (dateRangeParam) urlFilters.dateRange = dateRangeParam;
    
    const lineItemsParam = searchParams.get('showLineItems');
    if (lineItemsParam) urlFilters.showLineItems = lineItemsParam === 'true';
    
    const groupedParam = searchParams.get('grouped');
    if (groupedParam) urlFilters.groupByDeadline = groupedParam === 'true';
    
    const completedParam = searchParams.get('showCompleted');
    if (completedParam) urlFilters.showCompleted = completedParam === 'true';
    
    const searchParam = searchParams.get('search');
    if (searchParam) {
      setSearchQuery(searchParam);
    }
    
    const pageParam = searchParams.get('page');
    if (pageParam) setCurrentPage(parseInt(pageParam, 10) || 1);
    
    return urlFilters;
  };

  const loadSavedFilters = (): Partial<FilterState> => {
    if (typeof window === 'undefined') return {};
    const saved = localStorage.getItem(FILTER_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {};
  };
  
  const urlFilters = loadFiltersFromURL();
  const savedFilters = loadSavedFilters();
  
  // Filter states with URL params first, then localStorage, then defaults
  const [selectedUser, setSelectedUser] = useState<string>(
    urlFilters.selectedUser ?? savedFilters.selectedUser ?? currentUserId
  );
  const [selectedTypes, setSelectedTypes] = useState<TaskType[]>(
    urlFilters.selectedTypes ?? savedFilters.selectedTypes ?? []
  );
  const [selectedStatuses, setSelectedStatuses] = useState<TaskStatus[]>(
    urlFilters.selectedStatuses ?? savedFilters.selectedStatuses ?? []
  );
  const [dateRange, setDateRange] = useState<string>(
    urlFilters.dateRange ?? savedFilters.dateRange ?? 'all'
  );
  const [showLineItems, setShowLineItems] = useState(
    urlFilters.showLineItems ?? savedFilters.showLineItems ?? false
  );
  const [groupByDeadline, setGroupByDeadline] = useState(
    urlFilters.groupByDeadline ?? savedFilters.groupByDeadline ?? true
  );
  const [showCompleted, setShowCompleted] = useState(
    urlFilters.showCompleted ?? savedFilters.showCompleted ?? false
  );
  const [customDateStart, setCustomDateStart] = useState<string>(savedFilters.customDateStart ?? '');
  const [customDateEnd, setCustomDateEnd] = useState<string>(savedFilters.customDateEnd ?? '');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Bulk selection state
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assignmentTarget, setAssignmentTarget] = useState<string | null>(null);
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [assignmentType, setAssignmentType] = useState<'single' | 'bulk'>('single');
  const [singleAssignmentTask, setSingleAssignmentTask] = useState<UnifiedTask | null>(null);

  // Update URL with current filter state
  const updateURL = useCallback(() => {
    const params = new URLSearchParams();
    
    // Only add params that differ from defaults to keep URLs clean
    if (selectedUser !== currentUserId && selectedUser !== 'all') {
      params.set('user', selectedUser);
    }
    
    if (selectedTypes.length > 0) {
      params.set('types', selectedTypes.join(','));
    }
    
    if (selectedStatuses.length > 0) {
      params.set('statuses', selectedStatuses.join(','));
    }
    
    if (dateRange !== 'all') {
      params.set('dateRange', dateRange);
    }
    
    if (customDateStart) {
      params.set('startDate', customDateStart);
    }
    
    if (customDateEnd) {
      params.set('endDate', customDateEnd);
    }
    
    if (showLineItems) {
      params.set('showLineItems', 'true');
    }
    
    if (!groupByDeadline) {
      params.set('grouped', 'false');
    }
    
    if (showCompleted) {
      params.set('showCompleted', 'true');
    }
    
    if (searchQuery.trim()) {
      params.set('search', searchQuery);
    }
    
    if (currentPage > 1) {
      params.set('page', currentPage.toString());
    }
    
    const newURL = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    router.replace(newURL);
  }, [
    selectedUser, selectedTypes, selectedStatuses, dateRange, customDateStart, 
    customDateEnd, showLineItems, groupByDeadline, showCompleted, searchQuery, 
    currentPage, currentUserId, router
  ]);

  // Update URL when filters change
  useEffect(() => {
    updateURL();
  }, [updateURL]);

  // Save filters to localStorage
  useEffect(() => {
    const filters: FilterState = {
      selectedUser,
      selectedTypes,
      selectedStatuses,
      dateRange,
      showLineItems,
      groupByDeadline,
      showCompleted,
      customDateStart,
      customDateEnd
    };
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
  }, [selectedUser, selectedTypes, selectedStatuses, dateRange, showLineItems, groupByDeadline, showCompleted, customDateStart, customDateEnd]);
  
  // Reset filters
  const resetFilters = () => {
    setSelectedUser(currentUserId);
    setSelectedTypes([]);
    setSelectedStatuses([]);
    setDateRange('all');
    setShowLineItems(false);
    setShowCompleted(false);
    setCustomDateStart('');
    setCustomDateEnd('');
    setSearchQuery('');
  };
  
  // Clear all filters
  const clearFilters = () => {
    setSelectedUser(currentUserId);
    setSelectedTypes([]);
    setSelectedStatuses([]);
    setDateRange('all');
    setShowLineItems(false);
    setShowCompleted(false);
    setCustomDateStart('');
    setCustomDateEnd('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Check if filters are active
  const hasActiveFilters = () => {
    return selectedUser !== currentUserId || 
           selectedTypes.length > 0 || 
           selectedStatuses.length > 0 || 
           dateRange !== 'all' ||
           showLineItems ||
           searchQuery !== '' ||
           customDateStart !== '' ||
           customDateEnd !== '';
  };
  
  // Fetch tasks with filters
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      // User filter
      if (selectedUser === 'unassigned') {
        params.append('assignedTo', 'unassigned');
      } else if (selectedUser !== 'all') {
        params.append('assignedTo', selectedUser);
      } else {
        params.append('assignedTo', 'all');
      }
      
      // Type filter
      if (selectedTypes.length > 0) {
        params.append('type', selectedTypes.join(','));
      }
      
      // Status filter - if not showing completed, exclude it
      if (!showCompleted) {
        const statusesToFilter = selectedStatuses.length > 0 
          ? selectedStatuses.filter(s => s !== 'completed')
          : ['pending', 'in_progress', 'blocked'];
        if (statusesToFilter.length > 0) {
          params.append('status', statusesToFilter.join(','));
        }
      } else if (selectedStatuses.length > 0) {
        params.append('status', selectedStatuses.join(','));
      }
      
      // Date range
      if (dateRange === 'custom' && (customDateStart || customDateEnd)) {
        if (customDateStart) params.append('startDate', customDateStart);
        if (customDateEnd) params.append('endDate', customDateEnd);
      } else if (dateRange === 'month') {
        params.append('dateRange', 'month');
      } else if (dateRange !== 'all') {
        params.append('dateRange', dateRange);
      }
      
      // Search
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      
      // Line items toggle
      params.append('showLineItems', showLineItems.toString());
      
      // Pagination
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());

      const response = await fetch(`/api/internal/tasks?${params}`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedUser, selectedTypes, selectedStatuses, dateRange, searchQuery, showLineItems, showCompleted, customDateStart, customDateEnd, currentPage, itemsPerPage]);

  // Re-fetch when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTasks();
    }, 300); // Debounce

    return () => clearTimeout(timer);
  }, [fetchTasks]);

  // Reset to first page when filters change (but not pagination)
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedUser, selectedTypes, selectedStatuses, dateRange, searchQuery, showLineItems, showCompleted, customDateStart, customDateEnd]);

  // Format date
  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'No deadline';
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < -1) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays === -1) return '1 day overdue';
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    if (diffDays <= 7) return `Due in ${diffDays} days`;
    
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Get task icon
  const getTaskIcon = (task: UnifiedTask) => {
    switch (task.type) {
      case 'order':
        return <Package className="h-4 w-4 text-gray-500" />;
      case 'workflow':
        return <FileText className="h-4 w-4 text-gray-500" />;
      case 'line_item':
        return <ExternalLink className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get task type display info
  const getTaskTypeInfo = (task: UnifiedTask) => {
    switch (task.type) {
      case 'order':
        return { label: 'Order', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'workflow':
        return { label: 'Workflow', color: 'bg-green-50 text-green-700 border-green-200' };
      case 'line_item':
        return { label: 'Line Item', color: 'bg-purple-50 text-purple-700 border-purple-200' };
    }
  };

  // Handle task selection
  const handleTaskSelect = (taskId: string, checked: boolean) => {
    const newSelected = new Set(selectedTasks);
    if (checked) {
      newSelected.add(taskId);
    } else {
      newSelected.delete(taskId);
    }
    setSelectedTasks(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };
  
  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allTaskIds = new Set(data.tasks.map(t => t.id));
      setSelectedTasks(allTaskIds);
      setShowBulkActions(true);
    } else {
      setSelectedTasks(new Set());
      setShowBulkActions(false);
    }
  };
  
  // Handle assignment
  const handleAssignment = async () => {
    if (!assignmentTarget) return;
    
    try {
      const tasksToAssign = assignmentType === 'bulk' 
        ? Array.from(selectedTasks) 
        : singleAssignmentTask ? [singleAssignmentTask.id] : [];
      
      if (tasksToAssign.length === 0) return;
      
      // Parse task IDs to get entity type and ID
      const assignments = tasksToAssign.map(taskId => {
        const [type, id] = taskId.split('-');
        return {
          entityType: type === 'order' ? 'order' : type === 'workflow' ? 'workflow' : 'line_item',
          entityId: id
        };
      });
      
      // Make API call for each assignment type group
      const groupedAssignments = assignments.reduce((acc, curr) => {
        if (!acc[curr.entityType]) {
          acc[curr.entityType] = [];
        }
        acc[curr.entityType].push(curr.entityId);
        return acc;
      }, {} as Record<string, string[]>);
      
      for (const [entityType, entityIds] of Object.entries(groupedAssignments)) {
        await fetch('/api/internal/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entityType,
            entityIds,
            assignedTo: assignmentTarget,
            notes: assignmentNotes
          })
        });
      }
      
      // Reset state and refresh
      setShowAssignmentModal(false);
      setAssignmentTarget(null);
      setAssignmentNotes('');
      setSelectedTasks(new Set());
      setShowBulkActions(false);
      setSingleAssignmentTask(null);
      
      // Refresh tasks
      await fetchTasks();
    } catch (error) {
      console.error('Error assigning tasks:', error);
    }
  };
  
  // Handle claim task (assign to self)
  const handleClaimTask = async (task: UnifiedTask) => {
    const [type, id] = task.id.split('-');
    
    try {
      await fetch('/api/internal/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: type === 'order' ? 'order' : type === 'workflow' ? 'workflow' : 'line_item',
          entityId: id,
          assignedTo: currentUserId,
          notes: 'Claimed by user'
        })
      });
      
      // Refresh tasks
      await fetchTasks();
    } catch (error) {
      console.error('Error claiming task:', error);
    }
  };
  
  // Get status color
  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'in_progress':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'completed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'blocked':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'cancelled':
        return 'bg-gray-50 text-gray-500 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Get deadline color
  const getDeadlineColor = (deadline: Date | null | undefined) => {
    if (!deadline) return 'text-gray-500';
    const d = new Date(deadline);
    const now = new Date();
    const diffDays = Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'text-red-600 font-medium';
    if (diffDays === 0) return 'text-orange-600 font-medium';
    if (diffDays <= 3) return 'text-yellow-600';
    return 'text-gray-600';
  };

  // Render task card
  const renderTaskCard = (task: UnifiedTask) => {
    const isSelected = selectedTasks.has(task.id);
    
    return (
      <div key={task.id} className={`bg-white rounded-lg border ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-gray-200'} hover:shadow-sm transition-all`}>
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Selection checkbox */}
            <div className="pt-1">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => handleTaskSelect(task.id, e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
            </div>
            
            <div className="flex-1">
              {/* Task header */}
              <div className="flex items-center gap-2 mb-2">
                {getTaskIcon(task)}
                <h3 className="font-medium text-gray-900">{task.title}</h3>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getTaskTypeInfo(task).color}`}>
                  {getTaskTypeInfo(task).label}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(task.status)}`}>
                  {task.status.replace('_', ' ')}
                </span>
              </div>

            {/* Task details */}
            {task.description && (
              <p className="text-sm text-gray-600 mb-2">{task.description}</p>
            )}

            {/* Task metadata */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              {/* Deadline */}
              <div className={`flex items-center gap-1 ${getDeadlineColor(task.deadline)}`}>
                <Clock className="h-3 w-3" />
                {formatDate(task.deadline)}
              </div>

              {/* Client */}
              {(task.type === 'order' || task.type === 'workflow' || task.type === 'line_item') && (
                <div className="text-gray-600">
                  Client: {(task as any).client?.name || 'Unknown'}
                </div>
              )}

              {/* Order specific */}
              {task.type === 'order' && (
                <div className="text-gray-600">
                  {(task as any).lineItemCount} line items
                </div>
              )}

              {/* Workflow specific */}
              {task.type === 'workflow' && (task as any).completionPercentage !== undefined && (
                <div className="text-gray-600">
                  {(task as any).completionPercentage}% complete
                </div>
              )}

              {/* Line item specific */}
              {task.type === 'line_item' && (
                <>
                  {(task as any).assignedDomain && (
                    <div className="text-gray-600">
                      {(task as any).assignedDomain}
                    </div>
                  )}
                  <div className="text-gray-500 text-xs">
                    Order #{(task as any).parentOrderNumber}
                  </div>
                </>
              )}
              
              {/* Assigned to */}
              <div className="text-sm text-gray-600">
                {task.assignedTo ? (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {task.assignedTo.name || task.assignedTo.email}
                  </div>
                ) : (
                  <span className="text-orange-600 font-medium">Unassigned</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
              {/* Assignment dropdown or claim button */}
              {!task.assignedTo ? (
                <button
                  onClick={() => handleClaimTask(task)}
                  className="px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  Claim
                </button>
              ) : (
                <select
                  value={task.assignedTo?.id || ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSingleAssignmentTask(task);
                      setAssignmentTarget(e.target.value);
                      setAssignmentType('single');
                      setShowAssignmentModal(true);
                    }
                  }}
                  className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Reassign...</option>
                  {internalUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.email}
                    </option>
                  ))}
                </select>
              )}
              
              {/* View link */}
              <Link
                href={task.action}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                title="View"
              >
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Assignment Modal */}
      {showAssignmentModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowAssignmentModal(false)} />
            
            <div className="relative bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {assignmentType === 'bulk' ? `Assign ${selectedTasks.size} tasks` : 'Reassign task'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign to
                  </label>
                  <select
                    value={assignmentTarget || ''}
                    onChange={(e) => setAssignmentTarget(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Select user...</option>
                    {internalUsers
                      .sort((a, b) => {
                        // Sort by workload - least busy first for better assignment distribution
                        return (a.taskCount || 0) - (b.taskCount || 0);
                      })
                      .map(user => {
                        const name = user.name || user.email.split('@')[0];
                        const workloadIndicator = 
                          !user.taskCount ? '✅' :
                          user.taskCount <= 3 ? '🟢' :
                          user.taskCount <= 6 ? '🟡' :
                          '🔴';
                        const taskInfo = user.taskCount 
                          ? ` (${user.activeTaskCount || 0} active, ${user.taskCount} total)`
                          : ' (Available)';
                        
                        return (
                          <option key={user.id} value={user.id}>
                            {workloadIndicator} {name}{taskInfo}
                          </option>
                        );
                      })
                    }
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    value={assignmentNotes}
                    onChange={(e) => setAssignmentNotes(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Add any notes about this assignment..."
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowAssignmentModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignment}
                  disabled={!assignmentTarget}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Assign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700">
                  {selectedTasks.size} {selectedTasks.size === 1 ? 'task' : 'tasks'} selected
                </span>
                <button
                  onClick={() => handleSelectAll(false)}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Clear selection
                </button>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setAssignmentType('bulk');
                    setAssignmentTarget(null);
                    setAssignmentNotes('');
                    setShowAssignmentModal(true);
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Assign Selected
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            My Tasks ({data.stats.total})
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage your assignments across orders, workflows, and line items
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-semibold text-gray-900">{data.stats.overdue}</div>
            <div className="text-sm text-gray-600">Overdue</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-semibold text-gray-900">{data.stats.dueToday}</div>
            <div className="text-sm text-gray-600">Due Today</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-semibold text-gray-900">{data.stats.dueThisWeek}</div>
            <div className="text-sm text-gray-600">This Week</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-semibold text-gray-900">{data.stats.upcoming}</div>
            <div className="text-sm text-gray-600">Upcoming</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-semibold text-gray-900">{data.stats.noDueDate}</div>
            <div className="text-sm text-gray-600">No Deadline</div>
          </div>
        </div>

        {/* Enhanced Filters bar */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          {/* Main filters */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              {/* Search - full width on mobile, flex-1 on desktop */}
              <div className="w-full sm:flex-1 sm:min-w-[250px] relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
              </div>

              {/* Filter controls - organized in rows on mobile, inline on desktop */}
              <div className="w-full sm:w-auto flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {/* Enhanced User filter with task counts */}
                <div className="relative w-full sm:w-auto">
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2 pr-8 border border-gray-200 rounded-lg text-sm hover:border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white"
                  >
                    <option value={currentUserId}>
                      📋 My Tasks {(() => {
                        const myUser = internalUsers.find(u => u.id === currentUserId);
                        return myUser?.taskCount ? `(${myUser.taskCount})` : '';
                      })()}
                    </option>
                    <option value="all">👥 All Tasks</option>
                    <option value="unassigned">📭 Unassigned</option>
                    <optgroup label="──────── Team Members ────────">
                      {internalUsers
                        .filter(user => user.id !== currentUserId)
                        .sort((a, b) => {
                          // Sort by active task count first, then total tasks
                          if (b.activeTaskCount !== a.activeTaskCount) {
                            return (b.activeTaskCount || 0) - (a.activeTaskCount || 0);
                          }
                          return (b.taskCount || 0) - (a.taskCount || 0);
                        })
                        .map(user => {
                          const name = user.name || user.email.split('@')[0];
                          const hasActiveTasks = (user.activeTaskCount || 0) > 0;
                          const indicator = hasActiveTasks ? '🔴' : '⚪';
                          const taskInfo = user.taskCount 
                            ? ` (${user.activeTaskCount || 0}/${user.taskCount})`
                            : '';
                          
                          return (
                            <option key={user.id} value={user.id}>
                              {indicator} {name}{taskInfo}
                            </option>
                          );
                        })
                      }
                    </optgroup>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>

                {/* Type filter with multi-select */}
                <div className="relative w-full sm:w-auto">
                  <button
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className={`w-full sm:w-auto px-3 py-2 border rounded-lg text-sm flex items-center gap-2 hover:border-gray-300 ${
                      selectedTypes.length > 0 ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
                    }`}
                  >
                    <Filter className="h-4 w-4" />
                    {selectedTypes.length > 0 ? (
                      <span>Types ({selectedTypes.length})</span>
                    ) : (
                      <span>All Types</span>
                    )}
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>

                {/* Date range selector */}
                <select
                  value={dateRange}
                  onChange={(e) => {
                    setDateRange(e.target.value);
                    if (e.target.value !== 'custom') {
                      setCustomDateStart('');
                      setCustomDateEnd('');
                    }
                  }}
                  className="w-full sm:w-auto px-3 py-2 border border-gray-200 rounded-lg text-sm hover:border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="all">All Dates</option>
                  <option value="overdue">Overdue</option>
                  <option value="today">Due Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="custom">Custom Range...</option>
                </select>

                {/* Status filter */}
                <div className="relative w-full sm:w-auto">
                  <button
                    className={`w-full sm:w-auto px-3 py-2 border rounded-lg text-sm flex items-center gap-2 hover:border-gray-300 ${
                      selectedStatuses.length > 0 ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
                    }`}
                  >
                    {selectedStatuses.length > 0 ? (
                      <span>Status ({selectedStatuses.length})</span>
                    ) : (
                      <span>All Status</span>
                    )}
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
              </div>
              
              {/* Custom date range inputs - separate row for better mobile layout */}
              {dateRange === 'custom' && (
                <div className="mt-3 flex flex-col sm:flex-row gap-3 sm:gap-2 items-center">
                  <input
                    type="date"
                    value={customDateStart}
                    onChange={(e) => setCustomDateStart(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    placeholder="Start date"
                  />
                  <span className="text-gray-500 text-sm">to</span>
                  <input
                    type="date"
                    value={customDateEnd}
                    onChange={(e) => setCustomDateEnd(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    placeholder="End date"
                  />
                </div>
              )}

              {/* Action buttons - separate row for cleaner mobile layout */}
              <div className="mt-3 sm:mt-0 flex flex-col sm:flex-row gap-2 sm:gap-3">
                {/* Advanced filters toggle */}
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="w-full sm:w-auto px-3 py-2 text-sm text-gray-600 hover:text-gray-900 flex items-center justify-center gap-1"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Advanced
                </button>

                {/* Clear filters button - only show when filters are active */}
                {hasActiveFilters() && (
                  <button
                    onClick={resetFilters}
                    className="w-full sm:w-auto px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg flex items-center justify-center gap-1"
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Advanced filters dropdown */}
          {showAdvancedFilters && (
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Type checkboxes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Task Types</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedTypes.includes('order')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTypes([...selectedTypes, 'order']);
                          } else {
                            setSelectedTypes(selectedTypes.filter(t => t !== 'order'));
                          }
                        }}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">Orders</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedTypes.includes('workflow')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTypes([...selectedTypes, 'workflow']);
                          } else {
                            setSelectedTypes(selectedTypes.filter(t => t !== 'workflow'));
                          }
                        }}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">Workflows</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedTypes.includes('line_item')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTypes([...selectedTypes, 'line_item']);
                          } else {
                            setSelectedTypes(selectedTypes.filter(t => t !== 'line_item'));
                          }
                        }}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">Line Items</span>
                    </label>
                  </div>
                </div>

                {/* Status checkboxes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <div className="space-y-2">
                    {['pending', 'in_progress', 'completed', 'blocked'].map(status => (
                      <label key={status} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedStatuses.includes(status as TaskStatus)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStatuses([...selectedStatuses, status as TaskStatus]);
                            } else {
                              setSelectedStatuses(selectedStatuses.filter(s => s !== status));
                            }
                          }}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700 capitalize">{status.replace('_', ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Additional options */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Display Options</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={showLineItems}
                        onChange={(e) => setShowLineItems(e.target.checked)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">Show Line Items</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={showCompleted}
                        onChange={(e) => setShowCompleted(e.target.checked)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">Show Completed</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* View controls bar */}
          <div className="px-4 py-3 flex items-center justify-between bg-gray-50">
            <div className="flex items-center gap-4">
              {/* Select all checkbox */}
              <input
                type="checkbox"
                checked={selectedTasks.size > 0 && selectedTasks.size === data.tasks.length}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                title="Select all tasks"
              />
              
              <span className="text-sm text-gray-600">
                {hasActiveFilters() && (
                  <span className="font-medium text-indigo-600">Filtered: </span>
                )}
                {data.tasks.length} {data.tasks.length === 1 ? 'task' : 'tasks'}
                {selectedTasks.size > 0 && (
                  <span className="ml-2 text-indigo-600">
                    ({selectedTasks.size} selected)
                  </span>
                )}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 mr-2">View:</span>
              <button
                onClick={() => setGroupByDeadline(true)}
                className={`p-2 rounded-lg ${
                  groupByDeadline 
                    ? 'bg-white border border-gray-300 shadow-sm' 
                    : 'hover:bg-gray-100'
                }`}
                title="Grouped view"
              >
                <LayoutGrid className="h-4 w-4 text-gray-600" />
              </button>
              <button
                onClick={() => setGroupByDeadline(false)}
                className={`p-2 rounded-lg ${
                  !groupByDeadline 
                    ? 'bg-white border border-gray-300 shadow-sm' 
                    : 'hover:bg-gray-100'
                }`}
                title="List view"
              >
                <List className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Tasks list */}
        <div className={loading ? 'opacity-50' : ''}>
          {groupByDeadline && data.groupedTasks ? (
            // Grouped view
            <div className="space-y-6">
              {/* Check if all groups are empty */}
              {data.groupedTasks.overdue.length === 0 &&
               data.groupedTasks.dueToday.length === 0 &&
               data.groupedTasks.dueThisWeek.length === 0 &&
               data.groupedTasks.upcoming.length === 0 &&
               data.groupedTasks.noDueDate.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                  <Inbox className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchQuery ? 'No tasks match your search' : 
                     selectedUser === 'unassigned' ? 'No unassigned tasks' :
                     selectedUser === 'all' ? 'No tasks available' :
                     'No tasks assigned to you'}
                  </h3>
                  <div className="text-sm text-gray-500 mb-6 space-y-1">
                    {searchQuery && (
                      <p>No tasks found matching "{searchQuery}"</p>
                    )}
                    {selectedTypes.length > 0 && (
                      <p>Filtered by type: {selectedTypes.join(', ')}</p>
                    )}
                    {selectedStatuses.length > 0 && (
                      <p>Filtered by status: {selectedStatuses.join(', ')}</p>
                    )}
                    {dateRange !== 'all' && (
                      <p>Filtered by date: {dateRange}</p>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {hasActiveFilters() && (
                      <button
                        onClick={clearFilters}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <X className="h-4 w-4" />
                        Clear all filters
                      </button>
                    )}
                    <button
                      onClick={() => fetchTasks()}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Refresh tasks
                    </button>
                  </div>
                </div>
              ) : (
                <>
              {data.groupedTasks.overdue.length > 0 && (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    Overdue ({data.groupedTasks.overdue.length})
                  </h2>
                  <div className="space-y-3">
                    {data.groupedTasks.overdue.map(renderTaskCard)}
                  </div>
                </div>
              )}

              {data.groupedTasks.dueToday.length > 0 && (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-600" />
                    Due Today ({data.groupedTasks.dueToday.length})
                  </h2>
                  <div className="space-y-3">
                    {data.groupedTasks.dueToday.map(renderTaskCard)}
                  </div>
                </div>
              )}

              {data.groupedTasks.dueThisWeek.length > 0 && (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    This Week ({data.groupedTasks.dueThisWeek.length})
                  </h2>
                  <div className="space-y-3">
                    {data.groupedTasks.dueThisWeek.map(renderTaskCard)}
                  </div>
                </div>
              )}

              {data.groupedTasks.upcoming.length > 0 && (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-3">
                    Upcoming ({data.groupedTasks.upcoming.length})
                  </h2>
                  <div className="space-y-3">
                    {data.groupedTasks.upcoming.map(renderTaskCard)}
                  </div>
                </div>
              )}

              {data.groupedTasks.noDueDate.length > 0 && (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-3">
                    No Deadline ({data.groupedTasks.noDueDate.length})
                  </h2>
                  <div className="space-y-3">
                    {data.groupedTasks.noDueDate.map(renderTaskCard)}
                  </div>
                </div>
              )}
              </>
              )}
            </div>
          ) : (
            // Flat list view
            <div className="space-y-3">
              {data.tasks.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                  <Inbox className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchQuery ? 'No tasks match your search' : 
                     selectedUser === 'unassigned' ? 'No unassigned tasks' :
                     selectedUser === 'all' ? 'No tasks available' :
                     'No tasks assigned to you'}
                  </h3>
                  <div className="text-sm text-gray-500 mb-6 space-y-1">
                    {searchQuery && (
                      <p>No tasks found matching "{searchQuery}"</p>
                    )}
                    {selectedTypes.length > 0 && (
                      <p>Filtered by type: {selectedTypes.join(', ')}</p>
                    )}
                    {selectedStatuses.length > 0 && (
                      <p>Filtered by status: {selectedStatuses.join(', ')}</p>
                    )}
                    {dateRange !== 'all' && (
                      <p>Filtered by date: {dateRange}</p>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {hasActiveFilters() && (
                      <button
                        onClick={clearFilters}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <X className="h-4 w-4" />
                        Clear all filters
                      </button>
                    )}
                    <button
                      onClick={() => fetchTasks()}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Refresh tasks
                    </button>
                  </div>
                </div>
              ) : (
                data.tasks.map(renderTaskCard)
              )}
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {data.pagination && data.pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={!data.pagination.hasPrevious}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              <div className="flex items-center gap-1">
                {/* Show first page */}
                <button
                  onClick={() => setCurrentPage(1)}
                  className={`px-3 py-1 rounded-lg text-sm ${currentPage === 1 ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100'}`}
                >
                  1
                </button>
                
                {/* Show ellipsis if needed */}
                {currentPage > 3 && <span className="px-2">...</span>}
                
                {/* Show current page and neighbors */}
                {Array.from({ length: Math.min(3, data.pagination.totalPages) }, (_, i) => {
                  const page = Math.max(2, Math.min(currentPage - 1, data.pagination!.totalPages - 3)) + i;
                  if (page <= 1 || page >= data.pagination!.totalPages) return null;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 rounded-lg text-sm ${currentPage === page ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100'}`}
                    >
                      {page}
                    </button>
                  );
                }).filter(Boolean)}
                
                {/* Show ellipsis if needed */}
                {currentPage < data.pagination.totalPages - 2 && <span className="px-2">...</span>}
                
                {/* Show last page */}
                {data.pagination.totalPages > 1 && (
                  <button
                    onClick={() => setCurrentPage(data.pagination!.totalPages)}
                    className={`px-3 py-1 rounded-lg text-sm ${currentPage === data.pagination!.totalPages ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100'}`}
                  >
                    {data.pagination!.totalPages}
                  </button>
                )}
              </div>
              
              <button
                onClick={() => setCurrentPage(p => Math.min(data.pagination?.totalPages || p, p + 1))}
                disabled={!data.pagination.hasNext}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>
                Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, data.pagination.total)} of {data.pagination.total} tasks
              </span>
              
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1); // Reset to first page when changing page size
                }}
                className="border border-gray-200 rounded-lg px-2 py-1 text-sm"
              >
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}