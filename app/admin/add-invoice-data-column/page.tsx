'use client';

import { useState } from 'react';
import { CheckCircle, AlertCircle, Loader2, Database } from 'lucide-react';

export default function AddInvoiceDataColumnPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  const runMigration = async () => {
    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/admin/add-invoice-data-column');
      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message || 'Migration completed successfully');
      } else {
        setStatus('error');
        setMessage(data.error || 'Migration failed');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Failed to run migration: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Add Invoice Data Column Migration</h1>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Migration Details</h2>
          <p className="text-gray-600 mb-4">
            This migration adds a JSONB column called `invoice_data` to the orders table.
            This column will store invoice details including:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
            <li>Invoice number</li>
            <li>Issue and due dates</li>
            <li>Line items with descriptions and pricing</li>
            <li>Billing information</li>
            <li>Subtotal, discount, and total amounts</li>
          </ul>
        </div>

        <div className="border-t pt-6">
          <button
            onClick={runMigration}
            disabled={status === 'loading'}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'loading' ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Running migration...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Database className="w-4 h-4" />
                Run Migration
              </span>
            )}
          </button>
        </div>

        {message && (
          <div className={`mt-6 p-4 rounded-lg ${
            status === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : status === 'error'
              ? 'bg-red-50 border border-red-200'
              : ''
          }`}>
            <div className="flex items-start gap-3">
              {status === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : status === 'error' ? (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              ) : null}
              <p className={status === 'success' ? 'text-green-800' : 'text-red-800'}>
                {message}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}