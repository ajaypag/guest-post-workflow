'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, AlertCircle, CheckCircle, Clock, DollarSign, Filter, Search, ChevronDown, ChevronRight, Activity } from 'lucide-react';

interface Task {
  id: string;
  status_code: number;
  status_message: string;
  time: string;
  cost: number;
  cost_formatted: string;
  datetime_posted: string;
  datetime_posted_formatted: string;
  datetime_done: string;
  datetime_done_formatted: string;
  keyword_count: number;
  filter_info: any;
  path: string[];
  data: any;
  result: any;
}

interface TaskSummary {
  total_tasks: number;
  successful_tasks: number;
  failed_tasks: number;
  total_cost: string;
  keyword_distribution: { [key: string]: number };
}

export default function DataForSeoMonitoringPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [errors, setErrors] = useState<any[]>([]);
  const [summary, setSummary] = useState<TaskSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tasks' | 'errors' | 'debug'>('tasks');
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [filterKeywordCount, setFilterKeywordCount] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Debug state
  const [debugDomain, setDebugDomain] = useState('');
  const [debugKeywords, setDebugKeywords] = useState('');
  const [debugResults, setDebugResults] = useState<any>(null);
  const [debugLoading, setDebugLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== 'debug') {
      fetchData();
    }
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/dataforseo-monitoring?action=${activeTab}&limit=100`);
      const data = await response.json();
      
      if (data.status === 'success') {
        if (activeTab === 'tasks') {
          setTasks(data.tasks || []);
          setSummary(data.summary || null);
        } else {
          setErrors(data.data?.tasks?.[0]?.result || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch DataForSEO data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTaskDetails = async (taskId: string) => {
    try {
      const response = await fetch(`/api/admin/dataforseo-monitoring?action=task_details&task_id=${taskId}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch task details:', error);
      return null;
    }
  };

  const toggleTaskExpansion = async (taskId: string) => {
    if (expandedTask === taskId) {
      setExpandedTask(null);
    } else {
      setExpandedTask(taskId);
      // Fetch detailed data if needed
      const task = tasks.find(t => t.id === taskId);
      if (task && !task.result) {
        const details = await fetchTaskDetails(taskId);
        if (details?.data?.tasks?.[0]?.result) {
          // Update task with details
          setTasks(prev => prev.map(t => 
            t.id === taskId ? { ...t, result: details.data.tasks[0].result } : t
          ));
        }
      }
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filterKeywordCount !== 'all' && task.keyword_count.toString() !== filterKeywordCount) {
      return false;
    }
    if (searchTerm && !JSON.stringify(task).toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  const analyzeKeywordPatterns = () => {
    const patterns: any[] = [];
    
    // Group tasks by keyword count and analyze results
    const groupedByKeywords = tasks.reduce((acc: any, task) => {
      const key = task.keyword_count;
      if (!acc[key]) acc[key] = [];
      acc[key].push(task);
      return acc;
    }, {});

    Object.entries(groupedByKeywords).forEach(([keywordCount, taskList]: [string, any]) => {
      const successRate = taskList.filter((t: Task) => t.status_code === 20000).length / taskList.length;
      const avgResultCount = taskList
        .filter((t: Task) => t.result?.items)
        .reduce((sum: number, t: Task) => sum + (t.result?.items?.length || 0), 0) / taskList.length;

      patterns.push({
        keyword_count: parseInt(keywordCount),
        task_count: taskList.length,
        success_rate: (successRate * 100).toFixed(1),
        avg_results: avgResultCount.toFixed(1),
        sample_filters: taskList[0]?.filter_info
      });
    });

    return patterns.sort((a, b) => a.keyword_count - b.keyword_count);
  };

  const runDebugTest = async (testMode = true) => {
    if (!debugDomain || !debugKeywords) {
      alert('Please enter a domain and keywords');
      return;
    }

    setDebugLoading(true);
    setDebugResults(null);

    try {
      const keywordArray = debugKeywords.split(',').map(k => k.trim()).filter(k => k);
      
      const response = await fetch('/api/admin/dataforseo-debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: debugDomain,
          keywords: keywordArray,
          testMode
        })
      });

      const data = await response.json();
      setDebugResults(data);
    } catch (error) {
      console.error('Debug test failed:', error);
      setDebugResults({ error: 'Failed to run debug test' });
    } finally {
      setDebugLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/admin" className="text-blue-600 hover:text-blue-800 flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Admin
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">DataForSEO API Monitoring</h1>
        <p className="text-gray-600">Monitor API calls, analyze keyword filtering patterns, and debug issues</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'tasks'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          API Tasks
        </button>
        <button
          onClick={() => setActiveTab('errors')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'errors'
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Errors
        </button>
        <button
          onClick={() => setActiveTab('debug')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'debug'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Debug Tool
        </button>
        {activeTab !== 'debug' && (
          <button
            onClick={fetchData}
            className="ml-auto px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
        </div>
      ) : (
        <>
          {activeTab === 'tasks' && summary && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg shadow border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Tasks</p>
                      <p className="text-2xl font-bold">{summary.total_tasks}</p>
                    </div>
                    <Activity className="w-8 h-8 text-blue-500 opacity-50" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Success Rate</p>
                      <p className="text-2xl font-bold">
                        {summary.total_tasks > 0 
                          ? ((summary.successful_tasks / summary.total_tasks) * 100).toFixed(1) 
                          : 0}%
                      </p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-500 opacity-50" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Failed Tasks</p>
                      <p className="text-2xl font-bold text-red-600">{summary.failed_tasks}</p>
                    </div>
                    <AlertCircle className="w-8 h-8 text-red-500 opacity-50" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Cost</p>
                      <p className="text-2xl font-bold">${summary.total_cost}</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-500 opacity-50" />
                  </div>
                </div>
              </div>

              {/* Keyword Pattern Analysis */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-yellow-800 mb-2">🔍 Keyword Filter Pattern Analysis</h3>
                <p className="text-sm text-gray-700 mb-3">
                  Analyzing the relationship between keyword count and results:
                </p>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-yellow-300">
                        <th className="text-left py-2 px-3">Keywords</th>
                        <th className="text-left py-2 px-3">Tasks</th>
                        <th className="text-left py-2 px-3">Success Rate</th>
                        <th className="text-left py-2 px-3">Avg Results</th>
                        <th className="text-left py-2 px-3">Issue?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyzeKeywordPatterns().map((pattern, idx) => (
                        <tr key={idx} className="border-b border-yellow-200">
                          <td className="py-2 px-3 font-mono">{pattern.keyword_count}</td>
                          <td className="py-2 px-3">{pattern.task_count}</td>
                          <td className="py-2 px-3">{pattern.success_rate}%</td>
                          <td className="py-2 px-3">{pattern.avg_results}</td>
                          <td className="py-2 px-3">
                            {pattern.keyword_count >= 9 && parseFloat(pattern.avg_results) < 50 && (
                              <span className="text-red-600 font-semibold">⚠️ Low results</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {Object.keys(summary.keyword_distribution).some(k => parseInt(k.split('_')[0]) >= 9) && (
                  <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded">
                    <p className="text-sm text-red-800">
                      <strong>⚠️ Potential Issue Detected:</strong> Tasks with 9+ keywords may be experiencing reduced results. 
                      This could be due to DataForSEO's filter complexity limits.
                    </p>
                  </div>
                )}
              </div>

              {/* Filters */}
              <div className="bg-white p-4 rounded-lg shadow border mb-6">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <select
                      value={filterKeywordCount}
                      onChange={(e) => setFilterKeywordCount(e.target.value)}
                      className="px-3 py-1 border rounded-md text-sm"
                    >
                      <option value="all">All Keywords</option>
                      {Object.keys(summary.keyword_distribution)
                        .map(k => parseInt(k.split('_')[0]))
                        .sort((a, b) => a - b)
                        .map(count => (
                          <option key={count} value={count}>
                            {count} Keywords ({summary.keyword_distribution[`${count}_keywords`]} tasks)
                          </option>
                        ))}
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-1">
                    <Search className="w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search in tasks..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="px-3 py-1 border rounded-md text-sm flex-1"
                    />
                  </div>
                </div>
              </div>

              {/* Tasks List */}
              <div className="bg-white rounded-lg shadow border">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-semibold">Recent API Tasks</h2>
                </div>
                <div className="divide-y">
                  {filteredTasks.map((task) => (
                    <div key={task.id} className="p-4">
                      <div 
                        className="flex items-start justify-between cursor-pointer"
                        onClick={() => toggleTaskExpansion(task.id)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            {expandedTask === task.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            <span className="font-mono text-sm">{task.id}</span>
                            {task.status_code === 20000 ? (
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">Success</span>
                            ) : (
                              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">Error {task.status_code}</span>
                            )}
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                              {task.keyword_count} keywords
                            </span>
                          </div>
                          <div className="flex gap-4 text-sm text-gray-600 ml-7">
                            <span><Clock className="inline w-3 h-3 mr-1" />{task.datetime_posted_formatted}</span>
                            <span>{task.time}</span>
                            <span>{task.cost_formatted}</span>
                            {task.path?.[0] && <span className="font-medium">{task.path[0]}</span>}
                          </div>
                        </div>
                      </div>
                      
                      {expandedTask === task.id && (
                        <div className="mt-4 ml-7 space-y-3">
                          {/* Filter Info */}
                          {task.filter_info && (
                            <div className="bg-gray-50 p-3 rounded">
                              <h4 className="font-semibold text-sm mb-2">Applied Filters:</h4>
                              <pre className="text-xs overflow-x-auto bg-white p-2 rounded border">
                                {JSON.stringify(task.filter_info, null, 2)}
                              </pre>
                            </div>
                          )}
                          
                          {/* Request Data */}
                          {task.data && (
                            <div className="bg-gray-50 p-3 rounded">
                              <h4 className="font-semibold text-sm mb-2">Request Data:</h4>
                              <pre className="text-xs overflow-x-auto bg-white p-2 rounded border max-h-48">
                                {JSON.stringify(task.data, null, 2)}
                              </pre>
                            </div>
                          )}
                          
                          {/* Results Summary */}
                          {task.result && (
                            <div className="bg-gray-50 p-3 rounded">
                              <h4 className="font-semibold text-sm mb-2">Results:</h4>
                              <p className="text-sm">
                                Total items: {task.result[0]?.items?.length || 0}
                              </p>
                              {task.result[0]?.items?.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs text-gray-600 mb-1">Sample keywords found:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {task.result[0].items.slice(0, 10).map((item: any, idx: number) => (
                                      <span key={idx} className="px-2 py-1 bg-white text-xs rounded border">
                                        {item.keyword_data?.keyword}
                                      </span>
                                    ))}
                                    {task.result[0].items.length > 10 && (
                                      <span className="px-2 py-1 text-xs text-gray-500">
                                        +{task.result[0].items.length - 10} more
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'errors' && (
            <div className="bg-white rounded-lg shadow border">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">API Errors</h2>
              </div>
              <div className="divide-y">
                {errors.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500 opacity-50" />
                    <p>No errors found in the last 7 days</p>
                  </div>
                ) : (
                  errors.map((error, idx) => (
                    <div key={idx} className="p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 mt-1" />
                        <div className="flex-1">
                          <div className="font-medium text-red-700 mb-1">
                            Error {error.status_code}: {error.status_message}
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-mono">{error.id}</span>
                            <span className="mx-2">•</span>
                            <span>{new Date(error.datetime_posted).toLocaleString()}</span>
                          </div>
                          {error.data && (
                            <details className="mt-2">
                              <summary className="text-sm cursor-pointer text-blue-600 hover:text-blue-800">
                                View request data
                              </summary>
                              <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                                {JSON.stringify(error.data, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'debug' && (
            <div className="space-y-6">
              {/* Debug Tool Header */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-semibold text-purple-800 mb-2">🔬 Keyword Filter Debug Tool</h3>
                <p className="text-sm text-gray-700">
                  Test different keyword configurations to identify where the filtering issue occurs. 
                  This tool will progressively test 1, 2, 3... up to 10 keywords to find the drop-off point.
                </p>
              </div>

              {/* Debug Input Form */}
              <div className="bg-white rounded-lg shadow border p-6">
                <h4 className="font-semibold mb-4">Test Configuration</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Domain</label>
                    <input
                      type="text"
                      value={debugDomain}
                      onChange={(e) => setDebugDomain(e.target.value)}
                      placeholder="example.com"
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Keywords (comma separated)</label>
                    <textarea
                      value={debugKeywords}
                      onChange={(e) => setDebugKeywords(e.target.value)}
                      placeholder="keyword1, keyword2, keyword3, keyword4, keyword5, keyword6, keyword7, keyword8, keyword9, keyword10"
                      className="w-full px-3 py-2 border rounded-md h-24"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter at least 10 keywords to test the issue you're experiencing
                    </p>
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => runDebugTest(true)}
                      disabled={debugLoading}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      {debugLoading ? 'Testing...' : 'Preview Test Plan'}
                    </button>
                    <button
                      onClick={() => runDebugTest(false)}
                      disabled={debugLoading}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {debugLoading ? 'Running...' : 'Run Live Test (Uses API Credits)'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Debug Results */}
              {debugResults && (
                <div className="space-y-4">
                  {debugResults.error ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-800">{debugResults.error}</p>
                    </div>
                  ) : (
                    <>
                      {/* Analysis Summary */}
                      {debugResults.analysis && (
                        <div className={`rounded-lg p-4 ${
                          debugResults.analysis.pattern_detected 
                            ? 'bg-red-50 border border-red-200' 
                            : 'bg-green-50 border border-green-200'
                        }`}>
                          <h4 className={`font-semibold mb-2 ${
                            debugResults.analysis.pattern_detected ? 'text-red-800' : 'text-green-800'
                          }`}>
                            Analysis Results
                          </h4>
                          {debugResults.analysis.pattern_detected ? (
                            <>
                              <p className="text-sm text-red-700 mb-2">
                                ⚠️ Issue detected at {debugResults.analysis.issue_at_keyword_count} keywords
                              </p>
                              <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                                {debugResults.analysis.recommendations.map((rec: string, idx: number) => (
                                  <li key={idx}>{rec}</li>
                                ))}
                              </ul>
                            </>
                          ) : (
                            <p className="text-sm text-green-700">
                              ✅ No significant drop-off detected in test results
                            </p>
                          )}
                        </div>
                      )}

                      {/* Test Results Table */}
                      <div className="bg-white rounded-lg shadow border">
                        <div className="p-4 border-b">
                          <h4 className="font-semibold">Test Results</h4>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full">
                            <thead className="bg-gray-50 border-b">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Test</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Keywords</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Results</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Cost</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Filter</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {debugResults.test_results?.map((test: any, idx: number) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 text-sm">{test.test}</td>
                                  <td className="px-4 py-2 text-sm text-center">{test.keyword_count}</td>
                                  <td className="px-4 py-2 text-sm">
                                    {test.task_status_code === 20000 ? (
                                      <span className="text-green-600">✓ Success</span>
                                    ) : test.task_status_code ? (
                                      <span className="text-red-600">✗ Error {test.task_status_code}</span>
                                    ) : (
                                      <span className="text-gray-500">Pending</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2 text-sm">
                                    {test.result_count !== undefined ? (
                                      <span className={test.result_count === 0 ? 'text-red-600 font-semibold' : ''}>
                                        {test.result_count} results
                                      </span>
                                    ) : '-'}
                                  </td>
                                  <td className="px-4 py-2 text-sm">
                                    {test.cost ? `$${test.cost.toFixed(4)}` : '-'}
                                  </td>
                                  <td className="px-4 py-2">
                                    <details className="cursor-pointer">
                                      <summary className="text-xs text-blue-600 hover:text-blue-800">View</summary>
                                      <pre className="mt-1 text-xs bg-gray-50 p-1 rounded overflow-x-auto max-w-xs">
                                        {JSON.stringify(test.filter, null, 2)}
                                      </pre>
                                    </details>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}