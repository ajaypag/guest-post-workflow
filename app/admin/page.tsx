'use client';

import React from 'react';
import { Database, Activity, Wrench, Users, BarChart3, Settings, AlertTriangle, Bug, FileSearch, Search } from 'lucide-react';

export default function AdminDashboard() {
  const adminTools = [
    {
      title: 'Database Migration',
      description: 'Manage database tables and migrations for agentic features',
      icon: Database,
      href: '/admin/database-migration',
      color: 'bg-blue-50 border-blue-200 text-blue-700',
      iconColor: 'text-blue-600'
    },
    {
      title: 'Bulk URL Migration',
      description: 'Manage orphan URL support for bulk URL management feature',
      icon: Database,
      href: '/admin/bulk-url-migration',
      color: 'bg-indigo-50 border-indigo-200 text-indigo-700',
      iconColor: 'text-indigo-600'
    },
    {
      title: 'DataForSEO Migration',
      description: 'Manage database migration for DataForSEO integration and keyword analysis',
      icon: Search,
      href: '/admin/dataforseo-migration',
      color: 'bg-blue-50 border-blue-200 text-blue-700',
      iconColor: 'text-blue-600'
    },
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
      title: 'Column Size Checker',
      description: 'Check VARCHAR column sizes for potential data truncation',
      icon: Database,
      href: '/admin/column-check',
      color: 'bg-purple-50 border-purple-200 text-purple-700',
      iconColor: 'text-purple-600'
    },
    {
      title: 'Fix Formatting QA',
      description: 'Diagnose and fix formatting QA column size issues',
      icon: Wrench,
      href: '/admin/fix-formatting-qa',
      color: 'bg-orange-50 border-orange-200 text-orange-700',
      iconColor: 'text-orange-600'
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
      title: 'Fix Outline Generation',
      description: 'Diagnose and fix outline generation issues',
      icon: Wrench,
      href: '/admin/fix-outline-generation',
      color: 'bg-pink-50 border-pink-200 text-pink-700',
      iconColor: 'text-pink-600'
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
      title: 'User Management',
      description: 'Manage user accounts and permissions',
      icon: Users,
      href: '/admin/users',
      color: 'bg-indigo-50 border-indigo-200 text-indigo-700',
      iconColor: 'text-indigo-600'
    },
    {
      title: 'Analytics',
      description: 'View system usage and performance analytics',
      icon: BarChart3,
      href: '/admin/analytics',
      color: 'bg-teal-50 border-teal-200 text-teal-700',
      iconColor: 'text-teal-600'
    },
    {
      title: 'o3 Response Analyzer',
      description: 'Analyze o3-deep-research responses to fix parsing issues',
      icon: FileSearch,
      href: '/admin/o3-response-analyzer',
      color: 'bg-purple-50 border-purple-200 text-purple-700',
      iconColor: 'text-purple-600'
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
                <h3 className="text-sm font-semibold text-yellow-800">Admin Tools Overview</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  These tools are designed for database management and system diagnostics. 
                  All agentic features require proper database tables to function correctly.
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
              <h3 className="font-semibold text-gray-900 mb-2">Quick Reference</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <strong>Database Migration:</strong> Check/Create/Remove tables for agentic features
                </div>
                <div>
                  <strong>Diagnostics:</strong> Comprehensive system health analysis
                </div>
                <div>
                  <strong>Column Check:</strong> Verify VARCHAR column sizes across all tables
                </div>
                <div>
                  <strong>Fix Formatting QA:</strong> Resolve specific formatting QA issues
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}