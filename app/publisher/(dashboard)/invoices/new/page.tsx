'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  FileText, 
  ArrowLeft, 
  Plus,
  Trash2,
  Save,
  AlertCircle
} from 'lucide-react';
// PublisherHeader handled by layout.tsx
// PublisherAuthWrapper handled by layout.tsx

export default function NewInvoicePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    description: '',
    notes: '',
    taxAmount: 0
  });

  const [lineItems, setLineItems] = useState([
    {
      id: '1',
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0
    }
  ]);

  const calculateTotals = () => {
    const grossAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const totalAmount = grossAmount + invoiceData.taxAmount;
    return { grossAmount, totalAmount };
  };

  const updateLineItem = (id: string, field: string, value: any) => {
    setLineItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'rate') {
          updated.amount = updated.quantity * updated.rate;
        }
        return updated;
      }
      return item;
    }));
  };

  const addLineItem = () => {
    const newItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0
    };
    setLineItems(prev => [...prev, newItem]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { grossAmount, totalAmount } = calculateTotals();

      // Validate
      if (!invoiceData.invoiceNumber.trim()) {
        throw new Error('Invoice number is required');
      }
      if (grossAmount <= 0) {
        throw new Error('Invoice must have at least one line item with amount > 0');
      }
      if (!invoiceData.description.trim()) {
        throw new Error('Invoice description is required');
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate success
      alert('Invoice submitted successfully!');
      window.location.href = '/publisher/invoices';
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const { grossAmount, totalAmount } = calculateTotals();

  return (
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Create New Invoice</h1>
                  <p className="text-sm text-gray-600">Submit an invoice for manual payment processing</p>
                </div>
              </div>
              <Link
                href="/publisher/invoices"
                className="inline-flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Invoices
              </Link>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Invoice Form */}
              <div className="lg:col-span-2 space-y-6">
                {/* Invoice Details */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice Details</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Invoice Number *
                      </label>
                      <input
                        type="text"
                        value={invoiceData.invoiceNumber}
                        onChange={(e) => setInvoiceData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Invoice Date *
                      </label>
                      <input
                        type="date"
                        value={invoiceData.invoiceDate}
                        onChange={(e) => setInvoiceData(prev => ({ ...prev, invoiceDate: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description *
                    </label>
                    <textarea
                      value={invoiceData.description}
                      onChange={(e) => setInvoiceData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of services provided..."
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* Line Items */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Line Items</h2>
                    <button
                      type="button"
                      onClick={addLineItem}
                      className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </button>
                  </div>

                  <div className="space-y-4">
                    {lineItems.map((item, index) => (
                      <div key={item.id} className="grid grid-cols-12 gap-3 items-start">
                        <div className="col-span-5">
                          <input
                            type="text"
                            placeholder="Description of work..."
                            value={item.description}
                            onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => updateLineItem(item.id, 'quantity', Number(e.target.value))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min="1"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            placeholder="Rate"
                            value={item.rate}
                            onChange={(e) => updateLineItem(item.id, 'rate', Number(e.target.value))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="col-span-2">
                          <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm">
                            ${item.amount.toFixed(2)}
                          </div>
                        </div>
                        <div className="col-span-1">
                          {lineItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeLineItem(item.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Invoice Summary */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice Summary</h2>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Gross Amount:</span>
                      <span className="font-medium">${grossAmount.toFixed(2)}</span>
                    </div>
                    
                    <div className="border-t pt-3">
                      <div className="flex justify-between text-lg font-semibold">
                        <span>Total Amount:</span>
                        <span className="text-green-600">${totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Error Display */}
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center">
                        <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading || grossAmount <= 0}
                    className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Submit Invoice
                      </>
                    )}
                  </button>

                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Invoice will be reviewed by the internal team
                  </p>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    
  );
}