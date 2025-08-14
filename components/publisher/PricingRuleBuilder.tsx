'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft,
  Plus,
  X,
  Save,
  AlertCircle,
  DollarSign,
  Calendar,
  Globe,
  Users,
  Package,
  Percent,
  Hash,
  FileText,
  ChevronDown,
  ChevronUp,
  Settings,
  Trash2
} from 'lucide-react';
import { PublisherOffering, Website } from '@/lib/types/publisher';

interface PricingRule {
  id: string;
  publisherOfferingId: string;
  ruleType: 'percentage' | 'fixed' | 'dynamic';
  conditionType: string;
  conditionValue: any;
  adjustmentType: 'increase' | 'decrease' | 'set';
  adjustmentValue: string;
  priority: number;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PricingRuleBuilderProps {
  offering: PublisherOffering;
  website: Website;
  existingRules: PricingRule[];
}

const CONDITION_TYPES = [
  { 
    value: 'order_volume', 
    label: 'Order Volume',
    icon: Hash,
    description: 'Based on number of orders',
    valueType: 'number',
    placeholder: 'e.g., 5'
  },
  { 
    value: 'client_type', 
    label: 'Client Type',
    icon: Users,
    description: 'Based on client category',
    valueType: 'select',
    options: ['new', 'returning', 'enterprise', 'agency']
  },
  { 
    value: 'seasonal', 
    label: 'Seasonal',
    icon: Calendar,
    description: 'Time-based pricing',
    valueType: 'date_range'
  },
  { 
    value: 'content_length', 
    label: 'Content Length',
    icon: FileText,
    description: 'Based on word count',
    valueType: 'number',
    placeholder: 'e.g., 1500'
  },
  { 
    value: 'turnaround_time', 
    label: 'Rush Order',
    icon: Calendar,
    description: 'Faster delivery pricing',
    valueType: 'number',
    placeholder: 'Days (e.g., 3)'
  },
  { 
    value: 'niche', 
    label: 'Industry/Niche',
    icon: Globe,
    description: 'Niche-specific pricing',
    valueType: 'select',
    options: ['technology', 'finance', 'health', 'lifestyle', 'business', 'other']
  },
];

const ADJUSTMENT_TYPES = [
  { value: 'increase', label: 'Increase by', symbol: '+' },
  { value: 'decrease', label: 'Decrease by', symbol: '-' },
  { value: 'set', label: 'Set to', symbol: '=' },
];

export default function PricingRuleBuilder({ offering, website, existingRules }: PricingRuleBuilderProps) {
  const router = useRouter();
  const [rules, setRules] = useState<PricingRule[]>(existingRules || []);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [testPrice, setTestPrice] = useState<number | null>(null);

  // Add new rule
  const addNewRule = () => {
    const newRule: PricingRule = {
      id: `new-${Date.now()}`,
      publisherOfferingId: offering.id,
      ruleType: 'percentage',
      conditionType: 'order_volume',
      conditionValue: '',
      adjustmentType: 'increase',
      adjustmentValue: '',
      priority: rules.length + 1,
      isActive: true,
    };
    setRules([...rules, newRule]);
    setExpandedRule(newRule.id);
  };

  // Update rule
  const updateRule = (ruleId: string, field: keyof PricingRule, value: any) => {
    setRules(rules.map(rule => 
      rule.id === ruleId ? { ...rule, [field]: value } : rule
    ));
  };

  // Delete rule
  const deleteRule = (ruleId: string) => {
    setRules(rules.filter(rule => rule.id !== ruleId));
  };

  // Reorder rules
  const moveRule = (index: number, direction: 'up' | 'down') => {
    const newRules = [...rules];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex >= 0 && newIndex < rules.length) {
      [newRules[index], newRules[newIndex]] = [newRules[newIndex], newRules[index]];
      // Update priorities
      newRules.forEach((rule, idx) => {
        rule.priority = idx + 1;
      });
      setRules(newRules);
    }
  };

  // Calculate test price
  const calculateTestPrice = () => {
    let price = parseFloat(offering.basePrice) / 100;
    
    // Apply rules in priority order
    const activeRules = rules
      .filter(r => r.isActive && r.adjustmentValue)
      .sort((a, b) => a.priority - b.priority);
    
    activeRules.forEach(rule => {
      const adjustment = parseFloat(rule.adjustmentValue);
      
      if (rule.adjustmentType === 'increase') {
        if (rule.ruleType === 'percentage') {
          price += price * (adjustment / 100);
        } else {
          price += adjustment;
        }
      } else if (rule.adjustmentType === 'decrease') {
        if (rule.ruleType === 'percentage') {
          price -= price * (adjustment / 100);
        } else {
          price -= adjustment;
        }
      } else if (rule.adjustmentType === 'set') {
        price = adjustment;
      }
    });
    
    setTestPrice(Math.max(0, price));
  };

