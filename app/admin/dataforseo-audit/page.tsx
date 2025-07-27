'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Search, AlertCircle, CheckCircle, XCircle, Loader2, RefreshCw, Calendar, Eye } from 'lucide-react';
import Link from 'next/link';

interface TaskDetails {
  id: string;
  url: string;
  datetime_posted: string;
  datetime_done: string;
  status_code: number;
  status_message: string;
  cost: number;
  metadata?: {
    api: string;
    function: string;
    se: string;
    language: string;
    location: string;
  };
  result?: any;
}

interface ErrorDetails {
  id: string;
  datetime: string;
  function: string;
  error_code: number;
  error_message: string;
  http_url: string;
  http_method: string;
  http_code: number;
  http_response: string;
}

export default function DataForSeoAuditPage() {
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [tasks, setTasks] = useState<TaskDetails[]>([]);
  const [errors, setErrors] = useState<ErrorDetails[]>([]);
  const [activeTab, setActiveTab] = useState<'tasks' | 'errors'>('tasks');
  const [selectedTask, setSelectedTask] = useState<TaskDetails | null>(null);
  const [taskPayload, setTaskPayload] = useState<any>(null);
  const [loadingPayload, setLoadingPayload] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalTasks: 0,
    totalErrors: 0,
    totalCost: 0,
    successRate: 0
  });

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/dataforseo-audit/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datetime_from: `${dateFrom} 00:00:00`,
          datetime_to: `${dateTo} 23:59:59`,
          include_metadata: includeMetadata
        })
      });

      const data = await response.json();
      if (data.tasks) {
        setTasks(data.tasks);
        calculateStats(data.tasks, errors);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchErrors = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/dataforseo-audit/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datetime_from: `${dateFrom} 00:00:00`,
          datetime_to: `${dateTo} 23:59:59`
        })
      });

      const data = await response.json();
      if (data.errors) {
        setErrors(data.errors);
        calculateStats(tasks, data.errors);
      }
    } catch (error) {
      console.error('Failed to fetch errors:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTaskDetails = async (taskId: string) => {
    setLoadingPayload(true);
    setTaskPayload(null);
    try {
      const response = await fetch(`/api/admin/dataforseo-audit/task/${taskId}`);
      const data = await response.json();
      if (data.payload) {
        setTaskPayload(data.payload);
      }
    } catch (error) {
      console.error('Failed to fetch task details:', error);
    } finally {
      setLoadingPayload(false);
    }
  };

  const calculateStats = (taskList: TaskDetails[], errorList: ErrorDetails[]) => {
    const totalCost = taskList.reduce((sum, task) => sum + (task.cost || 0), 0);
    const totalTasks = taskList.length;
    const totalErrors = errorList.length;
    const successRate = totalTasks > 0 ? ((totalTasks - totalErrors) / totalTasks) * 100 : 0;

    setStats({
      totalTasks,
      totalErrors,
      totalCost,
      successRate
    });
  };

  const runMigration = async () => {
    if (!confirm('This will create the DataForSEO logs table. Continue?')) {
      return;
    }

    setMigrationStatus('Running migration...');
    try {
      const response = await fetch('/api/admin/migrate-dataforseo-logs', {
        method: 'POST',
      });

      const data = await response.json();
      
      if (response.ok) {
        setMigrationStatus('✅ ' + data.message);
      } else {
        setMigrationStatus('❌ Migration failed: ' + data.error);
      }
    } catch (error) {
      setMigrationStatus('❌ Migration error: ' + error);
    }
  };

  useEffect(() => {
    if (activeTab === 'tasks') {
      fetchTasks();
    } else {
      fetchErrors();
    }
  }, [activeTab, dateFrom, dateTo, includeMetadata]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (statusCode: number) => {
    if (statusCode === 20000) {
      return <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">
        <CheckCircle className="w-3 h-3 mr-1" /> Success
      </span>;
    } else {
      return <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-800 bg-red-100 rounded-full">
        <XCircle className="w-3 h-3 mr-1" /> Error {statusCode}
      </span>;
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link 
          href="/admin" 
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Admin
        </Link>
        
        <h1 className="text-3xl font-bold text-gray-900">DataForSEO API Audit</h1>
        <p className="text-gray-600 mt-2">Review API calls, task IDs, payloads, and errors</p>
      </div>

      {/* Migration Notice */}
      {!migrationStatus && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-yellow-800">Enable Request Logging</h3>
              <p className="text-sm text-yellow-700 mt-1">
                To track request payloads for better auditing, you need to create the logging table first.
              </p>
              <button
                onClick={runMigration}
                className="mt-3 px-4 py-2 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700"
              >
                Create Logging Table
              </button>
            </div>
          </div>
        </div>
      )}

      {migrationStatus && (
        <div className={`mb-6 p-4 rounded-lg ${
          migrationStatus.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {migrationStatus}
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-gray-900">{stats.totalTasks}</div>
          <div className="text-sm text-gray-600">Total Tasks</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-red-600">{stats.totalErrors}</div>
          <div className="text-sm text-gray-600">Total Errors</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-green-600">{stats.successRate.toFixed(1)}%</div>
          <div className="text-sm text-gray-600">Success Rate</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-gray-900">${stats.totalCost.toFixed(4)}</div>
          <div className="text-sm text-gray-600">Total Cost</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Date From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Date To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeMetadata}
                onChange={(e) => setIncludeMetadata(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Include Metadata</span>
            </label>
          </div>
          <div className="flex items-end">
            <button
              onClick={activeTab === 'tasks' ? fetchTasks : fetchErrors}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 inline mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`py-4 px-6 text-sm font-medium ${
                activeTab === 'tasks'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <CheckCircle className="w-4 h-4 inline mr-2" />
              Tasks ({tasks.length})
            </button>
            <button
              onClick={() => setActiveTab('errors')}
              className={`py-4 px-6 text-sm font-medium ${
                activeTab === 'errors'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <AlertCircle className="w-4 h-4 inline mr-2" />
              Errors ({errors.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
              <p className="text-gray-600 mt-2">Loading...</p>
            </div>
          ) : (
            <>
              {activeTab === 'tasks' && (
                <div>
                  {tasks.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No tasks found for the selected date range</p>
                  ) : (
                    <div className="space-y-4">
                      {tasks.map((task) => (
                        <div key={task.id} className="border rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-4 mb-2">
                                <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                                  {task.id}
                                </code>
                                {getStatusBadge(task.status_code)}
                                <span className="text-sm text-gray-600">
                                  ${task.cost?.toFixed(4) || '0.0000'}
                                </span>
                              </div>
                              
                              {task.metadata && (
                                <div className="text-sm text-gray-600 mb-2">
                                  <span className="font-medium">Function:</span> {task.metadata.function} | 
                                  <span className="font-medium ml-2">Location:</span> {task.metadata.location} | 
                                  <span className="font-medium ml-2">Language:</span> {task.metadata.language}
                                </div>
                              )}
                              
                              <div className="text-xs text-gray-500">
                                Posted: {formatDate(task.datetime_posted)} | 
                                Completed: {formatDate(task.datetime_done)}
                              </div>
                            </div>
                            
                            <button
                              onClick={() => {
                                setSelectedTask(task);
                                fetchTaskDetails(task.id);
                              }}
                              className="ml-4 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
                            >
                              <Eye className="w-4 h-4 inline mr-1" />
                              View Details
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'errors' && (
                <div>
                  {errors.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No errors found for the selected date range</p>
                  ) : (
                    <div className="space-y-4">
                      {errors.map((error) => (
                        <div key={error.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-4 mb-2">
                                <code className="text-sm font-mono bg-red-100 px-2 py-1 rounded">
                                  {error.id}
                                </code>
                                <span className="text-sm font-medium text-red-800">
                                  Error {error.error_code}
                                </span>
                              </div>
                              
                              <p className="text-sm text-red-700 mb-2">{error.error_message}</p>
                              
                              <div className="text-sm text-gray-600">
                                <span className="font-medium">Function:</span> {error.function} | 
                                <span className="font-medium ml-2">HTTP:</span> {error.http_code} {error.http_method}
                              </div>
                              
                              <div className="text-xs text-gray-500 mt-1">
                                {formatDate(error.datetime)}
                              </div>
                              
                              {error.http_response && (
                                <details className="mt-2">
                                  <summary className="text-xs text-gray-600 cursor-pointer">HTTP Response</summary>
                                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                                    {error.http_response}
                                  </pre>
                                </details>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Task Details Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold">Task Details</h2>
                  <code className="text-sm text-gray-600">{selectedTask.id}</code>
                </div>
                <button
                  onClick={() => {
                    setSelectedTask(null);
                    setTaskPayload(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {loadingPayload ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
                  <p className="text-gray-600 mt-2">Loading task payload...</p>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <h3 className="font-semibold mb-2">Task Metadata</h3>
                    <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                      {JSON.stringify(selectedTask.metadata || {}, null, 2)}
                    </pre>
                  </div>
                  
                  {taskPayload && (
                    <>
                      {taskPayload.request && (
                        <div className="mb-6">
                          <h3 className="font-semibold mb-2">Request Payload</h3>
                          <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                            {JSON.stringify(taskPayload.request, null, 2)}
                          </pre>
                        </div>
                      )}
                      
                      {taskPayload.metadata && (
                        <div className="mb-6">
                          <h3 className="font-semibold mb-2">Request Metadata</h3>
                          <div className="bg-gray-100 p-4 rounded-lg text-sm space-y-2">
                            <div><strong>Domain:</strong> {taskPayload.metadata.domain}</div>
                            <div><strong>Client:</strong> {taskPayload.metadata.client || 'N/A'}</div>
                            <div><strong>Keywords:</strong> {taskPayload.metadata.keywordCount || 0}</div>
                            <div><strong>Location:</strong> {taskPayload.metadata.locationCode}</div>
                            <div><strong>Language:</strong> {taskPayload.metadata.languageCode}</div>
                            <div><strong>Request Type:</strong> {taskPayload.metadata.requestType}</div>
                            <div><strong>Response Status:</strong> {taskPayload.metadata.responseStatus}</div>
                            {taskPayload.metadata.errorMessage && (
                              <div className="text-red-600"><strong>Error:</strong> {taskPayload.metadata.errorMessage}</div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {taskPayload.note && (
                        <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
                          <p className="text-sm text-yellow-800">{taskPayload.note}</p>
                          {taskPayload.suggestion && (
                            <p className="text-sm text-yellow-700 mt-2">{taskPayload.suggestion}</p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                  
                  {selectedTask.result && (
                    <div>
                      <h3 className="font-semibold mb-2">Response Data</h3>
                      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                        {JSON.stringify(selectedTask.result, null, 2)}
                      </pre>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}