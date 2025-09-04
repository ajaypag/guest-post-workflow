/**
 * Pricing Configuration
 * All pricing values in cents for consistency
 */

export const PRICING_CONFIG = {
  // Core service fees
  serviceFee: {
    standard: 10000, // $100 - Content creation & management fee per link
    rush: 15000,     // $150 - Rush delivery fee (optional)
    clientReview: 5000 // $50 - Client review service (optional)
  },

  // Default pricing tiers (per link, including service fee)
  defaultPackages: {
    bronze: {
      name: 'Bronze',
      retailPrice: 23000, // $230
      drRange: '20-34',
      description: 'Quality sites with moderate domain authority'
    },
    silver: {
      name: 'Silver', 
      retailPrice: 27900, // $279 (default)
      drRange: '35-49',
      description: 'Premium sites with good domain authority'
    },
    gold: {
      name: 'Gold',
      retailPrice: 34900, // $349
      drRange: '50-80',
      description: 'Top-tier sites with excellent domain authority'
    }
  },

  // Wholesale calculation (retail minus service fee)
  calculateWholesalePrice: (retailPrice: number): number => {
    return retailPrice - PRICING_CONFIG.serviceFee.standard;
  },

  // Default values
  defaults: {
    retailPricePerLink: 27900, // $279 - Silver package default
    minimumOrderValue: 27900,  // $279 - Minimum order is 1 link
    invoiceDueDays: 2,          // Invoice due 2 days from issue
    currency: 'USD'
  },

  // Discount rules
  discounts: {
    bulkThresholds: [
      { minLinks: 10, percentOff: 5 },
      { minLinks: 25, percentOff: 10 },
      { minLinks: 50, percentOff: 15 }
    ]
  },

  // Format price for display (cents to dollars)
  formatPrice: (cents: number): string => {
    return `$${(cents / 100).toFixed(2)}`;
  },

  // Parse dollar string to cents
  parseToCents: (dollarString: string): number => {
    const cleaned = dollarString.replace(/[^0-9.-]/g, '');
    return Math.round(parseFloat(cleaned) * 100);
  }
} as const;

// Export individual values for backward compatibility
export const SERVICE_FEE_CENTS = PRICING_CONFIG.serviceFee.standard;
export const DEFAULT_RETAIL_PRICE_CENTS = PRICING_CONFIG.defaults.retailPricePerLink;
export const RUSH_FEE_CENTS = PRICING_CONFIG.serviceFee.rush;
export const CLIENT_REVIEW_FEE_CENTS = PRICING_CONFIG.serviceFee.clientReview;