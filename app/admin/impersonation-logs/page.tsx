'use client';

import React, { useState, useEffect } from 'react';
import { Shield, User, Clock, Activity, ExternalLink, AlertTriangle, ChevronDown, ChevronUp, Eye } from 'lucide-react';

interface ImpersonationLog {
  id: string;
  sessionId: string;
  adminUserId: string;
  adminName: string;
  adminEmail: string;
  targetUserId: string;
  targetName: string;
  targetEmail: string;
  targetUserType: 'account' | 'publisher';
  startedAt: string;
  endedAt?: string;
  reason: string;
  status: 'active' | 'ended';
  actionsCount: number;
  ipAddress: string;
  duration?: string;
}

interface ImpersonationAction {
  id: string;
  logId: string;
  actionType: string;
  endpoint: string;
  method: string;
  requestData?: any;
  responseStatus: number;
  timestamp: string;
}

export default function ImpersonationLogsPage() {
  const [logs, setLogs] = useState<ImpersonationLog[]>([]);
  const [actions, setActions] = useState<{ [logId: string]: ImpersonationAction[] }>({});
  const [loading, setLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'ended'>('all');
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('week');

  useEffect(() => {
    fetchLogs();
  }, [filter, timeRange]);

  const fetchLogs = async () => {
    try {
      const response = await fetch(`/api/admin/impersonation-logs?filter=${filter}&timeRange=${timeRange}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      } else {
        console.error('Failed to fetch impersonation logs');
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActions = async (logId: string) => {
    if (actions[logId]) {
      return; // Already loaded
    }

    try {
      const response = await fetch(`/api/admin/impersonation-logs/${logId}/actions`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setActions(prev => ({
          ...prev,
          [logId]: data.actions || []
        }));
      }
    } catch (error) {
      console.error('Error fetching actions:', error);
    }
  };

  const toggleLogDetails = (logId: string) => {
    if (expandedLog === logId) {
      setExpandedLog(null);
    } else {
      setExpandedLog(logId);
      fetchActions(logId);
    }
  };

  const formatDuration = (startedAt: string, endedAt?: string) => {
    const start = new Date(startedAt);
    const end = endedAt ? new Date(endedAt) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}m`;
    }
    return `${diffMins}m`;
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'text-green-600 bg-green-50' : 'text-gray-600 bg-gray-50';
  };

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.status === filter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading impersonation logs...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Shield className="w-6 h-6 text-purple-600" />
                <h1 className="text-2xl font-bold text-gray-900">Impersonation Logs</h1>
              </div>
              <div className="text-sm text-gray-500">
                {filteredLogs.length} {filteredLogs.length === 1 ? 'session' : 'sessions'}
              </div>
            </div>

            {/* Filters */}
            <div className="mt-4 flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Status:</label>
                <select 
                  value={filter} 
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                >
                  <option value="all">All Sessions</option>
                  <option value="active">Active</option>
                  <option value="ended">Ended</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Time Range:</label>
                <select 
                  value={timeRange} 
                  onChange={(e) => setTimeRange(e.target.value as any)}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                >
                  <option value="today">Today</option>
                  <option value="week">Past Week</option>
                  <option value="month">Past Month</option>
                  <option value="all">All Time</option>
                </select>
              </div>
            </div>
          </div>

          {/* Logs List */}
          <div className="divide-y divide-gray-200">
            {filteredLogs.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Shield className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No impersonation sessions</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No impersonation sessions found for the selected filters.
                </p>
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div key={log.id} className="px-6 py-4 hover:bg-gray-50">
                  {/* Main Log Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                          {log.status === 'active' ? 'Active' : 'Ended'}
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{log.adminName}</span>
                          <span className="text-sm text-gray-500">→</span>
                          <span className="text-sm font-medium text-purple-700">{log.targetName}</span>
                          <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                            {log.targetUserType}
                          </span>
                        </div>
                        
                        <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatDuration(log.startedAt, log.endedAt)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Activity className="w-3 h-3" />
                            <span>{log.actionsCount} actions</span>
                          </div>
                          <span>Started {new Date(log.startedAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleLogDetails(log.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {expandedLog === log.id ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedLog === log.id && (
                    <div className="mt-4 pl-4 border-l-2 border-purple-200">
                      <div className="space-y-3">
                        {/* Session Details */}
                        <div className="bg-gray-50 rounded p-3">
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Session Details</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            <div><span className="font-medium">Reason:</span> {log.reason}</div>
                            <div><span className="font-medium">IP Address:</span> {log.ipAddress}</div>
                            <div><span className="font-medium">Session ID:</span> {log.sessionId}</div>
                            <div><span className="font-medium">Admin Email:</span> {log.adminEmail}</div>
                            <div><span className="font-medium">Target Email:</span> {log.targetEmail}</div>
                            {log.endedAt && (
                              <div><span className="font-medium">Ended At:</span> {new Date(log.endedAt).toLocaleString()}</div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        {actions[log.id] && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">
                              Actions ({actions[log.id].length})
                            </h4>
                            <div className="space-y-1 max-h-60 overflow-y-auto">
                              {actions[log.id].map((action) => (
                                <div key={action.id} className="text-xs bg-gray-50 rounded p-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <span className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                                        action.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                                        action.method === 'POST' ? 'bg-green-100 text-green-700' :
                                        action.method === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
                                        action.method === 'DELETE' ? 'bg-red-100 text-red-700' :
                                        'bg-gray-100 text-gray-700'
                                      }`}>
                                        {action.method}
                                      </span>
                                      <code className="font-mono">{action.endpoint}</code>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                                        action.responseStatus < 300 ? 'bg-green-100 text-green-700' :
                                        action.responseStatus < 400 ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-red-100 text-red-700'
                                      }`}>
                                        {action.responseStatus}
                                      </span>
                                      <span className="text-gray-500">
                                        {new Date(action.timestamp).toLocaleTimeString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}