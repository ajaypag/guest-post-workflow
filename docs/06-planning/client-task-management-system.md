# Client Task Management System - Complete Implementation Plan

## 🎯 System Overview

**Purpose**: Allow internal users to delegate specific tasks to clients (starting with anchor text review), creating a scalable task management system that can expand to other client collaboration needs.

**Core Philosophy**: 
- Internal users control when tasks are created
- Clients have a dedicated task interface 
- Each task type has its own specialized UI
- Tasks are trackable, expirable, and auditable

---

## 📋 Phase 1: Foundation & Database Schema

### Database Tables

#### **Core Tasks Table**
```sql
CREATE TABLE client_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id), -- Internal user who created task
  
  -- Task Metadata
  task_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
  
  -- Related Data
  related_order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  related_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  task_data JSONB NOT NULL DEFAULT '{}', -- Task-specific data
  
  -- Status & Timing
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, cancelled, expired
  expires_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_client_tasks_account_status (account_id, status),
  INDEX idx_client_tasks_created_by (created_by),
  INDEX idx_client_tasks_order (related_order_id),
  INDEX idx_client_tasks_expires (expires_at)
);
```

#### **Task Activity Log** (for audit trail)
```sql
CREATE TABLE client_task_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES client_tasks(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id), -- Who performed the action (can be null for system actions)
  actor_type VARCHAR(20) NOT NULL, -- 'internal', 'account', 'system'
  
  action VARCHAR(50) NOT NULL, -- 'created', 'started', 'updated', 'completed', 'cancelled', 'expired'
  details JSONB DEFAULT '{}', -- Action-specific details
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_task_activity_task_id (task_id),
  INDEX idx_task_activity_created_at (created_at)
);
```

### TypeScript Types
```typescript
// Core Types
export type TaskType = 
  | 'review_anchor_text'     // Phase 1 implementation
  | 'approve_content_draft'  // Future
  | 'provide_brand_info'     // Future
  | 'confirm_target_pages'   // Future
  | 'review_published_links'; // Future

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

// Main Task Interface
export interface ClientTask {
  id: string;
  accountId: string;
  createdBy: string;
  taskType: TaskType;
  title: string;
  description: string | null;
  priority: TaskPriority;
  relatedOrderId: string | null;
  relatedClientId: string | null;
  taskData: Record<string, any>;
  status: TaskStatus;
  expiresAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Task-specific data interfaces
export interface AnchorTextReviewData {
  orderNumber: string;
  lineItems: Array<{
    id: string;
    targetUrl: string;
    currentAnchorText: string;
    domain: string;
  }>;
}
```

---

## 📋 Phase 2: Core API Layer

### API Endpoints

#### **Task CRUD Operations**
```typescript
// POST /api/internal/tasks - Create new task (internal users only)
interface CreateTaskRequest {
  accountId: string;
  taskType: TaskType;
  title: string;
  description?: string;
  priority?: TaskPriority;
  relatedOrderId?: string;
  relatedClientId?: string;
  taskData: Record<string, any>;
  expiresAt?: Date;
}

// GET /api/account/tasks - Get tasks for authenticated account
interface GetTasksRequest {
  status?: TaskStatus[];
  taskType?: TaskType[];
  page?: number;
  limit?: number;
}

// GET /api/account/tasks/[id] - Get specific task details
// PUT /api/account/tasks/[id] - Update task (client users only)
// PUT /api/account/tasks/[id]/complete - Mark task as complete
// DELETE /api/internal/tasks/[id] - Cancel task (internal users only)
```

#### **Task Service Layer**
```typescript
export class ClientTaskService {
  // Internal user methods
  static async createTask(data: CreateTaskRequest, createdBy: string): Promise<ClientTask>;
  static async cancelTask(taskId: string, userId: string): Promise<void>;
  static async getTasksByAccount(accountId: string, filters?: TaskFilters): Promise<ClientTask[]>;
  
  // Account user methods
  static async getUserTasks(accountId: string, filters?: TaskFilters): Promise<ClientTask[]>;
  static async getTask(taskId: string, accountId: string): Promise<ClientTask | null>;
  static async updateTaskData(taskId: string, data: Record<string, any>, accountId: string): Promise<void>;
  static async completeTask(taskId: string, accountId: string): Promise<void>;
  
  // System methods
  static async expireTasks(): Promise<void>; // Cron job
  static async getTaskStats(accountId: string): Promise<TaskStats>;
}
```

