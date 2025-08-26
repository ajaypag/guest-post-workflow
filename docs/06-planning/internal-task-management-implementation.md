# Internal Task Management - Detailed Implementation Guide

## Overview
Build a deadline-focused task management dashboard for internal users. Skip vetted sites integration for now (different branch).

## Phase 1: Core Infrastructure (Steps 1-10)

### Step 1: Create Database Migration
**File**: `migrations/0072_add_internal_tasks_system.sql`
```sql
-- Create internal tasks table for ad-hoc deadline work
CREATE TABLE internal_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  deadline TIMESTAMP NOT NULL,
  assigned_to UUID REFERENCES users(id) NOT NULL,
  created_by UUID REFERENCES users(id) NOT NULL,
  
  -- Link to related work
  related_type VARCHAR(50), -- 'order', 'workflow'
  related_id UUID,
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'blocked'
  priority VARCHAR(20) DEFAULT 'normal', -- 'urgent', 'high', 'normal', 'low'
  
  -- Completion tracking
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  completion_notes TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_internal_tasks_assigned_deadline 
  ON internal_tasks(assigned_to, deadline);
CREATE INDEX idx_internal_tasks_status 
  ON internal_tasks(status, assigned_to);
CREATE INDEX idx_internal_tasks_related 
  ON internal_tasks(related_type, related_id);

-- Add deadline tracking to existing tables
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS expected_delivery_date TIMESTAMP;

ALTER TABLE workflows 
ADD COLUMN IF NOT EXISTS expected_completion_date TIMESTAMP;
```

### Step 2: Update Database Schema File
**File**: `lib/db/schema.ts`
```typescript
// Add after existing table definitions
export const internalTasks = pgTable('internal_tasks', {
  id: uuid('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  deadline: timestamp('deadline').notNull(),
  assignedTo: uuid('assigned_to').references(() => users.id).notNull(),
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  
  // Related entity
  relatedType: varchar('related_type', { length: 50 }),
  relatedId: uuid('related_id'),
  
  // Status
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  priority: varchar('priority', { length: 20 }).notNull().default('normal'),
  
  // Tracking
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  completionNotes: text('completion_notes'),
  metadata: jsonb('metadata').default({}),
  
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

// Add relations
export const internalTasksRelations = relations(internalTasks, ({ one }) => ({
  assignedUser: one(users, {
    fields: [internalTasks.assignedTo],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [internalTasks.createdBy],
    references: [users.id],
  }),
}));

// Update orders table (add if not exists)
// Add expectedDeliveryDate: timestamp('expected_delivery_date') to orders table

// Update workflows table (add if not exists) 
// Add expectedCompletionDate: timestamp('expected_completion_date') to workflows table
```

### Step 3: Create Type Definitions
**File**: `lib/types/tasks.ts`
```typescript
export type TaskType = 'order' | 'workflow' | 'custom';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';
export type TaskPriority = 'urgent' | 'high' | 'normal' | 'low';

export interface BaseTask {
  id: string;
  type: TaskType;
  title: string;
  description?: string;
  deadline: Date;
  assignedTo: {
    id: string;
    name: string;
    email: string;
  };
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: Date;
  updatedAt?: Date;
}

export interface OrderTask extends BaseTask {
  type: 'order';
  orderId: string;
  clientName: string;
  lineItemCount: number;
  totalValue: number;
}

export interface WorkflowTask extends BaseTask {
  type: 'workflow';
  workflowId: string;
  clientName?: string;
  completionPercentage: number;
  currentStep?: string;
}

export interface CustomTask extends BaseTask {
  type: 'custom';
  relatedType?: string;
  relatedId?: string;
  createdBy: {
    id: string;
    name: string;
  };
}

export type UnifiedTask = OrderTask | WorkflowTask | CustomTask;

export interface TaskStats {
  overdue: number;
  dueToday: number;
  dueThisWeek: number;
  upcoming: number;
  completed: number;
}

export interface TaskFilters {
  types?: TaskType[];
  statuses?: TaskStatus[];
  priorities?: TaskPriority[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchQuery?: string;
}
```

