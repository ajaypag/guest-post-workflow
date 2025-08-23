import React from 'react';
import { BrandIntelligenceGenerator } from '@/components/ui/BrandIntelligenceGenerator';

interface Params {
  id: string;
}

interface PageProps {
  params: Promise<Params>;
}

export default async function BrandIntelligencePage({ params }: PageProps) {
  const { id: clientId } = await params;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Brand Intelligence</h1>
        <p className="text-gray-600">
          AI-powered deep research and brand brief generation for comprehensive client understanding.
        </p>
      </div>
      
      <BrandIntelligenceGenerator clientId={clientId} />
    </div>
  );
}