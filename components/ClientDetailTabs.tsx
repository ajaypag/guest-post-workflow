'use client';

import { FC } from 'react';
import { Activity, Target, ShoppingCart, Brain, Settings, BarChart2 } from 'lucide-react';

interface Tab {
  id: 'overview' | 'pages' | 'orders' | 'brand' | 'settings' | 'bulk-analysis';
  label: string;
  icon: FC<{ className?: string }>;
  badge?: number | string;
  internalOnly?: boolean;
}

interface ClientDetailTabsProps {
  activeTab: 'overview' | 'pages' | 'orders' | 'brand' | 'settings' | 'bulk-analysis';
  onTabChange: (tab: 'overview' | 'pages' | 'orders' | 'brand' | 'settings' | 'bulk-analysis') => void;
  stats?: {
    total: number;
    active: number;
    inactive: number;
    completed: number;
  };
  userType: string;
}

export function ClientDetailTabs({ 
  activeTab, 
  onTabChange, 
  stats,
  userType 
}: ClientDetailTabsProps) {
  const tabs: Tab[] = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'pages', label: 'Target Pages', icon: Target, badge: stats?.total },
    { id: 'bulk-analysis', label: 'Bulk Analysis', icon: BarChart2 },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'brand', label: 'Brand & Content', icon: Brain },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const visibleTabs = tabs.filter(tab => !tab.internalOnly || userType === 'internal');

  return (
    <div className="bg-white rounded-lg shadow mb-6">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6 px-6 overflow-x-auto" aria-label="Tabs">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                  {tab.badge !== undefined && (
                    <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                      {tab.badge}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}