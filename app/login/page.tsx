'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/lib/auth';

// Deployment test console log
console.log('Login page loaded - DEPLOYMENT TEST v2 -', new Date().toISOString());

// Deployment version tracking
const DEPLOYMENT_VERSION = 'v3.0 - Invite Only';
const LAST_UPDATED = '2025-01-29 14:30 UTC';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Login logic only - no registration
      const user = await AuthService.login(formData.email, formData.password);
      if (!user) {
        throw new Error('Invalid email or password');
      }
      
      router.push('/');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        {/* DEPLOYMENT TEST BANNER */}
        <div className="bg-red-600 text-white p-4 rounded-lg shadow-lg animate-pulse">
          <h3 className="text-lg font-bold text-center">🚨 DEPLOYMENT TEST {DEPLOYMENT_VERSION} 🚨</h3>
          <p className="text-center text-sm mt-1">Last updated: {LAST_UPDATED}</p>
          <p className="text-center text-xs mt-2 opacity-90">This banner verifies new deployments are working</p>
        </div>
        
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Guest Post Workflow Manager
          </p>
          <p className="mt-1 text-center text-xs text-gray-500">
            Internal tool - Invite only
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="you@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <p className="mt-1 text-xs text-gray-500">
                Note: This is a demo - password not validated
              </p>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center text-sm text-gray-600">
            <p>Need access? Contact your administrator</p>
          </div>
          
          {(
            <div className="text-center mt-4 p-4 bg-blue-50 rounded">
              <p className="text-sm text-blue-800 font-medium">Demo Account</p>
              <p className="text-xs text-blue-600 mt-1">
                Email: admin@example.com
              </p>
            </div>
          )}
        </form>
        
        {/* Version indicator */}
        <div className="text-center mt-6 p-2 bg-yellow-100 border border-yellow-300 rounded">
          <p className="text-xs text-yellow-800">
            Deployment Test Active | Version: {DEPLOYMENT_VERSION} | Build Time: {LAST_UPDATED}
          </p>
        </div>
      </div>
    </div>
  );
}