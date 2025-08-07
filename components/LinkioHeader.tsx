'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Zap, ArrowLeft, Menu, X } from 'lucide-react';

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Navigation items for default variant
  const navItems = [
    { href: '/how-it-works', label: 'How It Works' },
    { href: '/guest-posting-sites', label: 'Browse Sites' },
    { href: '/blog', label: 'Blog' },
  ];
  return (
    <header className="bg-white border-b border-gray-100 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo Section */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-3" onClick={closeMobileMenu}>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-gray-900">Linkio</span>
            </Link>
            
            {/* Tool breadcrumb - hidden on very small screens */}
            {variant === 'tool' && toolName && (
              <div className="hidden sm:flex items-center space-x-2">
                <span className="text-gray-400">/</span>
                <span className="text-gray-600 text-sm">{toolName}</span>
              </div>
            )}
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            {/* Blog variant - minimal nav */}
            {variant === 'blog' && (
              <>
                {showBackButton && (
                  <Link 
                    href="/"
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Home
                  </Link>
                )}
                <Link 
                  href="https://app.linkio.com/users/sign_up"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
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
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
                >
                  Blog
                </Link>
                <Link 
                  href="https://app.linkio.com/users/sign_up"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
                >
                  Get Started Free
                </Link>
              </>
            )}
            
            {/* Default variant - full nav */}
            {variant === 'default' && (
              <>
                {navItems.map((item) => (
                  <Link 
                    key={item.href}
                    href={item.href}
                    className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
                <Link 
                  href="https://postflow.outreachlabs.net/login"
                  target="_blank"
                  rel="noopener noreferrer" 
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link 
                  href="/signup"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button - only show for default variant with multiple items */}
          {variant === 'default' && (
            <button
              onClick={toggleMobileMenu}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          )}

          {/* Mobile CTA for blog/tool variants */}
          {variant !== 'default' && (
            <div className="md:hidden">
              {variant === 'blog' && (
                <Link 
                  href="https://app.linkio.com/users/sign_up"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
                >
                  Start Trial
                </Link>
              )}
              {variant === 'tool' && (
                <Link 
                  href="https://app.linkio.com/users/sign_up"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
                >
                  Get Started
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {variant === 'default' && isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-100 shadow-lg z-50">
          <div className="px-4 py-6 space-y-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobileMenu}
                className="block text-gray-900 hover:text-blue-600 font-medium py-2 transition-colors"
              >
                {item.label}
              </Link>
            ))}
            
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <Link
                href="https://postflow.outreachlabs.net/login"
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMobileMenu}
                className="block text-gray-600 hover:text-gray-900 py-2 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                onClick={closeMobileMenu}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Mobile menu backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-25 z-40"
          onClick={closeMobileMenu}
        />
      )}
    </header>
  );
}