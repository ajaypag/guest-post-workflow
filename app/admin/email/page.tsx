'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Mail, 
  Send, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  Users,
  Activity,
  RefreshCw
} from 'lucide-react';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { format } from 'date-fns';

interface EmailLog {
  id: string;
  type: string;
  to: string[];
  subject: string;
  status: 'sent' | 'failed' | 'queued';
  sentAt?: string;
  error?: string;
  resendId?: string;
}

interface EmailStats {
  total: number;
  sent: number;
  failed: number;
  byType: Record<string, { sent: number; failed: number }>;
  dailyStats: Array<{ date: string; sent: number; failed: number }>;
}

export default function EmailManagement() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'logs' | 'stats' | 'test'>('logs');
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    recipient: '',
  });
  
  // Test email form
  const [testEmail, setTestEmail] = useState<{
    type: string;
    recipient: string;
    data: Record<string, any>;
  }>({
    type: 'welcome',
    recipient: '',
    data: {},
  });
  const [sending, setSending] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load email logs
  const loadLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.status) params.append('status', filters.status);
      if (filters.recipient) params.append('recipient', filters.recipient);
      
      const response = await fetch(`/api/email/logs?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
      }
    } catch (error) {
      console.error('Failed to load email logs:', error);
    }
  };

  // Load email statistics
  const loadStats = async () => {
    try {
      const response = await fetch('/api/email/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.statistics);
      }
    } catch (error) {
      console.error('Failed to load email stats:', error);
    }
  };

  useEffect(() => {
    setLoading(true);
    if (activeTab === 'logs') {
      loadLogs();
    } else if (activeTab === 'stats') {
      loadStats();
    }
    setLoading(false);
  }, [activeTab, filters]);

  // Send test email
  const sendTestEmail = async () => {
    setSending(true);
    setTestResult(null);
    
    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testEmail),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setTestResult({ success: true, message: 'Test email sent successfully!' });
        setTestEmail({ type: 'welcome', recipient: '', data: {} });
      } else {
        setTestResult({ success: false, message: data.error || 'Failed to send email' });
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Network error' });
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Sent</span>;
      case 'failed':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Failed</span>;
      case 'queued':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">Queued</span>;
      default:
        return null;
    }
  };

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/admin"
                className="inline-flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Admin
              </Link>
            </div>
          </div>

          {/* Header */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Mail className="w-6 h-6 mr-3" />
                  Email Management
                </h1>
                <p className="text-gray-600 mt-1">Monitor and manage email communications</p>
              </div>
              
              {stats && (
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                    <div className="text-sm text-gray-600">Total Emails</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
                    <div className="text-sm text-gray-600">Sent</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                    <div className="text-sm text-gray-600">Failed</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('logs')}
                  className={`py-3 px-6 text-sm font-medium ${
                    activeTab === 'logs'
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Email Logs
                </button>
                <button
                  onClick={() => setActiveTab('stats')}
                  className={`py-3 px-6 text-sm font-medium ${
                    activeTab === 'stats'
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Statistics
                </button>
                <button
                  onClick={() => setActiveTab('test')}
                  className={`py-3 px-6 text-sm font-medium ${
                    activeTab === 'test'
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Send Test Email
                </button>
              </nav>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading...</p>
                </div>
              ) : (
                <>
                  {/* Email Logs Tab */}
                  {activeTab === 'logs' && (
                    <div>
                      {/* Filters */}
                      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <select
                          value={filters.type}
                          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">All Types</option>
                          <option value="welcome">Welcome</option>
                          <option value="workflow-completed">Workflow Completed</option>
                          <option value="contact-outreach">Contact Outreach</option>
                          <option value="notification">Notification</option>
                        </select>
                        
                        <select
                          value={filters.status}
                          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">All Status</option>
                          <option value="sent">Sent</option>
                          <option value="failed">Failed</option>
                          <option value="queued">Queued</option>
                        </select>
                        
                        <input
                          type="email"
                          placeholder="Filter by recipient..."
                          value={filters.recipient}
                          onChange={(e) => setFilters({ ...filters, recipient: e.target.value })}
                          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        
                        <button
                          onClick={loadLogs}
                          className="flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Refresh
                        </button>
                      </div>

                      {/* Logs Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipient</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sent At</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {logs.map((log) => (
                              <tr key={log.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm">{log.type}</td>
                                <td className="px-4 py-3 text-sm">{log.to.join(', ')}</td>
                                <td className="px-4 py-3 text-sm">{log.subject}</td>
                                <td className="px-4 py-3">{getStatusBadge(log.status)}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {log.sentAt ? format(new Date(log.sentAt), 'PPp') : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Statistics Tab */}
                  {activeTab === 'stats' && stats && (
                    <div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {/* Email Types Chart */}
                        <div className="bg-gray-50 rounded-lg p-6">
                          <h3 className="text-lg font-semibold mb-4">Email Types</h3>
                          <div className="space-y-3">
                            {Object.entries(stats.byType).map(([type, data]) => (
                              <div key={type}>
                                <div className="flex justify-between mb-1">
                                  <span className="text-sm font-medium">{type}</span>
                                  <span className="text-sm text-gray-600">
                                    {data.sent} sent / {data.failed} failed
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{ width: `${(data.sent / (data.sent + data.failed)) * 100}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Daily Stats */}
                        <div className="bg-gray-50 rounded-lg p-6">
                          <h3 className="text-lg font-semibold mb-4">Daily Activity</h3>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {stats.dailyStats.map((day) => (
                              <div key={day.date} className="flex justify-between py-2 border-b">
                                <span className="text-sm">{day.date}</span>
                                <div className="flex items-center space-x-4">
                                  <span className="text-sm text-green-600">{day.sent} sent</span>
                                  <span className="text-sm text-red-600">{day.failed} failed</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Test Email Tab */}
                  {activeTab === 'test' && (
                    <div className="max-w-2xl">
                      <h3 className="text-lg font-semibold mb-4">Send Test Email</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email Type
                          </label>
                          <select
                            value={testEmail.type}
                            onChange={(e) => setTestEmail({ ...testEmail, type: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="welcome">Welcome Email</option>
                            <option value="workflow-completed">Workflow Completed</option>
                            <option value="custom">Custom Email</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Recipient Email
                          </label>
                          <input
                            type="email"
                            value={testEmail.recipient}
                            onChange={(e) => setTestEmail({ ...testEmail, recipient: e.target.value })}
                            placeholder="test@example.com"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        {testEmail.type === 'welcome' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              User Name
                            </label>
                            <input
                              type="text"
                              value={testEmail.data.userName || ''}
                              onChange={(e) => setTestEmail({
                                ...testEmail,
                                data: { ...testEmail.data, userName: e.target.value }
                              })}
                              placeholder="John Doe"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        )}

                        <button
                          onClick={sendTestEmail}
                          disabled={sending || !testEmail.recipient}
                          className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          {sending ? (
                            <>
                              <Clock className="w-4 h-4 mr-2 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Send Test Email
                            </>
                          )}
                        </button>

                        {testResult && (
                          <div className={`p-4 rounded-lg flex items-center ${
                            testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                          }`}>
                            {testResult.success ? (
                              <CheckCircle className="w-5 h-5 mr-2" />
                            ) : (
                              <AlertCircle className="w-5 h-5 mr-2" />
                            )}
                            {testResult.message}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}