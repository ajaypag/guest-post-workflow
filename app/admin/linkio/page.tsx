'use client';

import { useState, useEffect } from 'react';
import { 
  FileText, 
  Globe, 
  Tool, 
  BookOpen, 
  FileSearch,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  BarChart
} from 'lucide-react';

interface LinkioPage {
  id: string;
  originalUrl: string;
  originalTitle: string;
  pageType: string;
  category: string;
  priority: number;
  recreationStatus: string;
  ourSlug: string;
  updatedAt: string;
}

interface Stats {
  total: number;
  completed: number;
  progressPercentage: number;
  byStatus: Array<{ recreation_status: string; count: number }>;
  byType: Array<{ page_type: string; count: number }>;
  byPriority: Array<{ priority: number; count: number }>;
  recentActivity: Array<any>;
}

const pageTypeIcons = {
  landing_page: Globe,
  blog_post: FileText,
  tool_page: Tool,
  resource_page: BookOpen,
  case_study: FileSearch,
  other: FileText
};

const statusColors = {
  identified: 'bg-gray-100 text-gray-800',
  analyzed: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  published: 'bg-purple-100 text-purple-800',
  skipped: 'bg-red-100 text-red-800'
};

const priorityLabels = ['Low', 'Medium', 'High'];
const priorityColors = ['text-gray-500', 'text-yellow-600', 'text-red-600'];

export default function LinkioAdminPage() {
  const [pages, setPages] = useState<LinkioPage[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filter, setFilter] = useState({ pageType: '', status: '', priority: '' });
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchPages();
    fetchStats();
  }, [filter]);

  const fetchPages = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.pageType) params.append('pageType', filter.pageType);
      if (filter.status) params.append('status', filter.status);
      if (filter.priority) params.append('priority', filter.priority);
      
      const response = await fetch(`/api/linkio/pages?${params}`);
      const data = await response.json();
      setPages(data.pages || []);
    } catch (error) {
      console.error('Error fetching pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/linkio/stats');
      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const updatePageStatus = async (id: string, status: string) => {
    try {
      const response = await fetch('/api/linkio/pages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, recreationStatus: status })
      });
      
      if (response.ok) {
        fetchPages();
        fetchStats();
      }
    } catch (error) {
      console.error('Error updating page:', error);
    }
  };

  const addPage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      const response = await fetch('/api/linkio/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalUrl: formData.get('url'),
          originalTitle: formData.get('title'),
          pageType: formData.get('pageType'),
          priority: parseInt(formData.get('priority') as string)
        })
      });
      
      if (response.ok) {
        setShowAddModal(false);
        fetchPages();
        fetchStats();
      }
    } catch (error) {
      console.error('Error adding page:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Linkio Recreation Manager</h1>
              <p className="text-gray-600 mt-1">Track and manage the recreation of Linkio.com marketing pages</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add Page
            </button>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      {stats && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {/* Progress Card */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">Overall Progress</h3>
                <TrendingUp className="w-5 h-5 text-gray-400" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{stats.progressPercentage}%</div>
              <div className="text-sm text-gray-600">{stats.completed} of {stats.total} pages</div>
              <div className="mt-3 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${stats.progressPercentage}%` }}
                />
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="font-medium text-gray-900 mb-4">By Status</h3>
              <div className="space-y-2">
                {stats.byStatus.map(item => (
                  <div key={item.recreation_status} className="flex justify-between text-sm">
                    <span className="capitalize">{item.recreation_status.replace('_', ' ')}</span>
                    <span className="font-medium">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Type Breakdown */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="font-medium text-gray-900 mb-4">By Type</h3>
              <div className="space-y-2">
                {stats.byType.slice(0, 5).map(item => (
                  <div key={item.page_type} className="flex justify-between text-sm">
                    <span className="capitalize">{item.page_type.replace('_', ' ')}</span>
                    <span className="font-medium">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Priority Breakdown */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="font-medium text-gray-900 mb-4">By Priority</h3>
              <div className="space-y-2">
                {stats.byPriority.map(item => (
                  <div key={item.priority} className="flex justify-between text-sm">
                    <span>{priorityLabels[item.priority]}</span>
                    <span className="font-medium">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <select
                value={filter.pageType}
                onChange={(e) => setFilter({ ...filter, pageType: e.target.value })}
                className="px-3 py-2 border rounded-lg"
              >
                <option value="">All Types</option>
                <option value="landing_page">Landing Page</option>
                <option value="blog_post">Blog Post</option>
                <option value="tool_page">Tool Page</option>
                <option value="resource_page">Resource Page</option>
                <option value="case_study">Case Study</option>
                <option value="other">Other</option>
              </select>

              <select
                value={filter.status}
                onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                className="px-3 py-2 border rounded-lg"
              >
                <option value="">All Statuses</option>
                <option value="identified">Identified</option>
                <option value="analyzed">Analyzed</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="published">Published</option>
                <option value="skipped">Skipped</option>
              </select>

              <select
                value={filter.priority}
                onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
                className="px-3 py-2 border rounded-lg"
              >
                <option value="">All Priorities</option>
                <option value="2">High</option>
                <option value="1">Medium</option>
                <option value="0">Low</option>
              </select>

              <button
                onClick={() => setFilter({ pageType: '', status: '', priority: '' })}
                className="px-3 py-2 text-gray-600 hover:text-gray-900"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Pages Table */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Page</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Updated</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      Loading pages...
                    </td>
                  </tr>
                ) : pages.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No pages found
                    </td>
                  </tr>
                ) : (
                  pages.map((page) => {
                    const Icon = pageTypeIcons[page.pageType as keyof typeof pageTypeIcons] || FileText;
                    return (
                      <tr key={page.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-3">
                            <Icon className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                              <div className="font-medium text-gray-900">
                                {page.originalTitle || 'Untitled'}
                              </div>
                              <a 
                                href={page.originalUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline"
                              >
                                {page.originalUrl}
                              </a>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600 capitalize">
                            {page.pageType.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-medium ${priorityColors[page.priority]}`}>
                            {priorityLabels[page.priority]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${statusColors[page.recreationStatus as keyof typeof statusColors]}`}>
                            {page.recreationStatus.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(page.updatedAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <select
                            value={page.recreationStatus}
                            onChange={(e) => updatePageStatus(page.id, e.target.value)}
                            className="text-sm px-2 py-1 border rounded"
                          >
                            <option value="identified">Identified</option>
                            <option value="analyzed">Analyzed</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="published">Published</option>
                            <option value="skipped">Skipped</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Page Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Add Linkio Page to Track</h3>
            <form onSubmit={addPage}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Page URL
                  </label>
                  <input
                    type="url"
                    name="url"
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="https://linkio.com/..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Page Title
                  </label>
                  <input
                    type="text"
                    name="title"
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Optional - will be fetched if not provided"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Page Type
                  </label>
                  <select name="pageType" className="w-full px-3 py-2 border rounded-lg">
                    <option value="landing_page">Landing Page</option>
                    <option value="blog_post">Blog Post</option>
                    <option value="tool_page">Tool Page</option>
                    <option value="resource_page">Resource Page</option>
                    <option value="case_study">Case Study</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select name="priority" className="w-full px-3 py-2 border rounded-lg">
                    <option value="2">High</option>
                    <option value="1">Medium</option>
                    <option value="0">Low</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Page
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}