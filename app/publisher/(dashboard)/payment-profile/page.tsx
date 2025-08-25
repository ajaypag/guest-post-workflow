'use client';

import { useState } from 'react';
import { 
  CreditCard, 
  Building, 
  Mail,
  MapPin,
  Save,
  AlertCircle,
  CheckCircle,
  Globe,
  Banknote
} from 'lucide-react';
// PublisherHeader handled by layout.tsx
// PublisherAuthWrapper handled by layout.tsx

export default function PaymentProfilePage() {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [profileData, setProfileData] = useState({
    preferredMethod: 'bank_transfer',
    
    // Bank Transfer Details
    bankName: '',
    bankAccountHolder: '',
    bankAccountNumber: '',
    bankRoutingNumber: '',
    bankSwiftCode: '',
    bankAddress: '',
    
    // PayPal Details
    paypalEmail: '',
    
    // Payoneer Details
    payoneerEmail: '',
    
    // Wise Details  
    wiseEmail: '',
    wiseCurrency: 'USD',
    
    // Mailing Address (for checks)
    mailingAddress: '',
    mailingCity: '',
    mailingState: '',
    mailingZip: '',
    mailingCountry: 'US',
    
    // Tax Information
    taxId: '',
    taxFormType: 'W9',
    isBusiness: false,
    businessName: '',
    
    // Payment Preferences
    minimumPayoutAmount: 100,
    paymentFrequency: 'monthly',
    preferredPaymentDay: 1
  });

  const handleInputChange = (field: string, value: any) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields based on payment method
      if (profileData.preferredMethod === 'bank_transfer') {
        if (!profileData.bankName || !profileData.bankAccountNumber || !profileData.bankRoutingNumber) {
          throw new Error('Bank details are required for bank transfers');
        }
      } else if (profileData.preferredMethod === 'paypal') {
        if (!profileData.paypalEmail) {
          throw new Error('PayPal email is required');
        }
      } else if (profileData.preferredMethod === 'payoneer') {
        if (!profileData.payoneerEmail) {
          throw new Error('Payoneer email is required');
        }
      } else if (profileData.preferredMethod === 'wise') {
        if (!profileData.wiseEmail) {
          throw new Error('Wise email is required');
        }
      } else if (profileData.preferredMethod === 'check') {
        if (!profileData.mailingAddress || !profileData.mailingCity) {
          throw new Error('Mailing address is required for check payments');
        }
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center gap-3">
              <CreditCard className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Payment Profile</h1>
                <p className="text-sm text-gray-600">Configure your payment preferences and tax information</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Form */}
              <div className="lg:col-span-2 space-y-6">
                {/* Payment Method Selection */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h2>
                  
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="bank_transfer"
                        checked={profileData.preferredMethod === 'bank_transfer'}
                        onChange={(e) => handleInputChange('preferredMethod', e.target.value)}
                        className="mr-3"
                      />
                      <Building className="h-5 w-5 text-gray-600 mr-2" />
                      <span>Bank Transfer (ACH)</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="paypal"
                        checked={profileData.preferredMethod === 'paypal'}
                        onChange={(e) => handleInputChange('preferredMethod', e.target.value)}
                        className="mr-3"
                      />
                      <Mail className="h-5 w-5 text-gray-600 mr-2" />
                      <span>PayPal</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="payoneer"
                        checked={profileData.preferredMethod === 'payoneer'}
                        onChange={(e) => handleInputChange('preferredMethod', e.target.value)}
                        className="mr-3"
                      />
                      <Banknote className="h-5 w-5 text-gray-600 mr-2" />
                      <span>Payoneer</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="wise"
                        checked={profileData.preferredMethod === 'wise'}
                        onChange={(e) => handleInputChange('preferredMethod', e.target.value)}
                        className="mr-3"
                      />
                      <Globe className="h-5 w-5 text-gray-600 mr-2" />
                      <span>Wise (formerly TransferWise)</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="check"
                        checked={profileData.preferredMethod === 'check'}
                        onChange={(e) => handleInputChange('preferredMethod', e.target.value)}
                        className="mr-3"
                      />
                      <MapPin className="h-5 w-5 text-gray-600 mr-2" />
                      <span>Check (Mail)</span>
                    </label>
                  </div>
                </div>

                {/* Bank Transfer Details */}
                {profileData.preferredMethod === 'bank_transfer' && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Bank Transfer Details</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Bank Name *
                        </label>
                        <input
                          type="text"
                          value={profileData.bankName}
                          onChange={(e) => handleInputChange('bankName', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Account Holder Name *
                        </label>
                        <input
                          type="text"
                          value={profileData.bankAccountHolder}
                          onChange={(e) => handleInputChange('bankAccountHolder', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Account Number *
                        </label>
                        <input
                          type="text"
                          value={profileData.bankAccountNumber}
                          onChange={(e) => handleInputChange('bankAccountNumber', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Routing Number *
                        </label>
                        <input
                          type="text"
                          value={profileData.bankRoutingNumber}
                          onChange={(e) => handleInputChange('bankRoutingNumber', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* PayPal Details */}
                {profileData.preferredMethod === 'paypal' && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">PayPal Details</h2>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        PayPal Email Address *
                      </label>
                      <input
                        type="email"
                        value={profileData.paypalEmail}
                        onChange={(e) => handleInputChange('paypalEmail', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Payoneer Details */}
                {profileData.preferredMethod === 'payoneer' && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Payoneer Details</h2>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payoneer Account Email *
                      </label>
                      <input
                        type="email"
                        value={profileData.payoneerEmail}
                        onChange={(e) => handleInputChange('payoneerEmail', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="your-email@payoneer.com"
                        required
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Enter the email address associated with your Payoneer account
                      </p>
                    </div>
                  </div>
                )}

                {/* Wise Details */}
                {profileData.preferredMethod === 'wise' && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Wise Details</h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Wise Account Email *
                        </label>
                        <input
                          type="email"
                          value={profileData.wiseEmail}
                          onChange={(e) => handleInputChange('wiseEmail', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="your-email@wise.com"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Preferred Currency
                        </label>
                        <select
                          value={profileData.wiseCurrency}
                          onChange={(e) => handleInputChange('wiseCurrency', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="USD">USD - US Dollar</option>
                          <option value="EUR">EUR - Euro</option>
                          <option value="GBP">GBP - British Pound</option>
                          <option value="CAD">CAD - Canadian Dollar</option>
                          <option value="AUD">AUD - Australian Dollar</option>
                          <option value="CHF">CHF - Swiss Franc</option>
                          <option value="JPY">JPY - Japanese Yen</option>
                        </select>
                      </div>
                      
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm text-blue-800">
                          💡 <strong>Wise Benefits:</strong> Lower fees and better exchange rates for international transfers. 
                          Perfect for publishers outside the US.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mailing Address */}
                {profileData.preferredMethod === 'check' && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Mailing Address</h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Street Address *
                        </label>
                        <input
                          type="text"
                          value={profileData.mailingAddress}
                          onChange={(e) => handleInputChange('mailingAddress', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            City *
                          </label>
                          <input
                            type="text"
                            value={profileData.mailingCity}
                            onChange={(e) => handleInputChange('mailingCity', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            State
                          </label>
                          <input
                            type="text"
                            value={profileData.mailingState}
                            onChange={(e) => handleInputChange('mailingState', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            ZIP Code
                          </label>
                          <input
                            type="text"
                            value={profileData.mailingZip}
                            onChange={(e) => handleInputChange('mailingZip', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tax Information */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Tax Information</h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={profileData.isBusiness}
                        onChange={(e) => handleInputChange('isBusiness', e.target.checked)}
                        className="mr-3"
                      />
                      <label className="text-sm text-gray-700">This is a business account</label>
                    </div>
                    
                    {profileData.isBusiness && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Business Name
                        </label>
                        <input
                          type="text"
                          value={profileData.businessName}
                          onChange={(e) => handleInputChange('businessName', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tax ID (SSN/EIN)
                        </label>
                        <input
                          type="text"
                          value={profileData.taxId}
                          onChange={(e) => handleInputChange('taxId', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tax Form Type
                        </label>
                        <select
                          value={profileData.taxFormType}
                          onChange={(e) => handleInputChange('taxFormType', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="W9">W-9 (US Person)</option>
                          <option value="W8">W-8 (Non-US Person)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Preferences Sidebar */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Preferences</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Minimum Payout Amount
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-500">$</span>
                        <input
                          type="number"
                          value={profileData.minimumPayoutAmount}
                          onChange={(e) => handleInputChange('minimumPayoutAmount', Number(e.target.value))}
                          className="w-full pl-8 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="25"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Frequency
                      </label>
                      <select
                        value={profileData.paymentFrequency}
                        onChange={(e) => handleInputChange('paymentFrequency', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Bi-weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  </div>

                  {/* Success/Error Messages */}
                  {saved && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                        <p className="text-sm text-green-800">Profile saved successfully!</p>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center">
                        <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-6 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Profile
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    
  );
}