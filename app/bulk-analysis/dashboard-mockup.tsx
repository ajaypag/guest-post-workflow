'use client';

import { Building2, Users, FolderOpen, Search, TrendingUp, Clock, ArrowRight, Plus, Filter } from 'lucide-react';

// This is a mockup/preview of the new bulk analysis dashboard
export default function BulkAnalysisDashboardMockup() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Bulk Analysis Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage prospects and clients, track bulk analysis projects</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Prospects</p>
                <p className="text-2xl font-bold text-gray-900">12</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Clients</p>
                <p className="text-2xl font-bold text-gray-900">28</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Projects</p>
                <p className="text-2xl font-bold text-gray-900">45</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <FolderOpen className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Domains Analyzed</p>
                <p className="text-2xl font-bold text-gray-900">1,247</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Search className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* View Toggle and Actions */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <div className="bg-white rounded-lg p-1 flex border border-gray-200">
              <button className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded">
                All
              </button>
              <button className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded">
                Prospects (12)
              </button>
              <button className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded">
                Clients (28)
              </button>
            </div>
            <button className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900">
              <Filter className="w-4 h-4 mr-2" />
              More Filters
            </button>
          </div>
          <div className="flex space-x-3">
            <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              New Prospect
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              New Client
            </button>
          </div>
        </div>

        {/* Prospects Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Active Prospects</h2>
            <span className="text-sm text-gray-500">Sorted by last activity</span>
          </div>
          <div className="grid grid-cols-3 gap-6">
            {/* Prospect Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">TechStartup Inc</h3>
                  <p className="text-sm text-gray-500">techstartup.com</p>
                </div>
                <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                  Prospect
                </span>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Projects</span>
                  <span className="font-medium">2 active</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Domains Analyzed</span>
                  <span className="font-medium">47</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Last Activity</span>
                  <span className="font-medium">2 hours ago</span>
                </div>
              </div>
              <div className="flex space-x-2">
                <button className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                  View Projects
                </button>
                <button className="px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center">
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* More prospect cards... */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow opacity-60">
              <div className="h-32"></div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow opacity-60">
              <div className="h-32"></div>
            </div>
          </div>
        </div>

        {/* Clients Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Your Clients</h2>
            <span className="text-sm text-gray-500">Showing assigned clients</span>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Projects</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Workflows</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Activity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">Enterprise Corp</div>
                      <div className="text-sm text-gray-500">enterprise.com</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900">5 active</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900">12 total</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex -space-x-2">
                      <div className="w-8 h-8 bg-blue-500 rounded-full border-2 border-white"></div>
                      <div className="w-8 h-8 bg-green-500 rounded-full border-2 border-white"></div>
                      <div className="w-8 h-8 bg-purple-500 rounded-full border-2 border-white"></div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">1 hour ago</span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-sm text-blue-600 hover:text-blue-800">
                      Bulk Analysis →
                    </button>
                  </td>
                </tr>
                {/* More client rows... */}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}