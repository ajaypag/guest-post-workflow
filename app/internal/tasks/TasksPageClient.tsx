'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  ChevronRight,
  ShoppingBag,
  Users,
  Building,
  Download
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
  groupBy: 'deadline' | 'order' | 'client' | 'hierarchy';
  showCompleted: boolean;
  customDateStart?: string;
  customDateEnd?: string;
  selectedAccounts: string[];
  selectedClients: string[];
}

const FILTER_STORAGE_KEY = 'internal-tasks-filters';

// Task type display constants
const TASK_TYPE_INFO = {
  order: { label: 'Order', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  workflow: { label: 'Guest Post', color: 'bg-green-50 text-green-700 border-green-200' },
  line_item: { label: 'Paid Link', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  vetted_sites_request: { label: 'Vetted Sites Request', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  brand_intelligence: { label: 'Brand Intelligence', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' }
} as const;

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
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [allTasksCount, setAllTasksCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  
  // Load filters with proper priority: URL > localStorage > smart defaults
  const loadFiltersFromURL = (): Partial<FilterState> => {
    const urlFilters: Partial<FilterState> = {};
    const hasUrlParams = typeof window !== 'undefined' && window.location.search.length > 0;
    
    // If no URL params, clear localStorage to avoid persistence bug
    if (!hasUrlParams && typeof window !== 'undefined') {
      localStorage.removeItem(FILTER_STORAGE_KEY);
      return {}; // Return empty to use smart defaults
    }
    
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
    
    const groupByParam = searchParams.get('groupBy');
    if (groupByParam && ['deadline', 'order', 'client', 'hierarchy'].includes(groupByParam)) {
      urlFilters.groupBy = groupByParam as 'deadline' | 'order' | 'client' | 'hierarchy';
    }
    
    const completedParam = searchParams.get('showCompleted');
    if (completedParam) urlFilters.showCompleted = completedParam === 'true';
    
    const accountIdsParam = searchParams.get('accountIds');
    if (accountIdsParam) urlFilters.selectedAccounts = accountIdsParam.split(',');
    
    const clientIdsParam = searchParams.get('clientIds');
    if (clientIdsParam) urlFilters.selectedClients = clientIdsParam.split(',');
    
    return urlFilters;
  };

  const loadSavedFilters = (): Partial<FilterState> => {
    if (typeof window === 'undefined') return {};
    // Only load saved filters if no URL params exist
    const hasUrlParams = window.location.search.length > 0;
    if (hasUrlParams) return {};
    
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
  const [groupBy, setGroupBy] = useState<'deadline' | 'order' | 'client' | 'hierarchy'>(
    urlFilters.groupBy ?? savedFilters.groupBy ?? 'deadline'
  );
  const [showCompleted, setShowCompleted] = useState(
    urlFilters.showCompleted ?? savedFilters.showCompleted ?? false
  );
  const [customDateStart, setCustomDateStart] = useState<string>(savedFilters.customDateStart ?? '');
  const [customDateEnd, setCustomDateEnd] = useState<string>(savedFilters.customDateEnd ?? '');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Array<{key: string, label: string, value: any, remove?: () => void}>>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>(
    urlFilters.selectedClients ?? savedFilters.selectedClients ?? []
  );
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(
    urlFilters.selectedAccounts ?? savedFilters.selectedAccounts ?? []
  );
  const [availableClients, setAvailableClients] = useState<Array<{id: string, name: string, accountId?: string, website: string}>>([]);
  const [availableAccounts, setAvailableAccounts] = useState<Array<{id: string, name: string, email: string, company: string}>>([]);
  const [accountSearch, setAccountSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(null);
  
  // Bulk selection state
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assignmentTarget, setAssignmentTarget] = useState<string | null>(null);
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [assignmentType, setAssignmentType] = useState<'single' | 'bulk'>('single');
  const [singleAssignmentTask, setSingleAssignmentTask] = useState<UnifiedTask | null>(null);
  
  // Refs for auto-focus
  const accountSearchRef = useRef<HTMLInputElement>(null);

  // Update URL with current filter state
  const updateURL = useCallback(() => {
    const params = new URLSearchParams();
    
    // Only add params that differ from defaults to keep URLs clean
    if (selectedUser === 'all') {
      params.set('user', 'all');
    } else if (selectedUser !== currentUserId) {
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
    
    if (groupBy !== 'deadline') {
      params.set('groupBy', groupBy);
    }
    
    if (showCompleted) {
      params.set('showCompleted', 'true');
    }
    
    if (selectedAccounts.length > 0) {
      params.set('accountIds', selectedAccounts.join(','));
    }
    
    if (selectedClients.length > 0) {
      params.set('clientIds', selectedClients.join(','));
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
    customDateEnd, showLineItems, groupByDeadline, groupBy, showCompleted, searchQuery, 
    currentPage, currentUserId, router, selectedAccounts, selectedClients
  ]);

  // Handle URL params that require state updates (to avoid infinite loops)
  useEffect(() => {
    const searchParam = searchParams.get('search');
    if (searchParam) {
      setSearchQuery(searchParam);
    }
    
    const pageParam = searchParams.get('page');
    if (pageParam) {
      setCurrentPage(parseInt(pageParam, 10) || 1);
    }
  }, [searchParams]);

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
      groupBy,
      showCompleted,
      customDateStart,
      customDateEnd,
      selectedAccounts,
      selectedClients
    };
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
  }, [selectedUser, selectedTypes, selectedStatuses, dateRange, showLineItems, groupByDeadline, groupBy, showCompleted, customDateStart, customDateEnd, selectedAccounts, selectedClients]);
  
  // Update active filters for pills display
  useEffect(() => {
    const filters = [];
    
    if (selectedTypes.length > 0) {
      selectedTypes.forEach(type => {
        filters.push({
          key: `type-${type}`,
          label: `${type === 'order' ? '📦' : type === 'workflow' ? '📄' : '🔗'} ${type.charAt(0).toUpperCase() + type.slice(1)}${type === 'line_item' ? ' Items' : 's'}`,
          value: type,
          remove: () => setSelectedTypes(prev => prev.filter(t => t !== type))
        });
      });
    }
    
    if (selectedAccounts.length > 0) {
      selectedAccounts.forEach(accountId => {
        const account = availableAccounts.find(a => a.id === accountId);
        if (account) {
          filters.push({
            key: `account-${accountId}`,
            label: `👤 ${account.name}`,
            value: accountId,
            remove: () => {
              setSelectedAccounts(prev => prev.filter(id => id !== accountId));
              // Also remove related clients
              const accountClients = availableClients.filter(c => c.accountId === accountId);
              setSelectedClients(prev => prev.filter(id => !accountClients.some(c => c.id === id)));
            }
          });
        }
      });
    }
    
    if (selectedClients.length > 0) {
      selectedClients.forEach(clientId => {
        const client = availableClients.find(c => c.id === clientId);
        if (client) {
          filters.push({
            key: `client-${clientId}`,
            label: `🏢 ${client.name}`,
            value: clientId,
            remove: () => setSelectedClients(prev => prev.filter(id => id !== clientId))
          });
        }
      });
    }
    
    if (selectedStatuses.length > 0) {
      selectedStatuses.forEach(status => {
        const statusEmoji = {
          'pending': '⏳',
          'in_progress': '🔄', 
          'completed': '✅',
          'blocked': '🚫',
          'cancelled': '❌'
        };
        filters.push({
          key: `status-${status}`,
          label: `${statusEmoji[status]} ${status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}`,
          value: status,
          remove: () => setSelectedStatuses(prev => prev.filter(s => s !== status))
        });
      });
    }
    
    if (showLineItems) {
      filters.push({
        key: 'line-items',
        label: '🔗 Show Paid Links',
        value: true,
        remove: () => setShowLineItems(false)
      });
    }
    
    if (showCompleted) {
      filters.push({
        key: 'completed',
        label: '✅ Show Completed',
        value: true,
        remove: () => setShowCompleted(false)
      });
    }
    
    if (dateRange === 'custom' && (customDateStart || customDateEnd)) {
      const startDate = customDateStart ? new Date(customDateStart).toLocaleDateString() : 'Start';
      const endDate = customDateEnd ? new Date(customDateEnd).toLocaleDateString() : 'End';
      filters.push({
        key: 'custom-date',
        label: `📅 ${startDate} - ${endDate}`,
        value: { start: customDateStart, end: customDateEnd },
        remove: () => {
          setDateRange('all');
          setCustomDateStart('');
          setCustomDateEnd('');
        }
      });
    }
    
    setActiveFilters(filters);
  }, [selectedTypes, selectedStatuses, showLineItems, showCompleted, dateRange, customDateStart, customDateEnd, selectedAccounts, selectedClients, availableAccounts, availableClients]);
  
  // Auto-focus account search when dropdown opens
  useEffect(() => {
    if (showAccountDropdown && accountSearchRef.current) {
      accountSearchRef.current.focus();
    }
  }, [showAccountDropdown]);
  
  // Reset filters
  const resetFilters = () => {
    setSelectedUser(currentUserId);
    setSelectedTypes([]);
    setSelectedStatuses([]);
    setSelectedAccounts([]);
    setSelectedClients([]);
    setDateRange('all');
    setShowLineItems(false);
    setGroupBy('deadline');
    setShowCompleted(false);
    setCustomDateStart('');
    setCustomDateEnd('');
    setSearchQuery('');
    setAccountSearch('');
    setClientSearch('');
    setShowAccountDropdown(false);
    setShowClientDropdown(false);
  };
  
  // Create hierarchical grouping structure
  const createHierarchicalGrouping = (tasks: UnifiedTask[]) => {
    const hierarchy: {
      [accountKey: string]: {
        name: string;
        expanded: boolean;
        orders: {
          [orderKey: string]: {
            name: string;
            orderId: string;
            expanded: boolean;
            lineItems: {
              [lineItemKey: string]: {
                name: string;
                lineItemId: string;
                expanded: boolean;
                workflows: UnifiedTask[];
                lineItemTask?: UnifiedTask;
              }
            };
            standaloneWorkflows: UnifiedTask[];
          }
        };
        standaloneWorkflows: UnifiedTask[];
      }
    } = {};

    // Create a lookup map for workflows by ID to match with line items
    const workflowMap = new Map<string, UnifiedTask>();
    tasks.forEach(task => {
      if (task.type === 'workflow') {
        // Task IDs have prefixes like "workflow-", but we need the raw ID for matching
        const workflowId = task.id.replace('workflow-', '');
        workflowMap.set(workflowId, task);
        // Also store with the full ID in case that's what's referenced
        workflowMap.set(task.id, task);
      }
    });

    tasks.forEach(task => {
      if (task.type === 'line_item') {
        // Line items are the primary relationship holders
        const parentOrderId = (task as any).parentOrderId;
        const parentOrderNumber = (task as any).parentOrderNumber;
        const workflowId = (task as any).workflowId; // Line items have workflowId
        
        if (parentOrderId) {
          // Get account info - need to match what workflows use
          const clientName = task.client?.name || 'Unknown Client';
          
          // Try to find ANY workflow from this order to get consistent account info
          let accountName = 'Unknown Account';
          
          // First try to find from the associated workflow
          if (workflowId && workflowMap.has(workflowId)) {
            const matchingWorkflow = workflowMap.get(workflowId);
            const workflowMetadata = (matchingWorkflow as any).metadata;
            if (workflowMetadata?.accountName) {
              accountName = workflowMetadata.accountName;
            }
          }
          
          // If still no account name, find ANY workflow from this order to get the account
          if (accountName === 'Unknown Account') {
            for (const [wfId, wf] of workflowMap) {
              const wfMetadata = (wf as any).metadata;
              if (wfMetadata?.orderId === parentOrderId && wfMetadata?.accountName) {
                accountName = wfMetadata.accountName;
                break;
              }
            }
          }
          
          // Always use the full format to match workflows
          const accountKey = accountName !== 'Unknown Account' 
            ? `${accountName} - ${clientName}`
            : `Unknown Account - ${clientName}`;
          const orderKey = parentOrderNumber || `#${parentOrderId.slice(0, 8)}`;
          // Make order name more informative
          const orderStatus = (task as any).parentOrderStatus || '';
          const orderDate = (task as any).deadline ? new Date((task as any).deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
          const orderName = `${clientName} - Order ${orderKey}${orderStatus ? ` (${orderStatus})` : ''}${orderDate ? ` - Due ${orderDate}` : ''}`;
          
          const lineItemKey = task.id; // Use full ID to avoid collisions
          // Use the assigned domain as the line item name - much more useful!
          const assignedDomain = (task as any).assignedDomain || (task as any).targetUrl || '';
          const lineItemName = assignedDomain || (task as any).description || `Line Item #${task.id.slice(0, 8)}`;

          // Initialize account
          if (!hierarchy[accountKey]) {
            hierarchy[accountKey] = {
              name: accountKey,
              expanded: true,
              orders: {},
              standaloneWorkflows: []
            };
          }

          // Initialize order
          if (!hierarchy[accountKey].orders[orderKey]) {
            hierarchy[accountKey].orders[orderKey] = {
              name: orderName,
              orderId: parentOrderId,
              expanded: true,
              lineItems: {},
              standaloneWorkflows: []
            };
          }

          // Initialize line item and store the line item task itself
          if (!hierarchy[accountKey].orders[orderKey].lineItems[lineItemKey]) {
            hierarchy[accountKey].orders[orderKey].lineItems[lineItemKey] = {
              name: lineItemName,
              lineItemId: task.id,
              expanded: true,
              workflows: [],
              lineItemTask: task
            };
          }

          // Find and add the associated workflow
          if (workflowId) {
            if (workflowMap.has(workflowId)) {
              const associatedWorkflow = workflowMap.get(workflowId)!;
              hierarchy[accountKey].orders[orderKey].lineItems[lineItemKey].workflows.push(associatedWorkflow);
              // Remove from workflowMap so we don't process it again
              workflowMap.delete(workflowId);
              // Also delete the prefixed version if it exists
              workflowMap.delete('workflow-' + workflowId);
            }
          }
        }
      }
    });

    // Handle remaining workflows that don't have line item associations
    workflowMap.forEach(workflow => {
      const metadata = (workflow as any).metadata;
      
      if (metadata?.orderId) {
        // Workflow belongs to order but no specific line item (standalone within order)
        const accountName = metadata.accountName || 'Unknown Account';
        const clientName = metadata.clientName || 'Unknown Client';
        const accountKey = `${accountName}${clientName !== 'Unknown Client' ? ` - ${clientName}` : ''}`;
        const orderKey = metadata.orderNumber || `#${metadata.orderId.slice(0, 8)}`;
        const orderName = `Order ${orderKey}`;

        // Initialize account
        if (!hierarchy[accountKey]) {
          hierarchy[accountKey] = {
            name: accountKey,
            expanded: true,
            orders: {},
            standaloneWorkflows: []
          };
        }

        // Initialize order
        if (!hierarchy[accountKey].orders[orderKey]) {
          hierarchy[accountKey].orders[orderKey] = {
            name: orderName,
            orderId: metadata.orderId,
            expanded: true,
            lineItems: {},
            standaloneWorkflows: []
          };
        }

        hierarchy[accountKey].orders[orderKey].standaloneWorkflows.push(workflow);
      } else {
        // Completely standalone workflow
        const clientName = (workflow as any).clientName || ('client' in workflow ? workflow.client?.name : undefined) || 'Unknown Client';
        const accountKey = `${clientName} (Standalone)`;

        if (!hierarchy[accountKey]) {
          hierarchy[accountKey] = {
            name: accountKey,
            expanded: true,
            orders: {},
            standaloneWorkflows: []
          };
        }

        hierarchy[accountKey].standaloneWorkflows.push(workflow);
      }
    });

    return hierarchy;
  };

  // Group tasks by different criteria
  const groupTasksByType = (tasks: UnifiedTask[]) => {
    if (groupBy === 'order') {
      const grouped: { [key: string]: UnifiedTask[] } = {};
      tasks.forEach(task => {
        if (task.type === 'order') {
          const orderId = (task as any).orderId;
          const orderKey = `Order #${(task as any).orderNumber || orderId.slice(0, 8)}`;
          if (!grouped[orderKey]) grouped[orderKey] = [];
          grouped[orderKey].push(task);
        } else if (task.type === 'workflow' && (task as any).metadata?.orderId) {
          // Use enhanced metadata for richer grouping titles
          const metadata = (task as any).metadata;
          const accountName = metadata.accountName || 'Unknown Account';
          const clientName = metadata.clientName || 'Unknown Client';
          const orderNumber = metadata.orderNumber || `#${metadata.orderId.slice(0, 8)}`;
          const orderKey = `${accountName} - ${clientName} - Order ${orderNumber}`;
          if (!grouped[orderKey]) grouped[orderKey] = [];
          grouped[orderKey].push(task);
        } else if (task.type === 'line_item') {
          // Line items use parentOrderId and parentOrderNumber
          const parentOrderId = (task as any).parentOrderId;
          const parentOrderNumber = (task as any).parentOrderNumber;
          if (parentOrderId) {
            const orderKey = `Order ${parentOrderNumber || '#' + parentOrderId.slice(0, 8)}`;
            if (!grouped[orderKey]) grouped[orderKey] = [];
            grouped[orderKey].push(task);
          } else {
            // Only put in No Order if truly no order reference
            if (!grouped['Standalone Tasks']) grouped['Standalone Tasks'] = [];
            grouped['Standalone Tasks'].push(task);
          }
        } else {
          // Tasks without orders - better naming for clarity
          if (!grouped['Standalone Tasks']) grouped['Standalone Tasks'] = [];
          grouped['Standalone Tasks'].push(task);
        }
      });
      return grouped;
    } else if (groupBy === 'client') {
      const grouped: { [key: string]: UnifiedTask[] } = {};
      tasks.forEach(task => {
        let clientKey = 'No Client';
        if ('client' in task && task.client?.name) {
          clientKey = task.client.name;
        } else if (task.type === 'workflow' && (task as any).clientName) {
          clientKey = (task as any).clientName;
        }
        if (!grouped[clientKey]) grouped[clientKey] = [];
        grouped[clientKey].push(task);
      });
      return grouped;
    } else if (groupBy === 'hierarchy') {
      // Create hierarchical grouping: Account -> Orders -> Workflows
      return createHierarchicalGrouping(tasks);
    }
    return null;
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
           selectedAccounts.length > 0 ||
           selectedClients.length > 0 ||
           dateRange !== 'all' ||
           showLineItems ||
           searchQuery !== '' ||
           customDateStart !== '' ||
           customDateEnd !== '';
  };

  // Calculate filtered statistics based on current visible tasks
  const getFilteredStats = () => {
    // If no active filters that would change the dataset, use server stats
    if (selectedAccounts.length === 0 && selectedClients.length === 0) {
      return data.stats;
    }

    // Calculate stats from current filtered tasks
    const tasks = data.tasks || [];
    
    const stats = {
      total: tasks.length,
      overdue: 0,
      dueToday: 0,
      byType: {
        order: 0,
        workflow: 0,
        line_item: 0,
        vetted_sites_request: 0,
        brand_intelligence: 0
      },
      byStatus: {
        pending: 0,
        in_progress: 0,
        completed: 0,
        blocked: 0
      }
    };

    const today = new Date().toDateString();

    tasks.forEach(task => {
      // Count by type
      if (task.type === 'order') stats.byType.order++;
      else if (task.type === 'workflow') stats.byType.workflow++;
      else if (task.type === 'line_item') stats.byType.line_item++;
      else if (task.type === 'vetted_sites_request') (stats.byType as any).vetted_sites_request++;
      else if (task.type === 'brand_intelligence') (stats.byType as any).brand_intelligence++;

      // Count by status
      if (task.status === 'pending') stats.byStatus.pending++;
      else if (task.status === 'in_progress') stats.byStatus.in_progress++;
      else if (task.status === 'completed') stats.byStatus.completed++;
      else if (task.status === 'blocked') stats.byStatus.blocked++;

      // Count overdue and due today
      if (task.deadline) {
        const dueDate = new Date(task.deadline);
        const dueDateString = dueDate.toDateString();
        
        if (dueDateString === today && task.status !== 'completed') {
          stats.dueToday++;
        } else if (dueDate < new Date() && task.status !== 'completed') {
          stats.overdue++;
        }
      }
    });

    return stats;
  };

  // Calculate user-specific task counts based on filtered tasks
  const getUserTaskCounts = () => {
    // If no account/client filters are active, use the pre-fetched counts
    if (selectedAccounts.length === 0 && selectedClients.length === 0) {
      return {
        myTasks: internalUsers.find(u => u.id === currentUserId)?.taskCount || 0,
        allTasks: allTasksCount,
        unassigned: unassignedCount
      };
    }

    // Calculate from filtered tasks
    const tasks = data.tasks || [];
    
    let myTasks = 0;
    let unassigned = 0;
    let allTasks = tasks.length;

    tasks.forEach(task => {
      if (task.assignedTo?.id === currentUserId) {
        myTasks++;
      } else if (!task.assignedTo || task.assignedTo === null) {
        unassigned++;
      }
    });

    return {
      myTasks,
      allTasks,
      unassigned
    };
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
      
      // Type filter - for hierarchy grouping, we need both line_item and workflow types
      if (selectedTypes.length > 0) {
        let typesToFetch = [...selectedTypes];
        
        // If hierarchy grouping is selected and we have line_item or workflow types,
        // we need both types to build the proper relationships
        if (groupBy === 'hierarchy') {
          const hasLineItem = typesToFetch.includes('line_item');
          const hasWorkflow = typesToFetch.includes('workflow');
          
          if (hasLineItem && !hasWorkflow) {
            typesToFetch.push('workflow');
          } else if (hasWorkflow && !hasLineItem) {
            typesToFetch.push('line_item');
          }
        }
        
        params.append('type', typesToFetch.join(','));
      } else {
        // When no types are selected, "All types" means fetch everything
        // Always include line items when showing all types
        params.append('type', 'order,line_item,workflow');
        params.append('showLineItems', 'true');
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
      
      // Account/Client filters
      if (selectedAccounts.length > 0) {
        params.append('accountIds', selectedAccounts.join(','));
      }
      
      if (selectedClients.length > 0) {
        params.append('clientIds', selectedClients.join(','));
      }
      
      // Line items toggle - auto-enable when filtering by line_item type
      const shouldShowLineItems = showLineItems || selectedTypes.includes('line_item');
      params.append('showLineItems', shouldShowLineItems.toString());
      
      // Pagination
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());

      console.log('🚀 Fetching tasks from:', `/api/internal/tasks?${params}`);
      const response = await fetch(`/api/internal/tasks?${params}`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      
      const result = await response.json();
      console.log('🎯 Raw API response:', result);
      
      
      setData(result);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedUser, selectedTypes, selectedStatuses, dateRange, searchQuery, showLineItems, showCompleted, customDateStart, customDateEnd, currentPage, itemsPerPage, selectedAccounts, selectedClients]);

  // Fetch account and client data for dropdowns
  const fetchAccountsAndClients = useCallback(async () => {
    try {
      const [accountsResponse, clientsResponse] = await Promise.all([
        fetch('/api/accounts?simple=true'),
        fetch('/api/clients?limit=1000') // Increase limit to get all clients for dropdown
      ]);
      
      if (accountsResponse.ok) {
        const accounts = await accountsResponse.json();
        setAvailableAccounts(accounts.map((account: any) => ({
          id: account.id,
          name: account.name,
          email: account.email,
          company: account.company
        })));
      }
      
      if (clientsResponse.ok) {
        const clientsData = await clientsResponse.json();
        setAvailableClients(clientsData.clients.map((client: any) => ({
          id: client.id,
          name: client.name,
          website: client.website,
          accountId: client.accountId
        })));
      }
    } catch (error) {
      console.error('Error fetching accounts/clients:', error);
    }
  }, []);

  // Fetch unassigned count for dropdown
  const fetchUnassignedCount = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.append('assignedTo', 'unassigned');
      params.append('status', 'pending,in_progress,blocked');
      params.append('showLineItems', 'true');
      params.append('page', '1');
      params.append('limit', '1'); // We only need the count, not the actual tasks
      
      const response = await fetch(`/api/internal/tasks?${params}`);
      if (!response.ok) throw new Error('Failed to fetch unassigned count');
      
      const result = await response.json();
      setUnassignedCount(result.stats.total);
    } catch (error) {
      console.error('Error fetching unassigned count:', error);
      setUnassignedCount(0);
    }
  }, []);

  // Fetch all tasks count for dropdown (regardless of current filters)
  const fetchAllTasksCount = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.append('assignedTo', 'all');
      params.append('status', 'pending,in_progress,blocked');
      params.append('showLineItems', 'true'); // Include all task types
      params.append('page', '1');
      params.append('limit', '1'); // We only need the count, not the actual tasks
      
      const response = await fetch(`/api/internal/tasks?${params}`);
      if (!response.ok) throw new Error('Failed to fetch all tasks count');
      
      const result = await response.json();
      setAllTasksCount(result.stats.total);
    } catch (error) {
      console.error('Error fetching all tasks count:', error);
      setAllTasksCount(0);
    }
  }, []);

  // Re-fetch when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTasks();
    }, 300); // Debounce

    return () => clearTimeout(timer);
  }, [fetchTasks]);

  // Fetch dropdown counts on component mount
  useEffect(() => {
    fetchUnassignedCount();
    fetchAllTasksCount();
    fetchAccountsAndClients();
  }, [fetchUnassignedCount, fetchAllTasksCount, fetchAccountsAndClients]);
  
  // Handle clicks outside dropdowns to close them
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-dropdown="account"]') && !target.closest('[data-dropdown="client"]')) {
        setShowAccountDropdown(false);
        setShowClientDropdown(false);
      }
      if (!target.closest('[data-status-dropdown]')) {
        setOpenStatusDropdown(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset to first page when filters change (but not pagination)
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedUser, selectedTypes, selectedStatuses, dateRange, searchQuery, showLineItems, showCompleted, customDateStart, customDateEnd, selectedAccounts, selectedClients]);

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
      case 'vetted_sites_request':
        return <Building className="h-4 w-4 text-gray-500" />;
      case 'brand_intelligence':
        return <Users className="h-4 w-4 text-gray-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get task type display info
  const getTaskTypeInfo = (task: UnifiedTask) => {
    return TASK_TYPE_INFO[task.type];
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
        const [type, ...idParts] = taskId.split('-');
        const id = idParts.join('-'); // Rejoin the UUID parts
        
        let entityType: string;
        if (type === 'order') entityType = 'order';
        else if (type === 'workflow') entityType = 'workflow';
        else if (type === 'line_item' || type === 'lineitem') entityType = 'line_item';
        else if (type === 'vetted_request') entityType = 'vetted_sites_request';
        else if (type === 'brand_intelligence') entityType = 'brand_intelligence';
        else entityType = 'line_item'; // fallback
        
        return {
          entityType,
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
  
  // Handle quick status change
  const handleQuickStatusChange = async (taskId: string, taskType: TaskType, newStatus: TaskStatus) => {
    try {
      // Determine the correct endpoint based on task type
      let endpoint = '';
      let body = {};
      
      if (taskType === 'order') {
        endpoint = `/api/orders/${taskId}/status`;
        body = { status: newStatus };
      } else if (taskType === 'workflow') {
        endpoint = `/api/workflows/${taskId}`;
        body = { status: newStatus };
      } else if (taskType === 'line_item') {
        // For line items, we might need to update via the order endpoint
        endpoint = `/api/orders/line-items/${taskId}`;
        body = { status: newStatus };
      }
      
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) throw new Error('Failed to update status');
      
      // Refresh tasks to show the update
      await fetchTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };
  
  // Export tasks to CSV
  const exportToCSV = () => {
    const tasks = data.tasks || [];
    if (tasks.length === 0) {
      alert('No tasks to export');
      return;
    }
    
    // Prepare CSV headers
    const headers = [
      'ID',
      'Type',
      'Title',
      'Status',
      'Priority',
      'Assigned To',
      'Client',
      'Account',
      'Deadline',
      'Created Date',
      'Description'
    ];
    
    // Convert tasks to CSV rows
    const rows = tasks.map(task => {
      const assignedTo = task.assignedTo ? 
        (task.assignedTo.name || task.assignedTo.email) : 'Unassigned';
      const client = (task as any).client?.name || 'N/A';
      const account = (task as any).client?.companyName || 'N/A';
      const deadline = task.deadline ? 
        new Date(task.deadline).toLocaleDateString() : 'No deadline';
      const created = new Date(task.createdAt).toLocaleDateString();
      
      return [
        task.id,
        task.type,
        task.title,
        task.status,
        task.priority,
        assignedTo,
        client,
        account,
        deadline,
        created,
        task.description || ''
      ];
    });
    
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(cell => 
          // Escape cells containing commas, quotes, or newlines
          typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))
            ? `"${cell.replace(/"/g, '""')}"` 
            : cell
        ).join(',')
      )
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `tasks-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    
    // Check if task is overdue
    const isOverdue = task.deadline && 
                      new Date(task.deadline) < new Date() && 
                      task.status !== 'completed';
    
    return (
      <div key={task.id} className={`bg-white rounded-lg border ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-100' : isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200'} hover:shadow-sm transition-all`}>
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
                <Link 
                  href={task.action}
                  className="font-medium text-gray-900 hover:text-indigo-600 hover:underline transition-colors"
                >
                  <h3>{task.title}</h3>
                </Link>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getTaskTypeInfo(task).color}`}>
                  {getTaskTypeInfo(task).label}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(task.status)}`}>
                  {task.status.replace('_', ' ')}
                </span>
              </div>

            {/* Task details - hide for workflows since we show it differently */}
            {task.description && task.type !== 'workflow' && (
              <p className="text-sm text-gray-600 mb-2">{task.description}</p>
            )}

            {/* Task metadata - customize for workflows */}
            {task.type !== 'workflow' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm mt-3 pt-3 border-t border-gray-100">
                {/* Deadline */}
                <div className={`flex items-center gap-1 ${getDeadlineColor(task.deadline)} col-span-1`}>
                  <Clock className="h-3 w-3" />
                  <span className="font-medium">{formatDate(task.deadline)}</span>
                  {isOverdue && (
                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded font-semibold animate-pulse">
                      OVERDUE!
                    </span>
                  )}
                </div>

                {/* Client */}
                {(task.type === 'order' || task.type === 'line_item') && (task as any).client && (
                  <div className="text-gray-600">
                    Client: <Link 
                      href={`/clients/${(task as any).client.id}`}
                      className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium"
                    >
                      {(task as any).client.name}
                    </Link>
                  </div>
                )}
                {(task.type === 'order' || task.type === 'line_item') && !(task as any).client && (
                  <div className="text-gray-600">
                    Client: Unknown
                  </div>
                )}
              </div>
            )}

            {/* Order specific - spans full width */}
            {task.type === 'order' && (
                <div className="col-span-full space-y-2 border-t border-gray-100 pt-2 mt-2">
                  {/* Elegant Order Details */}
                  <div className="space-y-2">
                    {/* Account Info - Clean inline */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-gray-600">
                        <span className="text-gray-500">Account:</span> 
                        <span className="font-medium ml-1 text-gray-800">
                          {(task as any).client?.companyName || (task as any).client?.name || 'Unknown Account'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 font-mono">
                        {(task as any).orderNumber || `#${(task as any).orderId?.slice(0, 8)}`}
                      </span>
                    </div>

                    {/* Progress & Status - Subtle inline */}
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      {/* Line Items */}
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">{(task as any).lineItemCount || 0} items</span>
                        {(task as any).completedLineItems !== undefined && (task as any).lineItemCount > 0 && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className="text-green-600">{(task as any).completedLineItems} done</span>
                            <div className="w-12 bg-gray-200 rounded-full h-1 ml-1">
                              <div 
                                className="bg-green-500 h-1 rounded-full transition-all duration-300" 
                                style={{ width: `${Math.min(100, ((task as any).completedLineItems / (task as any).lineItemCount) * 100)}%` }}
                              ></div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Status & State - Minimal */}
                      <div className="flex items-center gap-3 text-xs">
                        <div className="relative" data-status-dropdown>
                          <button
                            onClick={() => setOpenStatusDropdown(openStatusDropdown === task.id ? null : task.id)}
                            className={`px-1.5 py-0.5 rounded text-xs flex items-center gap-1 hover:ring-2 hover:ring-offset-1 hover:ring-indigo-500 transition-all ${
                              task.status === 'completed' ? 'text-green-700 bg-green-50' :
                              task.status === 'in_progress' ? 'text-blue-700 bg-blue-50' :
                              task.status === 'blocked' ? 'text-red-700 bg-red-50' :
                              'text-gray-700 bg-gray-50'
                            }`}
                          >
                            {task.status.replace('_', ' ')}
                            <ChevronDown className="h-3 w-3" />
                          </button>
                          
                          {openStatusDropdown === task.id && (
                            <div className="absolute top-full mt-1 left-0 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px]">
                              {(['pending', 'in_progress', 'completed', 'blocked'] as TaskStatus[]).map(status => (
                                <button
                                  key={status}
                                  onClick={() => {
                                    const [taskType, taskId] = task.id.split('-');
                                    handleQuickStatusChange(taskId, task.type, status);
                                    setOpenStatusDropdown(null);
                                  }}
                                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-2 ${
                                    task.status === status ? 'bg-indigo-50 text-indigo-700' : ''
                                  }`}
                                >
                                  <span className={`w-2 h-2 rounded-full ${
                                    status === 'completed' ? 'bg-green-500' :
                                    status === 'in_progress' ? 'bg-blue-500' :
                                    status === 'blocked' ? 'bg-red-500' :
                                    'bg-gray-400'
                                  }`} />
                                  {status.replace('_', ' ')}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {(task as any).state && (task as any).state !== 'unknown' && (
                          <span className={`px-1.5 py-0.5 rounded text-xs ${
                            (task as any).state === 'confirmed' ? 'text-green-700 bg-green-50' :
                            (task as any).state === 'draft' ? 'text-gray-700 bg-gray-50' :
                            (task as any).state === 'cancelled' ? 'text-red-700 bg-red-50' :
                            'text-blue-700 bg-blue-50'
                          }`}>
                            {(task as any).state}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Minimal Actions */}
                    <div className="flex items-center gap-3 pt-1">
                      <Link 
                        href={`/orders/${(task as any).orderId}`}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        View order
                      </Link>
                      {(task as any).lineItemCount > 0 && (
                        <>
                          <span className="text-gray-300">•</span>
                          <Link 
                            href={`/orders/${(task as any).orderId}?tab=line-items`}
                            className="text-xs text-gray-600 hover:text-gray-800 hover:underline"
                          >
                            {(task as any).lineItemCount} line items
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Internal Notes */}
                  {task.description && (
                    <div className="border-t border-gray-100 pt-2 mt-2">
                      <div className="text-gray-600 text-xs">
                        <span className="text-gray-500 font-medium">Internal Notes:</span> 
                        <span className="ml-1 text-gray-700 italic">{task.description}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Workflow specific - Complete redesigned layout */}
              {task.type === 'workflow' && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                  {/* Main content section with better structure */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    {/* Article Title - Primary focus */}
                    <div className="font-medium text-gray-900 text-sm mb-2">
                      {(task as any).articleTitle || task.title}
                    </div>
                    
                    {/* Client → Target flow with visual hierarchy */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-medium text-gray-700 bg-white px-2 py-1 rounded border border-gray-200">
                        {(task as any).clientName || 'Unknown Client'}
                      </span>
                      <ChevronRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
                      {(task as any).guestPostSite ? (
                        <Link 
                          href={`https://${(task as any).guestPostSite}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium bg-indigo-50 px-2 py-1 rounded border border-indigo-200"
                        >
                          {(task as any).guestPostSite}
                          <ExternalLink className="h-3 w-3 inline ml-1" />
                        </Link>
                      ) : (
                        <span className="text-gray-500 italic">No target site selected</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Metadata row - Deadline, Progress, Assignee */}
                  <div className="flex items-center justify-between gap-3 text-xs">
                    {/* Left side - Deadline and Assignee */}
                    <div className="flex items-center gap-3">
                      {/* Deadline */}
                      {task.deadline && (
                        <div className={`flex items-center gap-1 ${getDeadlineColor(task.deadline)}`}>
                          <Clock className="h-3 w-3" />
                          <span className="font-medium">{formatDate(task.deadline)}</span>
                          {task.deadline && new Date(task.deadline) < new Date() && task.status !== 'completed' && (
                            <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded font-semibold">
                              OVERDUE
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* Assignee */}
                      {task.assignedTo && (
                        <div className="flex items-center gap-1 text-gray-600">
                          <User className="h-3 w-3" />
                          <span>{task.assignedTo.name || task.assignedTo.email?.split('@')[0] || 'Unassigned'}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Right side - Progress indicator */}
                    {(task as any).completionPercentage !== undefined && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Progress:</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${
                                (task as any).completionPercentage === 100 ? 'bg-green-500' :
                                (task as any).completionPercentage > 70 ? 'bg-blue-500' : 
                                (task as any).completionPercentage > 30 ? 'bg-yellow-500' : 'bg-gray-400'
                              }`}
                              style={{ width: `${Math.min(100, (task as any).completionPercentage)}%` }}
                            />
                          </div>
                          <span className="font-medium text-gray-700">
                            {(task as any).completionPercentage}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Secondary info row - only show if we have URLs */}
                  {((task as any).googleUrl || (task as any).publishedArticleUrl || (task as any).publisher) && (
                    <div className="flex flex-wrap gap-3 mt-2 text-xs">
                      {/* Publisher */}
                      {(task as any).publisher && (
                        <div className="text-gray-500">
                          <span className="font-medium">Publisher:</span> {(task as any).publisher}
                        </div>
                      )}
                      
                      {/* Target URL */}
                      {(task as any).googleUrl && (
                        <div className="text-gray-500">
                          <span className="font-medium">Target:</span>{' '}
                          <Link 
                            href={(task as any).googleUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-800 hover:underline"
                          >
                            {(task as any).googleUrl.replace(/^https?:\/\//, '').substring(0, 30)}...
                            <ExternalLink className="h-2.5 w-2.5 inline ml-0.5" />
                          </Link>
                        </div>
                      )}
                      
                      {/* Published Article */}
                      {(task as any).publishedArticleUrl && (
                        <div className="text-gray-500">
                          <span className="font-medium text-green-600">✓ Published:</span>{' '}
                          <Link 
                            href={(task as any).publishedArticleUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-800 hover:underline"
                          >
                            View Article
                            <ExternalLink className="h-2.5 w-2.5 inline ml-0.5" />
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Line item specific - spans full width */}
              {task.type === 'line_item' && (
                <div className="col-span-full space-y-2 border-t border-gray-100 pt-2 mt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {/* Target URL */}
                    {(task as any).targetUrl && (
                      <div className="text-gray-600 text-xs">
                        <span className="text-gray-500 font-medium">Target URL:</span> 
                        <Link 
                          href={(task as any).targetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 hover:underline ml-1 break-all"
                        >
                          {(task as any).targetUrl.replace(/^https?:\/\//, '')}
                          <ExternalLink className="h-3 w-3 inline ml-1" />
                        </Link>
                      </div>
                    )}
                    
                    {/* Guest Post Site Domain */}
                    {(task as any).assignedDomain && (
                      <div className="text-gray-600 text-xs">
                        <span className="text-gray-500 font-medium">Guest Post Site:</span> 
                        <Link 
                          href={`https://${(task as any).assignedDomain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium ml-1"
                        >
                          {(task as any).assignedDomain}
                          <ExternalLink className="h-3 w-3 inline ml-1" />
                        </Link>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {/* Anchor Text */}
                    {(task as any).anchorText && (
                      <div className="text-gray-600 text-xs">
                        <span className="text-gray-500 font-medium">Anchor Text:</span> 
                        <span className="font-medium ml-1 text-gray-800">"{(task as any).anchorText}"</span>
                      </div>
                    )}
                    
                    {/* Published URL (if available) */}
                    {(task as any).publishedUrl && (
                      <div className="text-gray-600 text-xs">
                        <span className="text-gray-500 font-medium">Published:</span> 
                        <Link 
                          href={(task as any).publishedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-800 hover:underline ml-1 break-all"
                        >
                          {(task as any).publishedUrl.replace(/^https?:\/\//, '')}
                          <ExternalLink className="h-3 w-3 inline ml-1" />
                        </Link>
                      </div>
                    )}
                  </div>
                  
                  {/* Order reference */}
                  <div className="text-gray-500 text-xs pt-1">
                    <Link 
                      href={`/orders/${(task as any).parentOrderId}`}
                      className="text-indigo-500 hover:text-indigo-700 hover:underline"
                    >
                      Order #{(task as any).parentOrderNumber}
                    </Link>
                    {(task as any).workflowStatus && (
                      <span className="ml-2 text-gray-400">• Workflow: {(task as any).workflowStatus}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Vetted Sites Request specific */}
              {task.type === 'vetted_sites_request' && (
                <div className="col-span-full space-y-2 border-t border-gray-100 pt-2 mt-2">
                  <div className="bg-orange-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-orange-800">
                        Vetted Sites Request
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        (task as any).requestStatus === 'approved' ? 'bg-green-100 text-green-700' :
                        (task as any).requestStatus === 'submitted' ? 'bg-yellow-100 text-yellow-700' :
                        (task as any).requestStatus === 'fulfilled' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {(task as any).requestStatus || 'pending'}
                      </div>
                    </div>
                    
                    <div className="text-sm text-orange-700">
                      <div className="mb-1">
                        <strong>{(task as any).targetUrls?.length || 0} target URLs</strong> requested for analysis
                      </div>
                      {(task as any).submittedAt && (
                        <div className="text-xs text-orange-600">
                          Submitted: {new Date((task as any).submittedAt).toLocaleDateString()}
                        </div>
                      )}
                      {(task as any).reviewedAt && (
                        <div className="text-xs text-orange-600">
                          Approved: {new Date((task as any).reviewedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Brand Intelligence specific */}
              {task.type === 'brand_intelligence' && (
                <div className="col-span-full space-y-2 border-t border-gray-100 pt-2 mt-2">
                  <div className="bg-indigo-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-indigo-800">
                        Brand Intelligence
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          (task as any).researchStatus === 'completed' ? 'bg-green-100 text-green-700' :
                          (task as any).researchStatus === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                          (task as any).researchStatus === 'error' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          Research: {(task as any).researchStatus || 'idle'}
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          (task as any).briefStatus === 'completed' ? 'bg-green-100 text-green-700' :
                          (task as any).briefStatus === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                          (task as any).briefStatus === 'error' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          Brief: {(task as any).briefStatus || 'idle'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-sm text-indigo-700">
                      <div className="mb-1">
                        Client: <strong>{task.client?.name || 'Unknown'}</strong>
                      </div>
                      <div className="text-xs text-indigo-600">
                        {(task as any).hasClientInput ? 
                          '✓ Client input received' : 
                          'Waiting for client input'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Assigned to */}
              <div className="text-sm text-gray-600 col-span-1">
                {task.assignedTo ? (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <Link 
                      href={`/internal/tasks?user=${task.assignedTo.id}`}
                      className="text-gray-700 hover:text-indigo-600 hover:underline font-medium"
                    >
                      {task.assignedTo.name || task.assignedTo.email.split('@')[0]}
                    </Link>
                  </div>
                ) : (
                  <span className="text-orange-600 font-medium">Unassigned</span>
                )}
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
    <div className="min-h-screen bg-gray-50/50">
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
            My Tasks ({getFilteredStats().total})
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage your assignments across orders, workflows, and line items
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-semibold text-gray-900">{getFilteredStats().overdue}</div>
            <div className="text-sm text-gray-600">Overdue</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-semibold text-gray-900">{getFilteredStats().dueToday}</div>
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

        {/* Modern Filter Bar */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
          {/* Primary Navigation Tabs */}
          <div className="px-6 pt-6 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex bg-gray-50 rounded-lg p-1">
                <button
                  onClick={() => setSelectedUser(currentUserId)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    selectedUser === currentUserId
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📋 My Tasks
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    selectedUser === currentUserId ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {getUserTaskCounts().myTasks}
                  </span>
                </button>
                
                <button
                  onClick={() => setSelectedUser('all')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    selectedUser === 'all'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  👥 All Tasks
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    selectedUser === 'all' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {getUserTaskCounts().allTasks}
                  </span>
                </button>
                
                <button
                  onClick={() => setSelectedUser('unassigned')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    selectedUser === 'unassigned'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📭 Unassigned
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    selectedUser === 'unassigned' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {getUserTaskCounts().unassigned}
                  </span>
                </button>
              </div>
            </div>
            
            {/* Active Filter Pills */}
            {activeFilters.length > 0 && (
              <div className="px-6 pb-4 border-t border-gray-100 pt-4 mt-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-gray-500 font-medium">Active filters:</span>
                  {activeFilters.map(filter => (
                    <div
                      key={filter.key}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium hover:bg-indigo-200 transition-colors group"
                    >
                      <span>{filter.label}</span>
                      <button
                        onClick={filter.remove || (() => {})}
                        className="ml-1 p-0.5 rounded-full hover:bg-indigo-200 transition-colors"
                        title="Remove filter"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={resetFilters}
                    className="ml-2 px-3 py-1.5 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                  >
                    Clear all
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Search Bar */}
          <div className="px-6 pb-3">
            <div className="relative max-w-2xl">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search tasks, orders, clients, domains..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all duration-200 placeholder-gray-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Filter Controls */}
          <div className="px-6 pb-4">
            <div className="flex flex-col gap-4">
              {/* Primary Filters Row */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Account & Client Hierarchical Dropdowns */}
                <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-2">
                  {/* Account Selector */}
                  <div className="relative" data-dropdown="account">
                    <button
                      onClick={() => {
                        setShowAccountDropdown(!showAccountDropdown);
                        setShowClientDropdown(false); // Close client dropdown when opening account dropdown
                      }}
                      className="px-3 py-2 border border-gray-200 rounded-md bg-white hover:border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-sm flex items-center gap-2 min-w-[150px]"
                    >
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="truncate text-xs">
                        {selectedAccounts.length === 0 ? (
                          'All Accounts'
                        ) : selectedAccounts.length === 1 ? (
                          availableAccounts.find(a => a.id === selectedAccounts[0])?.name || 'Selected Account'
                        ) : (
                          `${selectedAccounts.length} Accounts`
                        )}
                      </span>
                      <ChevronDown className="h-4 w-4 text-gray-500 ml-auto" />
                    </button>
                    
                    {showAccountDropdown && (
                      <div className="absolute top-full left-0 mt-1 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <div className="p-3 border-b border-gray-100">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                          ref={accountSearchRef}
                          type="text"
                          placeholder="Search accounts..."
                          value={accountSearch}
                          onChange={(e) => setAccountSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      <button
                        onClick={() => {
                          setSelectedAccounts([]);
                          setSelectedClients([]);
                          setShowAccountDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                          selectedAccounts.length === 0 ? 'bg-indigo-50 text-indigo-700 font-medium' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <User className="h-4 w-4 text-gray-500" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">All Accounts</div>
                            <div className="text-xs text-gray-500">View tasks from all accounts</div>
                          </div>
                        </div>
                      </button>
                      {availableAccounts
                        .filter(account => 
                          accountSearch === '' ||
                          account.name.toLowerCase().includes(accountSearch.toLowerCase()) ||
                          account.company.toLowerCase().includes(accountSearch.toLowerCase()) ||
                          account.email.toLowerCase().includes(accountSearch.toLowerCase())
                        )
                        .map(account => {
                          const isSelected = selectedAccounts.includes(account.id);
                          const accountClients = availableClients.filter(c => c.accountId === account.id);
                          
                          return (
                            <button
                              key={account.id}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedAccounts(prev => prev.filter(id => id !== account.id));
                                  setSelectedClients(prev => prev.filter(id => !accountClients.some(c => c.id === id)));
                                } else {
                                  setSelectedAccounts([account.id]); // Single selection for now
                                  setSelectedClients([]); // Reset client selection
                                }
                              }}
                              className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                                isSelected ? 'bg-indigo-50' : ''
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  isSelected ? 'bg-indigo-100' : 'bg-gray-100'
                                }`}>
                                  <span className={`text-sm font-medium ${
                                    isSelected ? 'text-indigo-700' : 'text-gray-600'
                                  }`}>
                                    {account.name.substring(0, 2).toUpperCase()}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={`font-medium truncate ${
                                    isSelected ? 'text-indigo-900' : 'text-gray-900'
                                  }`}>
                                    {account.name}
                                  </div>
                                  <div className="text-sm text-gray-600 truncate">
                                    {account.company}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate">
                                    {account.email} • {accountClients.length} clients
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })
                      }
                    </div>
                  </div>
                )}
                  </div>
                  
                  {/* Client Selector */}
                  {selectedAccounts.length > 0 && (
                    <div className="relative" data-dropdown="client">
                      <button
                        onClick={() => {
                          setShowClientDropdown(!showClientDropdown);
                          setShowAccountDropdown(false); // Close account dropdown when opening client dropdown
                        }}
                        className="px-3 py-2 border border-gray-200 rounded-md bg-white hover:border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-sm flex items-center gap-2 min-w-[150px]"
                      >
                        <Building className="h-4 w-4 text-gray-500" />
                        <span className="truncate text-xs">
                          {selectedClients.length === 0 ? (
                            'All Clients'
                          ) : selectedClients.length === 1 ? (
                            availableClients.find(c => c.id === selectedClients[0])?.name || 'Selected Client'
                          ) : (
                            `${selectedClients.length} Clients`
                          )}
                        </span>
                        <ChevronDown className="h-4 w-4 text-gray-500 ml-auto" />
                      </button>
                      
                      {showClientDropdown && (
                        <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                          <div className="p-3 border-b border-gray-100">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                              <input
                                type="text"
                                placeholder="Search clients..."
                                value={clientSearch}
                                onChange={(e) => setClientSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                          <div className="max-h-64 overflow-y-auto">
                            <button
                              onClick={() => {
                                setSelectedClients([]);
                                setShowClientDropdown(false);
                              }}
                              className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                                selectedClients.length === 0 ? 'bg-indigo-50 text-indigo-700 font-medium' : ''
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                  <Building className="h-4 w-4 text-gray-500" />
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">All Clients</div>
                                  <div className="text-xs text-gray-500">View from selected accounts</div>
                                </div>
                              </div>
                            </button>
                            {availableClients
                              .filter(client => 
                                selectedAccounts.includes(client.accountId || '') &&
                                (clientSearch === '' ||
                                 client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
                                 client.website.toLowerCase().includes(clientSearch.toLowerCase()))
                              )
                              .map(client => {
                                const isSelected = selectedClients.includes(client.id);
                                
                                return (
                                  <button
                                    key={client.id}
                                    onClick={() => {
                                      if (isSelected) {
                                        setSelectedClients(prev => prev.filter(id => id !== client.id));
                                      } else {
                                        setSelectedClients(prev => [...prev, client.id]);
                                      }
                                    }}
                                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                                      isSelected ? 'bg-indigo-50' : ''
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                        isSelected ? 'bg-indigo-100' : 'bg-gray-100'
                                      }`}>
                                        <span className={`text-sm font-medium ${
                                          isSelected ? 'text-indigo-700' : 'text-gray-600'
                                        }`}>
                                          {client.name.substring(0, 2).toUpperCase()}
                                        </span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className={`font-medium truncate ${
                                          isSelected ? 'text-indigo-900' : 'text-gray-900'
                                        }`}>
                                          {client.name}
                                        </div>
                                        <div className="text-xs text-gray-500 truncate">
                                          {client.website}
                                        </div>
                                      </div>
                                    </div>
                                  </button>
                                );
                              })
                            }
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Task Type Quick Filters */}
                <div className="flex bg-gray-100 rounded-lg p-1.5 border border-gray-200">
                  <button
                    onClick={() => setSelectedTypes([])}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex items-center gap-1 ${
                      selectedTypes.length === 0
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    All Types
                  </button>
                  <button
                    onClick={() => {
                      if (selectedTypes.includes('order')) {
                        setSelectedTypes(prev => prev.filter(t => t !== 'order'));
                      } else {
                        setSelectedTypes(prev => [...prev, 'order']);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex items-center gap-1 ${
                      selectedTypes.includes('order')
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-blue-600'
                    }`}
                  >
                    📦 Orders
                    <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                      selectedTypes.includes('order') ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {getFilteredStats().byType.order}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      if (selectedTypes.includes('line_item')) {
                        setSelectedTypes(prev => prev.filter(t => t !== 'line_item'));
                      } else {
                        setSelectedTypes(prev => [...prev, 'line_item']);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex items-center gap-1 ${
                      selectedTypes.includes('line_item')
                        ? 'bg-white text-purple-600 shadow-sm'
                        : 'text-gray-600 hover:text-purple-600'
                    }`}
                  >
                    🔗 Paid Links
                    <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                      selectedTypes.includes('line_item') ? 'bg-purple-100 text-purple-600' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {getFilteredStats().byType.line_item}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      if (selectedTypes.includes('workflow')) {
                        setSelectedTypes(prev => prev.filter(t => t !== 'workflow'));
                      } else {
                        setSelectedTypes(prev => [...prev, 'workflow']);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex items-center gap-1 ${
                      selectedTypes.includes('workflow')
                        ? 'bg-white text-green-600 shadow-sm'
                        : 'text-gray-600 hover:text-green-600'
                    }`}
                  >
                    📄 Guest Posts
                    <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                      selectedTypes.includes('workflow') ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {getFilteredStats().byType.workflow}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      if (selectedTypes.includes('vetted_sites_request')) {
                        setSelectedTypes(prev => prev.filter(t => t !== 'vetted_sites_request'));
                      } else {
                        setSelectedTypes(prev => [...prev, 'vetted_sites_request']);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex items-center gap-1 ${
                      selectedTypes.includes('vetted_sites_request')
                        ? 'bg-white text-orange-600 shadow-sm'
                        : 'text-gray-600 hover:text-orange-600'
                    }`}
                  >
                    🏢 Vetted Sites
                    <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                      selectedTypes.includes('vetted_sites_request') ? 'bg-orange-100 text-orange-600' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {(getFilteredStats().byType as any).vetted_sites_request || 0}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      if (selectedTypes.includes('brand_intelligence')) {
                        setSelectedTypes(prev => prev.filter(t => t !== 'brand_intelligence'));
                      } else {
                        setSelectedTypes(prev => [...prev, 'brand_intelligence']);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex items-center gap-1 ${
                      selectedTypes.includes('brand_intelligence')
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-gray-600 hover:text-indigo-600'
                    }`}
                  >
                    🧠 Brand Intel
                    <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                      selectedTypes.includes('brand_intelligence') ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {(getFilteredStats().byType as any).brand_intelligence || 0}
                    </span>
                  </button>
                </div>
                
                {/* Advanced Filters Toggle */}
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    showAdvancedFilters || selectedStatuses.length > 0 || showLineItems || showCompleted || dateRange !== 'all'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  More Filters
                  {(selectedStatuses.length > 0 || showLineItems || showCompleted || dateRange !== 'all') && (
                    <span className="ml-1 px-1.5 py-0.5 bg-indigo-200 text-indigo-800 rounded text-xs">
                      {selectedStatuses.length + (showLineItems ? 1 : 0) + (showCompleted ? 1 : 0) + (dateRange !== 'all' ? 1 : 0)}
                    </span>
                  )}
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${
                    showAdvancedFilters ? 'rotate-180' : ''
                  }`} />
                </button>
                
                {/* Export to CSV */}
                <button
                  onClick={exportToCSV}
                  className="px-3 py-2 text-sm text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-all duration-200 flex items-center gap-1"
                  title={`Export ${data.tasks?.length || 0} tasks to CSV`}
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
                
                {/* Clear All Filters */}
                {hasActiveFilters() && (
                  <button
                    onClick={resetFilters}
                    className="px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 flex items-center gap-1"
                  >
                    <X className="h-4 w-4" />
                    Clear All
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Modern Advanced Filters Panel */}
          {showAdvancedFilters && (
            <div className="mx-6 mb-6 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Team Members */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Team Members
                    </h3>
                    <div className="max-h-48 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-3 bg-white">
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
                          const activeCount = user.activeTaskCount || 0;
                          const totalCount = user.taskCount || 0;
                          
                          // Better status indicators based on workload
                          let statusIcon = '✅'; // Available
                          
                          if (activeCount === 0) {
                            statusIcon = '✅'; // Available - green check
                          } else if (activeCount <= 2) {
                            statusIcon = '🟢'; // Light load - green circle
                          } else if (activeCount <= 5) {
                            statusIcon = '🟡'; // Medium load - yellow circle
                          } else if (activeCount <= 8) {
                            statusIcon = '🟠'; // Heavy load - orange circle
                          } else {
                            statusIcon = '🔴'; // Overloaded - red circle
                          }
                          
                          const taskInfo = ` (${activeCount}/${totalCount})`;
                          const isSelected = selectedUser === user.id;
                          
                          return (
                            <button
                              key={user.id}
                              onClick={() => setSelectedUser(user.id)}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 hover:bg-gray-100 ${
                                isSelected ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-gray-700'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                  <span>{statusIcon}</span>
                                  <span className="truncate">{name}</span>
                                </span>
                                <span className="text-xs text-gray-500 flex-shrink-0">{taskInfo}</span>
                              </div>
                            </button>
                          );
                        })
                      }
                    </div>
                  </div>

                  {/* Status Filters */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Status
                    </h3>
                    <div className="space-y-3">
                      {[
                        { id: 'pending', label: 'Pending', emoji: '⏳', count: getFilteredStats().byStatus.pending },
                        { id: 'in_progress', label: 'In Progress', emoji: '🔄', count: getFilteredStats().byStatus.in_progress },
                        { id: 'completed', label: 'Completed', emoji: '✅', count: getFilteredStats().byStatus.completed },
                        { id: 'blocked', label: 'Blocked', emoji: '🚫', count: getFilteredStats().byStatus.blocked }
                      ].map(status => (
                        <label key={status.id} className="flex items-center gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={selectedStatuses.includes(status.id as TaskStatus)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStatuses([...selectedStatuses, status.id as TaskStatus]);
                              } else {
                                setSelectedStatuses(selectedStatuses.filter(s => s !== status.id));
                              }
                            }}
                            className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500 focus:ring-2 transition-colors"
                          />
                          <div className="flex items-center gap-2 flex-1 group-hover:text-gray-900 transition-colors">
                            <span className="text-sm">{status.emoji}</span>
                            <span className="text-sm font-medium text-gray-700">{status.label}</span>
                            <span className="ml-auto px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-xs">
                              {status.count}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Display Options */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <LayoutGrid className="h-4 w-4" />
                      Display Options
                    </h3>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={showLineItems}
                          onChange={(e) => setShowLineItems(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500 focus:ring-2 transition-colors"
                        />
                        <div className="flex items-center gap-2 flex-1 group-hover:text-gray-900 transition-colors">
                          <span className="text-sm">🔗</span>
                          <span className="text-sm font-medium text-gray-700">Show Paid Links</span>
                        </div>
                      </label>
                      
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={showCompleted}
                          onChange={(e) => setShowCompleted(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500 focus:ring-2 transition-colors"
                        />
                        <div className="flex items-center gap-2 flex-1 group-hover:text-gray-900 transition-colors">
                          <span className="text-sm">✅</span>
                          <span className="text-sm font-medium text-gray-700">Show Completed</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Date Filters */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Date Filters
                    </h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setDateRange('overdue')}
                          className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all duration-200 flex items-center justify-center gap-1 ${
                            dateRange === 'overdue'
                              ? 'border-red-200 bg-red-50 text-red-700'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-red-200 hover:text-red-600'
                          }`}
                        >
                          <AlertTriangle className="h-3 w-3" />
                          Overdue
                        </button>
                        <button
                          onClick={() => setDateRange('today')}
                          className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all duration-200 flex items-center justify-center gap-1 ${
                            dateRange === 'today'
                              ? 'border-orange-200 bg-orange-50 text-orange-700'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-orange-200 hover:text-orange-600'
                          }`}
                        >
                          <Clock className="h-3 w-3" />
                          Today
                        </button>
                        <button
                          onClick={() => setDateRange('week')}
                          className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all duration-200 flex items-center justify-center gap-1 ${
                            dateRange === 'week'
                              ? 'border-blue-200 bg-blue-50 text-blue-700'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-blue-200 hover:text-blue-600'
                          }`}
                        >
                          <Calendar className="h-3 w-3" />
                          Week
                        </button>
                        <button
                          onClick={() => setDateRange('all')}
                          className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all duration-200 ${
                            dateRange === 'all'
                              ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900'
                          }`}
                        >
                          All Dates
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Custom Date Range */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Custom Date Range
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={customDateStart}
                          onChange={(e) => {
                            setCustomDateStart(e.target.value);
                            if (e.target.value) setDateRange('custom');
                          }}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                        <input
                          type="date"
                          value={customDateEnd}
                          onChange={(e) => {
                            setCustomDateEnd(e.target.value);
                            if (e.target.value) setDateRange('custom');
                          }}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                        />
                      </div>
                      {(customDateStart || customDateEnd) && (
                        <button
                          onClick={() => {
                            setCustomDateStart('');
                            setCustomDateEnd('');
                            setDateRange('all');
                          }}
                          className="w-full px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          Clear Dates
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modern View Controls Bar */}
          <div className="px-6 py-4 bg-white border-t border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Select all checkbox */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTasks.size > 0 && selectedTasks.size === data.tasks.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500 focus:ring-2 transition-colors"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Select all
                  </span>
                </label>
                
                <div className="h-4 w-px bg-gray-300" />
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {hasActiveFilters() && (
                      <span className="inline-flex items-center gap-1 mr-2">
                        <Filter className="h-3 w-3 text-indigo-500" />
                        <span className="font-medium text-indigo-600">Filtered:</span>
                      </span>
                    )}
                    <span className="font-semibold text-gray-900">{data.tasks.length}</span> {data.tasks.length === 1 ? 'task' : 'tasks'}
                    {selectedTasks.size > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                        {selectedTasks.size} selected
                      </span>
                    )}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {/* View Mode Toggle */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 font-medium">View:</span>
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setGroupByDeadline(false)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex items-center gap-1 ${
                        !groupByDeadline
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <List className="h-3 w-3" />
                      List
                    </button>
                    <button
                      onClick={() => setGroupByDeadline(true)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex items-center gap-1 ${
                        groupByDeadline
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <LayoutGrid className="h-3 w-3" />
                      Grouped
                    </button>
                  </div>
                </div>
                
                {/* Group By Selector (only when grouped view is active) */}
                {groupByDeadline && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Group by:</span>
                    <select
                      value={groupBy}
                      onChange={(e) => setGroupBy(e.target.value as 'deadline' | 'order' | 'client' | 'hierarchy')}
                      className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    >
                      <option value="deadline">📅 Due Date</option>
                      <option value="order">📦 Order</option>
                      <option value="client">👥 Account/Client</option>
                      <option value="hierarchy">🏗️ Account → Order → Guest Posts</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tasks list */}
        <div className={loading ? 'opacity-50' : ''}>
          {groupByDeadline ? (
            // Grouped view
            <div className="space-y-6">
              {groupBy === 'deadline' && data.groupedTasks ? (
                // Deadline-based grouping
                <>
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
                          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                          {loading ? 'Refreshing...' : 'Refresh tasks'}
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
                </>
              ) : (
                // Custom grouping (order or client)
                <>
                  {(() => {
                    const groupedTasks = groupTasksByType(data.tasks);
                    if (!groupedTasks || Object.keys(groupedTasks).length === 0) {
                      return (
                        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                          <Inbox className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No tasks to group by {groupBy === 'order' ? 'order' : groupBy === 'client' ? 'client' : 'hierarchy'}
                          </h3>
                          <div className="text-sm text-gray-500 mb-6">
                            <p>Try changing your filters or grouping method</p>
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
                      );
                    }

                    // Special rendering for hierarchical grouping
                    if (groupBy === 'hierarchy') {
                      const hierarchy = groupedTasks as any;
                      return Object.entries(hierarchy).map(([accountKey, accountData]: [string, any]) => (
                        <div key={accountKey} className="border border-gray-200 rounded-lg overflow-hidden">
                          {/* Account Level Header */}
                          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                            <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                              <Building className="h-5 w-5 text-indigo-600" />
                              {accountData.name}
                              <span className="text-sm font-normal text-gray-500">
                                ({Object.keys(accountData.orders).length} orders, 
                                 {Object.values(accountData.orders).reduce((sum: number, order: any) => sum + Object.keys(order.lineItems).length, 0)} line items,
                                 {accountData.standaloneWorkflows.length} standalone)
                              </span>
                            </h2>
                          </div>
                          
                          <div className="divide-y divide-gray-200">
                            {/* Orders */}
                            {Object.entries(accountData.orders).map(([orderKey, orderData]: [string, any]) => (
                              <div key={orderKey} className="p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <ShoppingBag className="h-4 w-4 text-blue-600" />
                                  <h3 className="font-medium text-gray-900 text-base">{orderData.name}</h3>
                                </div>
                                <div className="ml-6 text-sm text-gray-600 mb-3">
                                  <span>{Object.keys(orderData.lineItems).length} guest posts</span>
                                  {orderData.standaloneWorkflows.length > 0 && (
                                    <span> • {orderData.standaloneWorkflows.length} standalone workflows</span>
                                  )}
                                </div>
                                
                                {/* Line Items within Order */}
                                <div className="ml-6">
                                  {Object.entries(orderData.lineItems).map(([lineItemKey, lineItemData]: [string, any]) => (
                                    <div key={lineItemKey} className="border-l-2 border-gray-200 pl-4 mb-4">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Package className="h-3 w-3 text-green-600" />
                                        <h4 className="font-medium text-gray-800 text-sm">
                                          {lineItemData.name}
                                          {lineItemData.workflows.length > 0 && (
                                            <span className="ml-2 text-xs font-normal text-gray-500">
                                              ({lineItemData.workflows.length} {lineItemData.workflows.length === 1 ? 'workflow' : 'workflows'})
                                            </span>
                                          )}
                                        </h4>
                                      </div>
                                      
                                      {/* Show line item task if available */}
                                      {lineItemData.lineItemTask && (
                                        <div className="ml-5 mb-2">
                                          {renderTaskCard(lineItemData.lineItemTask)}
                                        </div>
                                      )}
                                      
                                      {/* Workflows under this line item */}
                                      <div className="ml-5 space-y-2">
                                        {lineItemData.workflows.map((workflow: UnifiedTask) => renderTaskCard(workflow))}
                                      </div>
                                    </div>
                                  ))}
                                  
                                  {/* Standalone workflows within order */}
                                  {orderData.standaloneWorkflows.length > 0 && (
                                    <div className="border-l-2 border-gray-200 pl-4 mb-4">
                                      <div className="flex items-center gap-2 mb-2">
                                        <FileText className="h-3 w-3 text-gray-600" />
                                        <h4 className="font-medium text-gray-700 text-sm">Order Workflows</h4>
                                        <span className="text-xs text-gray-500">({orderData.standaloneWorkflows.length})</span>
                                      </div>
                                      <div className="ml-5 space-y-2">
                                        {orderData.standaloneWorkflows.map(renderTaskCard)}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                            
                            {/* Standalone Workflows */}
                            {accountData.standaloneWorkflows.length > 0 && (
                              <div className="p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <FileText className="h-4 w-4 text-gray-600" />
                                  <h3 className="font-medium text-gray-700">Account Standalone Tasks</h3>
                                  <span className="text-sm text-gray-500">({accountData.standaloneWorkflows.length})</span>
                                </div>
                                <div className="ml-6 space-y-3">
                                  {accountData.standaloneWorkflows.map(renderTaskCard)}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ));
                    }

                    return Object.entries(groupedTasks).map(([groupKey, tasks]) => (
                      <div key={groupKey}>
                        <h2 className="text-lg font-medium text-gray-900 mb-3 flex items-center gap-2">
                          {groupBy === 'order' ? (
                            <ShoppingBag className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Users className="h-5 w-5 text-green-600" />
                          )}
                          {groupKey} ({tasks.length})
                        </h2>
                        <div className="space-y-3">
                          {tasks.map(renderTaskCard)}
                        </div>
                      </div>
                    ));
                  })()
                  }
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