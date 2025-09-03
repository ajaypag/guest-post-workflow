'use client';

import { useState, useEffect } from 'react';
import { X, Search, DollarSign, Clock, User, Building } from 'lucide-react';

interface PublisherOffering {
  id: string;
  publisherId: string;
  publisherName: string;
  publisherEmail?: string;
  offeringName: string;
  basePrice: number;
  turnaroundDays: number;
  expressAvailable: boolean;
  expressPrice?: number;
  currentAvailability: string;
  isPrimary?: boolean;
  isPreferred?: boolean;
}

interface PublisherAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  lineItemId: string;
  orderId: string;
  domain: string;
  currentPublisherId?: string;
  onAssigned: (publisherId: string, offeringId: string, publisherName: string) => void;
}

export default function PublisherAssignmentModal({
  isOpen,
  onClose,
  lineItemId,
  orderId,
  domain,
  currentPublisherId,
  onAssigned
}: PublisherAssignmentModalProps) {
  const [offerings, setOfferings] = useState<PublisherOffering[]>([]);
  const [filteredOfferings, setFilteredOfferings] = useState<PublisherOffering[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOffering, setSelectedOffering] = useState<PublisherOffering | null>(null);
  const [customPrice, setCustomPrice] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchOfferings();
    }
  }, [isOpen, lineItemId]);

  useEffect(() => {
    // Filter offerings based on search term
    if (searchTerm) {
      const filtered = offerings.filter(o => 
        o.publisherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.publisherEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.offeringName.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredOfferings(filtered);
    } else {
      setFilteredOfferings(offerings);
    }
  }, [searchTerm, offerings]);

  const fetchOfferings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/orders/${orderId}/line-items/${lineItemId}/assign-publisher`);
      if (!response.ok) throw new Error('Failed to fetch offerings');
      
      const data = await response.json();
      setOfferings(data.availableOfferings || []);
      setFilteredOfferings(data.availableOfferings || []);
    } catch (error) {
      console.error('Error fetching offerings:', error);
      setError('Failed to load publisher offerings');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedOffering) return;

    setSaving(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/orders/${orderId}/line-items/${lineItemId}/assign-publisher`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publisherId: selectedOffering.publisherId,
          offeringId: selectedOffering.id,
          price: customPrice || selectedOffering.basePrice
        })
      });

      if (!response.ok) throw new Error('Failed to assign publisher');
      
      const data = await response.json();
      onAssigned(
        selectedOffering.publisherId,
        selectedOffering.id,
        selectedOffering.publisherName
      );
      onClose();
    } catch (error) {
      console.error('Error assigning publisher:', error);
      setError('Failed to assign publisher');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">
                Assign Publisher
              </h2>
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Domain:</span>
                  <span className="text-sm font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded">
                    {domain}
                  </span>
                </div>
                {currentPublisherId && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Current Status:</span>
                    <span className="text-sm text-amber-600">
                      Has existing publisher - you are changing the assignment
                    </span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 ml-4"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Search */}
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search publishers or offerings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading offerings...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600">{error}</p>
              <button
                onClick={fetchOfferings}
                className="mt-2 text-blue-600 hover:text-blue-700"
              >
                Try Again
              </button>
            </div>
          ) : filteredOfferings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">
                {searchTerm ? 'No offerings match your search' : 'No publisher offerings available'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOfferings.map((offering) => (
                <div
                  key={offering.id}
                  onClick={() => {
                    setSelectedOffering(offering);
                    setCustomPrice(offering.basePrice);
                  }}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedOffering?.id === offering.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-gray-900">
                          {offering.publisherName}
                        </span>
                        {offering.publisherId === currentPublisherId && (
                          <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                            Current
                          </span>
                        )}
                        {offering.isPrimary && (
                          <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                            Primary
                          </span>
                        )}
                        {offering.isPreferred && (
                          <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full">
                            Preferred
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-1 text-sm text-gray-600">
                        {offering.offeringName}
                      </div>
                      
                      {offering.publisherEmail && (
                        <div className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                          <User className="h-3 w-3" />
                          {offering.publisherEmail}
                        </div>
                      )}
                      
                      <div className="mt-2 flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-gray-400" />
                          <span className="font-medium">
                            ${(offering.basePrice / 100).toFixed(2)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <span>{offering.turnaroundDays} days</span>
                        </div>
                        
                        {offering.expressAvailable && (
                          <span className="text-blue-600">
                            Express available (+${((offering.expressPrice || 0) / 100).toFixed(2)})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="ml-4">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        selectedOffering?.id === offering.id
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {selectedOffering?.id === offering.id && (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Custom Price Input */}
          {selectedOffering && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Price Override (optional)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">$</span>
                <input
                  type="number"
                  value={(customPrice || selectedOffering.basePrice) / 100}
                  onChange={(e) => setCustomPrice(Math.round(parseFloat(e.target.value) * 100))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="0.01"
                  min="0"
                />
                <button
                  onClick={() => setCustomPrice(selectedOffering.basePrice)}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Reset to ${(selectedOffering.basePrice / 100).toFixed(2)}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              {selectedOffering && (
                <p className="text-sm text-gray-600">
                  Selected: <span className="font-medium">{selectedOffering.publisherName}</span>
                  {customPrice !== selectedOffering.basePrice && (
                    <span className="ml-2 text-blue-600">
                      (Custom price: ${(customPrice! / 100).toFixed(2)})
                    </span>
                  )}
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={!selectedOffering || saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Assigning...' : 'Assign Publisher'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}