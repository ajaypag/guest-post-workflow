import { AuthServiceServer } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { User, CreditCard, FileText, Bell, Shield, Globe } from 'lucide-react';
import Link from 'next/link';

export default async function PublisherSettingsPage() {
  const session = await AuthServiceServer.getSession();
  
  if (!session || session.userType !== 'publisher') {
    redirect('/publisher/login');
  }

  const settingsSections = [
    {
      title: 'Profile',
      description: 'Manage your personal information and account details',
      icon: User,
      href: '/publisher/settings/profile',
      color: 'blue',
    },
    {
      title: 'Payment Methods',
      description: 'Configure how you receive payments',
      icon: CreditCard,
      href: '/publisher/settings/payments',
      color: 'green',
    },
    {
      title: 'Content Guidelines',
      description: 'Set your content requirements and restrictions',
      icon: FileText,
      href: '/publisher/settings/guidelines',
      color: 'purple',
    },
    {
      title: 'Notifications',
      description: 'Control email and platform notifications',
      icon: Bell,
      href: '/publisher/settings/notifications',
      color: 'yellow',
    },
    {
      title: 'Security',
      description: 'Manage password and security settings',
      icon: Shield,
      href: '/publisher/settings/security',
      color: 'red',
    },
    {
      title: 'API Access',
      description: 'Manage API keys and integrations',
      icon: Globe,
      href: '/publisher/settings/api',
      color: 'emerald',
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; icon: string }> = {
      blue: { bg: 'bg-blue-100', icon: 'text-blue-600' },
      green: { bg: 'bg-green-100', icon: 'text-green-600' },
      purple: { bg: 'bg-purple-100', icon: 'text-purple-600' },
      yellow: { bg: 'bg-yellow-100', icon: 'text-yellow-600' },
      red: { bg: 'bg-red-100', icon: 'text-red-600' },
      emerald: { bg: 'bg-emerald-100', icon: 'text-emerald-600' },
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {settingsSections.map((section) => {
          const colors = getColorClasses(section.color);
          return (
            <Link
              key={section.title}
              href={section.href}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start">
                <div className={`p-3 ${colors.bg} rounded-lg`}>
                  <section.icon className={`h-6 w-6 ${colors.icon}`} />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{section.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{section.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Account Info */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Account Type:</span>
            <p className="font-medium text-gray-900">Publisher Account</p>
          </div>
          <div>
            <span className="text-gray-600">Email:</span>
            <p className="font-medium text-gray-900">{session.email}</p>
          </div>
          <div>
            <span className="text-gray-600">Account Status:</span>
            <p className="font-medium text-gray-900">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                Active
              </span>
            </p>
          </div>
          <div>
            <span className="text-gray-600">Member Since:</span>
            <p className="font-medium text-gray-900">January 2025</p>
          </div>
        </div>
      </div>
    </div>
  );
}