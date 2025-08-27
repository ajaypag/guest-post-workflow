'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { executeRecaptcha } from '@/components/RecaptchaProvider';
import { 
  Globe,
  ArrowRight,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Building,
  Mail,
  Lock,
  User
} from 'lucide-react';

interface FormState {
  step: 'url' | 'signup' | 'verifying' | 'complete';
  targetUrl: string;
  email: string;
  password: string;
  contactName: string;
  companyName: string;
  showPassword: boolean;
  loading: boolean;
  error: string;
}

export default function VettedSitesLeadForm() {
  const router = useRouter();
  const [formState, setFormState] = useState<FormState>({
    step: 'url',
    targetUrl: '',
    email: '',
    password: '',
    contactName: '',
    companyName: '',
    showPassword: false,
    loading: false,
    error: ''
  });

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formState.targetUrl.trim()) {
      setFormState(prev => ({ ...prev, error: 'Please enter a URL' }));
      return;
    }

    if (!validateUrl(formState.targetUrl)) {
      setFormState(prev => ({ ...prev, error: 'Please enter a valid URL (e.g., https://example.com)' }));
      return;
    }

    // Move to signup step
    setFormState(prev => ({ ...prev, step: 'signup', error: '' }));
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formState.email || !formState.password || !formState.contactName) {
      setFormState(prev => ({ ...prev, error: 'Please fill in all fields' }));
      return;
    }

    if (formState.password.length < 8) {
      setFormState(prev => ({ ...prev, error: 'Password must be at least 8 characters' }));
      return;
    }

    setFormState(prev => ({ ...prev, loading: true, error: '' }));

    try {
      // Execute reCAPTCHA
      const recaptchaToken = await executeRecaptcha('homepage_signup');
      
      // Call the account signup API
      const response = await fetch('/api/auth/account-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formState.email,
          password: formState.password,
          name: formState.contactName,
          company: formState.companyName,
          recaptchaToken,
          requireVerification: true,
          pendingRequest: {
            targetUrls: [formState.targetUrl],
            filters: {},
            notes: 'Lead magnet signup from homepage'
          }
        })
      });

      const data = await response.json();

      if (response.ok) {
        setFormState(prev => ({ ...prev, step: 'verifying', loading: false }));
        
        // Show completion message
        setTimeout(() => {
          setFormState(prev => ({ ...prev, step: 'complete' }));
        }, 2000);
      } else {
        setFormState(prev => ({ 
          ...prev, 
          error: data.error || 'Failed to create account',
          loading: false 
        }));
      }
    } catch (err) {
      setFormState(prev => ({ 
        ...prev, 
        error: 'An error occurred. Please try again.',
        loading: false 
      }));
    }
  };

  // Success states
  if (formState.step === 'verifying') {
    return (
      <div className="bg-white rounded-3xl shadow-2xl p-8 border-2 border-blue-200 relative max-w-lg mx-auto">
        {/* Processing badge */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <div className="bg-blue-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-xl flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            PROCESSING
          </div>
        </div>

        <div className="pt-6 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
            <Loader2 className="h-10 w-10 text-white animate-spin" />
          </div>
          
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            Creating your account...
          </h3>
          
          <div className="bg-blue-50 rounded-2xl p-6 border-2 border-blue-200 mb-6">
            <p className="text-lg font-semibold text-blue-900 mb-2">
              🔍 Setting up analysis for:
            </p>
            <p className="text-xl font-bold text-blue-800">
              {new URL(formState.targetUrl).hostname.toUpperCase()}
            </p>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
        </div>
      </div>
    );
  }

  if (formState.step === 'complete') {
    return (
      <div className="bg-white rounded-3xl shadow-2xl p-8 border-2 border-blue-200 relative max-w-lg mx-auto">
        {/* Success badge */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <div className="bg-emerald-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-xl flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            ACCOUNT CREATED
          </div>
        </div>

        <div className="pt-6 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
            <CheckCircle className="h-10 w-10 text-white" />
          </div>
          
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            We're analyzing {new URL(formState.targetUrl).hostname.toUpperCase()}
          </h3>
          
          <div className="bg-blue-50 rounded-2xl p-6 border-2 border-blue-200 mb-6">
            <p className="text-lg font-semibold text-blue-900 mb-2">
              📧 Verification email sent to:
            </p>
            <p className="text-xl font-bold text-blue-800 break-all">
              {formState.email}
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3 text-left bg-gray-50 rounded-xl p-4">
              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">
                1
              </div>
              <div>
                <p className="font-semibold text-gray-900">Check your email & click the verification link</p>
                <p className="text-sm text-gray-600">This activates your account and vetted sites analysis</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 text-left bg-gray-50 rounded-xl p-4">
              <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">
                2
              </div>
              <div>
                <p className="font-semibold text-gray-900">Get your keyword overlap report in 24 hours</p>
                <p className="text-sm text-gray-600">See which sites already rank for your target keywords</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-2xl p-8 border-2 border-blue-200 relative transform hover:scale-105 transition-transform">
      {/* Prominent badge */}
      <div className="absolute -top-4 left-8">
        <div className="bg-amber-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-xl">
          🎯 KEYWORD OVERLAP REPORT
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-center mb-8 pt-6">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shadow-lg ${
            formState.step === 'url' ? 'bg-blue-600 text-white' : 'bg-green-500 text-white'
          }`}>
            {formState.step === 'signup' ? <CheckCircle className="w-6 h-6" /> : '1'}
          </div>
          <div className={`w-24 h-2 rounded-full ${formState.step === 'signup' ? 'bg-blue-600' : 'bg-gray-300'}`} />
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shadow-lg ${
            formState.step === 'signup' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
          }`}>
            2
          </div>
        </div>
      </div>

      {formState.error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-800">{formState.error}</p>
          </div>
        </div>
      )}

      {/* Step 1: URL Input */}
      {formState.step === 'url' && (
        <form onSubmit={handleUrlSubmit} className="space-y-6">
          <div>
            <label className="block text-2xl font-bold text-gray-900 mb-3 leading-tight">
              Enter your target URL to see personalized site recommendations
            </label>
            <p className="text-gray-700 mb-6 text-lg font-normal">
              The page you want mentioned in guest posts and AI responses
            </p>
            <input
              type="url"
              value={formState.targetUrl}
              onChange={(e) => setFormState(prev => ({ ...prev, targetUrl: e.target.value, error: '' }))}
              placeholder="https://yoursite.com/page-to-promote"
              className="w-full px-6 py-5 text-xl border-3 border-blue-300 rounded-2xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 font-mono bg-blue-50 focus:bg-white transition-all shadow-lg"
              required
            />
          </div>

          <div className="bg-slate-50 rounded-2xl p-6 border-2 border-slate-200">
            <p className="text-gray-900 font-bold mb-4 text-lg">🎯 YOU'LL RECEIVE:</p>
            <div className="space-y-3 text-gray-700 font-medium">
              <div className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>See which keywords each site ranks for vs. yours</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>AI analysis of why each site matches your content</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Wholesale cost + $79 admin fee (no markups)</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-6 px-8 bg-blue-600 text-white font-bold text-xl rounded-2xl hover:bg-blue-700 transform hover:scale-105 transition-all shadow-2xl flex items-center justify-center gap-3"
          >
            GET VETTED SITES & ANALYSIS
            <ArrowRight className="w-6 h-6" />
          </button>

          <div className="flex items-center justify-center gap-6 text-sm font-medium text-gray-600 pt-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Results in 24 hours</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>No commitment required</span>
            </div>
          </div>

          <div className="text-center pt-6 border-t-2 border-gray-200">
            <p className="text-gray-600 font-medium">
              Already have an account? {' '}
              <a href="/login" className="text-blue-600 hover:text-blue-700 font-semibold underline">
                Sign in
              </a>
            </p>
          </div>
        </form>
      )}

      {/* Step 2: Signup Form */}
      {formState.step === 'signup' && (
        <div className="space-y-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-3 text-lg font-bold mb-8 px-6 py-3 bg-blue-500 text-white rounded-2xl shadow-xl">
              <CheckCircle className="w-5 h-5" />
              <span>ANALYZING: {new URL(formState.targetUrl).hostname.toUpperCase()}</span>
            </div>
            
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              CREATE YOUR ACCOUNT
            </h3>
            <p className="text-lg font-normal text-gray-700 mb-8">
              Get your personalized analysis delivered in 24 hours
            </p>
          </div>
          
          <form onSubmit={handleSignupSubmit} className="space-y-6">
            <div className="space-y-5">
              <div>
                <input
                  type="text"
                  value={formState.contactName}
                  onChange={(e) => setFormState(prev => ({ ...prev, contactName: e.target.value }))}
                  placeholder="Your name"
                  className="w-full px-6 py-5 text-lg border-3 border-blue-300 rounded-2xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 bg-blue-50 focus:bg-white transition-all shadow-lg font-normal"
                  required
                />
              </div>

              <div>
                <input
                  type="email"
                  value={formState.email}
                  onChange={(e) => setFormState(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Work email address"
                  className="w-full px-6 py-5 text-lg border-3 border-blue-300 rounded-2xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 bg-blue-50 focus:bg-white transition-all shadow-lg font-normal"
                  required
                />
              </div>

              <div className="relative">
                <input
                  type={formState.showPassword ? 'text' : 'password'}
                  value={formState.password}
                  onChange={(e) => setFormState(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Password (min. 8 characters)"
                  className="w-full px-6 py-5 pr-16 text-lg border-3 border-blue-300 rounded-2xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 bg-blue-50 focus:bg-white transition-all shadow-lg font-normal"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setFormState(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-700"
                >
                  {formState.showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <input
                type="text"
                value={formState.companyName}
                onChange={(e) => setFormState(prev => ({ ...prev, companyName: e.target.value }))}
                placeholder="Company name (optional)"
                className="w-full px-6 py-5 text-lg border-3 border-purple-300 rounded-2xl focus:ring-4 focus:ring-purple-200 focus:border-purple-500 bg-purple-50 focus:bg-white transition-all shadow-lg font-semibold"
              />
            </div>

            <button
              type="submit"
              disabled={formState.loading}
              className="w-full py-6 px-8 bg-blue-600 text-white font-bold text-xl rounded-2xl hover:bg-blue-700 transform hover:scale-105 transition-all shadow-2xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {formState.loading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  CREATING ACCOUNT...
                </>
              ) : (
                <>
                  GET MY ANALYSIS REPORT
                  <ArrowRight className="w-6 h-6" />
                </>
              )}
            </button>

            <div className="flex items-center justify-between pt-6 border-t-2 border-blue-200">
              <button
                type="button"
                onClick={() => setFormState(prev => ({ ...prev, step: 'url', error: '' }))}
                className="text-blue-600 hover:text-blue-800 font-semibold underline"
              >
                ← BACK TO URL
              </button>
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>DELIVERED IN 24 HOURS</span>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}