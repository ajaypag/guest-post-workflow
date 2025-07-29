'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, AlertCircle, Loader2, Users } from 'lucide-react';
import { sessionStorage } from '@/lib/userStorage';

interface Client {
  id: string;
  name: string;
  hasExistingQualification?: boolean;
  existingStatus?: string;
}

interface QualificationModalProps {
  websiteId: string;
  websiteDomain: string;
  isOpen: boolean;
  onClose: () => void;
  onQualify: (clientId: string, status: string, notes: string) => Promise<void>;
}

export default function QualificationModal({
  websiteId,
  websiteDomain,
  isOpen,
  onClose,
  onQualify
}: QualificationModalProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [status, setStatus] = useState<'qualified' | 'disqualified'>('qualified');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadClients();
    }
  }, [isOpen, websiteId]);

  const loadClients = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get all clients
      const response = await fetch('/api/clients');
      const data = await response.json();
      
      // Check existing qualifications for this website
      const qualResponse = await fetch(`/api/websites/${websiteId}/qualifications`);
      const qualData = await qualResponse.json();
      
      // Mark which clients already have qualifications
      const clientsWithStatus = (data.clients || []).map((client: any) => {
        const existingQual = qualData.qualifications?.find((q: any) => q.clientId === client.id);
        return {
          ...client,
          hasExistingQualification: !!existingQual,
          existingStatus: existingQual?.status
        };
      });
      
      setClients(clientsWithStatus);
    } catch (error) {
      console.error('Failed to load clients:', error);
      setError('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedClient) {
      setError('Please select a client');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onQualify(selectedClient, status, notes);
      
      // Reset form
      setSelectedClient('');
      setStatus('qualified');
      setNotes('');
      
      // Close modal
      onClose();
    } catch (error: any) {
      setError(error.message || 'Failed to save qualification');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />
        
        <div className="inline-block w-full max-w-md px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Qualify Website</h2>
              <p className="mt-1 text-sm text-gray-600">
                Qualify <span className="font-medium">{websiteDomain}</span> for a client
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
              <p className="mt-2 text-gray-500">Loading clients...</p>
            </div>
          ) : (
            <>
              {/* Client Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Client
                </label>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Choose a client...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                      {client.hasExistingQualification && (
                        ` (Currently ${client.existingStatus})`
                      )}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Qualification Status
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setStatus('qualified')}
                    className={`px-4 py-3 border rounded-lg flex items-center justify-center gap-2 transition-colors ${
                      status === 'qualified'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <CheckCircle className="w-5 h-5" />
                    Qualified
                  </button>
                  <button
                    onClick={() => setStatus('disqualified')}
                    className={`px-4 py-3 border rounded-lg flex items-center justify-center gap-2 transition-colors ${
                      status === 'disqualified'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <XCircle className="w-5 h-5" />
                    Disqualified
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Add any relevant notes about this qualification..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="text-red-800">{error}</span>
                </div>
              )}

              {/* Warning for existing qualification */}
              {selectedClient && clients.find(c => c.id === selectedClient)?.hasExistingQualification && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Existing qualification found</p>
                    <p>This will update the existing qualification for this client.</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !selectedClient}
                  className={`flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50 ${
                    status === 'qualified'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : (
                    `Mark as ${status === 'qualified' ? 'Qualified' : 'Disqualified'}`
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}