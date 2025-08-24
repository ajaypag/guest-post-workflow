'use client';

import { useState } from 'react';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';

export default function ClientDetailPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'pages'>('overview');
  
  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1>Test Page</h1>
          
          {activeTab === 'overview' && (
            <div>Overview Tab</div>
          )}
          
          {activeTab === 'pages' && (
            <div>Pages Tab</div>
          )}
        </div>
      </div>
    </AuthWrapper>
  );
}