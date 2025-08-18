'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Plus, 
  Edit2, 
  Trash2, 
  DollarSign,
  Zap,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  Percent,
  Calendar,
  FileText,
  Settings,
  Power,
  Copy,
  ChevronDown,
  ChevronUp,
  Hash,
  Type,
  Clock,
  Link as LinkIcon,
  Globe,
  Users,
  Package
} from 'lucide-react';

interface PricingRule {
  id: string;
  ruleName: string;
  ruleType: string;
  description?: string;
  conditions: any;
  actions: any;
  priority: number;
  isCumulative: boolean;
  autoApply: boolean;
  requiresApproval: boolean;
  validFrom?: string;
  validUntil?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Offering {
  id: string;
  offeringType: string;
  basePrice: number;
  currency: string;
  website?: {
    domain: string;
  };
}

export default function PricingRulesPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: offeringId } = use(params);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [offering, setOffering] = useState<Offering | null>(null);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [showAddRule, setShowAddRule] = useState(false);
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);
  
  // Form state for new/edit rule
  const [ruleForm, setRuleForm] = useState({
    ruleName: '',
    ruleType: 'word_count',
    description: '',
    // Conditions
    conditionType: 'greater_than',
    conditionValue: '',
    conditionField: 'wordCount',
    // Actions
    adjustmentType: 'percentage',
    adjustmentValue: '',
    // Settings
    priority: 0,
    isCumulative: false,
    autoApply: true,
    requiresApproval: false,
    validFrom: '',
    validUntil: '',
    isActive: true
  });

  const ruleTypes = [
    { value: 'word_count', label: 'Word Count', icon: Type, field: 'wordCount' },
    { value: 'turnaround', label: 'Turnaround Time', icon: Clock, field: 'turnaroundDays' },
    { value: 'link_type', label: 'Link Type', icon: LinkIcon, field: 'linkType' },
    { value: 'bulk_discount', label: 'Bulk Order', icon: Package, field: 'quantity' },
    { value: 'client_type', label: 'Client Type', icon: Users, field: 'clientType' },
    { value: 'seasonal', label: 'Seasonal/Date', icon: Calendar, field: 'date' },
    { value: 'niche', label: 'Content Niche', icon: Globe, field: 'niche' },
    { value: 'custom', label: 'Custom Rule', icon: Settings, field: 'custom' }
  ];

  const conditionTypes = {
    word_count: [
      { value: 'greater_than', label: 'Greater than' },
      { value: 'less_than', label: 'Less than' },
      { value: 'between', label: 'Between' },
      { value: 'equals', label: 'Equals' }
    ],
    turnaround: [
      { value: 'less_than', label: 'Less than (Rush)' },
      { value: 'greater_than', label: 'Greater than (Extended)' },
      { value: 'equals', label: 'Exactly' }
    ],
    link_type: [
      { value: 'equals', label: 'Is' },
      { value: 'not_equals', label: 'Is not' },
      { value: 'in', label: 'In list' }
    ],
    bulk_discount: [
      { value: 'greater_than', label: 'More than' },
      { value: 'between', label: 'Between' },
      { value: 'equals', label: 'Exactly' }
    ],
    client_type: [
      { value: 'equals', label: 'Is' },
      { value: 'in', label: 'In list' }
    ],
    seasonal: [
      { value: 'date_range', label: 'Date range' },
      { value: 'day_of_week', label: 'Day of week' },
      { value: 'month', label: 'Month' }
    ],
    niche: [
      { value: 'equals', label: 'Is' },
      { value: 'in', label: 'In list' },
      { value: 'not_in', label: 'Not in list' }
    ],
    custom: [
      { value: 'custom', label: 'Custom condition' }
    ]
  };

  const adjustmentTypes = [
    { value: 'percentage', label: 'Percentage', icon: Percent },
    { value: 'fixed', label: 'Fixed Amount', icon: DollarSign },
    { value: 'multiplier', label: 'Multiplier', icon: Hash }
  ];

  useEffect(() => {
    loadOffering();
    loadPricingRules();
  }, [offeringId]);

  const loadOffering = async () => {
    try {
      const response = await fetch(`/api/publisher/offerings/${offeringId}`);
      if (!response.ok) {
        throw new Error('Failed to load offering');
      }
      const data = await response.json();
      setOffering(data.offering);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load offering');
    }
  };

  const loadPricingRules = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/publisher/offerings/${offeringId}/pricing-rules`);
      if (!response.ok) {
        throw new Error('Failed to load pricing rules');
      }
      const data = await response.json();
      setPricingRules(data.pricingRules || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pricing rules');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Build conditions and actions based on rule type
      const conditions: any = {
        type: ruleForm.conditionType,
        field: ruleTypes.find(r => r.value === ruleForm.ruleType)?.field
      };

      // Add condition values based on type
      if (ruleForm.conditionType === 'between') {
        const [min, max] = ruleForm.conditionValue.split('-').map(v => v.trim());
        conditions.min = isNaN(Number(min)) ? min : Number(min);
        conditions.max = isNaN(Number(max)) ? max : Number(max);
      } else if (ruleForm.conditionType === 'in' || ruleForm.conditionType === 'not_in') {
        conditions.values = ruleForm.conditionValue.split(',').map(v => v.trim());
      } else if (ruleForm.conditionType === 'date_range') {
        const [start, end] = ruleForm.conditionValue.split(' to ');
        conditions.startDate = start;
        conditions.endDate = end;
      } else {
        conditions.value = isNaN(Number(ruleForm.conditionValue)) 
          ? ruleForm.conditionValue 
          : Number(ruleForm.conditionValue);
      }

      const actions = {
        adjustmentType: ruleForm.adjustmentType,
        adjustmentValue: Number(ruleForm.adjustmentValue)
      };

      const ruleData = {
        ruleName: ruleForm.ruleName,
        ruleType: ruleForm.ruleType,
        description: ruleForm.description || undefined,
        conditions,
        actions,
        priority: ruleForm.priority,
        isCumulative: ruleForm.isCumulative,
        autoApply: ruleForm.autoApply,
        requiresApproval: ruleForm.requiresApproval,
        validFrom: ruleForm.validFrom || undefined,
        validUntil: ruleForm.validUntil || undefined,
        isActive: ruleForm.isActive
      };

      let response;
      if (editingRule) {
        // Update existing rule
        response = await fetch(
          `/api/publisher/offerings/${offeringId}/pricing-rules/${editingRule.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ruleData)
          }
        );
      } else {
        // Create new rule
        response = await fetch(
          `/api/publisher/offerings/${offeringId}/pricing-rules`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ruleData)
          }
        );
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save pricing rule');
      }

      setSuccess(editingRule ? 'Rule updated successfully!' : 'Rule created successfully!');
      resetForm();
      await loadPricingRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save pricing rule');
    } finally {
      setSaving(false);
    }
  };

  const deleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this pricing rule?')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/publisher/offerings/${offeringId}/pricing-rules/${ruleId}`,
        {
          method: 'DELETE'
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete pricing rule');
      }

      setSuccess('Rule deleted successfully!');
      await loadPricingRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete rule');
    }
  };

  const toggleRuleStatus = async (rule: PricingRule) => {
    try {
      const response = await fetch(
        `/api/publisher/offerings/${offeringId}/pricing-rules/${rule.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: !rule.isActive })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update rule status');
      }

      await loadPricingRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update rule');
    }
  };

  const editRule = (rule: PricingRule) => {
    setEditingRule(rule);
    
    // Parse the rule back into form state
    const ruleType = ruleTypes.find(rt => rt.field === rule.conditions.field)?.value || 'custom';
    
    let conditionValue = '';
    if (rule.conditions.type === 'between' && rule.conditions.min !== undefined && rule.conditions.max !== undefined) {
      conditionValue = `${rule.conditions.min}-${rule.conditions.max}`;
    } else if ((rule.conditions.type === 'in' || rule.conditions.type === 'not_in') && rule.conditions.values) {
      conditionValue = rule.conditions.values.join(', ');
    } else if (rule.conditions.type === 'date_range' && rule.conditions.startDate && rule.conditions.endDate) {
      conditionValue = `${rule.conditions.startDate} to ${rule.conditions.endDate}`;
    } else if (rule.conditions.value !== undefined) {
      conditionValue = String(rule.conditions.value);
    }

    setRuleForm({
      ruleName: rule.ruleName,
      ruleType: ruleType,
      description: rule.description || '',
      conditionType: rule.conditions.type || 'greater_than',
      conditionValue,
      conditionField: rule.conditions.field || '',
      adjustmentType: rule.actions.adjustmentType || 'percentage',
      adjustmentValue: String(rule.actions.adjustmentValue || ''),
      priority: rule.priority,
      isCumulative: rule.isCumulative,
      autoApply: rule.autoApply,
      requiresApproval: rule.requiresApproval,
      validFrom: rule.validFrom ? rule.validFrom.split('T')[0] : '',
      validUntil: rule.validUntil ? rule.validUntil.split('T')[0] : '',
      isActive: rule.isActive
    });
    
    setShowAddRule(true);
  };

  const resetForm = () => {
    setRuleForm({
      ruleName: '',
      ruleType: 'word_count',
      description: '',
      conditionType: 'greater_than',
      conditionValue: '',
      conditionField: 'wordCount',
      adjustmentType: 'percentage',
      adjustmentValue: '',
      priority: 0,
      isCumulative: false,
      autoApply: true,
      requiresApproval: false,
      validFrom: '',
      validUntil: '',
      isActive: true
    });
    setEditingRule(null);
    setShowAddRule(false);
  };

  const formatAdjustment = (rule: PricingRule) => {
    const { adjustmentType, adjustmentValue } = rule.actions;
    if (adjustmentType === 'percentage') {
      return `${adjustmentValue > 0 ? '+' : ''}${adjustmentValue}%`;
    } else if (adjustmentType === 'fixed') {
      return `${adjustmentValue > 0 ? '+' : ''}$${Math.abs(adjustmentValue / 100).toFixed(2)}`;
    } else if (adjustmentType === 'multiplier') {
      return `×${adjustmentValue}`;
    }
    return adjustmentValue;
  };

  const formatCondition = (rule: PricingRule) => {
    const { type, field, value, values, min, max, startDate, endDate } = rule.conditions;
    
    if (type === 'between' && min !== undefined && max !== undefined) {
      return `${field} between ${min} and ${max}`;
    } else if (type === 'in' && values) {
      return `${field} in [${values.join(', ')}]`;
    } else if (type === 'not_in' && values) {
      return `${field} not in [${values.join(', ')}]`;
    } else if (type === 'date_range' && startDate && endDate) {
      return `From ${startDate} to ${endDate}`;
    } else if (value !== undefined) {
      return `${field} ${type.replace('_', ' ')} ${value}`;
    }
    return type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading pricing rules...</span>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href={`/publisher/offerings/${offeringId}/edit`}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Offering
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Pricing Rules</h1>
              <p className="mt-2 text-gray-600">
                Dynamic pricing for {offering?.website?.domain || 'your offering'}
              </p>
              {offering && (
                <div className="mt-2 flex items-center text-sm text-gray-500">
                  <DollarSign className="h-4 w-4 mr-1" />
                  Base price: ${(offering.basePrice / 100).toFixed(2)} {offering.currency}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowAddRule(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Rule
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center">
            <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            {success}
          </div>
        )}

        {/* Add/Edit Rule Form */}
        {showAddRule && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingRule ? 'Edit Pricing Rule' : 'Add New Pricing Rule'}
              </h2>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rule Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={ruleForm.ruleName}
                    onChange={(e) => setRuleForm({ ...ruleForm, ruleName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Long-form content surcharge"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rule Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={ruleForm.ruleType}
                    onChange={(e) => setRuleForm({ 
                      ...ruleForm, 
                      ruleType: e.target.value,
                      conditionField: ruleTypes.find(r => r.value === e.target.value)?.field || 'custom'
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    {ruleTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={ruleForm.description}
                  onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="Describe when this rule applies..."
                />
              </div>

              {/* Conditions */}
              <div className="border-t pt-6">
                <h3 className="text-md font-semibold text-gray-900 mb-4">Conditions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Condition Type
                    </label>
                    <select
                      value={ruleForm.conditionType}
                      onChange={(e) => setRuleForm({ ...ruleForm, conditionType: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {(conditionTypes[ruleForm.ruleType as keyof typeof conditionTypes] || []).map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Condition Value
                    </label>
                    <input
                      type="text"
                      value={ruleForm.conditionValue}
                      onChange={(e) => setRuleForm({ ...ruleForm, conditionValue: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={
                        ruleForm.conditionType === 'between' ? 'e.g., 1000-2000' :
                        ruleForm.conditionType === 'in' ? 'e.g., dofollow, nofollow' :
                        ruleForm.conditionType === 'date_range' ? 'e.g., 2024-12-01 to 2024-12-31' :
                        'e.g., 1500'
                      }
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="border-t pt-6">
                <h3 className="text-md font-semibold text-gray-900 mb-4">Price Adjustment</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adjustment Type
                    </label>
                    <select
                      value={ruleForm.adjustmentType}
                      onChange={(e) => setRuleForm({ ...ruleForm, adjustmentType: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {adjustmentTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adjustment Value
                    </label>
                    <input
                      type="number"
                      value={ruleForm.adjustmentValue}
                      onChange={(e) => setRuleForm({ ...ruleForm, adjustmentValue: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={
                        ruleForm.adjustmentType === 'percentage' ? 'e.g., 10 for 10%' :
                        ruleForm.adjustmentType === 'fixed' ? 'e.g., 50 for $50' :
                        'e.g., 1.5 for 1.5x'
                      }
                      step="0.01"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {ruleForm.adjustmentType === 'percentage' && 'Use negative values for discounts'}
                      {ruleForm.adjustmentType === 'fixed' && 'Enter amount in dollars (will be converted to cents)'}
                      {ruleForm.adjustmentType === 'multiplier' && 'e.g., 0.9 for 10% discount, 1.1 for 10% increase'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Settings */}
              <div className="border-t pt-6">
                <h3 className="text-md font-semibold text-gray-900 mb-4">Settings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority (0-100)
                    </label>
                    <input
                      type="number"
                      value={ruleForm.priority}
                      onChange={(e) => setRuleForm({ ...ruleForm, priority: Number(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      max="100"
                    />
                    <p className="mt-1 text-xs text-gray-500">Higher priority rules are applied first</p>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ruleForm.isCumulative}
                        onChange={(e) => setRuleForm({ ...ruleForm, isCumulative: e.target.checked })}
                        className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Cumulative (stacks with other rules)</span>
                    </label>

                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ruleForm.autoApply}
                        onChange={(e) => setRuleForm({ ...ruleForm, autoApply: e.target.checked })}
                        className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Auto-apply to matching orders</span>
                    </label>

                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ruleForm.requiresApproval}
                        onChange={(e) => setRuleForm({ ...ruleForm, requiresApproval: e.target.checked })}
                        className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Requires approval</span>
                    </label>

                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ruleForm.isActive}
                        onChange={(e) => setRuleForm({ ...ruleForm, isActive: e.target.checked })}
                        className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Active</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Valid From
                    </label>
                    <input
                      type="date"
                      value={ruleForm.validFrom}
                      onChange={(e) => setRuleForm({ ...ruleForm, validFrom: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Valid Until
                    </label>
                    <input
                      type="date"
                      value={ruleForm.validUntil}
                      onChange={(e) => setRuleForm({ ...ruleForm, validUntil: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      {editingRule ? 'Update' : 'Create'} Rule
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Pricing Rules List */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Rules</h2>
            
            {pricingRules.length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No pricing rules configured yet</p>
                <p className="text-sm text-gray-500">
                  Add dynamic pricing rules to automatically adjust prices based on conditions
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pricingRules
                  .sort((a, b) => b.priority - a.priority)
                  .map((rule) => (
                    <div 
                      key={rule.id} 
                      className={`border rounded-lg p-4 ${
                        !rule.isActive ? 'bg-gray-50 opacity-60' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <h3 className="font-semibold text-gray-900 mr-3">{rule.ruleName}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              rule.isActive 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {rule.isActive ? 'Active' : 'Inactive'}
                            </span>
                            {rule.isCumulative && (
                              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                Cumulative
                              </span>
                            )}
                            {rule.requiresApproval && (
                              <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                                Requires Approval
                              </span>
                            )}
                          </div>
                          
                          {rule.description && (
                            <p className="text-sm text-gray-600 mb-2">{rule.description}</p>
                          )}

                          <div className="flex items-center space-x-6 text-sm">
                            <div className="flex items-center text-gray-600">
                              <Settings className="h-4 w-4 mr-1" />
                              <span>When: {formatCondition(rule)}</span>
                            </div>
                            <div className="flex items-center font-medium">
                              {rule.actions.adjustmentValue > 0 ? (
                                <TrendingUp className="h-4 w-4 mr-1 text-green-600" />
                              ) : (
                                <TrendingDown className="h-4 w-4 mr-1 text-red-600" />
                              )}
                              <span className={rule.actions.adjustmentValue > 0 ? 'text-green-600' : 'text-red-600'}>
                                {formatAdjustment(rule)}
                              </span>
                            </div>
                            <div className="flex items-center text-gray-500">
                              <span>Priority: {rule.priority}</span>
                            </div>
                          </div>

                          {(rule.validFrom || rule.validUntil) && (
                            <div className="mt-2 flex items-center text-xs text-gray-500">
                              <Calendar className="h-3 w-3 mr-1" />
                              {rule.validFrom && `From ${new Date(rule.validFrom).toLocaleDateString()}`}
                              {rule.validFrom && rule.validUntil && ' - '}
                              {rule.validUntil && `Until ${new Date(rule.validUntil).toLocaleDateString()}`}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => toggleRuleStatus(rule)}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title={rule.isActive ? 'Deactivate' : 'Activate'}
                          >
                            <Power className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => editRule(rule)}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Rule"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteRule(rule.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Rule"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">How pricing rules work:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Rules are evaluated in priority order (highest first)</li>
                <li>Non-cumulative rules stop evaluation once applied</li>
                <li>Cumulative rules stack with other cumulative rules</li>
                <li>Auto-apply rules are automatically applied to matching orders</li>
                <li>Rules requiring approval must be manually confirmed</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}