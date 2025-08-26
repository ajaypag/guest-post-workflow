/**
 * Internal Tasks API Endpoint
 * Provides task aggregation and filtering for internal users
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { taskService } from '@/lib/services/taskService';
import { type TaskFilters, type TaskType, type TaskStatus, type TaskPriority } from '@/lib/types/tasks';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession();
    
    if (!session || session.userType !== 'internal') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    
    // Build filters from query params
    const filters: TaskFilters = {};

    // User filter (defaults to current user unless 'all' is specified)
    const assignedToParam = searchParams.get('assignedTo');
    
    if (assignedToParam === 'all') {
      // Show all tasks (no filter)
    } else if (assignedToParam === 'unassigned') {
      // Show only unassigned tasks
      filters.assignedTo = ['unassigned'];
    } else if (assignedToParam) {
      // Specific user IDs (comma-separated)
      filters.assignedTo = assignedToParam.split(',').filter(Boolean);
    } else {
      // Default to current user
      filters.assignedTo = [session.userId];
    }

    // Task type filter - handle both 'type' and 'types' parameters
    const typeParam = searchParams.get('type') || searchParams.get('types');
    if (typeParam) {
      filters.types = typeParam.split(',').filter(Boolean) as TaskType[];
    }

    // Status filter
    const statusParam = searchParams.get('status');
    if (statusParam) {
      filters.statuses = statusParam.split(',').filter(Boolean) as TaskStatus[];
    }

    // Priority filter
    const priorityParam = searchParams.get('priority');
    if (priorityParam) {
      filters.priorities = priorityParam.split(',').filter(Boolean) as TaskPriority[];
    }

    // Client filter - handle both clientId (legacy) and clientIds (new)
    const clientParam = searchParams.get('clientId') || searchParams.get('clientIds');
    if (clientParam) {
      filters.clients = clientParam.split(',').filter(Boolean);
    }

    // Account filter - hierarchical filtering by account
    const accountParam = searchParams.get('accountIds');
    if (accountParam) {
      filters.accounts = accountParam.split(',').filter(Boolean);
    }

    // Order filter
    const orderParam = searchParams.get('orderId');
    if (orderParam) {
      filters.orders = orderParam.split(',').filter(Boolean);
    }

    // Date range filter
    const dateRangeParam = searchParams.get('dateRange');
    if (dateRangeParam) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      switch (dateRangeParam) {
        case 'today':
          filters.dateRange = {
            start: today,
            end: new Date(today.getTime() + 24 * 60 * 60 * 1000)
          };
          break;
        case 'week':
          const weekFromNow = new Date(today);
          weekFromNow.setDate(today.getDate() + 7);
          filters.dateRange = {
            start: today,
            end: weekFromNow
          };
          break;
        case 'month':
          const monthFromNow = new Date(today);
          monthFromNow.setMonth(today.getMonth() + 1);
          filters.dateRange = {
            start: today,
            end: monthFromNow
          };
          break;
        case 'overdue':
          filters.dateRange = {
            end: today
          };
          break;
        // 'all' or no value means no date filter
      }
    }

    // Custom date range
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (startDate || endDate) {
      filters.dateRange = {
        start: startDate ? new Date(startDate) : undefined,
        end: endDate ? new Date(endDate) : undefined
      };
    }

    // Search query
    const searchQuery = searchParams.get('search');
    if (searchQuery) {
      filters.searchQuery = searchQuery;
    }

    // Show line items toggle
    const showLineItems = searchParams.get('showLineItems');
    filters.showLineItems = showLineItems === 'true';

    // Pagination
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    filters.page = Math.max(1, page);
    filters.limit = Math.min(100, Math.max(1, limit)); // Cap at 100 items per page

    // Fetch tasks
    const result = await taskService.getTasks(filters);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession();
    
    if (!session || session.userType !== 'internal') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { entityType, entityId, assignedTo, notes } = body;

    // Validate required fields
    if (!entityType || !entityId || !assignedTo) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate entity type
    if (!['order', 'workflow', 'line_item'].includes(entityType)) {
      return NextResponse.json(
        { error: 'Invalid entity type' },
        { status: 400 }
      );
    }

    // Perform assignment
    const success = await taskService.assignTask(
      entityType as 'order' | 'workflow' | 'line_item',
      entityId,
      assignedTo,
      notes
    );

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Failed to assign task' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error assigning task:', error);
    return NextResponse.json(
      { error: 'Failed to assign task' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession();
    
    if (!session || session.userType !== 'internal') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Check if this is a bulk assignment
    if (body.entityIds && Array.isArray(body.entityIds)) {
      const { entityType, entityIds, assignedTo, notes } = body;

      // Validate required fields
      if (!entityType || !entityIds.length || !assignedTo) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        );
      }

      // Validate entity type
      if (!['order', 'workflow', 'line_item'].includes(entityType)) {
        return NextResponse.json(
          { error: 'Invalid entity type' },
          { status: 400 }
        );
      }

      // Perform bulk assignment
      const success = await taskService.bulkAssignTasks(
        entityType as 'order' | 'workflow' | 'line_item',
        entityIds,
        assignedTo,
        notes
      );

      if (success) {
        return NextResponse.json({ success: true });
      } else {
        return NextResponse.json(
          { error: 'Failed to bulk assign tasks' },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in bulk assignment:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}