### Step 4: Create Task Service
**File**: `lib/services/taskService.ts`
```typescript
import { db } from '@/lib/db/connection';
import { orders, workflows, internalTasks, users } from '@/lib/db/schema';
import { eq, and, or, sql, desc, asc, gte, lte, between } from 'drizzle-orm';
import { UnifiedTask, TaskFilters, TaskStats } from '@/lib/types/tasks';

export class TaskService {
  /**
   * Get all tasks for a specific user
   */
  async getUserTasks(userId: string, filters?: TaskFilters): Promise<{
    overdue: UnifiedTask[];
    dueToday: UnifiedTask[];
    dueThisWeek: UnifiedTask[];
    upcoming: UnifiedTask[];
    stats: TaskStats;
  }> {
    const now = new Date();
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    // Fetch orders assigned to user
    const userOrders = await db.query.orders.findMany({
      where: and(
        eq(orders.assignedTo, userId),
        sql`${orders.status} NOT IN ('completed', 'cancelled', 'delivered')`
      ),
      with: {
        account: true,
        lineItems: true
      }
    });
    
    // Fetch workflows assigned to user
    const userWorkflows = await db.query.workflows.findMany({
      where: and(
        eq(workflows.assignedUserId, userId),
        sql`${workflows.status} != 'completed'`
      ),
      with: {
        client: true,
        user: true
      }
    });
    
    // Fetch custom tasks
    const customTasks = await db.query.internalTasks.findMany({
      where: and(
        eq(internalTasks.assignedTo, userId),
        sql`${internalTasks.status} != 'completed'`
      ),
      with: {
        assignedUser: true,
        createdByUser: true
      }
    });
    
    // Transform to UnifiedTask format
    const allTasks: UnifiedTask[] = [
      ...this.transformOrders(userOrders),
      ...this.transformWorkflows(userWorkflows),
      ...this.transformCustomTasks(customTasks)
    ];
    
    // Apply additional filters
    let filteredTasks = this.applyFilters(allTasks, filters);
    
    // Group by deadline
    const overdue = filteredTasks.filter(t => t.deadline < now);
    const dueToday = filteredTasks.filter(t => 
      t.deadline >= now && t.deadline <= todayEnd
    );
    const dueThisWeek = filteredTasks.filter(t => 
      t.deadline > todayEnd && t.deadline <= weekEnd
    );
    const upcoming = filteredTasks.filter(t => t.deadline > weekEnd);
    
    return {
      overdue: overdue.sort((a, b) => b.deadline.getTime() - a.deadline.getTime()),
      dueToday: dueToday.sort((a, b) => a.deadline.getTime() - b.deadline.getTime()),
      dueThisWeek: dueThisWeek.sort((a, b) => a.deadline.getTime() - b.deadline.getTime()),
      upcoming: upcoming.sort((a, b) => a.deadline.getTime() - b.deadline.getTime()),
      stats: {
        overdue: overdue.length,
        dueToday: dueToday.length,
        dueThisWeek: dueThisWeek.length,
        upcoming: upcoming.length,
        completed: 0 // Will be implemented later
      }
    };
  }
  
  private transformOrders(orders: any[]): OrderTask[] {
    return orders.map(order => ({
      id: `order-${order.id}`,
      type: 'order' as const,
      orderId: order.id,
      title: `Process Order #${order.id.substring(0, 8)}`,
      description: order.notes,
      deadline: order.expectedDeliveryDate || 
                new Date(order.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000),
      assignedTo: {
        id: order.assignedTo,
        name: order.assignedToUser?.name || 'Unknown',
        email: order.assignedToUser?.email || ''
      },
      status: this.mapOrderStatus(order.status),
      priority: order.priority || 'normal',
      clientName: order.account?.companyName || 'Unknown Client',
      lineItemCount: order.lineItems?.length || 0,
      totalValue: order.totalRetail || 0,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    }));
  }
  
  private transformWorkflows(workflows: any[]): WorkflowTask[] {
    return workflows.map(workflow => ({
      id: `workflow-${workflow.id}`,
      type: 'workflow' as const,
      workflowId: workflow.id,
      title: workflow.title,
      description: workflow.content?.description,
      deadline: workflow.expectedCompletionDate || 
                workflow.estimatedCompletionDate ||
                new Date(workflow.createdAt.getTime() + 14 * 24 * 60 * 60 * 1000),
      assignedTo: {
        id: workflow.assignedUserId,
        name: workflow.assignedUser?.name || 'Unknown',
        email: workflow.assignedUser?.email || ''
      },
      status: this.mapWorkflowStatus(workflow.status),
      priority: workflow.priority || 'normal',
      clientName: workflow.client?.name,
      completionPercentage: Number(workflow.completionPercentage) || 0,
      currentStep: workflow.content?.currentStep,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt
    }));
  }
  
  private transformCustomTasks(tasks: any[]): CustomTask[] {
    return tasks.map(task => ({
      id: `custom-${task.id}`,
      type: 'custom' as const,
      title: task.title,
      description: task.description,
      deadline: task.deadline,
      assignedTo: {
        id: task.assignedTo,
        name: task.assignedUser?.name || 'Unknown',
        email: task.assignedUser?.email || ''
      },
      status: task.status,
      priority: task.priority,
      relatedType: task.relatedType,
      relatedId: task.relatedId,
      createdBy: {
        id: task.createdBy,
        name: task.createdByUser?.name || 'Unknown'
      },
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    }));
  }
  
  private mapOrderStatus(orderStatus: string): TaskStatus {
    const statusMap: Record<string, TaskStatus> = {
      'pending': 'pending',
      'processing': 'in_progress',
      'confirmed': 'in_progress',
      'in_progress': 'in_progress',
      'completed': 'completed',
      'delivered': 'completed',
      'cancelled': 'completed'
    };
    return statusMap[orderStatus] || 'pending';
  }
  
  private mapWorkflowStatus(workflowStatus: string): TaskStatus {
    const statusMap: Record<string, TaskStatus> = {
      'active': 'in_progress',
      'paused': 'blocked',
      'completed': 'completed',
      'draft': 'pending'
    };
    return statusMap[workflowStatus] || 'pending';
  }
  
  private applyFilters(tasks: UnifiedTask[], filters?: TaskFilters): UnifiedTask[] {
    if (!filters) return tasks;
    
    let filtered = [...tasks];
    
    if (filters.types?.length) {
      filtered = filtered.filter(t => filters.types!.includes(t.type));
    }
    
    if (filters.statuses?.length) {
      filtered = filtered.filter(t => filters.statuses!.includes(t.status));
    }
    
    if (filters.priorities?.length) {
      filtered = filtered.filter(t => filters.priorities!.includes(t.priority));
    }
    
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }
}

