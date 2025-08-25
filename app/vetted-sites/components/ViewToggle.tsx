'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Database, Sparkles, List } from 'lucide-react';

export type VettedSitesView = 'requests' | 'sites';

interface ViewToggleProps {
  currentView: VettedSitesView;
  onViewChange: (view: VettedSitesView) => void;
  userType: 'internal' | 'account';
  pendingRequestsCount?: number;
}

export default function ViewToggle({ 
  currentView, 
  onViewChange, 
  userType,
  pendingRequestsCount = 0 
}: ViewToggleProps) {
  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Vetted Sites</h1>
            <p className="text-gray-600">
              {currentView === 'requests' 
                ? 'Request custom analysis for your target URLs' 
                : 'Browse pre-qualified guest post opportunities'
              }
            </p>
          </div>
          
          <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
            <Button
              variant={currentView === 'requests' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewChange('requests')}
              className="flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Requests
              {pendingRequestsCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 text-xs">
                  {pendingRequestsCount}
                </Badge>
              )}
            </Button>
            
            <Button
              variant={currentView === 'sites' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewChange('sites')}
              className="flex items-center gap-2"
            >
              <Database className="h-4 w-4" />
              Sites Database
            </Button>
          </div>
        </div>
        
        {/* View descriptions */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className={`p-3 rounded-lg border-2 transition-colors ${
            currentView === 'requests' 
              ? 'border-blue-200 bg-blue-50' 
              : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-gray-900">Vetted Sites Requests</span>
            </div>
            <p className="text-gray-600 text-xs">
              Submit your target URLs and get personalized vetted site recommendations. 
              Our team manually reviews and qualifies sites specifically for your content.
            </p>
          </div>
          
          <div className={`p-3 rounded-lg border-2 transition-colors ${
            currentView === 'sites' 
              ? 'border-blue-200 bg-blue-50' 
              : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-4 w-4 text-green-600" />
              <span className="font-medium text-gray-900">Sites Database</span>
            </div>
            <p className="text-gray-600 text-xs">
              Browse our existing database of pre-qualified guest post opportunities. 
              Filter by quality metrics, topics, and other criteria to find matches.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}