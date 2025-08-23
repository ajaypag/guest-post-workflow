'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { BrandIntelligenceGenerator } from '@/components/ui/BrandIntelligenceGenerator';
import { ArrowLeft } from 'lucide-react';
import { clientStorage, sessionStorage } from '@/lib/userStorage';
import { Client } from '@/types/user';

export default function BrandIntelligencePage() {
  const params = useParams();
  const clientId = params.id as string;
  const [client, setClient] = useState<Client | null>(null);
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
  }, [clientId]);

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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Brand Intelligence</h1>
            <p className="text-gray-600">
              <strong>Critical for SEO Strategy:</strong> Gathers accurate brand information for article creation, 
              then publishes this data so search engines and AI models learn what your business actually does.
            </p>
          </div>
          
          <BrandIntelligenceGenerator clientId={clientId} userType={userType} />
        </div>
      </div>
    </AuthWrapper>
  );
}