---

## 📋 Phase 3: Internal User Interface

### Order Management Integration
```typescript
// In /app/orders/[id]/internal/page.tsx
function TaskCreationSection({ order }) {
  const [showTaskModal, setShowTaskModal] = useState(false);
  
  const canCreateAnchorTask = 
    order.status === 'paid' && 
    !order.hasWorkflows &&
    !hasExistingAnchorTask(order.id);

  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-lg font-semibold mb-4">Client Tasks</h3>
      
      {canCreateAnchorTask && (
        <button 
          onClick={() => setShowTaskModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          📝 Request Anchor Text Review
        </button>
      )}
      
      {/* Show existing tasks for this order */}
      <ExistingTasksList orderId={order.id} />
      
      {showTaskModal && (
        <CreateTaskModal 
          order={order}
          taskType="review_anchor_text"
          onClose={() => setShowTaskModal(false)}
          onCreated={handleTaskCreated}
        />
      )}
    </div>
  );
}
```

### Task Creation Modal
```typescript
function CreateTaskModal({ order, taskType, onClose, onCreated }) {
  const [formData, setFormData] = useState({
    title: `Review anchor text for Order #${order.orderNumber}`,
    description: 'Please review and update anchor text before content creation begins.',
    priority: 'normal',
    expiresInDays: 7
  });

  const handleSubmit = async () => {
    const taskData = {
      orderNumber: order.orderNumber,
      lineItems: order.lineItems.map(item => ({
        id: item.id,
        targetUrl: item.targetPageUrl,
        currentAnchorText: item.anchorText,
        domain: item.assignedDomain
      }))
    };

    await ClientTaskService.createTask({
      accountId: order.accountId,
      taskType,
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      relatedOrderId: order.id,
      taskData,
      expiresAt: new Date(Date.now() + formData.expiresInDays * 24 * 60 * 60 * 1000)
    }, session.userId);

    onCreated();
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-4">Create Anchor Text Review Task</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Task Title</label>
            <input 
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea 
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full border rounded px-3 py-2"
              rows={3}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Priority</label>
            <select 
              value={formData.priority}
              onChange={(e) => setFormData({...formData, priority: e.target.value})}
              className="w-full border rounded px-3 py-2"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Expires In</label>
            <select 
              value={formData.expiresInDays}
              onChange={(e) => setFormData({...formData, expiresInDays: parseInt(e.target.value)})}
              className="w-full border rounded px-3 py-2"
            >
              <option value={1}>1 day</option>
              <option value={3}>3 days</option>
              <option value={7}>1 week</option>
              <option value={14}>2 weeks</option>
            </select>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <button 
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create Task
          </button>
        </div>
      </div>
    </Modal>
  );
}
```

---

## 📋 Phase 4: Client User Interface

### Account Dashboard Integration
```typescript
// In /app/account/dashboard/page.tsx
function PendingTasksCard({ tasks }) {
  if (tasks.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-amber-900">Action Required</h3>
          <p className="text-amber-700 text-sm">
            You have {tasks.length} pending task{tasks.length !== 1 ? 's' : ''} 
          </p>
        </div>
        <Link 
          href="/account/tasks" 
          className="bg-amber-600 text-white px-3 py-2 rounded-md hover:bg-amber-700 text-sm"
        >
          View Tasks
        </Link>
      </div>
      
      {/* Show preview of urgent/high priority tasks */}
      {tasks.filter(t => t.priority === 'urgent' || t.priority === 'high').slice(0, 2).map(task => (
        <div key={task.id} className="mt-3 p-3 bg-white rounded border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{task.title}</span>
            {task.priority === 'urgent' && (
              <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">Urgent</span>
            )}
          </div>
          {task.expiresAt && (
            <p className="text-xs text-gray-600 mt-1">
              Expires: {new Date(task.expiresAt).toLocaleDateString()}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
```

### Dedicated Tasks Page
```typescript
// /app/account/tasks/page.tsx
export default function AccountTasksPage() {
  const [tasks, setTasks] = useState<ClientTask[]>([]);
  const [filter, setFilter] = useState<TaskStatus | 'all'>('pending');
  
  const filteredTasks = tasks.filter(task => 
    filter === 'all' || task.status === filter
  );

  return (
    <AccountLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Your Tasks</h1>
          
          <div className="flex items-center gap-2">
            <select 
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="border rounded px-3 py-2"
            >
              <option value="all">All Tasks</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
        
        {filteredTasks.length === 0 ? (
          <EmptyTasksState filter={filter} />
        ) : (
          <div className="space-y-4">
            {filteredTasks.map(task => (
              <TaskCard key={task.id} task={task} onUpdate={handleTaskUpdate} />
            ))}
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
```

### Task Execution Components
```typescript
// Task-specific execution components
function AnchorTextReviewTask({ task, onComplete }) {
  const [lineItems, setLineItems] = useState(task.taskData.lineItems);
  const [saving, setSaving] = useState(false);

  const updateAnchorText = (itemId: string, newAnchorText: string) => {
    setLineItems(prev => prev.map(item => 
      item.id === itemId ? {...item, currentAnchorText: newAnchorText} : item
    ));
  };

  const handleComplete = async () => {
    setSaving(true);
    
    // Update the order line items with new anchor text
    await Promise.all(lineItems.map(item => 
      fetch(`/api/orders/${task.relatedOrderId}/line-items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anchorText: item.currentAnchorText })
      })
    ));
    
    // Mark task as complete
    await ClientTaskService.completeTask(task.id, session.accountId);
    
    setSaving(false);
    onComplete();
  };

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{task.title}</h3>
        <TaskStatusBadge status={task.status} priority={task.priority} />
      </div>
      
      {task.description && (
        <p className="text-gray-600 mb-4">{task.description}</p>
      )}
      
      <div className="space-y-4">
        {lineItems.map(item => (
          <div key={item.id} className="border rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Globe className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600 mb-2">Target Page:</p>
                <a 
                  href={item.targetUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm break-all"
                >
                  {item.targetUrl}
                </a>
                
                <p className="text-sm text-gray-600 mt-3 mb-2">Domain: {item.domain}</p>
                
                <div className="mt-3">
                  <label className="block text-sm font-medium mb-2">Anchor Text:</label>
                  <input 
                    type="text"
                    value={item.currentAnchorText}
                    onChange={(e) => updateAnchorText(item.id, e.target.value)}
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter anchor text..."
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {task.expiresAt && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            ⏰ This task expires on {new Date(task.expiresAt).toLocaleString()}
          </p>
        </div>
      )}
      
      <div className="flex justify-end mt-6">
        <button 
          onClick={handleComplete}
          disabled={saving}
          className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : '✅ Complete Task'}
        </button>
      </div>
    </div>
  );
}
```

---

## 📋 Phase 5: Notifications & Email Integration

### Email Service Integration
```typescript
export class TaskEmailService {
  static async sendTaskCreatedEmail(task: ClientTask, account: Account) {
    const taskUrl = `${process.env.NEXTAUTH_URL}/account/tasks/${task.id}`;
    
    await EmailService.send('task_created', {
      to: account.email,
      subject: `Action Required: ${task.title}`,
      html: this.generateTaskCreatedEmail({
        taskTitle: task.title,
        taskDescription: task.description,
        priority: task.priority,
        expiresAt: task.expiresAt,
        taskUrl,
        accountName: account.contactName
      })
    });
  }
  
  static async sendTaskReminderEmail(task: ClientTask, account: Account) {
    // Send reminder 24 hours before expiry
  }
  
  static async sendTaskCompletedEmail(task: ClientTask, internalUser: User) {
    // Notify internal user when task is completed
  }
}
```

### Notification Integration
```typescript
// In existing notification system
export function useTaskNotifications(accountId: string) {
  const [notifications, setNotifications] = useState([]);
  
  useEffect(() => {
    // Subscribe to task notifications
    const eventSource = new EventSource(`/api/account/notifications/stream`);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'task_created' || data.type === 'task_reminder') {
        setNotifications(prev => [data, ...prev]);
      }
    };
    
    return () => eventSource.close();
  }, [accountId]);
  
  return notifications;
}
```

---

## 📋 Phase 6: System Integration & Polish

### Cron Jobs & Background Tasks
```typescript
// /api/cron/tasks/expire - Run every hour
export async function expireOldTasks() {
  const expiredTasks = await db
    .select()
    .from(clientTasks)
    .where(
      and(
        eq(clientTasks.status, 'pending'),
        lt(clientTasks.expiresAt, new Date())
      )
    );

  for (const task of expiredTasks) {
    await ClientTaskService.expireTask(task.id);
    await TaskEmailService.sendTaskExpiredEmail(task);
  }
}
```

### Analytics & Reporting
```typescript
// Task completion rates, average time to complete, etc.
export class TaskAnalytics {
  static async getTaskStats(dateRange: DateRange) {
    return {
      totalCreated: number,
      totalCompleted: number,
      totalExpired: number,
      averageCompletionTime: number,
      completionRateByType: Record<TaskType, number>,
      topPerformingAccounts: Array<{accountId: string, completionRate: number}>
    };
  }
}
```

### Security & Permissions
```typescript
// Middleware for task access control
export function validateTaskAccess(req: NextRequest, taskId: string) {
  const session = await getSession(req);
  const task = await ClientTaskService.getTask(taskId);
  
  if (session.userType === 'internal') {
    return true; // Internal users can see all tasks
  }
  
  if (session.userType === 'account' && task.accountId === session.accountId) {
    return true; // Account users can only see their own tasks
  }
  
  throw new Error('Unauthorized');
}
```

---

## 🚀 Implementation Timeline

### **Week 1: Foundation**
- Database schema and migrations
- Core TypeScript types
- Basic API endpoints (CRUD)
- Task service layer

### **Week 2: Internal Interface**
- Order management integration
- Task creation modal
- Basic task listing for internal users
- Task cancellation functionality

### **Week 3: Client Interface**
- Account dashboard integration
- Tasks listing page
- Anchor text review component
- Task completion workflow

### **Week 4: Polish & Integration**
- Email notifications
- Background job for expiring tasks
- UI polish and responsive design
- Testing and bug fixes

---

## 🔧 Technical Considerations

### **Performance**
- Index on account_id + status for fast querying
- Paginated task lists
- Efficient task data storage in JSONB

### **Scalability**
- Task types are extensible via enum
- Task data is flexible via JSONB
- Can add task templates for common patterns

### **Security**
- Account users can only see their own tasks
- Internal users can manage all tasks
- Task data validation per task type
- Expiry mechanism prevents stale tasks

### **UX Considerations**
- Clear task priorities and deadlines
- Progress indicators for multi-step tasks
- Email reminders before expiry
- Mobile-responsive task interface

---

## 💡 Future Enhancements

### **Additional Task Types**
- `approve_content_draft` - Client reviews and approves content before publishing
- `provide_brand_info` - Request missing brand guidelines or information
- `confirm_target_pages` - Verify target URLs are still valid and relevant
- `review_published_links` - Final review of published guest posts
- `approve_site_selections` - Client approval for proposed publishing sites

### **Advanced Features**
- Task templates for common scenarios
- Batch task creation for multiple orders
- Task dependencies and workflows
- Client task delegation (account admin → team members)
- Task analytics and reporting dashboard
- Integration with internal project management tools

### **Automation Opportunities**
- Auto-create anchor text review tasks for orders meeting certain criteria
- Smart task prioritization based on order value/urgency
- Automated follow-up sequences for incomplete tasks
- Integration with content creation workflows

This system provides a solid foundation for client task management while being specifically tailored to start with anchor text review. It's extensible for future task types and maintains clean separation of concerns between internal team operations and client collaboration.