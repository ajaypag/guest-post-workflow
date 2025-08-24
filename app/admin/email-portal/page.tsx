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
  RefreshCw,
  Eye,
  TestTube,
  Layers,
  FileText,
  Search,
  Filter,
  Download,
  Calendar,
  Code,
  Zap,
  Settings,
  BarChart3,
  Database
} from 'lucide-react';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { format } from 'date-fns';

interface EmailTemplate {
  name: string;
  fileName: string;
  description: string;
  emailType: string;
  variables: string[];
  triggers: string[];
  status: 'active' | 'draft' | 'deprecated';
  lastModified?: string;
  usage?: number;
}

interface EmailLog {
  id: string;
  type: string;
  to: string[];
  subject: string;
  status: 'sent' | 'failed' | 'queued';
  sentAt?: string;
  error?: string;
  resendId?: string;
  metadata?: any;
}

interface EmailStats {
  total: number;
  sent: number;
  failed: number;
  queued: number;
  byType: Record<string, { sent: number; failed: number }>;
  dailyStats: Array<{ date: string; sent: number; failed: number }>;
  recentActivity: Array<{
    time: string;
    type: string;
    status: string;
    recipient: string;
  }>;
}

interface EmailTrigger {
  id: string;
  name: string;
  description: string;
  endpoint?: string;
  emailType: string;
  active: boolean;
  lastTriggered?: string;
  triggerCount: number;
}

