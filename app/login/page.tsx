'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthService } from '@/lib/auth';
import { Sparkles, Users, BarChart3, Mail } from 'lucide-react';
import LinkioHeader from '@/components/LinkioHeader';
import MarketingFooter from '@/components/MarketingFooter';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Get redirect URL from query params, default to homepage
  const redirectTo = searchParams.get('redirect') || '/';

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
      
      // Check if user was in middle of quick start flow
      const quickstartState = typeof window !== 'undefined' ? sessionStorage.getItem('quickstart_state') : null;
      if (quickstartState) {
        // Return to get-started page to complete order
        router.push('/get-started');
      } else if (user.userType === 'account') {
        // Account users should go to their dashboard
        router.push(searchParams.get('redirect') || '/account/dashboard');
      } else {
        // Internal users go to main app
        router.push(redirectTo);
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col">
      <LinkioHeader variant="default" />
      <div className="flex-grow flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            Linkio
          </h2>
          <p className="mt-3 text-lg text-gray-600">
            Link Building That Gets You Cited by AI
          </p>
          <p className="mt-4 text-sm text-gray-500 max-w-sm mx-auto">
            We find hidden gems with real ranking potential. Your brand gets mentioned in ChatGPT, Claude, and Perplexity responses.
          </p>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-2">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-xs text-gray-600">AI Citations</p>
          </div>
          <div className="space-y-2">
            <div className="mx-auto w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <p className="text-xs text-gray-600">Real Authority</p>
          </div>
          <div className="space-y-2">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-xs text-gray-600">Proven Results</p>
          </div>
        </div>
        
        <div className="bg-white shadow-xl rounded-2xl p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
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
                  className="mt-1 appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
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
                  className="mt-1 appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div></div>
              <a
                href="/forgot-password"
                className="text-sm text-purple-600 hover:text-purple-500 transition-colors"
              >
                Forgot password?
              </a>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <a 
                  href="/signup" 
                  className="text-purple-600 hover:text-purple-700 font-medium transition-colors"
                >
                  Sign up
                </a>
              </p>
            </div>
          </form>
        </div>

        {/* Quick start without account */}
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
          <p className="text-sm text-gray-700 mb-3 text-center">
            Want to see how it works first?
          </p>
          <a
            href="/get-started"
            className="block w-full text-center py-2 px-4 bg-white border border-blue-300 rounded-lg text-blue-600 font-medium hover:bg-blue-50 transition-colors"
          >
            Try Quick Start (No Account Needed)
          </a>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-400">
            © 2025 Linkio. All rights reserved.
          </p>
        </div>
        </div>
      </div>
      <MarketingFooter />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}