export const taskService = new TaskService();
```

### Step 5: Create API Endpoint
**File**: `app/api/internal/tasks/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { taskService } from '@/lib/services/taskService';

export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession();
    
    if (!session || session.userType !== 'internal') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse filters from query params
    const url = new URL(request.url);
    const filters = {
      types: url.searchParams.get('types')?.split(','),
      statuses: url.searchParams.get('statuses')?.split(','),
      priorities: url.searchParams.get('priorities')?.split(','),
      searchQuery: url.searchParams.get('search')
    };
    
    const tasks = await taskService.getUserTasks(session.userId, filters);
    
    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}
```

### Step 6: Create Server Component (Page)
**File**: `app/internal/tasks/page.tsx`
```typescript
import { AuthServiceServer } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import TasksPageClient from './TasksPageClient';
import { taskService } from '@/lib/services/taskService';

export default async function InternalTasksPage() {
  const session = await AuthServiceServer.getSession();
  
  if (!session || session.userType !== 'internal') {
    redirect('/login');
  }
  
  // Initial data load
  const initialTasks = await taskService.getUserTasks(session.userId);
  
  return (
    <TasksPageClient
      initialTasks={initialTasks}
      userId={session.userId}
      userName={session.name}
    />
  );
}
```

### Step 7: Create Client Component
**File**: `app/internal/tasks/TasksPageClient.tsx`
```typescript
'use client';

