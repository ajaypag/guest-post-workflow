'use client';

import { useState, useEffect } from 'react';
import { RefreshCcw, AlertTriangle, CheckCircle, XCircle, Info, Bug } from 'lucide-react';

interface DiagnosticSession {
  sessionId: string;
  workflowId: string;
  agentType: 'semantic_audit' | 'article_writing' | 'formatting_qa' | 'final_polish';
  status: string;
  startTime: string;
  endTime?: string;
  events: {
    textOnly: number;
    toolCalls: number;
    retries: number;
    errors: number;
  };
}

interface DiagnosticEvent {
  timestamp: number;
  type: string;
  category: 'text' | 'tool' | 'retry' | 'error' | 'success';
  message: string;
  details?: any;
}

export default function AgentDiagnosticsPage() {
  const [sessions, setSessions] = useState<DiagnosticSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [events, setEvents] = useState<DiagnosticEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Fetch sessions from backend
  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/admin/agent-diagnostics/sessions?limit=20');
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error('Failed to fetch diagnostic sessions:', error);
    }
  };

  useEffect(() => {
    fetchSessions();
    // Refresh sessions every 5 seconds
    const interval = setInterval(fetchSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (autoRefresh && selectedSession) {
      const interval = setInterval(() => {
        loadSessionEvents(selectedSession);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, selectedSession]);

  const loadSessionEvents = async (sessionId: string) => {
    setLoading(true);
    setSelectedSession(sessionId);
    
    try {
      const response = await fetch(`/api/admin/agent-diagnostics/sessions/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events);
      }
    } catch (error) {
      console.error('Failed to fetch session events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEventIcon = (category: string) => {
    switch (category) {
      case 'text':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'retry':
        return <RefreshCcw className="h-4 w-4 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const formatTimestamp = (ms: number) => {
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-2">
            <Bug className="w-8 h-8 text-yellow-600" />
            <h1 className="text-3xl font-bold">Agent Diagnostics</h1>
          </div>
          <p className="text-gray-600">Monitor and debug agent text response issues</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sessions List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">Recent Sessions</h2>
                <p className="text-sm text-gray-600">Click a session to view its diagnostic events</p>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  {sessions.map((session) => (
                    <div
                      key={session.sessionId}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedSession === session.sessionId 
                          ? 'bg-blue-50 border-blue-300' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => loadSessionEvents(session.sessionId)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-sm">{session.sessionId.substring(0, 8)}...</div>
                          <span className="inline-block px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded mt-1">
                            {session.agentType.replace('_', ' ')}
                          </span>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded ${getStatusColor(session.status)}`}>
                          {session.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mb-2">
                        {new Date(session.startTime).toLocaleString()}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-xs border rounded px-2 py-1">
                          <AlertTriangle className="h-3 w-3" />
                          {session.events.textOnly} text
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs border rounded px-2 py-1">
                          <RefreshCcw className="h-3 w-3" />
                          {session.events.retries} retries
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs border rounded px-2 py-1">
                          <CheckCircle className="h-3 w-3" />
                          {session.events.toolCalls} tools
                        </span>
                        {session.events.errors > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-800 rounded px-2 py-1">
                            <XCircle className="h-3 w-3" />
                            {session.events.errors} errors
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Events Timeline */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-semibold">Event Timeline</h2>
                    <p className="text-sm text-gray-600">
                      {selectedSession ? `Session: ${selectedSession}` : 'Select a session to view events'}
                    </p>
                  </div>
                  {selectedSession && (
                    <button
                      onClick={() => setAutoRefresh(!autoRefresh)}
                      className={`px-4 py-2 text-sm font-medium rounded-md ${
                        autoRefresh 
                          ? 'bg-blue-600 text-white hover:bg-blue-700' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      } transition-colors`}
                    >
                      <RefreshCcw className={`h-4 w-4 mr-1 inline ${autoRefresh ? 'animate-spin' : ''}`} />
                      Auto-refresh
                    </button>
                  )}
                </div>
              </div>
              <div className="p-4">
                {loading ? (
                  <div className="text-center py-8">Loading events...</div>
                ) : selectedSession ? (
                  <div className="space-y-2">
                    {events.map((event, index) => (
                      <div
                        key={index}
                        className="flex gap-3 p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-shrink-0 mt-1">
                          {getEventIcon(event.category)}
                        </div>
                        <div className="flex-grow">
                          <div className="flex justify-between items-start">
                            <div className="font-medium text-sm">{event.message}</div>
                            <div className="text-xs text-gray-500">
                              {formatTimestamp(event.timestamp)}
                            </div>
                          </div>
                          {event.details && (
                            <div className="mt-1 text-xs text-gray-600">
                              {event.details.content && (
                                <div className="bg-gray-100 p-2 rounded mt-1">
                                  "{event.details.content.substring(0, 100)}..."
                                </div>
                              )}
                              {event.details.toolName && (
                                <div>Tool: <code className="bg-gray-100 px-1 rounded">{event.details.toolName}</code></div>
                              )}
                              {event.details.nudgeType && (
                                <div>Expected tool: <code className="bg-gray-100 px-1 rounded">{event.details.nudgeType}</code></div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Select a session from the list to view diagnostic events
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Diagnostic Summary */}
        {selectedSession && events.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Diagnostic Summary</h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Session Metrics</h4>
                  <div className="text-sm space-y-1">
                    <div>Text responses detected: <strong>{events.filter(e => e.category === 'text').length}</strong></div>
                    <div>Retry attempts made: <strong>{events.filter(e => e.category === 'retry').length}</strong></div>
                    <div>Tool calls successful: <strong>{events.filter(e => e.category === 'success').length}</strong></div>
                    <div>Errors encountered: <strong>{events.filter(e => e.category === 'error').length}</strong></div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Common Patterns</h4>
                  <ul className="text-sm space-y-1">
                    {events.filter(e => e.category === 'text').length > 0 && (
                      <li className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        Agent outputs text instead of using tools
                      </li>
                    )}
                    {events.filter(e => e.category === 'retry').length > 0 && (
                      <li className="flex items-center gap-2">
                        <RefreshCcw className="h-4 w-4 text-yellow-500" />
                        Retry nudges needed to correct behavior
                      </li>
                    )}
                    {events.filter(e => e.category === 'error').length > 0 && (
                      <li className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        Errors occurred during execution
                      </li>
                    )}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Recommendations</h4>
                  <ul className="text-sm space-y-1">
                    {events.filter(e => e.category === 'text').length > 2 && (
                      <li>• Agent instructions may need stronger tool emphasis</li>
                    )}
                    {events.filter(e => e.category === 'retry').length > 2 && (
                      <li>• Consider more specific retry nudges</li>
                    )}
                    {events.filter(e => e.category === 'error').length > 0 && (
                      <li>• Review error patterns for root causes</li>
                    )}
                    <li>• Monitor retry success rates</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}