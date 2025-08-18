'use client';

import { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  Plus,
  X,
  Percent,
  Globe
} from 'lucide-react';

interface NichePricingConfig {
  niches: {
    name: string;
    adjustment: {
      type: 'percentage' | 'multiplier' | 'fixed';
      value: number;
    };
    example?: string;
  }[];
  basePrice: number;
  currency: string;
}

interface Props {
  basePrice: number;
  currency: string;
  existingConfig?: NichePricingConfig;
  onSave: (config: any) => void;
  onCancel: () => void;
}

// Common niches with typical pricing adjustments
const COMMON_NICHES = [
  { name: 'Finance/Crypto', typicalAdjustment: '+50%', reason: 'YMYL content, high compliance' },
  { name: 'Health/Medical', typicalAdjustment: '+40%', reason: 'YMYL content, expertise required' },
  { name: 'Legal', typicalAdjustment: '+35%', reason: 'Specialized knowledge required' },
  { name: 'Technology/SaaS', typicalAdjustment: '+20%', reason: 'Technical expertise needed' },
  { name: 'CBD/Cannabis', typicalAdjustment: '+60%', reason: 'High risk, compliance issues' },
  { name: 'Gambling/Casino', typicalAdjustment: '+75%', reason: 'High risk industry' },
  { name: 'Adult/Dating', typicalAdjustment: '+100%', reason: 'Restricted content' },
  { name: 'Real Estate', typicalAdjustment: '+15%', reason: 'Market expertise required' },
  { name: 'Education', typicalAdjustment: '0%', reason: 'Standard pricing' },
  { name: 'Lifestyle/Fashion', typicalAdjustment: '-10%', reason: 'High volume, easier content' },
  { name: 'Travel', typicalAdjustment: '0%', reason: 'Standard pricing' },
  { name: 'Food/Recipe', typicalAdjustment: '-15%', reason: 'High volume, simpler content' },
];

