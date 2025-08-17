'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  Globe, 
  LogOut, 
  BarChart2, 
  ShoppingCart, 
  FileText, 
  Wallet,
  Settings,
  Menu,
  X,
  ChevronDown,
  User,
  HelpCircle,
  Building2,
  DollarSign,
  TrendingUp,
  Bell,
  Package,
  Zap
} from 'lucide-react';

interface PublisherSession {
  userId: string;
  email: string;
  name: string;
  companyName?: string;
  userType: 'publisher';
}

export default function PublisherHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<PublisherSession | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  useEffect(() => {
    // Get publisher session from localStorage
    const storedSession = localStorage.getItem('publisherSession');
    if (storedSession) {
      setSession(JSON.parse(storedSession));
    }
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setUserDropdownOpen(false);
      setMobileMenuOpen(false);
    };

    if (userDropdownOpen || mobileMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [userDropdownOpen, mobileMenuOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    try {
      await fetch('/api/publisher/auth/logout', { method: 'POST' });
      localStorage.removeItem('publisherSession');
      window.location.href = '/publisher/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isActive = (path: string) => {
    if (path === '/publisher' && pathname === '/publisher') return true;
    if (path !== '/publisher' && pathname.startsWith(path)) return true;
    return false;
  };

  const navItems = [
    { href: '/publisher', label: 'Dashboard', icon: BarChart2 },
    { href: '/publisher/websites', label: 'My Websites', icon: Globe },
    { href: '/publisher/offerings', label: 'Offerings', icon: Package },
    { href: '/publisher/orders', label: 'Orders', icon: ShoppingCart },
    { href: '/publisher/invoices', label: 'Invoices', icon: FileText },
    { href: '/publisher/analytics', label: 'Analytics', icon: TrendingUp },
  ];

  if (!session) return null;

  return (
    <>
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Brand */}
            <div className="flex items-center">
              <Link href="/publisher" className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full"></div>
                </div>
                <div>
                  <span className="text-lg font-semibold text-gray-900">Publisher Portal</span>
                  <span className="hidden sm:block text-xs text-gray-500">Linkio</span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${active 
                        ? 'bg-green-50 text-green-700' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4 mr-1.5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Desktop User Menu & Mobile Menu Button */}
            <div className="flex items-center space-x-3">
              {/* Notification Bell */}
              <button className="hidden md:block p-2 rounded-lg hover:bg-gray-50 transition-colors relative">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* Mobile menu button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMobileMenuOpen(!mobileMenuOpen);
                }}
                className="md:hidden p-2 rounded-lg hover:bg-gray-50 transition-colors"
                aria-label="Toggle mobile menu"
              >
                <Menu className="w-6 h-6 text-gray-600" />
              </button>

              {/* User Dropdown - Desktop only */}
              <div className="relative hidden md:block">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setUserDropdownOpen(!userDropdownOpen);
                  }}
                  className="flex items-center space-x-3 px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-7 h-7 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900">{session.name}</div>
                    {session.companyName && (
                      <div className="text-xs text-gray-500">{session.companyName}</div>
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <div className="text-sm font-medium text-gray-900">{session.name}</div>
                      <div className="text-xs text-gray-500">{session.email}</div>
                      {session.companyName && (
                        <div className="text-xs text-gray-500">{session.companyName}</div>
                      )}
                      <div className="text-xs text-green-600 font-medium mt-1">Publisher Account</div>
                    </div>

                    <Link
                      href="/publisher/payment-profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                      onClick={() => setUserDropdownOpen(false)}
                    >
                      <Wallet className="w-4 h-4 mr-2" />
                      Payment Profile
                    </Link>

                    <Link
                      href="/publisher/settings"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                      onClick={() => setUserDropdownOpen(false)}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Account Settings
                    </Link>

                    <Link
                      href="/publisher/help"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                      onClick={() => setUserDropdownOpen(false)}
                    >
                      <HelpCircle className="w-4 h-4 mr-2" />
                      Help & Support
                    </Link>

                    <div className="border-t border-gray-100 my-1"></div>

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Mobile Menu Drawer */}
      <div className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
        mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Mobile Menu Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">{session.name}</div>
                <div className="text-xs text-gray-500">{session.email}</div>
                {session.companyName && (
                  <div className="text-xs text-gray-500">{session.companyName}</div>
                )}
                <div className="text-xs text-green-600 font-medium">Publisher</div>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-50 transition-colors"
              aria-label="Close mobile menu"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          {/* Mobile Menu Content */}
          <div className="flex-1 overflow-y-auto py-4">
            {/* Notifications */}
            <div className="px-4 pb-4 border-b border-gray-100 mb-4">
              <button className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <Bell className="w-5 h-5 text-gray-600 mr-3" />
                  <span className="text-sm font-medium">Notifications</span>
                </div>
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
            </div>

            {/* Mobile Navigation */}
            <nav className="px-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors
                      ${active 
                        ? 'bg-green-50 text-green-700' 
                        : 'text-gray-700 hover:bg-gray-50'
                      }
                    `}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-base font-medium">{item.label}</span>
                  </Link>
                );
              })}

              <div className="border-t border-gray-100 my-4"></div>

              <Link
                href="/publisher/payment-profile"
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Wallet className="w-5 h-5" />
                <span className="text-base font-medium">Payment Profile</span>
              </Link>

              <Link
                href="/publisher/settings"
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Settings className="w-5 h-5" />
                <span className="text-base font-medium">Account Settings</span>
              </Link>

              <Link
                href="/publisher/help"
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <HelpCircle className="w-5 h-5" />
                <span className="text-base font-medium">Help & Support</span>
              </Link>
            </nav>
          </div>

          {/* Mobile Menu Footer */}
          <div className="border-t border-gray-100 p-4">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-base font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}