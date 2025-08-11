'use client';

import { useEffect } from 'react';
// import { onCLS, onFCP, onLCP, onTTFB, onINP, Metric } from 'web-vitals';

// Temporary placeholder interfaces for web-vitals
interface Metric {
  name: string;
  value: number;
  rating: string;
  delta: number;
  id: string;
}

function sendToAnalytics(metric: Metric) {
  // Send to Google Analytics 4
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', metric.name, {
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_category: 'Web Vitals',
      event_label: metric.id,
      non_interaction: true,
    });
  }

  // Also log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Web Vitals]', metric.name, metric.value, metric.rating);
  }

  // Optionally send to your own analytics endpoint
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
    fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify({
        metric: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    }).catch((error) => {
      console.error('Failed to send web vitals:', error);
    });
  }
}

export function WebVitals() {
  useEffect(() => {
    // Core Web Vitals - temporarily disabled due to missing web-vitals package
    // onCLS(sendToAnalytics);
    // onINP(sendToAnalytics); // INP replaced FID in Core Web Vitals
    // onLCP(sendToAnalytics);
    
    // Other metrics
    // onFCP(sendToAnalytics);
    // onTTFB(sendToAnalytics);
    
    console.log('[WebVitals] Temporarily disabled - web-vitals package not installed');
  }, []);

  return null;
}

// Type declaration for gtag
declare global {
  interface Window {
    gtag?: (
      command: string,
      ...args: any[]
    ) => void;
  }
}