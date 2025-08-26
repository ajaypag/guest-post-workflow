import { redirect } from 'next/navigation';
import { AuthServiceServer } from '@/lib/auth-server';
import { taskService } from '@/lib/services/taskService';
import { db } from '@/lib/db/connection';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import TasksPageClient from './TasksPageClient';
import type { TasksResponse } from '@/lib/types/tasks';

export default async function InternalTasksPage() {
  // Check authentication
  const session = await AuthServiceServer.getSession();
  
  if (!session || session.userType !== 'internal') {
    redirect('/login');
  }

  // Fetch internal users for assignment dropdown
  const internalUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email
    })
    .from(users)
    .where(eq(users.role, 'internal'))
    .orderBy(users.name);
  
  // Initial data load for the current user
  let initialData: TasksResponse;
  
  try {
    initialData = await taskService.getUserTasks(session.userId);
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
    <TasksPageClient
      initialData={initialData}
      currentUserId={session.userId}
      currentUserName={session.name || 'Internal User'}
      currentUserEmail={session.email}
      internalUsers={internalUsers}
    />
  );
}