'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { TargetPageIntelligenceGenerator } from '@/components/ui/TargetPageIntelligenceGenerator';
import { ArrowLeft } from 'lucide-react';
import { clientStorage, sessionStorage } from '@/lib/userStorage';
import { Client } from '@/types/user';

interface TargetPage {
  id: string;
  url: string;
  keywords: string[];
  description: string;
}

export default function TargetPageIntelligencePage() {
  const params = useParams();
  const clientId = params.id as string;
  const targetPageId = params.targetPageId as string;
  const [client, setClient] = useState<Client | null>(null);
  const [targetPage, setTargetPage] = useState<TargetPage | null>(null);
  const [userType, setUserType] = useState<string>('');

  useEffect(() => {
    // Get user type from session
    const session = sessionStorage.getSession();
    if (session) {
      setUserType(session.userType || 'internal');
    }

    if (clientId) {
      loadClient();
    }
    
    if (targetPageId) {
      loadTargetPage();
    }
  }, [clientId, targetPageId]);

  const loadClient = async () => {
    if (!clientId) return;
    
    try {
      const response = await fetch(`/api/clients/${clientId}`);
      if (!response.ok) throw new Error('Failed to fetch client');
      const data = await response.json();
      console.log('Loaded client:', data);
      setClient(data);
    } catch (error) {
      console.error('Error loading client:', error);
      // Try to get from local storage as fallback
      const allClients = await clientStorage.getAllClients();
      const foundClient = allClients.find((c: any) => c.id === clientId);
      if (foundClient) {
        console.log('Found client in storage:', foundClient);
        setClient(foundClient);
      }
    }
  };

  const loadTargetPage = async () => {
    if (!targetPageId) return;
    
    try {
      const response = await fetch(`/api/target-pages/${targetPageId}`);
      if (!response.ok) throw new Error('Failed to fetch target page');
      const data = await response.json();
      console.log('Loaded target page:', data);
      setTargetPage(data);
    } catch (error) {
      console.error('Error loading target page:', error);
    }
  };

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Navigation */}
          <div className="mb-6">
            <Link 
              href={`/clients/${clientId}`}
              className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to {client?.name || 'Client'}
            </Link>
          </div>

          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Target Page Intelligence Generator</h1>
            <p className="text-gray-600 mb-3">
              Create a comprehensive brief for this specific product/service page that helps AI understand the offering deeply. This provides 
              granular intelligence for targeted content creation and ensures accurate representation of this specific page.
            </p>
            {targetPage?.url && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-sm font-medium text-purple-900">Target URL:</p>
                <a 
                  href={targetPage.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-purple-700 hover:text-purple-800 underline break-all"
                >
                  {targetPage.url}
                </a>
              </div>
            )}
          </div>
          
          <TargetPageIntelligenceGenerator 
            clientId={clientId} 
            targetPageId={targetPageId}
            targetUrl={targetPage?.url || ''} 
            userType={userType} 
          />
        </div>
      </div>
    </AuthWrapper>
  );
}