  // Save rules
  const handleSave = async () => {
    setError('');
    setLoading(true);

    try {
      // Validate rules
      const validRules = rules.filter(rule => 
        rule.conditionValue && rule.adjustmentValue
      );

      if (validRules.length === 0 && rules.length > 0) {
        throw new Error('Please complete at least one rule or remove empty rules');
      }

      const response = await fetch(`/api/publisher/offerings/${offering.id}/pricing-rules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: validRules }),
      });

      if (!response.ok) {
        throw new Error('Failed to save pricing rules');
      }

      router.push(`/publisher/offerings/${offering.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: offering.currency || 'USD',
      minimumFractionDigits: 2,
    }).format(cents / 100);
  };

  // Get condition input component
  const getConditionInput = (rule: PricingRule) => {
    const conditionType = CONDITION_TYPES.find(ct => ct.value === rule.conditionType);
    
    if (!conditionType) return null;

    switch (conditionType.valueType) {
      case 'number':
        return (
          <input
            type="number"
            value={rule.conditionValue || ''}
            onChange={(e) => updateRule(rule.id, 'conditionValue', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={conditionType.placeholder}
          />
        );
      
      case 'select':
        return (
          <select
            value={rule.conditionValue || ''}
            onChange={(e) => updateRule(rule.id, 'conditionValue', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select...</option>
            {conditionType.options?.map(option => (
              <option key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>
        );
      
      case 'date_range':
        return (
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={rule.conditionValue?.start || ''}
              onChange={(e) => updateRule(rule.id, 'conditionValue', {
                ...rule.conditionValue,
                start: e.target.value
              })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="date"
              value={rule.conditionValue?.end || ''}
              onChange={(e) => updateRule(rule.id, 'conditionValue', {
                ...rule.conditionValue,
                end: e.target.value
              })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center space-x-4">
          <Link
            href={`/publisher/offerings/${offering.id}`}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Pricing Rules</h1>
            <p className="text-sm text-gray-600 mt-1">
              {website.domain} - {offering.offeringType}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Base Price</p>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(parseFloat(offering.basePrice))}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Rules List */}
      <div className="space-y-4">
        {rules.map((rule, index) => {
          const isExpanded = expandedRule === rule.id;
          const conditionType = CONDITION_TYPES.find(ct => ct.value === rule.conditionType);
          
          return (
            <div key={rule.id} className="bg-white rounded-lg shadow-md">
              <div 
                className="p-4 flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedRule(isExpanded ? null : rule.id)}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                  {conditionType && <conditionType.icon className="h-5 w-5 text-gray-400" />}
                  <div>
                    <p className="font-medium text-gray-900">
                      {conditionType?.label || 'New Rule'}
                    </p>
                    {rule.adjustmentValue && (
                      <p className="text-sm text-gray-600">
                        {rule.adjustmentType} {rule.adjustmentValue}
                        {rule.ruleType === 'percentage' ? '%' : ` ${offering.currency}`}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* Priority Controls */}
                  {index > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveRule(index, 'up');
                      }}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    </button>
                  )}
                  {index < rules.length - 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveRule(index, 'down');
                      }}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </button>
                  )}
                  
                  {/* Active Toggle */}
                  <label className="flex items-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={rule.isActive}
                      onChange={(e) => updateRule(rule.id, 'isActive', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm">Active</span>
                  </label>
                  
                  {/* Delete Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteRule(rule.id);
                    }}
                    className="p-1 hover:bg-red-50 text-red-600 rounded"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  
                  {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </div>
              
              {isExpanded && (
                <div className="border-t border-gray-200 p-4 space-y-4">
                  {/* Condition */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      When condition is met:
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <select
                        value={rule.conditionType}
                        onChange={(e) => updateRule(rule.id, 'conditionType', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {CONDITION_TYPES.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      
                      {getConditionInput(rule)}
                    </div>
                    {conditionType && (
                      <p className="text-xs text-gray-500 mt-1">{conditionType.description}</p>
                    )}
                  </div>
                  
                  {/* Adjustment */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price adjustment:
                    </label>
                    <div className="grid grid-cols-3 gap-4">
                      <select
                        value={rule.adjustmentType}
                        onChange={(e) => updateRule(rule.id, 'adjustmentType', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {ADJUSTMENT_TYPES.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      
                      <input
                        type="number"
                        value={rule.adjustmentValue}
                        onChange={(e) => updateRule(rule.id, 'adjustmentValue', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Amount"
                        step="0.01"
                        min="0"
                      />
                      
                      <select
                        value={rule.ruleType}
                        onChange={(e) => updateRule(rule.id, 'ruleType', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed ({offering.currency})</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        
        {/* Add Rule Button */}
        <button
          onClick={addNewRule}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 flex items-center justify-center space-x-2 text-gray-600 hover:text-gray-700"
        >
          <Plus className="h-5 w-5" />
          <span>Add Pricing Rule</span>
        </button>
      </div>

      {/* Price Calculator */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Price Calculator</h2>
        <p className="text-sm text-gray-600 mb-4">
          Test how your pricing rules affect the final price
        </p>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Base Price</p>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(parseFloat(offering.basePrice))}
            </p>
          </div>
          
          <button
            onClick={calculateTestPrice}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Calculate
          </button>
          
          <div>
            <p className="text-sm text-gray-600">Final Price</p>
            <p className="text-xl font-bold text-green-600">
              {testPrice !== null ? formatCurrency(testPrice * 100) : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-4">
        <Link
          href={`/publisher/offerings/${offering.id}`}
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
        >
          Cancel
        </Link>
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Rules'}
        </button>
      </div>
    </div>
  );
}