export default function EmailPortal() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'templates' | 'logs' | 'triggers' | 'test' | 'settings'>('overview');
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);

  // Email templates configuration
  const emailTemplates: EmailTemplate[] = [
    {
      name: 'Sites Ready for Review',
      fileName: 'SitesReadyForReviewEmail.tsx',
      description: 'Sent when internal user marks sites as ready for client review',
      emailType: 'sites_ready',
      variables: ['recipientName', 'companyName', 'orderNumber', 'sites', 'reviewUrl'],
      triggers: ['POST /api/orders/[id]/update-state (state=sites_ready)'],
      status: 'active',
      lastModified: '2025-08-22',
      usage: 0
    },
    {
      name: 'Workflows Generated',
      fileName: 'WorkflowsGeneratedEmail.tsx',
      description: 'Sent when workflows are created for an order',
      emailType: 'workflows_generated',
      variables: ['recipientName', 'orderNumber', 'workflowCount', 'sites', 'dashboardUrl'],
      triggers: ['POST /api/orders/[id]/generate-workflows'],
      status: 'active',
      lastModified: '2025-08-22',
      usage: 0
    },
    {
      name: 'Welcome Email',
      fileName: 'WelcomeEmail.tsx',
      description: 'Sent to new users after signup',
      emailType: 'welcome',
      variables: ['userName', 'activationUrl'],
      triggers: ['Account creation', 'Manual send'],
      status: 'active',
      usage: 145
    },
    {
      name: 'Workflow Completed',
      fileName: 'WorkflowCompletedEmail.tsx',
      description: 'Sent when a workflow reaches 100% completion',
      emailType: 'workflow-completed',
      variables: ['userName', 'workflowName', 'clientName', 'completedSteps', 'viewUrl'],
      triggers: ['Workflow completion'],
      status: 'active',
      usage: 89
    },
    {
      name: 'Contact Outreach',
      fileName: 'ContactOutreachEmail.tsx',
      description: 'Used for outreach to publishers and contacts',
      emailType: 'contact-outreach',
      variables: ['contactName', 'message', 'senderName'],
      triggers: ['Manual send', 'Bulk campaigns'],
      status: 'active',
      usage: 234
    },
    {
      name: 'Invitation Email',
      fileName: 'InvitationEmail.tsx',
      description: 'Sent when inviting users to join the platform',
      emailType: 'invitation',
      variables: ['inviteeEmail', 'inviterName', 'invitationUrl', 'expiresAt'],
      triggers: ['Admin invitation', 'Account invitation'],
      status: 'active',
      usage: 67
    }
  ];

  // Email triggers/automation
  const emailTriggers: EmailTrigger[] = [
    {
      id: '1',
      name: 'Sites Ready Notification',
      description: 'Automatically sends email when order state changes to sites_ready',
      endpoint: '/api/orders/[id]/update-state',
      emailType: 'sites_ready',
      active: true,
      lastTriggered: '2025-08-22T14:30:00Z',
      triggerCount: 12
    },
    {
      id: '2',
      name: 'Workflow Generation Alert',
      description: 'Notifies client when workflows are generated for their order',
      endpoint: '/api/orders/[id]/generate-workflows',
      emailType: 'workflows_generated',
      active: true,
      lastTriggered: '2025-08-22T12:15:00Z',
      triggerCount: 8
    },
    {
      id: '3',
      name: 'Payment Success',
      description: 'Sends confirmation when payment is processed successfully',
      endpoint: '/api/payments/success',
      emailType: 'order_paid',
      active: true,
      triggerCount: 145
    },
    {
      id: '4',
      name: 'Welcome Series',
      description: 'Onboarding email sequence for new accounts',
      emailType: 'account_welcome',
      active: true,
      triggerCount: 89
    }
  ];

  // Load email statistics
  const loadStats = async () => {
    try {
      // Simulated stats for now - replace with actual API call
      setStats({
        total: 1234,
        sent: 1156,
        failed: 45,
        queued: 33,
        byType: {
          'sites_ready': { sent: 145, failed: 3 },
          'workflows_generated': { sent: 89, failed: 2 },
          'welcome': { sent: 234, failed: 5 },
          'notification': { sent: 456, failed: 12 },
          'invitation': { sent: 67, failed: 1 }
        },
        dailyStats: [
          { date: '2025-08-20', sent: 145, failed: 5 },
          { date: '2025-08-21', sent: 189, failed: 8 },
          { date: '2025-08-22', sent: 98, failed: 3 }
        ],
        recentActivity: [
          { time: '2 min ago', type: 'sites_ready', status: 'sent', recipient: 'client@example.com' },
          { time: '15 min ago', type: 'workflows_generated', status: 'sent', recipient: 'user@test.com' },
          { time: '1 hour ago', type: 'welcome', status: 'failed', recipient: 'new@user.com' }
        ]
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Sent</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.sent || 0}</p>
              <p className="text-xs text-green-600 mt-1">+12% from last week</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Failed</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.failed || 0}</p>
              <p className="text-xs text-red-600 mt-1">3.6% failure rate</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">In Queue</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.queued || 0}</p>
              <p className="text-xs text-yellow-600 mt-1">Processing...</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Templates</p>
              <p className="text-2xl font-bold text-gray-900">{emailTemplates.filter(t => t.status === 'active').length}</p>
              <p className="text-xs text-blue-600 mt-1">2 new this week</p>
            </div>
            <Layers className="w-8 h-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">Recent Email Activity</h3>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {stats?.recentActivity?.map((activity, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.status === 'sent' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activity.type}</p>
                    <p className="text-xs text-gray-500">To: {activity.recipient}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{activity.time}</p>
                  <p className={`text-xs font-medium ${
                    activity.status === 'sent' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {activity.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => setActiveTab('test')}
              className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <TestTube className="w-6 h-6 text-blue-600 mb-2" />
              <span className="text-sm font-medium">Test Email</span>
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FileText className="w-6 h-6 text-green-600 mb-2" />
              <span className="text-sm font-medium">View Logs</span>
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Code className="w-6 h-6 text-purple-600 mb-2" />
              <span className="text-sm font-medium">Templates</span>
            </button>
            <button
              onClick={() => setActiveTab('triggers')}
              className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Zap className="w-6 h-6 text-orange-600 mb-2" />
              <span className="text-sm font-medium">Automations</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTemplates = () => (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="deprecated">Deprecated</option>
          </select>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {emailTemplates
          .filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
          .map((template, idx) => (
          <div key={idx} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <h3 className="font-medium text-gray-900">{template.name}</h3>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  template.status === 'active' 
                    ? 'bg-green-100 text-green-800'
                    : template.status === 'draft'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {template.status}
                </span>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">{template.description}</p>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-xs text-gray-500">
                  <Code className="w-3 h-3 mr-1" />
                  <span className="font-mono">{template.fileName}</span>
                </div>
                <div className="flex items-center text-xs text-gray-500">
                  <Zap className="w-3 h-3 mr-1" />
                  <span>Type: {template.emailType}</span>
                </div>
                {template.usage !== undefined && (
                  <div className="flex items-center text-xs text-gray-500">
                    <BarChart3 className="w-3 h-3 mr-1" />
                    <span>Sent: {template.usage} times</span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t">
                <div className="mb-2">
                  <p className="text-xs font-medium text-gray-700 mb-1">Triggers:</p>
                  <div className="flex flex-wrap gap-1">
                    {template.triggers.map((trigger, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-100 text-xs rounded">
                        {trigger}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <button
                  onClick={() => {
                    setSelectedTemplate(template);
                    setShowTemplatePreview(true);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  View Details →
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600">
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add New Template Button */}
      <div className="fixed bottom-8 right-8">
        <button className="bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
          <Mail className="w-5 h-5" />
          <span>New Template</span>
        </button>
      </div>
    </div>
  );

  const renderTriggers = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">Email Automation Triggers</h3>
          <p className="text-sm text-gray-500 mt-1">Configure when emails are automatically sent</p>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {emailTriggers.map((trigger) => (
              <div key={trigger.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-medium text-gray-900">{trigger.name}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        trigger.active 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {trigger.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{trigger.description}</p>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      {trigger.endpoint && (
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                          {trigger.endpoint}
                        </span>
                      )}
                      <span>Email Type: {trigger.emailType}</span>
                      <span>Triggered: {trigger.triggerCount} times</span>
                      {trigger.lastTriggered && (
                        <span>Last: {new Date(trigger.lastTriggered).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="ml-4">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={trigger.active}
                        onChange={() => {}}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderTestSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">Test Email Templates</h3>
          <p className="text-sm text-gray-500 mt-1">Send test emails to verify templates are working</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Template Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Template
              </label>
              <select 
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => {
                  const template = emailTemplates.find(t => t.emailType === e.target.value);
                  if (template) setSelectedTemplate(template);
                }}
              >
                <option value="">Choose a template...</option>
                {emailTemplates.map((template) => (
                  <option key={template.emailType} value={template.emailType}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Recipient */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Email
              </label>
              <input
                type="email"
                placeholder="test@example.com"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Test Data */}
          {selectedTemplate && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template Variables
              </label>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-3">
                  {selectedTemplate.variables.map((variable) => (
                    <div key={variable}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {variable}
                      </label>
                      <input
                        type="text"
                        placeholder={`Enter ${variable}`}
                        className="w-full px-3 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Send Button */}
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                <Send className="w-4 h-4" />
                <span>Send Test Email</span>
              </button>
              <button className="text-gray-600 hover:text-gray-800">
                Preview HTML
              </button>
            </div>
            
            {/* Test Links */}
            <div className="text-sm text-gray-500">
              Quick test: 
              <Link href="/api/test/sites-ready-email" className="text-blue-600 hover:underline ml-2">
                Sites Ready
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Tests */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">Recent Test Emails</h3>
        </div>
        <div className="p-6">
          <div className="text-sm text-gray-500 text-center py-8">
            No recent test emails. Send a test email to see results here.
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <AuthWrapper requireAdmin={true}>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link
                  href="/admin"
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Email Management Portal</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Manage email templates, logs, automations, and testing
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-500 hover:text-gray-700">
                  <RefreshCw className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-500 hover:text-gray-700">
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="border-b">
              <nav className="flex -mb-px">
                {[
                  { id: 'overview', label: 'Overview', icon: BarChart3 },
                  { id: 'templates', label: 'Templates', icon: Layers },
                  { id: 'logs', label: 'Email Logs', icon: FileText },
                  { id: 'triggers', label: 'Automations', icon: Zap },
                  { id: 'test', label: 'Test Center', icon: TestTube },
                  { id: 'settings', label: 'Settings', icon: Settings },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`
                        flex items-center space-x-2 px-6 py-3 border-b-2 font-medium text-sm transition-colors
                        ${activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }
                      `}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : (
            <>
              {activeTab === 'overview' && renderOverview()}
              {activeTab === 'templates' && renderTemplates()}
              {activeTab === 'triggers' && renderTriggers()}
              {activeTab === 'test' && renderTestSection()}
              {activeTab === 'logs' && (
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-gray-500">
                    Email logs interface - View the existing{' '}
                    <Link href="/admin/email" className="text-blue-600 hover:underline">
                      email logs page
                    </Link>
                  </p>
                </div>
              )}
              {activeTab === 'settings' && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Email Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Resend API Status
                      </label>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">Not configured</span>
                        <Link href="/api/email/test-config" className="text-blue-600 hover:underline text-sm ml-4">
                          Test Configuration
                        </Link>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Default From Email
                      </label>
                      <input
                        type="email"
                        value="info@linkio.com"
                        readOnly
                        className="w-full max-w-md px-4 py-2 border rounded-lg bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reply-To Email
                      </label>
                      <input
                        type="email"
                        value="info@linkio.com"
                        readOnly
                        className="w-full max-w-md px-4 py-2 border rounded-lg bg-gray-50"
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Template Preview Modal */}
          {showTemplatePreview && selectedTemplate && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">{selectedTemplate.name}</h3>
                  <button
                    onClick={() => setShowTemplatePreview(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Description</h4>
                      <p className="text-sm text-gray-600">{selectedTemplate.description}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">File Location</h4>
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                        lib/email/templates/{selectedTemplate.fileName}
                      </code>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Variables</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedTemplate.variables.map((v) => (
                          <span key={v} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            {v}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Triggers</h4>
                      <ul className="list-disc list-inside text-sm text-gray-600">
                        {selectedTemplate.triggers.map((t, i) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthWrapper>
  );
}