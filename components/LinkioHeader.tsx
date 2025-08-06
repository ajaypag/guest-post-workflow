import Link from 'next/link';
import { ArrowRight, Zap, ArrowLeft } from 'lucide-react';

interface LinkioHeaderProps {
  variant?: 'default' | 'blog' | 'tool';
  toolName?: string;
  showBackButton?: boolean;
}

export default function LinkioHeader({ 
  variant = 'default', 
  toolName, 
  showBackButton = false 
}: LinkioHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo Section */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-gray-900">Linkio</span>
            </Link>
            
            {/* Tool breadcrumb */}
            {variant === 'tool' && toolName && (
              <>
                <span className="text-gray-400">/</span>
                <span className="text-gray-600">{toolName}</span>
              </>
            )}
          </div>
          
          {/* Navigation Section */}
          <div className="flex items-center gap-4">
            {/* Blog variant - minimal nav */}
            {variant === 'blog' && (
              <>
                {showBackButton && (
                  <Link 
                    href="/"
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Home
                  </Link>
                )}
                <Link 
                  href="https://app.linkio.com/users/sign_up"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  Start Free Trial
                </Link>
              </>
            )}
            
            {/* Tool variant - focused nav */}
            {variant === 'tool' && (
              <>
                <Link 
                  href="/blog"
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                >
                  Blog
                </Link>
                <Link 
                  href="https://app.linkio.com/users/sign_up"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  Get Started Free
                </Link>
              </>
            )}
            
            {/* Default variant - full nav */}
            {variant === 'default' && (
              <>
                <Link 
                  href="/guest-posting-sites" 
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                >
                  Browse Sites
                </Link>
                <Link 
                  href="/blog" 
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                >
                  Blog
                </Link>
                <Link 
                  href="/account/login" 
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                >
                  Sign In
                </Link>
                <Link 
                  href="/signup/marketing" 
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}