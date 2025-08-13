'use client';

import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, UserX, CheckCircle, RefreshCw } from 'lucide-react';

interface SignupAttempt {
  email: string;
  ip: string;
  timestamp: Date;
  blocked: boolean;
  reason?: string;
}

export default function SignupMonitoringPage() {
  const [attempts, setAttempts] = useState<SignupAttempt[]>([]);
  const [stats, setStats] = useState({
    totalAttempts: 0,
    blockedAttempts: 0,
    uniqueIPs: 0,
    suspiciousEmails: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/admin/signup-stats');
      if (response.ok) {
        const data = await response.json();
        setAttempts(data.recentAttempts || []);
        setStats(data.stats || stats);
      }
    } catch (error) {
      console.error('Failed to fetch signup stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Shield className="h-8 w-8 text-blue-600" />
          Signup Monitoring Dashboard
        </h1>
        <p className="text-gray-600 mt-2">Monitor and manage signup attempts to prevent spam</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Attempts (24h)</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalAttempts}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Blocked Attempts</p>
              <p className="text-2xl font-bold text-red-600">{stats.blockedAttempts}</p>
            </div>
            <UserX className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Unique IPs</p>
              <p className="text-2xl font-bold text-gray-900">{stats.uniqueIPs}</p>
            </div>
            <Shield className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Suspicious Emails</p>
              <p className="text-2xl font-bold text-orange-600">{stats.suspiciousEmails}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Recent Attempts Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Recent Signup Attempts</h2>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : attempts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No recent signup attempts
                  </td>
                </tr>
              ) : (
                attempts.map((attempt, index) => (
                  <tr key={index} className={attempt.blocked ? 'bg-red-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {attempt.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {attempt.ip}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(attempt.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {attempt.blocked ? (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                          Blocked
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          Allowed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {attempt.reason || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Configuration Section */}
      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Protection Settings</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span><strong>Rate Limiting:</strong> 2 signups per hour per IP</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span><strong>Email Validation:</strong> Blocking disposable email domains</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span><strong>Honeypot Fields:</strong> Active on signup form</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span><strong>reCAPTCHA v3:</strong> {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ? 'Configured' : 'Not configured (add NEXT_PUBLIC_RECAPTCHA_SITE_KEY)'}</span>
          </li>
        </ul>
        
        {!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && (
          <div className="mt-4 p-4 bg-white border border-yellow-300 rounded">
            <p className="text-sm text-gray-700">
              <strong>To enable reCAPTCHA:</strong>
            </p>
            <ol className="mt-2 text-sm text-gray-600 list-decimal list-inside space-y-1">
              <li>Go to <a href="https://www.google.com/recaptcha/admin" target="_blank" className="text-blue-600 hover:underline">Google reCAPTCHA Admin</a></li>
              <li>Register your site with reCAPTCHA v3</li>
              <li>Add to your .env: <code className="bg-gray-100 px-1">NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_site_key</code></li>
              <li>Add to your .env: <code className="bg-gray-100 px-1">RECAPTCHA_SECRET_KEY=your_secret_key</code></li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}