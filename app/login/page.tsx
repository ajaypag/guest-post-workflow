'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/lib/auth';

// Deployment test console log
console.log('Login page loaded - DEPLOYMENT TEST v2 -', new Date().toISOString());

// Deployment version tracking
const DEPLOYMENT_VERSION = 'v2.0';
const LAST_UPDATED = '2025-01-22 15:45 UTC';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Login logic
        const user = await AuthService.login(formData.email, formData.password);
        if (!user) {
          throw new Error('Invalid email or password');
        }
        
        router.push('/');
      } else {
        // Registration logic
        if (!formData.name.trim()) {
          throw new Error('Name is required');
        }
        
        const user = await AuthService.register({
          email: formData.email,
          name: formData.name,
          password: formData.password,
          role: 'user', // Default role
        });
        
        if (!user) {
          throw new Error('Registration failed');
        }
        
        router.push('/');
      }
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
            {isLogin ? 'Sign in to your account - TEST v2' : 'Create new account - TEST v2'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Guest Post Workflow Manager
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            {!isLogin && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required={!isLogin}
                  className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            )}
            
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
              {isLogin && (
                <p className="mt-1 text-xs text-gray-500">
                  Note: This is a demo - password not validated
                </p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign in' : 'Create account')}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setFormData({ email: '', password: '', name: '' });
              }}
              className="text-blue-600 hover:text-blue-500 text-sm"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
          
          {isLogin && (
            <div className="text-center mt-4 p-4 bg-blue-50 rounded">
              <p className="text-sm text-blue-800 font-medium">Demo Account</p>
              <p className="text-xs text-blue-600 mt-1">
                Email: admin@example.com (Admin)<br/>
                Or create a new account
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