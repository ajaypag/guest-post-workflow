'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateSystemUserPage() {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const createSystemUser = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/admin/create-system-user', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create system user');
      }

      setResult(data);
    } catch (error) {
      console.error('Error creating system user:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Create System User</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <p className="mb-4">
            This will create a system user with ID: 00000000-0000-0000-0000-000000000000
          </p>
          <p className="mb-6 text-sm text-gray-600">
            This user is needed for clients created by account users, since accounts are not in the users table.
          </p>
          
          <button
            onClick={createSystemUser}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create System User'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">Error: {error}</p>
          </div>
        )}

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Success!</h3>
            <pre className="text-sm overflow-auto">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}

        <button
          onClick={() => router.push('/admin')}
          className="mt-6 text-blue-600 hover:text-blue-800"
        >
          ← Back to Admin
        </button>
      </div>
    </div>
  );
}