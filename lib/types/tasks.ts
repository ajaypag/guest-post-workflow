/**
 * Task Management System Type Definitions
 * These types support the unified task interface that aggregates work from:
 * - Orders (full order assignments)
 * - Workflows (content creation assignments)  
 * - Order Line Items (individual link assignments)
 */

// Base types
export type TaskType = 'order' | 'workflow' | 'line_item';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
export type TaskPriority = 'urgent' | 'high' | 'normal' | 'low';

// User type (simplified for tasks)
export interface TaskUser {
  id: string;
  name: string | null;
  email: string;
}

// Client type (simplified for tasks)
export interface TaskClient {
  id: string;
  name: string;
  companyName?: string | null;
}

// Base task interface
export interface BaseTask {
  id: string;
  type: TaskType;
  title: string;
  description?: string | null;
  deadline?: Date | null;
  assignedTo?: TaskUser | null;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: Date;
  updatedAt?: Date | null;
}

// Order task (entire order)
export interface OrderTask extends BaseTask {
  type: 'order';
  orderId: string;
  orderNumber?: string;
  client?: TaskClient | null;
  lineItemCount: number;
  completedLineItems?: number;
  totalValue?: number | null; // In cents
  expectedDeliveryDate?: Date | null;
  action: string; // Link to order page
}

// Workflow task
export interface WorkflowTask extends BaseTask {
  type: 'workflow';
  workflowId: string;
  workflowTitle: string;
  client?: TaskClient | null;
  publisher?: string | null;
  completionPercentage?: number;
  estimatedCompletionDate?: Date | null;
  publishDeadline?: Date | null;
  action: string; // Link to workflow page
}

// Order Line Item task
export interface LineItemTask extends BaseTask {
  type: 'line_item';
  lineItemId: string;
  parentOrderId: string;
  parentOrderNumber?: string;
  client?: TaskClient | null;
  targetUrl?: string | null;
  assignedDomain?: string | null;
  anchorText?: string | null;
  workflowStatus?: string | null;
  workflowId?: string | null;
  publishedUrl?: string | null;
  action: string; // Link to line item or order page
}

// Union type for all tasks
export type UnifiedTask = OrderTask | WorkflowTask | LineItemTask;

// Filter interfaces
export interface TaskFilters {
  assignedTo?: string[]; // User IDs
  types?: TaskType[];
  statuses?: TaskStatus[];
  priorities?: TaskPriority[];
  clients?: string[]; // Client IDs
  orders?: string[]; // Order IDs
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  searchQuery?: string;
  showLineItems?: boolean; // Whether to include line items
  page?: number; // For pagination
  limit?: number; // Items per page
}

// Task grouping for display
export interface GroupedTasks {
  overdue: UnifiedTask[];
  dueToday: UnifiedTask[];
  dueThisWeek: UnifiedTask[];
  upcoming: UnifiedTask[];
  noDueDate: UnifiedTask[];
}

// Statistics for dashboard
export interface TaskStats {
  total: number;
  overdue: number;
  dueToday: number;
  dueThisWeek: number;
  upcoming: number;
  noDueDate: number;
  byStatus: {
    pending: number;
    in_progress: number;
    completed: number;
    blocked: number;
    cancelled: number;
  };
  byType: {
    order: number;
    workflow: number;
    line_item: number;
  };
}

// API Response types
export interface TasksResponse {
  tasks: UnifiedTask[];
  stats: TaskStats;
  groupedTasks?: GroupedTasks;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// Assignment request
export interface AssignTaskRequest {
  assignedTo: string; // User ID
  notes?: string;
}

// Bulk assignment request
export interface BulkAssignRequest {
  entityType: TaskType;
  entityIds: string[];
  assignedTo: string; // User ID
  notes?: string;
}

// Helper type guards
export function isOrderTask(task: UnifiedTask): task is OrderTask {
  return task.type === 'order';
}

export function isWorkflowTask(task: UnifiedTask): task is WorkflowTask {
  return task.type === 'workflow';
}

export function isLineItemTask(task: UnifiedTask): task is LineItemTask {
  return task.type === 'line_item';
}

// Date helper functions
export function isOverdue(deadline?: Date | null): boolean {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
}

export function isDueToday(deadline?: Date | null): boolean {
  if (!deadline) return false;
  const today = new Date();
  const taskDate = new Date(deadline);
  return (
    taskDate.getFullYear() === today.getFullYear() &&
    taskDate.getMonth() === today.getMonth() &&
    taskDate.getDate() === today.getDate()
  );
}

export function isDueThisWeek(deadline?: Date | null): boolean {
  if (!deadline) return false;
  const today = new Date();
  const weekFromNow = new Date(today);
  weekFromNow.setDate(today.getDate() + 7);
  const taskDate = new Date(deadline);
  return taskDate >= today && taskDate <= weekFromNow;
}

// Sort helper
export function sortTasksByDeadline(tasks: UnifiedTask[]): UnifiedTask[] {
  return tasks.sort((a, b) => {
    // No deadline goes to the end
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    
    // Sort by deadline
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });
}