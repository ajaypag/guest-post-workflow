'use client';

import { FC, useEffect, useState } from 'react';
import { 
  Plus, Edit, Trash2, CheckCircle, XCircle, Clock, 
  FileText, Target, ShoppingCart, BarChart2, Users,
  Sparkles, Link2, Calendar, Package, Archive, UserCheck,
  AlertCircle
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description?: string;
  timestamp: Date | string;
  user?: string;
  metadata?: any;
}

interface ActivityTimelineProps {
  clientId: string;
  limit?: number;
  showViewAll?: boolean;
}

// Mock data generator for demo (fallback if API fails)
function generateMockActivities(): ActivityItem[] {
  const now = new Date();
  const activities: ActivityItem[] = [
    {
      id: '1',
      type: 'keywords_generated',
      title: 'AI Keywords Generated',
      description: 'Generated keywords for 15 target pages using AI',
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      user: 'System',
      metadata: { pageCount: 15 }
    },
    {
      id: '2',
      type: 'page_added',
      title: 'Target Pages Added',
      description: '5 new target pages added to tracking',
      timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 day ago
      user: 'John Doe',
      metadata: { urls: ['/blog/seo-tips', '/services', '/about'] }
    },
    {
      id: '3',
      type: 'order_created',
      title: 'Order #ORD-2024-001 Created',
      description: 'New order for 10 guest posts created',
      timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      user: 'Jane Smith',
      metadata: { orderId: 'ORD-2024-001', linkCount: 10 }
    },
    {
      id: '4',
      type: 'status_change',
      title: 'Page Status Updated',
      description: '3 pages marked as completed',
      timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      user: 'John Doe',
      metadata: { fromStatus: 'active', toStatus: 'completed', count: 3 }
    },
    {
      id: '5',
      type: 'bulk_analysis',
      title: 'Bulk Analysis Completed',
      description: 'Analyzed 50 domains for outreach opportunities',
      timestamp: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      user: 'System',
      metadata: { domainCount: 50, qualified: 12 }
    },
    {
      id: '6',
      type: 'client_updated',
      title: 'Client Information Updated',
      description: 'Updated client website and contact details',
      timestamp: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      user: 'Admin',
    },
    {
      id: '7',
      type: 'account_assigned',
      title: 'Account Owner Assigned',
      description: 'Client assigned to account: john@example.com',
      timestamp: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
      user: 'Admin',
      metadata: { accountEmail: 'john@example.com' }
    }
  ];
  
  return activities;
}

function getActivityIcon(type: string) {
  switch (type) {
    case 'page_added':
      return <Plus className="w-4 h-4" />;
    case 'page_removed':
      return <Trash2 className="w-4 h-4" />;
    case 'status_change':
    case 'page_completed':
      return <CheckCircle className="w-4 h-4" />;
    case 'order_created':
    case 'order_confirmed':
      return <ShoppingCart className="w-4 h-4" />;
    case 'order_completed':
      return <Package className="w-4 h-4" />;
    case 'workflow_created':
      return <FileText className="w-4 h-4" />;
    case 'workflow_completed':
    case 'workflow_published':
      return <Link2 className="w-4 h-4" />;
    case 'bulk_analysis':
    case 'bulk_analysis_completed':
      return <BarChart2 className="w-4 h-4" />;
    case 'keywords_generated':
      return <Sparkles className="w-4 h-4" />;
    case 'client_created':
    case 'client_updated':
      return <Edit className="w-4 h-4" />;
    case 'client_converted':
      return <UserCheck className="w-4 h-4" />;
    case 'client_archived':
      return <Archive className="w-4 h-4" />;
    case 'account_assigned':
      return <Users className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
}

function getActivityColor(type: string) {
  switch (type) {
    case 'page_added':
    case 'order_created':
    case 'workflow_created':
    case 'client_created':
    case 'client_converted':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'page_removed':
    case 'client_archived':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'status_change':
    case 'page_completed':
    case 'workflow_completed':
    case 'order_completed':
    case 'client_updated':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'bulk_analysis':
    case 'bulk_analysis_completed':
    case 'keywords_generated':
      return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'order_confirmed':
    case 'workflow_published':
      return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'account_assigned':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

function formatTimeAgo(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
  } else if (diffHours > 0) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  } else if (diffMins > 0) {
    return diffMins === 1 ? '1 minute ago' : `${diffMins} minutes ago`;
  } else {
    return 'Just now';
  }
}

export function ActivityTimeline({ clientId, limit = 5, showViewAll = true }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentLimit, setCurrentLimit] = useState(limit);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    fetchActivities();
  }, [clientId, currentLimit]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/clients/${clientId}/activity?limit=${currentLimit}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }
      
      const data = await response.json();
      setActivities(data.activities || []);
      setHasMore(data.hasMore || false);
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError('Failed to load activities');
      // Fall back to mock data
      setActivities(generateMockActivities().slice(0, limit));
    } finally {
      setLoading(false);
    }
  };

  const handleViewAll = () => {
    setCurrentLimit(50); // Show more activities
  };
  
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-gray-600" />
            Recent Activity
          </h3>
          {showViewAll && currentLimit < 50 && (hasMore || activities.length >= currentLimit) && (
            <button 
              onClick={handleViewAll}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              View All ({activities.length >= currentLimit ? 'more' : activities.length})
            </button>
          )}
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-gray-600">Using sample data</p>
          </div>
        ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-8 bottom-0 w-0.5 bg-gray-200"></div>
          
          {/* Activity items */}
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div key={activity.id} className="relative flex items-start">
                {/* Timeline dot */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center ${getActivityColor(activity.type)} bg-white z-10`}>
                  {getActivityIcon(activity.type)}
                </div>
                
                {/* Content */}
                <div className="ml-4 flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.title}
                      </p>
                      {activity.description && (
                        <p className="text-sm text-gray-600 mt-0.5">
                          {activity.description}
                        </p>
                      )}
                      <div className="flex items-center mt-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3 mr-1" />
                        <span>{formatTimeAgo(activity.timestamp)}</span>
                        {activity.user && (
                          <>
                            <span className="mx-1">•</span>
                            <span>by {activity.user}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}
        
        {!loading && !error && activities.length === 0 && (
          <div className="text-center py-8">
            <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">No recent activity</p>
          </div>
        )}
      </div>
    </div>
  );
}