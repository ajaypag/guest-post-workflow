'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, FileText, Trash2, Calendar, ExternalLink, Filter, User, 
  Search, ChevronLeft, ChevronRight, Check, X, ChevronDown,
  ArrowUpDown, ArrowUp, ArrowDown, Users, RefreshCw, Clock
} from 'lucide-react';
import { GuestPostWorkflow, WORKFLOW_STEPS } from '@/types/workflow';
import { storage } from '@/lib/storage';
import { userStorage } from '@/lib/userStorage';
import { AuthService } from '@/lib/auth';
import { User as UserType } from '@/types/user';
import { format } from 'date-fns';
import Link from 'next/link';
import { SearchableAccountDropdown } from '@/components/SearchableAccountDropdown';

const ITEMS_PER_PAGE = 20;

type SortField = 'updatedAt' | 'createdAt' | 'progress' | 'clientName';
type SortOrder = 'asc' | 'desc';
type StatusFilter = 'all' | 'not-started' | 'in-progress' | 'completed' | 'stalled';

export default function WorkflowListEnhanced() {
  // Core state
  const [workflows, setWorkflows] = useState<GuestPostWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserType[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [orders, setOrders] = useState<Map<string, any>>(new Map());
  
  // User session
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  
  // Filters
  const [selectedUser, setSelectedUser] = useState<string>('created_by_me');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<string>('all');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  
  // Bulk operations
  const [selectedWorkflowIds, setSelectedWorkflowIds] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [bulkAssigneeId, setBulkAssigneeId] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setError(null);
      
      // Get current user info
      const session = AuthService.getSession();
      if (session) {
        setCurrentUserEmail(session.email);
        setCurrentUserId(session.userId);
      }
      
      // Load workflows, users, and accounts
      const [allWorkflows, allUsers] = await Promise.all([
        storage.getAllWorkflows(),
        userStorage.getAllUsers()
      ]);
      
      // Load clients from API
      try {
        const clientsResponse = await fetch('/api/clients');
        const clientsData = clientsResponse.ok ? await clientsResponse.json() : { clients: [] };
        setClients(clientsData.clients || []);
      } catch (error) {
        console.error('Error loading clients:', error);
        setClients([]); // Set empty array if clients fail to load
      }
      
      // Load order details for workflows that have orderId
      const orderIds = [...new Set(allWorkflows
        .filter(w => w.metadata?.orderId)
        .map(w => w.metadata!.orderId!)
      )];
      
      const ordersMap = new Map();
      for (const orderId of orderIds) {
        try {
          const orderResponse = await fetch(`/api/orders/${orderId}?skipOrderGroups=true`);
          if (orderResponse.ok) {
            const orderData = await orderResponse.json();
            ordersMap.set(orderId, orderData);
          }
        } catch (error) {
          console.error(`Error loading order ${orderId}:`, error);
        }
      }
      
      setOrders(ordersMap);
      setWorkflows(allWorkflows);
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate workflow progress
  const getProgress = (workflow: GuestPostWorkflow) => {
    const completed = workflow.steps.filter(s => s.status === 'completed').length;
    return Math.round((completed / WORKFLOW_STEPS.length) * 100);
  };

  // Determine workflow status
  const getWorkflowStatus = (workflow: GuestPostWorkflow): StatusFilter => {
    const progress = getProgress(workflow);
    if (progress === 0) return 'not-started';
    if (progress === 100) return 'completed';
    
    // Check if stalled (no update in 7 days)
    const lastUpdate = new Date(workflow.updatedAt);
    const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate > 7 && progress < 100) return 'stalled';
    
    return 'in-progress';
  };

  // Filter and sort workflows
  const processedWorkflows = useMemo(() => {
    let filtered = [...workflows];

    // User filter (creator)
    if (selectedUser === 'created_by_me') {
      filtered = filtered.filter(w => w.createdByEmail === currentUserEmail);
    } else if (selectedUser !== 'all') {
      const selectedUserData = users.find(u => u.id === selectedUser);
      if (selectedUserData) {
        filtered = filtered.filter(w => w.createdByEmail === selectedUserData.email);
      }
    }

    // Assignee filter
    if (selectedAssignee === 'assigned_to_me') {
      filtered = filtered.filter(w => w.assignedUserId === currentUserId || (!w.assignedUserId && w.userId === currentUserId));
    } else if (selectedAssignee !== 'all') {
      filtered = filtered.filter(w => w.assignedUserId === selectedAssignee || (!w.assignedUserId && w.userId === selectedAssignee));
    }

    // Order filter
    if (selectedOrder !== 'all') {
      filtered = filtered.filter(w => w.metadata?.orderId === selectedOrder);
    }

    // Client filter
    if (selectedClient !== 'all') {
      console.log('🔍 CLIENT FILTER DEBUG:');
      console.log('- Selected client:', selectedClient);
      console.log('- Total workflows before filter:', filtered.length);
      console.log('- Available clients:', clients.map(c => ({ id: c.id, name: c.name })));
      
      // Show all available clientIds in workflows for debugging
      const allClientIds = workflows.map(w => ({
        id: w.id,
        metadataClientId: w.metadata?.clientId,
        directClientId: (w as any).clientId,
        clientName: w.clientName
      }));
      console.log('- All clientIds in workflows:', allClientIds);
      
      filtered = filtered.filter(w => {
        // Check both metadata.clientId and direct clientId property
        const metadataClientId = w.metadata?.clientId;
        const directClientId = (w as any).clientId;
        const match = metadataClientId === selectedClient || directClientId === selectedClient;
        console.log(`- Workflow ${w.id}: metadataClientId=${metadataClientId}, directClientId=${directClientId}, match=${match}`);
        return match;
      });
      
      console.log('- Workflows after client filter:', filtered.length);
    }


    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(w => getWorkflowStatus(w) === statusFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(w => 
        w.clientName.toLowerCase().includes(query) ||
        w.targetDomain.toLowerCase().includes(query) ||
        w.id.toLowerCase().includes(query) ||
        w.steps.find(s => s.id === 'topic-generation')?.outputs?.finalKeyword?.toLowerCase().includes(query)
      );
    }

    // Date range filter
    if (dateRange.start) {
      const startDate = new Date(dateRange.start);
      filtered = filtered.filter(w => new Date(w.createdAt) >= startDate);
    }
    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(w => new Date(w.createdAt) <= endDate);
    }

    // Sorting
    filtered.sort((a, b) => {
      let compareValue = 0;
      
      switch (sortField) {
        case 'updatedAt':
          compareValue = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          break;
        case 'createdAt':
          compareValue = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          break;
        case 'progress':
          compareValue = getProgress(b) - getProgress(a);
          break;
        case 'clientName':
          compareValue = a.clientName.localeCompare(b.clientName);
          break;
      }
      
      return sortOrder === 'desc' ? compareValue : -compareValue;
    });

    return filtered;
  }, [workflows, selectedUser, selectedAssignee, selectedOrder, selectedClient, statusFilter, searchQuery, dateRange, sortField, sortOrder, currentUserEmail, currentUserId, users]);

  // Pagination
  const totalPages = Math.ceil(processedWorkflows.length / ITEMS_PER_PAGE);
  const paginatedWorkflows = processedWorkflows.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedUser, selectedAssignee, selectedOrder, selectedClient, statusFilter, searchQuery, dateRange]);

  // Bulk operations
  const handleSelectAll = () => {
    if (selectedWorkflowIds.size === paginatedWorkflows.length) {
      setSelectedWorkflowIds(new Set());
    } else {
      setSelectedWorkflowIds(new Set(paginatedWorkflows.map(w => w.id)));
    }
  };

  const handleSelectWorkflow = (id: string) => {
    const newSelection = new Set(selectedWorkflowIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedWorkflowIds(newSelection);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedWorkflowIds.size} workflows?`)) return;
    
    try {
      for (const id of selectedWorkflowIds) {
        await storage.deleteWorkflow(id);
      }
      await loadData();
      setSelectedWorkflowIds(new Set());
    } catch (error) {
      console.error('Error deleting workflows:', error);
      alert('Failed to delete workflows');
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkAssigneeId) return;
    
    try {
      for (const id of selectedWorkflowIds) {
        await fetch(`/api/workflows/${id}/assign`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignedUserId: bulkAssigneeId })
        });
      }
      await loadData();
      setSelectedWorkflowIds(new Set());
      setShowAssignModal(false);
    } catch (error) {
      console.error('Error assigning workflows:', error);
      alert('Failed to assign workflows');
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const uniqueClients = Array.from(new Set(workflows.map(w => w.clientName))).sort();
  const uniqueOrders = Array.from(new Set(workflows
    .filter(w => w.metadata?.orderId)
    .map(w => w.metadata!.orderId!)
  )).sort();

  return (
    <div className="workflow-list-section">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Active Workflows</h2>
          <p className="text-gray-600 mt-1">Manage your guest post campaigns</p>
        </div>
        <Link
          href="/workflow/new"
          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Workflow
        </Link>
      </div>

      {/* Enhanced Filters */}
      {!loading && workflows.length > 0 && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-4">
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by client, domain, keyword, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Grouped Filter Controls */}
          <div className="space-y-4">
            {/* Filter Groups */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* PEOPLE Section */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <User className="w-4 h-4 text-gray-500 mr-2" />
                  <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">People</span>
                </div>
                <div className="space-y-2">
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="created_by_me">Created by Me</option>
                    <option value="all">All Creators</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedAssignee}
                    onChange={(e) => setSelectedAssignee(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Assignees</option>
                    <option value="assigned_to_me">Assigned to Me</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SCOPE Section */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <FileText className="w-4 h-4 text-gray-500 mr-2" />
                  <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Scope</span>
                </div>
                <div className="space-y-2">
                  <select
                    value={selectedOrder}
                    onChange={(e) => setSelectedOrder(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Orders</option>
                    {uniqueOrders.map(orderId => (
                      <option key={orderId} value={orderId}>
                        Order #{orderId.slice(0, 8)}
                      </option>
                    ))}
                  </select>
                  <div className="w-full">
                    <SearchableAccountDropdown
                      accounts={[
                        { id: 'all', email: '', contactName: 'All Clients', companyName: '', status: 'active' },
                        ...clients.map(client => ({
                          id: client.id,
                          email: '',
                          contactName: client.name,
                          companyName: client.website || '',
                          status: 'active'
                        }))
                      ]}
                      selectedAccountId={selectedClient}
                      onSelect={(account) => setSelectedClient(account.id)}
                      placeholder="Choose client..."
                      className="w-full"
                    />
                  </div>
                  <select
                    value={selectedClient}
                    onChange={(e) => setSelectedClient(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Clients</option>
                    {uniqueClients.map(client => (
                      <option key={client} value={client}>
                        {client}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* STATUS & TIME Section */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <Clock className="w-4 h-4 text-gray-500 mr-2" />
                  <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Status & Time</span>
                </div>
                <div className="space-y-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="not-started">Not Started</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="stalled">Stalled (7+ days)</option>
                  </select>
                  <div className="space-y-1">
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Start date"
                    />
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="End date"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <div className="flex items-center gap-4">
                {/* Clear Filters */}
                {(selectedUser !== 'created_by_me' || selectedAssignee !== 'all' || selectedOrder !== 'all' || selectedClient !== 'all' || statusFilter !== 'all' || searchQuery || dateRange.start || dateRange.end) && (
                  <button
                    onClick={() => {
                      setSelectedUser('created_by_me');
                      setSelectedAssignee('all');
                      setSelectedOrder('all');
                      setSelectedClient('all');
                      setStatusFilter('all');
                      setSearchQuery('');
                      setDateRange({ start: '', end: '' });
                    }}
                    className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 underline flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    Clear all filters
                  </button>
                )}
                <button
                  onClick={loadData}
                  className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Refresh
                </button>
              </div>
              <div className="text-sm text-gray-500">
                Showing {paginatedWorkflows.length} of {processedWorkflows.length} workflows
              </div>
            </div>
          </div>

          {/* Sorting Options */}
          <div className="mt-4 flex items-center gap-4 pt-4 border-t border-gray-200">
            <span className="text-sm font-medium text-gray-700">Sort by:</span>
            <div className="flex gap-2">
              {[
                { field: 'updatedAt' as SortField, label: 'Updated' },
                { field: 'createdAt' as SortField, label: 'Created' },
                { field: 'progress' as SortField, label: 'Progress' },
                { field: 'clientName' as SortField, label: 'Client' },
              ].map(({ field, label }) => (
                <button
                  key={field}
                  onClick={() => handleSort(field)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    sortField === field
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {label}
                  {sortField === field && (
                    sortOrder === 'desc' ? 
                      <ArrowDown className="w-3 h-3 inline ml-1" /> : 
                      <ArrowUp className="w-3 h-3 inline ml-1" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedWorkflowIds.size > 0 && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-blue-900">
              {selectedWorkflowIds.size} workflow{selectedWorkflowIds.size !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => setSelectedWorkflowIds(new Set())}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Clear selection
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAssignModal(true)}
              className="px-4 py-2 bg-white text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              Reassign
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Workflows List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading workflows...</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-red-200 p-12 text-center">
          <p className="text-red-600">{error}</p>
          <button onClick={loadData} className="mt-4 text-blue-600 hover:text-blue-800">
            Try Again
          </button>
        </div>
      ) : paginatedWorkflows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No workflows found</h3>
          <p className="text-gray-600 mb-6">
            {searchQuery || selectedUser !== 'created_by_me' || selectedClient !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by creating your first workflow'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Select All Checkbox */}
          <div className="flex items-center gap-2 px-2">
            <input
              type="checkbox"
              checked={selectedWorkflowIds.size === paginatedWorkflows.length && paginatedWorkflows.length > 0}
              onChange={handleSelectAll}
              className="rounded border-gray-300"
            />
            <label className="text-sm text-gray-600">Select all on this page</label>
          </div>

          {/* Workflow Cards */}
          {paginatedWorkflows.map((workflow) => (
            <div key={workflow.id} className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-200">
              <div className="flex items-start gap-4">
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedWorkflowIds.has(workflow.id)}
                  onChange={() => handleSelectWorkflow(workflow.id)}
                  className="mt-1 rounded border-gray-300"
                />

                {/* Main Content */}
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">{workflow.clientName}</h3>
                        <div className="ml-3 px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                          {getProgress(workflow)}% Complete
                        </div>
                        {getWorkflowStatus(workflow) === 'stalled' && (
                          <div className="ml-2 px-2 py-1 bg-yellow-50 text-yellow-700 text-xs font-medium rounded-full">
                            Stalled
                          </div>
                        )}
                      </div>
                      
                      {/* Order Details */}
                      {workflow.metadata?.orderId && orders.get(workflow.metadata.orderId) && (
                        <div className="mb-2 flex items-center gap-3 text-sm">
                          <span className="inline-flex items-center px-2 py-0.5 bg-purple-50 text-purple-700 rounded">
                            Order #{orders.get(workflow.metadata.orderId).orderNumber || workflow.metadata.orderId.slice(0, 8)}
                          </span>
                          {orders.get(workflow.metadata.orderId).account && (
                            <span className="text-gray-600">
                              {orders.get(workflow.metadata.orderId).account.companyName || orders.get(workflow.metadata.orderId).account.email}
                            </span>
                          )}
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Target Site</div>
                          <p className="text-gray-900 font-medium">
                            {workflow.website?.domain || 
                             workflow.steps.find(s => s.id === 'domain-selection')?.outputs?.domain ||
                             workflow.targetDomain || 
                             'Not selected yet'}
                          </p>
                        </div>
                        
                        <div>
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Keyword</div>
                          <p className="text-gray-900 font-medium">
                            {workflow.steps.find(s => s.id === 'topic-generation')?.outputs?.finalKeyword || 'Not determined yet'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1.5" />
                          Updated {format(new Date(workflow.updatedAt), 'MMM d, h:mm a')}
                        </div>
                        {workflow.estimatedCompletionDate && (
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1.5" />
                            Due {format(new Date(workflow.estimatedCompletionDate), 'MMM d')}
                          </div>
                        )}
                        {workflow.assignedUserId && workflow.assignedUserId !== workflow.userId && (
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-1.5" />
                            {users.find(u => u.id === workflow.assignedUserId)?.name || 'Unknown'}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link
                        href={`/workflow/${workflow.id}`}
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
                      >
                        Continue
                      </Link>
                      <button
                        onClick={() => storage.deleteWorkflow(workflow.id).then(loadData)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getProgress(workflow)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages} • {processedWorkflows.length} total workflows
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            {/* Page numbers */}
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={i}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1 rounded-lg border ${
                    pageNum === currentPage
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Bulk Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Reassign {selectedWorkflowIds.size} Workflows</h3>
            <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
              {users.filter((u: any) => u.role === 'internal' || u.role === 'admin' || u.userType === 'internal').map(user => (
                <label
                  key={user.id}
                  className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="bulkAssignee"
                    value={user.id}
                    checked={bulkAssigneeId === user.id}
                    onChange={(e) => setBulkAssigneeId(e.target.value)}
                    className="mr-3"
                  />
                  <User className="h-4 w-4 mr-2 text-gray-400" />
                  <div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setBulkAssigneeId('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAssign}
                disabled={!bulkAssigneeId}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Reassign All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}