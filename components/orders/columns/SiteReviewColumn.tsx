'use client';

import { useState, useEffect } from 'react';
import { Globe, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';

interface SiteReviewColumnProps {
  order: any;
  isNewOrder: boolean;
  session: any;
  onOrderUpdate: (updates: any) => void;
  onNavigate?: (view: string) => void;
}

export default function SiteReviewColumn({
  order,
  isNewOrder,
  session,
  onOrderUpdate,
  onNavigate
}: SiteReviewColumnProps) {
  // This is a placeholder implementation
  // The full implementation would load and display site submissions for review
  
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Review Sites</h2>
        <p className="text-sm text-gray-600 mt-1">
          Approve or reject suggested sites for your guest posts
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-center py-8">
          <Globe className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            Site review functionality will be implemented here
          </p>
          <p className="text-sm text-gray-400 mt-2">
            This will show domains submitted by internal team for approval
          </p>
        </div>
      </div>
    </div>
  );
}