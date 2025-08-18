'use client';

import { LucideIcon, ArrowUp, ArrowDown } from 'lucide-react';

interface PublisherStatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: 'blue' | 'purple' | 'green' | 'yellow' | 'emerald' | 'red';
}

export default function PublisherStatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend,
  color 
}: PublisherStatCardProps) {
  // Color mappings
  const colorClasses = {
    blue: {
      bg: 'bg-blue-100',
      icon: 'text-blue-600',
      trend: 'text-blue-600'
    },
    purple: {
      bg: 'bg-purple-100',
      icon: 'text-purple-600',
      trend: 'text-purple-600'
    },
    green: {
      bg: 'bg-green-100',
      icon: 'text-green-600',
      trend: 'text-green-600'
    },
    yellow: {
      bg: 'bg-yellow-100',
      icon: 'text-yellow-600',
      trend: 'text-yellow-600'
    },
    emerald: {
      bg: 'bg-emerald-100',
      icon: 'text-emerald-600',
      trend: 'text-emerald-600'
    },
    red: {
      bg: 'bg-red-100',
      icon: 'text-red-600',
      trend: 'text-red-600'
    }
  };

  const colors = colorClasses[color];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 ${colors.bg} rounded-lg`}>
          <Icon className={`h-6 w-6 ${colors.icon}`} />
        </div>
        {trend && (
          <div className={`flex items-center text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? (
              <ArrowUp className="h-4 w-4 mr-1" />
            ) : (
              <ArrowDown className="h-4 w-4 mr-1" />
            )}
            <span>{trend.value}%</span>
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <p className="text-sm text-gray-600 mt-1">{title}</p>
    </div>
  );
}