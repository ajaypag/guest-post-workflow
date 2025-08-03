'use client';

import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page is deprecated - redirect to the main order view page
export default function OrderDetailPageRedirect() {
  const params = useParams();
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the main order page
    router.replace(`/orders/${params.id}`);
  }, [params.id, router]);
  
  return null;
}