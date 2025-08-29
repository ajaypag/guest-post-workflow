import { taskService } from '@/lib/services/taskService';
import { db } from '@/lib/db/connection';
import { users } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';
import HomepageTaskManager from './HomepageTaskManager';
import type { TasksResponse } from '@/lib/types/tasks';

interface HomepageTaskSectionProps {
  userId: string;
  userName: string;
  userEmail: string;
}

export default async function HomepageTaskSection({
  userId,
  userName,
  userEmail
}: HomepageTaskSectionProps) {
  // Fetch internal users for assignment dropdown
  const internalUsersBase = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email
    })
    .from(users)
    .where(sql`${users.role} IN ('admin', 'user')`)
    .orderBy(users.name);
  
  // Fetch task counts for each user
  const taskCountsQuery = await db.execute(sql`
    WITH order_counts AS (
      SELECT 
        assigned_to as user_id,
        COUNT(*) as total_count,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as active_count
      FROM orders
      WHERE assigned_to IS NOT NULL
        AND status NOT IN ('completed', 'cancelled', 'refunded')
      GROUP BY assigned_to
    ),
    workflow_counts AS (
      SELECT 
        assigned_user_id as user_id,
        COUNT(*) as total_count,
        COUNT(CASE WHEN completion_percentage < 100 THEN 1 END) as active_count
      FROM workflows
      WHERE assigned_user_id IS NOT NULL
        AND status NOT IN ('published', 'archived')
      GROUP BY assigned_user_id
    ),
    combined_counts AS (
      SELECT 
        COALESCE(o.user_id, w.user_id) as user_id,
        COALESCE(o.total_count, 0) + COALESCE(w.total_count, 0) as total_tasks,
        COALESCE(o.active_count, 0) + COALESCE(w.active_count, 0) as active_tasks
      FROM order_counts o
      FULL OUTER JOIN workflow_counts w ON o.user_id = w.user_id
    )
    SELECT * FROM combined_counts
  `);
  
  // Map task counts to users
  const taskCountsMap = new Map(
    taskCountsQuery.rows.map((row: any) => [
      row.user_id, 
      { total: Number(row.total_tasks) || 0, active: Number(row.active_tasks) || 0 }
    ])
  );
  
  // Enrich users with task counts
  const internalUsers = internalUsersBase.map(user => ({
    ...user,
    taskCount: taskCountsMap.get(user.id)?.total || 0,
    activeTaskCount: taskCountsMap.get(user.id)?.active || 0
  }));
  
  // Initial data load for the current user
  let initialData: TasksResponse;
  
  try {
    initialData = await taskService.getUserTasks(userId);
  } catch (error) {
    console.error('Error loading initial tasks:', error);
    // Return empty state if there's an error
    initialData = {
      tasks: [],
      stats: {
        total: 0,
        overdue: 0,
        dueToday: 0,
        dueThisWeek: 0,
        upcoming: 0,
        noDueDate: 0,
        byStatus: {
          pending: 0,
          in_progress: 0,
          completed: 0,
          rejected: 0,
          blocked: 0,
          cancelled: 0
        },
        byType: {
          order: 0,
          workflow: 0,
          line_item: 0
        }
      },
      groupedTasks: {
        overdue: [],
        dueToday: [],
        dueThisWeek: [],
        upcoming: [],
        noDueDate: []
      }
    };
  }

  return (
    <HomepageTaskManager
      initialData={initialData}
      currentUserId={userId}
      currentUserName={userName}
      currentUserEmail={userEmail}
      internalUsers={internalUsers}
      initialPageSize={5}
    />
  );
}