/**
 * Integration tests for task filtering bug
 * 
 * Critical Bug: When filtering by types=workflow, the API returns all order tasks
 * instead of filtering correctly. Stats are calculated correctly but tasks array
 * is not filtered by type.
 */

import { taskService } from '@/lib/services/taskService';
import { TaskFilters, TaskType } from '@/lib/types/tasks';

describe('Task Filtering Integration Tests', () => {
  describe('Type Filtering Bug', () => {
    test('should return empty array when filtering by workflow type (no workflows assigned)', async () => {
      // Test user has no workflows assigned according to the bug report
      const userId = '97aca16f-8b81-44ad-a532-a6e3fa96cbfc';
      
      const filters: TaskFilters = {
        assignedTo: [userId],
        types: ['workflow']
      };

      const result = await taskService.getTasks(filters);

      // Should return empty array since user has no workflows
      expect(result.tasks).toHaveLength(0);
      expect(result.stats.byType.workflow).toBe(0);
      expect(result.stats.byType.order).toBe(0);
      expect(result.stats.byType.line_item).toBe(0);
      expect(result.stats.total).toBe(0);
    });

    test('should return only order tasks when filtering by order type', async () => {
      const userId = '97aca16f-8b81-44ad-a532-a6e3fa96cbfc';
      
      const filters: TaskFilters = {
        assignedTo: [userId],
        types: ['order']
      };

      const result = await taskService.getTasks(filters);

      // Should return only order tasks
      expect(result.tasks.length).toBeGreaterThan(0);
      result.tasks.forEach(task => {
        expect(task.type).toBe('order');
      });
      
      // Stats should match
      expect(result.stats.byType.order).toBe(result.tasks.length);
      expect(result.stats.byType.workflow).toBe(0);
      expect(result.stats.byType.line_item).toBe(0);
      expect(result.stats.total).toBe(result.tasks.length);
    });

    test('should return mixed tasks when filtering by multiple types', async () => {
      const userId = '97aca16f-8b81-44ad-a532-a6e3fa96cbfc';
      
      const filters: TaskFilters = {
        assignedTo: [userId],
        types: ['order', 'workflow']
      };

      const result = await taskService.getTasks(filters);

      // Should return tasks matching the specified types
      result.tasks.forEach(task => {
        expect(['order', 'workflow']).toContain(task.type);
      });

      // Stats should be consistent with returned tasks
      const orderTasks = result.tasks.filter(t => t.type === 'order');
      const workflowTasks = result.tasks.filter(t => t.type === 'workflow');
      
      expect(result.stats.byType.order).toBe(orderTasks.length);
      expect(result.stats.byType.workflow).toBe(workflowTasks.length);
      expect(result.stats.byType.line_item).toBe(0);
      expect(result.stats.total).toBe(result.tasks.length);
    });

    test('should return all tasks when no type filter is provided', async () => {
      const userId = '97aca16f-8b81-44ad-a532-a6e3fa96cbfc';
      
      const filters: TaskFilters = {
        assignedTo: [userId]
        // No types filter
      };

      const result = await taskService.getTasks(filters);

      // Should return all tasks for the user
      const orderTasks = result.tasks.filter(t => t.type === 'order');
      const workflowTasks = result.tasks.filter(t => t.type === 'workflow');
      const lineItemTasks = result.tasks.filter(t => t.type === 'line_item');
      
      expect(result.stats.byType.order).toBe(orderTasks.length);
      expect(result.stats.byType.workflow).toBe(workflowTasks.length);
      expect(result.stats.byType.line_item).toBe(lineItemTasks.length);
      expect(result.stats.total).toBe(result.tasks.length);
    });

    test('should return empty array for line_item type filtering', async () => {
      const userId = '97aca16f-8b81-44ad-a532-a6e3fa96cbfc';
      
      const filters: TaskFilters = {
        assignedTo: [userId],
        types: ['line_item'],
        showLineItems: true
      };

      const result = await taskService.getTasks(filters);

      // Should only return line items
      result.tasks.forEach(task => {
        expect(task.type).toBe('line_item');
      });
      
      expect(result.stats.byType.line_item).toBe(result.tasks.length);
      expect(result.stats.byType.order).toBe(0);
      expect(result.stats.byType.workflow).toBe(0);
    });

    test('should handle invalid type filtering gracefully', async () => {
      const userId = '97aca16f-8b81-44ad-a532-a6e3fa96cbfc';
      
      const filters: TaskFilters = {
        assignedTo: [userId],
        types: ['invalid_type'] as TaskType[]
      };

      const result = await taskService.getTasks(filters);

      // Should return empty array for invalid types
      expect(result.tasks).toHaveLength(0);
      expect(result.stats.total).toBe(0);
    });
  });

  describe('Stats Consistency', () => {
    test('stats should match actual returned tasks after type filtering', async () => {
      const userId = '97aca16f-8b81-44ad-a532-a6e3fa96cbfc';
      
      // Test each type individually
      const testTypes: TaskType[] = ['order', 'workflow', 'line_item'];
      
      for (const taskType of testTypes) {
        const filters: TaskFilters = {
          assignedTo: [userId],
          types: [taskType],
          showLineItems: taskType === 'line_item'
        };

        const result = await taskService.getTasks(filters);

        // All returned tasks should match the filter type
        result.tasks.forEach(task => {
          expect(task.type).toBe(taskType);
        });

        // Stats should match
        expect(result.stats.byType[taskType]).toBe(result.tasks.length);
        expect(result.stats.total).toBe(result.tasks.length);
        
        // Other type counts should be 0
        testTypes.forEach(otherType => {
          if (otherType !== taskType) {
            expect(result.stats.byType[otherType]).toBe(0);
          }
        });
      }
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty types array', async () => {
      const userId = '97aca16f-8b81-44ad-a532-a6e3fa96cbfc';
      
      const filters: TaskFilters = {
        assignedTo: [userId],
        types: []
      };

      const result = await taskService.getTasks(filters);

      // Empty types array should return all tasks (same as no filter)
      expect(result.tasks.length).toBeGreaterThanOrEqual(0);
      expect(result.stats.total).toBe(result.tasks.length);
    });

    test('should handle undefined types', async () => {
      const userId = '97aca16f-8b81-44ad-a532-a6e3fa96cbfc';
      
      const filters: TaskFilters = {
        assignedTo: [userId],
        types: undefined
      };

      const result = await taskService.getTasks(filters);

      // Undefined types should return all tasks
      expect(result.tasks.length).toBeGreaterThanOrEqual(0);
      expect(result.stats.total).toBe(result.tasks.length);
    });
  });
});