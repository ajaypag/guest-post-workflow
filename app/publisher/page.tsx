'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PublisherRoutePage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated as a publisher
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/publisher/check', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated && data.user?.userType === 'publisher') {
            // Publisher is logged in, redirect to main dashboard
            router.replace('/publisher/dashboard');
            return;
          }
        }
        
        // Not authenticated or not a publisher, redirect to landing page
        router.replace('/publisher-landing');
      } catch (error) {
        console.error('Auth check failed:', error);
        // On error, redirect to landing page
        router.replace('/publisher-landing');
      }
    };

    checkAuth();
  }, [router]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}