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
  DollarSign
} from 'lucide-react';

interface PaymentProfileFormProps {
  publisherId: string;
  existingProfile: any;
}

export default function PublisherPaymentProfileForm({ 
  publisherId, 
  existingProfile 
}: PaymentProfileFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Payment Method
    preferredMethod: existingProfile?.preferred_method || 'bank_transfer',
    
    // Bank Details
    bankName: existingProfile?.bank_name || '',
    bankAccountHolder: existingProfile?.bank_account_holder || '',
    bankAccountNumber: existingProfile?.bank_account_number || '',
    bankRoutingNumber: existingProfile?.bank_routing_number || '',
    bankSwiftCode: existingProfile?.bank_swift_code || '',
    bankAddress: existingProfile?.bank_address || '',
    
    // PayPal
    paypalEmail: existingProfile?.paypal_email || '',
    
    // Mailing Address
    mailingAddress: existingProfile?.mailing_address || '',
    mailingCity: existingProfile?.mailing_city || '',
    mailingState: existingProfile?.mailing_state || '',
    mailingZip: existingProfile?.mailing_zip || '',
    mailingCountry: existingProfile?.mailing_country || 'US',
    
    // Tax Information
    taxId: existingProfile?.tax_id || '',
    taxFormType: existingProfile?.tax_form_type || 'W9',
    isBusiness: existingProfile?.is_business || false,
    businessName: existingProfile?.business_name || '',
    
    // Payment Preferences
    minimumPayoutAmount: existingProfile?.minimum_payout_amount || 5000,
    paymentFrequency: existingProfile?.payment_frequency || 'monthly',
    preferredPaymentDay: existingProfile?.preferred_payment_day || 1,
  });

  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaveStatus('idle');

    try {
      const response = await fetch('/api/publisher/payment-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        const error = await response.json();
        console.error('Save failed:', error);
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('Error saving payment profile:', error);
      setSaveStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Payment Method Selection */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-4">
          <CreditCard className="h-5 w-5 text-blue-600 mr-2" />
          <h2 className="text-lg font-semibold">Payment Method</h2>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { value: 'bank_transfer', label: 'Bank Transfer', desc: 'Direct bank deposit' },
              { value: 'paypal', label: 'PayPal', desc: 'PayPal account' },
              { value: 'check', label: 'Check', desc: 'Mailed check' }
            ].map(method => (
              <label key={method.value} className="relative">
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method.value}
                  checked={formData.preferredMethod === method.value}
                  onChange={(e) => handleChange('preferredMethod', e.target.value)}
                  className="sr-only"
                />
                <div className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                  formData.preferredMethod === method.value 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <div className="font-medium">{method.label}</div>
                  <div className="text-sm text-gray-600">{method.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Bank Transfer Details */}
      {formData.preferredMethod === 'bank_transfer' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <Building className="h-5 w-5 text-green-600 mr-2" />
            <h2 className="text-lg font-semibold">Bank Account Details</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Name *
              </label>
              <input
                type="text"
                value={formData.bankName}
                onChange={(e) => handleChange('bankName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Holder Name *
              </label>
              <input
                type="text"
                value={formData.bankAccountHolder}
                onChange={(e) => handleChange('bankAccountHolder', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Number *
              </label>
              <input
                type="text"
                value={formData.bankAccountNumber}
                onChange={(e) => handleChange('bankAccountNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Routing Number *
              </label>
              <input
                type="text"
                value={formData.bankRoutingNumber}
                onChange={(e) => handleChange('bankRoutingNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SWIFT Code (International)
              </label>
              <input
                type="text"
                value={formData.bankSwiftCode}
                onChange={(e) => handleChange('bankSwiftCode', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* PayPal Details */}
      {formData.preferredMethod === 'paypal' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <Mail className="h-5 w-5 text-blue-600 mr-2" />
            <h2 className="text-lg font-semibold">PayPal Details</h2>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PayPal Email Address *
            </label>
            <input
              type="email"
              value={formData.paypalEmail}
              onChange={(e) => handleChange('paypalEmail', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>
      )}

      {/* Mailing Address (for checks) */}
      {formData.preferredMethod === 'check' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <MapPin className="h-5 w-5 text-red-600 mr-2" />
            <h2 className="text-lg font-semibold">Mailing Address</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Street Address *
              </label>
              <textarea
                value={formData.mailingAddress}
                onChange={(e) => handleChange('mailingAddress', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                <input
                  type="text"
                  value={formData.mailingCity}
                  onChange={(e) => handleChange('mailingCity', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                <input
                  type="text"
                  value={formData.mailingState}
                  onChange={(e) => handleChange('mailingState', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ZIP *</label>
                <input
                  type="text"
                  value={formData.mailingZip}
                  onChange={(e) => handleChange('mailingZip', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
                <select
                  value={formData.mailingCountry}
                  onChange={(e) => handleChange('mailingCountry', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="GB">United Kingdom</option>
                  <option value="AU">Australia</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tax Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Tax Information</h2>
        
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isBusiness"
              checked={formData.isBusiness}
              onChange={(e) => handleChange('isBusiness', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isBusiness" className="ml-2 text-sm font-medium text-gray-700">
              I am a business entity
            </label>
          </div>
          
          {formData.isBusiness && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Name *
              </label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => handleChange('businessName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tax ID (SSN/EIN) *
              </label>
              <input
                type="text"
                value={formData.taxId}
                onChange={(e) => handleChange('taxId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tax Form Type
              </label>
              <select
                value={formData.taxFormType}
                onChange={(e) => handleChange('taxFormType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="W9">W-9 (US Person)</option>
                <option value="W8">W-8 (Foreign Person)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Preferences */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-4">
          <DollarSign className="h-5 w-5 text-green-600 mr-2" />
          <h2 className="text-lg font-semibold">Payment Preferences</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Payout Amount
            </label>
            <select
              value={formData.minimumPayoutAmount}
              onChange={(e) => handleChange('minimumPayoutAmount', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={2500}>$25</option>
              <option value={5000}>$50</option>
              <option value={10000}>$100</option>
              <option value={25000}>$250</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Frequency
            </label>
            <select
              value={formData.paymentFrequency}
              onChange={(e) => handleChange('paymentFrequency', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preferred Payment Day
            </label>
            <select
              value={formData.preferredPaymentDay}
              onChange={(e) => handleChange('preferredPaymentDay', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                <option key={day} value={day}>
                  {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {saveStatus === 'success' && (
            <div className="flex items-center text-green-600">
              <CheckCircle className="h-5 w-5 mr-1" />
              <span className="text-sm">Profile saved successfully!</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center text-red-600">
              <AlertCircle className="h-5 w-5 mr-1" />
              <span className="text-sm">Failed to save profile. Please try again.</span>
            </div>
          )}
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </form>
  );
}