import { useState, useEffect } from 'react';
import { UnifiedTask, TaskStats, TaskFilters } from '@/lib/types/tasks';
import {
  Clock,
  AlertCircle,
  CheckCircle,
  Calendar,
  Filter,
  Plus,
  ChevronRight,
  Package,
  FileText,
  ListTodo
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface TasksPageClientProps {
  initialTasks: {
    overdue: UnifiedTask[];
    dueToday: UnifiedTask[];
    dueThisWeek: UnifiedTask[];
    upcoming: UnifiedTask[];
    stats: TaskStats;
  };
  userId: string;
  userName: string;
}

export default function TasksPageClient({
  initialTasks,
  userId,
  userName
}: TasksPageClientProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<TaskFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  
  // Refresh tasks
  const refreshTasks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.types?.length) params.set('types', filters.types.join(','));
      if (filters.statuses?.length) params.set('statuses', filters.statuses.join(','));
      if (filters.searchQuery) params.set('search', filters.searchQuery);
      
      const response = await fetch(`/api/internal/tasks?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('Error refreshing tasks:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (Object.keys(filters).length > 0) {
      refreshTasks();
    }
  }, [filters]);
  
  // Get icon for task type
  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'order': return <Package className="w-4 h-4" />;
      case 'workflow': return <FileText className="w-4 h-4" />;
      case 'custom': return <ListTodo className="w-4 h-4" />;
      default: return <ListTodo className="w-4 h-4" />;
    }
  };
  
  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'normal': return 'text-blue-600 bg-blue-50';
      case 'low': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };
  
  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'in_progress': return 'text-blue-600 bg-blue-50';
      case 'blocked': return 'text-red-600 bg-red-50';
      case 'completed': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };
  
  // Get task action link
  const getTaskLink = (task: UnifiedTask) => {
    switch (task.type) {
      case 'order':
        return `/orders/${(task as any).orderId}`;
      case 'workflow':
        return `/workflows/${(task as any).workflowId}`;
      case 'custom':
        const custom = task as any;
        if (custom.relatedType && custom.relatedId) {
          return `/${custom.relatedType}s/${custom.relatedId}`;
        }
        return '#';
      default:
        return '#';
    }
  };
  
  const TaskCard = ({ task }: { task: UnifiedTask }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {getTaskIcon(task.type)}
            <h3 className="font-medium text-gray-900">{task.title}</h3>
          </div>
          
          {task.description && (
            <p className="text-sm text-gray-600 mb-2">{task.description}</p>
          )}
          
          <div className="flex items-center gap-4 text-xs">
            <span className={`px-2 py-1 rounded-full ${getPriorityColor(task.priority)}`}>
              {task.priority}
            </span>
            <span className={`px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
              {task.status.replace('_', ' ')}
            </span>
            {task.type === 'order' && (
              <span className="text-gray-500">
                {(task as any).lineItemCount} items • {(task as any).clientName}
              </span>
            )}
            {task.type === 'workflow' && (
              <span className="text-gray-500">
                {(task as any).completionPercentage}% complete
              </span>
            )}
          </div>
        </div>
        
        <Link
          href={getTaskLink(task)}
          className="ml-4 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-1"
        >
          View
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
  
  const TaskSection = ({ 
    title, 
    tasks, 
    icon, 
    color 
  }: { 
    title: string; 
    tasks: UnifiedTask[]; 
    icon: React.ReactNode;
    color: string;
  }) => {
    if (tasks.length === 0) return null;
    
    return (
      <div className="mb-8">
        <div className={`flex items-center gap-2 mb-4 pb-2 border-b ${color}`}>
          {icon}
          <h2 className="text-lg font-semibold text-gray-900">
            {title} ({tasks.length})
          </h2>
        </div>
        <div className="space-y-3">
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
            <p className="text-sm text-gray-600 mt-1">
              Managing tasks for {userName}
            </p>
          </div>
          
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Task
          </button>
        </div>
      </div>
      
      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-900">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{tasks.stats.overdue}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
        </div>
        
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-900">Due Today</p>
              <p className="text-2xl font-bold text-yellow-600">{tasks.stats.dueToday}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
        
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">This Week</p>
              <p className="text-2xl font-bold text-blue-600">{tasks.stats.dueThisWeek}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-900">Upcoming</p>
              <p className="text-2xl font-bold text-green-600">{tasks.stats.upcoming}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>
      </div>
      
      {/* Filter Toggle */}
      <div className="mb-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>
        
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            {/* Filter controls will be added in Phase 2 */}
            <p className="text-sm text-gray-600">Filters coming soon...</p>
          </div>
        )}
      </div>
      
      {/* Task Sections */}
      <div className={loading ? 'opacity-50 pointer-events-none' : ''}>
        <TaskSection
          title="Overdue"
          tasks={tasks.overdue}
          icon={<AlertCircle className="w-5 h-5 text-red-600" />}
          color="border-red-200"
        />
        
        <TaskSection
          title="Due Today"
          tasks={tasks.dueToday}
          icon={<Clock className="w-5 h-5 text-yellow-600" />}
          color="border-yellow-200"
        />
        
        <TaskSection
          title="This Week"
          tasks={tasks.dueThisWeek}
          icon={<Calendar className="w-5 h-5 text-blue-600" />}
          color="border-blue-200"
        />
        
        <TaskSection
          title="Upcoming"
          tasks={tasks.upcoming}
          icon={<CheckCircle className="w-5 h-5 text-green-600" />}
          color="border-green-200"
        />
      </div>
      
      {/* Empty State */}
      {tasks.overdue.length === 0 && 
       tasks.dueToday.length === 0 && 
       tasks.dueThisWeek.length === 0 && 
       tasks.upcoming.length === 0 && (
        <div className="text-center py-12">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
          <p className="text-gray-600">No pending tasks assigned to you.</p>
        </div>
      )}
    </div>
  );
}
```

### Step 8: Add to Internal Navigation
**File**: `components/internal/InternalLayout.tsx`
```typescript
// Add to navigation array (around line 35)
const navigation = [
  { name: 'Dashboard', href: '/internal', icon: Home },
  { name: 'My Tasks', href: '/internal/tasks', icon: ListTodo }, // ADD THIS
  { name: 'Websites', href: '/internal/websites', icon: Globe },
  // ... rest of navigation
];

