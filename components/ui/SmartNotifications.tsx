'use client';

import React from 'react';
import { AlertTriangle, FileText, Tag, Brain, ArrowRight } from 'lucide-react';

interface SmartNotificationsProps {
  client: any;
  onGenerateKeywords?: () => void;
  onGenerateDescriptions?: () => void;
  onGenerateBrandIntelligence?: () => void;
  onGoToPages?: () => void;
  canUseAI?: {
    keywords: boolean;
    descriptions: boolean;
    brandIntelligence: boolean;
  };
}

export const SmartNotifications = ({
  client,
  onGenerateKeywords,
  onGenerateDescriptions,
  onGenerateBrandIntelligence,
  onGoToPages,
  canUseAI = { keywords: false, descriptions: false, brandIntelligence: false }
}: SmartNotificationsProps) => {
  if (!client?.targetPages) return null;

  const pages = client.targetPages;
  const pagesWithoutKeywords = pages.filter((page: any) => !page.keywords || page.keywords.trim() === '');
  const pagesWithoutDescriptions = pages.filter((page: any) => !page.description || page.description.trim() === '');
  const hasBrandIntelligence = client.brandIntelligence && client.brandIntelligence.trim() !== '';

  const notifications = [];

  // Missing Keywords Alert
  if (pagesWithoutKeywords.length > 0 && canUseAI.keywords) {
    notifications.push({
      id: 'missing-keywords',
      type: 'warning',
      icon: Tag,
      title: `${pagesWithoutKeywords.length} pages missing keywords`,
      description: `Generate AI keywords for ${pagesWithoutKeywords.length} target pages to improve targeting`,
      action: {
        label: 'Generate Keywords',
        onClick: onGenerateKeywords
      },
      secondary: {
        label: 'View Pages',
        onClick: onGoToPages
      }
    });
  }

  // Missing Descriptions Alert
  if (pagesWithoutDescriptions.length > 0 && canUseAI.descriptions) {
    notifications.push({
      id: 'missing-descriptions',
      type: 'warning',
      icon: FileText,
      title: `${pagesWithoutDescriptions.length} pages missing descriptions`,
      description: `Generate AI descriptions for ${pagesWithoutDescriptions.length} target pages to improve context`,
      action: {
        label: 'Generate Descriptions',
        onClick: onGenerateDescriptions
      },
      secondary: {
        label: 'View Pages',
        onClick: onGoToPages
      }
    });
  }

  // Missing Brand Intelligence Alert
  if (!hasBrandIntelligence && canUseAI.brandIntelligence) {
    notifications.push({
      id: 'missing-brand-intelligence',
      type: 'info',
      icon: Brain,
      title: 'Brand intelligence not generated',
      description: 'Generate AI brand intelligence to understand client positioning and messaging',
      action: {
        label: 'Generate Brand Intelligence',
        onClick: onGenerateBrandIntelligence
      }
    });
  }

  // If no missing data, don't render
  if (notifications.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <div className="flex items-center space-x-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-orange-500" />
        <h3 className="text-lg font-semibold text-gray-900">Smart Notifications</h3>
        <span className="text-sm text-gray-500">Missing Data Alerts</span>
      </div>

      <div className="space-y-3">
        {notifications.map((notification) => {
          const IconComponent = notification.icon;
          
          return (
            <div
              key={notification.id}
              className={`flex items-start space-x-3 p-4 rounded-lg border ${
                notification.type === 'warning' 
                  ? 'bg-orange-50 border-orange-200' 
                  : 'bg-blue-50 border-blue-200'
              }`}
            >
              <IconComponent className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                notification.type === 'warning' ? 'text-orange-600' : 'text-blue-600'
              }`} />
              
              <div className="flex-1 min-w-0">
                <h4 className={`font-medium text-sm ${
                  notification.type === 'warning' ? 'text-orange-900' : 'text-blue-900'
                }`}>
                  {notification.title}
                </h4>
                <p className={`text-sm mt-1 ${
                  notification.type === 'warning' ? 'text-orange-700' : 'text-blue-700'
                }`}>
                  {notification.description}
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                {notification.secondary && (
                  <button
                    onClick={notification.secondary.onClick}
                    className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      notification.type === 'warning'
                        ? 'text-orange-700 hover:text-orange-900 hover:bg-orange-100'
                        : 'text-blue-700 hover:text-blue-900 hover:bg-blue-100'
                    }`}
                  >
                    {notification.secondary.label}
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </button>
                )}
                
                {notification.action && (
                  <button
                    onClick={notification.action.onClick}
                    className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-white transition-colors ${
                      notification.type === 'warning'
                        ? 'bg-orange-600 hover:bg-orange-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {notification.action.label}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};