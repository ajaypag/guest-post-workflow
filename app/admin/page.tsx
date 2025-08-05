'use client';

import React from 'react';
import { Database, Activity, Wrench, Users, BarChart3, Settings, AlertTriangle, Bug, FileSearch, Search, Mail, MessageSquare } from 'lucide-react';

export default function AdminDashboard() {
  const adminTools = [
    // Active Monitoring & Diagnostics
    {
      title: 'Diagnostics',
      description: 'Run comprehensive system diagnostics and health checks',
      icon: Activity,
      href: '/admin/diagnostics',
      color: 'bg-green-50 border-green-200 text-green-700',
      iconColor: 'text-green-600'
    },
    {
      title: 'Agent Diagnostics',
      description: 'Monitor and debug agent text response issues in real-time',
      icon: Bug,
      href: '/admin/agent-diagnostics',
      color: 'bg-yellow-50 border-yellow-200 text-yellow-700',
      iconColor: 'text-yellow-600'
    },
    {
      title: 'Outline Generation Health',
      description: 'Check AI outline generation system health and status',
      icon: Activity,
      href: '/admin/outline-generation-health',
      color: 'bg-purple-50 border-purple-200 text-purple-700',
      iconColor: 'text-purple-600'
    },
    {
      title: 'Outline Generation Diagnostics',
      description: 'Advanced diagnostics for agent handoff and type mismatch issues',
      icon: AlertTriangle,
      href: '/admin/outline-generation-diagnostics',
      color: 'bg-red-50 border-red-200 text-red-700',
      iconColor: 'text-red-600'
    },
    {
      title: 'O3 Deep Research Diagnostics',
      description: 'Diagnose o3-deep-research API issues and manage failed sessions',
      icon: AlertTriangle,
      href: '/admin/o3-deep-research-diagnostics',
      color: 'bg-red-50 border-red-200 text-red-700',
      iconColor: 'text-red-600'
    },
    {
      title: 'Streaming Diagnostics',
      description: 'Monitor streaming outline generation health and performance',
      icon: Activity,
      href: '/admin/streaming-diagnostics',
      color: 'bg-cyan-50 border-cyan-200 text-cyan-700',
      iconColor: 'text-cyan-600'
    },
    {
      title: 'Polish Health Check',
      description: 'Monitor content polishing service health and performance',
      icon: Activity,
      href: '/admin/polish-health',
      color: 'bg-indigo-50 border-indigo-200 text-indigo-700',
      iconColor: 'text-indigo-600'
    },
    {
      title: 'Link Orchestration Diagnostics',
      description: 'Monitor and debug link orchestration service',
      icon: Activity,
      href: '/admin/link-orchestration-diagnostics',
      color: 'bg-violet-50 border-violet-200 text-violet-700',
      iconColor: 'text-violet-600'
    },
    
    // Order Management Diagnostics
    {
      title: 'Order Flow Diagnostics',
      description: 'Debug order creation and flow issues',
      icon: Bug,
      href: '/admin/order-flow-diagnostics',
      color: 'bg-orange-50 border-orange-200 text-orange-700',
      iconColor: 'text-orange-600'
    },
    {
      title: 'Order Project Diagnostics',
      description: 'Analyze order and project relationships',
      icon: FileSearch,
      href: '/admin/order-project-diagnostics',
      color: 'bg-amber-50 border-amber-200 text-amber-700',
      iconColor: 'text-amber-600'
    },
    {
      title: 'Order Status Diagnostics',
      description: 'Check order status and group integrity',
      icon: Activity,
      href: '/admin/order-status-diagnostics',
      color: 'bg-lime-50 border-lime-200 text-lime-700',
      iconColor: 'text-lime-600'
    },
    
    // User & Account Management
    {
      title: 'User Management',
      description: 'Manage users, permissions, and send invitations',
      icon: Users,
      href: '/admin/users',
      color: 'bg-indigo-50 border-indigo-200 text-indigo-700',
      iconColor: 'text-indigo-600'
    },
    {
      title: 'Account Invitations',
      description: 'Manage account invitations and access',
      icon: Mail,
      href: '/admin/account-invitations',
      color: 'bg-blue-50 border-blue-200 text-blue-700',
      iconColor: 'text-blue-600'
    },
    {
      title: 'Debug Invitations',
      description: 'View all invitations in database for debugging',
      icon: Search,
      href: '/admin/debug-invitations',
      color: 'bg-purple-50 border-purple-200 text-purple-700',
      iconColor: 'text-purple-600'
    },
    {
      title: 'Debug Account Clients',
      description: 'Debug account and client relationships',
      icon: Bug,
      href: '/admin/debug-account-clients',
      color: 'bg-rose-50 border-rose-200 text-rose-700',
      iconColor: 'text-rose-600'
    },
    {
      title: 'Create System User',
      description: 'Create internal system users for automation',
      icon: Users,
      href: '/admin/create-system-user',
      color: 'bg-teal-50 border-teal-200 text-teal-700',
      iconColor: 'text-teal-600'
    },
    
    // External Integrations
    {
      title: 'Airtable Sync',
      description: 'Sync websites from Airtable to local database',
      icon: Database,
      href: '/admin/airtable-sync',
      color: 'bg-indigo-50 border-indigo-200 text-indigo-700',
      iconColor: 'text-indigo-600'
    },
    {
      title: 'Chatwoot Integration',
      description: 'Sync PostFlow contacts and orders with Chatwoot for customer support',
      icon: MessageSquare,
      href: '/admin/chatwoot-sync',
      color: 'bg-blue-50 border-blue-200 text-blue-700',
      iconColor: 'text-blue-600'
    },
    {
      title: 'Chatwoot Email Test',
      description: 'Test Chatwoot email sending and status tracking functionality',
      icon: Mail,
      href: '/admin/chatwoot-test',
      color: 'bg-purple-50 border-purple-200 text-purple-700',
      iconColor: 'text-purple-600'
    },
    
    // Email & Analytics
    {
      title: 'Email Management',
      description: 'Monitor email communications, view logs, and send test emails',
      icon: Mail,
      href: '/admin/email',
      color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      iconColor: 'text-emerald-600'
    },
    {
      title: 'Analytics',
      description: 'View system usage and performance analytics',
      icon: BarChart3,
      href: '/admin/analytics',
      color: 'bg-teal-50 border-teal-200 text-teal-700',
      iconColor: 'text-teal-600'
    },
    
    // DataForSEO Monitoring
    {
      title: 'DataForSEO Monitoring',
      description: 'Monitor API calls, analyze keyword filtering patterns, and debug issues',
      icon: Search,
      href: '/admin/dataforseo-monitoring',
      color: 'bg-orange-50 border-orange-200 text-orange-700',
      iconColor: 'text-orange-600'
    },
    {
      title: 'DataForSEO Audit',
      description: 'Audit API task IDs, view errors, track costs and success rates',
      icon: FileSearch,
      href: '/admin/dataforseo-audit',
      color: 'bg-amber-50 border-amber-200 text-amber-700',
      iconColor: 'text-amber-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Settings className="w-8 h-8 text-gray-600" />
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          </div>

          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-yellow-800">Admin Tools</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  These tools are for system monitoring, diagnostics, and management. 
                  Access is restricted to internal users only.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adminTools.map((tool) => (
              <a
                key={tool.href}
                href={tool.href}
                className={`block p-6 rounded-lg border-2 transition-all hover:shadow-md ${tool.color} hover:scale-105`}
              >
                <div className="flex items-center space-x-3 mb-3">
                  <tool.icon className={`w-6 h-6 ${tool.iconColor}`} />
                  <h3 className="text-lg font-semibold">{tool.title}</h3>
                </div>
                <p className="text-sm opacity-90">{tool.description}</p>
              </a>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Tool Categories</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <strong>Monitoring & Diagnostics:</strong> System health and performance monitoring
                </div>
                <div>
                  <strong>User Management:</strong> User accounts, permissions, and invitations
                </div>
                <div>
                  <strong>External Integrations:</strong> Airtable, Chatwoot, and email services
                </div>
                <div>
                  <strong>Analytics & Audit:</strong> Usage tracking and API monitoring
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> All admin endpoints require authentication. 
              If you encounter any 404 errors, those tools have been deprecated and removed for security.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}