export default function NichePricingRuleEditor({ 
  basePrice, 
  currency, 
  existingConfig, 
  onSave, 
  onCancel 
}: Props) {
  const [nichePricing, setNichePricing] = useState<{
    [key: string]: {
      enabled: boolean;
      adjustmentType: 'percentage' | 'multiplier' | 'fixed';
      adjustmentValue: number;
    };
  }>({});

  const [showCustomNiche, setShowCustomNiche] = useState(false);
  const [customNiche, setCustomNiche] = useState('');
  const [customAdjustmentType, setCustomAdjustmentType] = useState<'percentage' | 'multiplier' | 'fixed'>('percentage');
  const [customAdjustmentValue, setCustomAdjustmentValue] = useState('');

  useEffect(() => {
    // Load existing configuration if available
    if (existingConfig?.niches) {
      const config: any = {};
      existingConfig.niches.forEach(niche => {
        config[niche.name] = {
          enabled: true,
          adjustmentType: niche.adjustment.type,
          adjustmentValue: niche.adjustment.value
        };
      });
      setNichePricing(config);
    }
  }, [existingConfig]);

  const calculateAdjustedPrice = (adjustmentType: string, adjustmentValue: number) => {
    const base = basePrice / 100; // Convert from cents
    
    switch (adjustmentType) {
      case 'percentage':
        return base + (base * adjustmentValue / 100);
      case 'multiplier':
        return base * adjustmentValue;
      case 'fixed':
        return base + adjustmentValue;
      default:
        return base;
    }
  };

  const handleNicheToggle = (nicheName: string, suggestedAdjustment?: string) => {
    setNichePricing(prev => {
      const isCurrentlyEnabled = prev[nicheName]?.enabled;
      
      if (isCurrentlyEnabled) {
        // Disable it
        const updated = { ...prev };
        delete updated[nicheName];
        return updated;
      } else {
        // Enable it with suggested adjustment
        let adjustmentValue = 0;
        let adjustmentType: 'percentage' | 'multiplier' | 'fixed' = 'percentage';
        
        if (suggestedAdjustment) {
          const match = suggestedAdjustment.match(/([+-]?\d+)%/);
          if (match) {
            adjustmentValue = parseInt(match[1]);
          }
        }
        
        return {
          ...prev,
          [nicheName]: {
            enabled: true,
            adjustmentType,
            adjustmentValue
          }
        };
      }
    });
  };

  const handleAdjustmentChange = (nicheName: string, field: string, value: any) => {
    setNichePricing(prev => ({
      ...prev,
      [nicheName]: {
        ...prev[nicheName],
        [field]: value
      }
    }));
  };

  const addCustomNiche = () => {
    if (customNiche && customAdjustmentValue) {
      setNichePricing(prev => ({
        ...prev,
        [customNiche]: {
          enabled: true,
          adjustmentType: customAdjustmentType,
          adjustmentValue: parseFloat(customAdjustmentValue)
        }
      }));
      setCustomNiche('');
      setCustomAdjustmentValue('');
      setShowCustomNiche(false);
    }
  };

  const handleSave = () => {
    const niches = Object.entries(nichePricing)
      .filter(([_, config]) => config.enabled)
      .map(([name, config]) => ({
        name,
        adjustment: {
          type: config.adjustmentType,
          value: config.adjustmentValue
        }
      }));

    onSave({
      ruleName: 'Niche-Based Pricing',
      ruleType: 'niche',
      description: `Different pricing for ${niches.length} content niches`,
      conditions: {
        type: 'niche_match',
        niches: niches.map(n => n.name)
      },
      actions: {
        adjustments: niches.map(n => ({
          niche: n.name,
          type: n.adjustment.type,
          value: n.adjustment.value
        }))
      },
      priority: 10,
      isCumulative: false,
      autoApply: true,
      isActive: true
    });
  };

  const activePricingCount = Object.values(nichePricing).filter(n => n.enabled).length;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <Globe className="h-5 w-5 mr-2 text-blue-600" />
          Niche-Based Pricing Rules
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Set different prices for different content niches. Your base price is{' '}
          <span className="font-semibold">${(basePrice / 100).toFixed(2)} {currency}</span>
        </p>
      </div>

      {/* Quick Stats */}
      {activePricingCount > 0 && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="text-sm text-blue-900">
            <strong>{activePricingCount} niche{activePricingCount !== 1 ? 's' : ''}</strong> with custom pricing
          </div>
        </div>
      )}

      {/* Common Niches Grid */}
      <div className="space-y-3 mb-6">
        <h3 className="text-sm font-medium text-gray-700">Select Niches & Set Pricing</h3>
        
        <div className="space-y-2">
          {COMMON_NICHES.map(niche => {
            const isEnabled = nichePricing[niche.name]?.enabled;
            const config = nichePricing[niche.name];
            const adjustedPrice = config ? 
              calculateAdjustedPrice(config.adjustmentType, config.adjustmentValue) : 
              calculateAdjustedPrice('percentage', parseInt(niche.typicalAdjustment) || 0);

            return (
              <div 
                key={niche.name}
                className={`border rounded-lg p-4 transition-all ${
                  isEnabled ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isEnabled || false}
                        onChange={() => handleNicheToggle(niche.name, niche.typicalAdjustment)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                      />
                      <label className="ml-3 font-medium text-gray-900">
                        {niche.name}
                      </label>
                      <span className="ml-2 text-xs text-gray-500">
                        (Typical: {niche.typicalAdjustment})
                      </span>
                    </div>
                    <p className="mt-1 ml-7 text-xs text-gray-600">{niche.reason}</p>
                  </div>

                  {isEnabled && (
                    <div className="flex items-center space-x-2 ml-4">
                      <select
                        value={config.adjustmentType}
                        onChange={(e) => handleAdjustmentChange(niche.name, 'adjustmentType', e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="percentage">%</option>
                        <option value="multiplier">×</option>
                        <option value="fixed">$</option>
                      </select>
                      
                      <input
                        type="number"
                        value={config.adjustmentValue}
                        onChange={(e) => handleAdjustmentChange(niche.name, 'adjustmentValue', parseFloat(e.target.value))}
                        className="w-20 text-sm border border-gray-300 rounded px-2 py-1"
                        placeholder="0"
                        step={config.adjustmentType === 'multiplier' ? '0.1' : '1'}
                      />

                      <div className="flex items-center text-sm">
                        <span className="text-gray-500 mr-1">→</span>
                        <span className={`font-semibold ${
                          adjustedPrice > basePrice / 100 ? 'text-red-600' : 
                          adjustedPrice < basePrice / 100 ? 'text-green-600' : 
                          'text-gray-900'
                        }`}>
                          ${adjustedPrice.toFixed(2)}
                        </span>
                        {adjustedPrice !== basePrice / 100 && (
                          <>
                            {adjustedPrice > basePrice / 100 ? 
                              <TrendingUp className="h-3 w-3 ml-1 text-red-600" /> : 
                              <TrendingDown className="h-3 w-3 ml-1 text-green-600" />
                            }
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Custom Niche */}
      <div className="border-t pt-4">
        {!showCustomNiche ? (
          <button
            onClick={() => setShowCustomNiche(true)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Custom Niche
          </button>
        ) : (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Add Custom Niche</h4>
            <div className="flex items-end space-x-2">
              <div className="flex-1">
                <label className="block text-xs text-gray-600 mb-1">Niche Name</label>
                <input
                  type="text"
                  value={customNiche}
                  onChange={(e) => setCustomNiche(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-1.5"
                  placeholder="e.g., Cryptocurrency"
                />
              </div>
              
              <div>
                <label className="block text-xs text-gray-600 mb-1">Type</label>
                <select
                  value={customAdjustmentType}
                  onChange={(e) => setCustomAdjustmentType(e.target.value as any)}
                  className="text-sm border border-gray-300 rounded px-2 py-1.5"
                >
                  <option value="percentage">%</option>
                  <option value="multiplier">×</option>
                  <option value="fixed">$</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs text-gray-600 mb-1">Value</label>
                <input
                  type="number"
                  value={customAdjustmentValue}
                  onChange={(e) => setCustomAdjustmentValue(e.target.value)}
                  className="w-20 text-sm border border-gray-300 rounded px-2 py-1.5"
                  placeholder="0"
                />
              </div>
              
              <button
                onClick={addCustomNiche}
                className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700"
              >
                Add
              </button>
              
              <button
                onClick={() => {
                  setShowCustomNiche(false);
                  setCustomNiche('');
                  setCustomAdjustmentValue('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Custom Niches Added */}
      {Object.entries(nichePricing).filter(([name]) => 
        !COMMON_NICHES.find(n => n.name === name)
      ).length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Custom Niches</h4>
          {Object.entries(nichePricing)
            .filter(([name]) => !COMMON_NICHES.find(n => n.name === name))
            .map(([name, config]) => {
              const adjustedPrice = calculateAdjustedPrice(config.adjustmentType, config.adjustmentValue);
              
              return (
                <div key={name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-900">{name}</span>
                  <div className="flex items-center space-x-2">
                    <select
                      value={config.adjustmentType}
                      onChange={(e) => handleAdjustmentChange(name, 'adjustmentType', e.target.value)}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="percentage">%</option>
                      <option value="multiplier">×</option>
                      <option value="fixed">$</option>
                    </select>
                    
                    <input
                      type="number"
                      value={config.adjustmentValue}
                      onChange={(e) => handleAdjustmentChange(name, 'adjustmentValue', parseFloat(e.target.value))}
                      className="w-20 text-sm border border-gray-300 rounded px-2 py-1"
                    />
                    
                    <span className="text-sm font-semibold">
                      → ${adjustedPrice.toFixed(2)}
                    </span>
                    
                    <button
                      onClick={() => handleNicheToggle(name)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Summary Preview */}
      {activePricingCount > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Pricing Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Base Price (Default):</span>
              <span className="font-semibold">${(basePrice / 100).toFixed(2)}</span>
            </div>
            {Object.entries(nichePricing)
              .filter(([_, config]) => config.enabled)
              .map(([name, config]) => {
                const adjustedPrice = calculateAdjustedPrice(config.adjustmentType, config.adjustmentValue);
                const difference = ((adjustedPrice - basePrice / 100) / (basePrice / 100) * 100);
                
                return (
                  <div key={name} className="flex justify-between">
                    <span className="text-gray-600">{name}:</span>
                    <span className="font-semibold">
                      ${adjustedPrice.toFixed(2)}
                      <span className={`ml-2 text-xs ${
                        difference > 0 ? 'text-red-600' : difference < 0 ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        ({difference > 0 ? '+' : ''}{difference.toFixed(0)}%)
                      </span>
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex justify-end space-x-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={activePricingCount === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save Niche Pricing
        </button>
      </div>
    </div>
  );
}