// Import ListTodo icon at top
import { 
  // ... other imports
  ListTodo,  // ADD THIS
  // ... other imports
} from 'lucide-react';
```

### Step 9: Run Migration
```bash
# Command to execute
psql $DATABASE_URL -f migrations/0072_add_internal_tasks_system.sql
```

### Step 10: Test Basic Functionality
1. Navigate to `/internal/tasks`
2. Verify orders and workflows appear
3. Check deadline grouping works
4. Test navigation to individual items

## Phase 2: Enhanced Features (Steps 11-20)

### Step 11: Create Custom Task Modal
**File**: `components/internal/CreateTaskModal.tsx`
```typescript
'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: any) => Promise<void>;
  userId: string;
}

export default function CreateTaskModal({
  isOpen,
  onClose,
  onSubmit,
  userId
}: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState('normal');
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await onSubmit({
        title,
        description,
        deadline: new Date(deadline),
        priority,
        assignedTo: userId
      });
      
      // Reset form
      setTitle('');
      setDescription('');
      setDeadline('');
      setPriority('normal');
      onClose();
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Create Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={3}
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deadline *
            </label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### Step 12: Add Create Task API
**File**: `app/api/internal/tasks/custom/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { internalTasks } from '@/lib/db/schema';

export async function POST(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession();
    
    if (!session || session.userType !== 'internal') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const data = await request.json();
    
    const newTask = await db.insert(internalTasks).values({
      title: data.title,
      description: data.description,
      deadline: new Date(data.deadline),
      assignedTo: data.assignedTo || session.userId,
      createdBy: session.userId,
      priority: data.priority || 'normal',
      status: 'pending',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    return NextResponse.json(newTask[0]);
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
```

### Step 13: Update Task Status API
**File**: `app/api/internal/tasks/[id]/status/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { internalTasks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await AuthServiceServer.getSession();
    
    if (!session || session.userType !== 'internal') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { status, notes } = await request.json();
    const taskId = params.id.replace('custom-', '');
    
    const updates: any = {
      status,
      updatedAt: new Date()
    };
    
    if (status === 'in_progress') {
      updates.startedAt = new Date();
    } else if (status === 'completed') {
      updates.completedAt = new Date();
      updates.completionNotes = notes;
    }
    
    const updated = await db
      .update(internalTasks)
      .set(updates)
      .where(eq(internalTasks.id, taskId))
      .returning();
    
    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('Error updating task status:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}
```

### Steps 14-20: Additional Features

14. **Add Filter Controls** to TasksPageClient
15. **Create Team Overview Page** at `/internal/tasks/team`
16. **Add Deadline Notifications** using existing notification system
17. **Create Task Assignment Modal** for reassigning tasks
18. **Add Bulk Actions** (mark complete, reassign multiple)
19. **Create Task Templates** for recurring tasks
20. **Add Performance Metrics** dashboard

## Phase 3: Testing & Polish (Steps 21-25)

21. **Add Loading States** and error handling
22. **Implement Optimistic Updates** for better UX
23. **Add Keyboard Shortcuts** (n = new task, / = search)
24. **Create Mobile Responsive** views
25. **Add Export to CSV** functionality

## Key Implementation Notes

### Data Flow:
1. Server component fetches initial data
2. Client component manages state and updates
3. API endpoints handle CRUD operations
4. Service layer handles business logic

### Performance Considerations:
- Paginate tasks if > 50 per section
- Cache user tasks for 1 minute
- Index database on (assigned_to, deadline)
- Use optimistic updates for status changes

### Security:
- Verify user can only see their tasks (or team if manager)
- Validate all inputs on server
- Log all task reassignments
- Check permissions for custom task creation

### Edge Cases to Handle:
- Tasks with no deadline (default to +7 days)
- Deleted related entities (orders/workflows)
- Multiple users updating same task
- Timezone handling for deadlines

## Testing Checklist

- [ ] Tasks load correctly for user
- [ ] Deadlines group properly
- [ ] Navigation to tasks works
- [ ] Custom task creation works
- [ ] Status updates persist
- [ ] Filters function correctly
- [ ] Mobile view responsive
- [ ] Empty state displays
- [ ] Error states handled
- [ ] Performance acceptable with 100+ tasks