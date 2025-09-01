import { db } from '@/lib/db/connection';
import { websites } from '@/lib/db/websiteSchema';
import { pricingRules } from '@/lib/db/orderSchema';
import { eq, or, and, lte, gte, isNull } from 'drizzle-orm';

export interface PriceInfo {
  retailPrice: number;
  wholesalePrice: number;
  domainRating?: number;
  traffic?: number;
  found: boolean;
}

export interface DiscountInfo {
  percent: number;
  amount: number;
  ruleName: string;
  nextTier?: {
    quantity: number;
    percent: number;
    additionalSavings: number;
  };
}

export class PricingService {
  /**
   * Clean domain for matching
   */
  private static cleanDomain(domain: string): string {
    return domain
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '')
      .trim();
  }

  /**
   * Get retail price for a domain
   */
  static async getDomainPrice(domain: string): Promise<PriceInfo> {
    const cleanDomain = this.cleanDomain(domain);
    
    // Try multiple variations for matching
    const domainVariations = [
      cleanDomain,
      `www.${cleanDomain}`,
      cleanDomain.replace('www.', '')
    ];

    const website = await db.query.websites.findFirst({
      where: or(
        ...domainVariations.map(d => eq(websites.domain, d))
      ),
    });

    if (!website || !website.guestPostCost) {
      return {
        retailPrice: 0,
        wholesalePrice: 0,
        found: false,
      };
    }

    // website.guestPostCost is what we pay publishers (wholesale) - now in cents
    const wholesalePriceCents = website.guestPostCost || 0;
    // Convert to dollars for return value (keeping API contract)
    const wholesalePrice = wholesalePriceCents / 100;
    // Customer price is wholesale + $79 service fee (in dollars)
    const retailPrice = wholesalePrice + 79;

    return {
      retailPrice,
      wholesalePrice,
      domainRating: website.domainRating || undefined,
      traffic: website.totalTraffic || undefined,
      found: true,
    };
  }

  /**
   * Get bulk prices for multiple domains
   */
  static async getBulkDomainPrices(domains: string[]): Promise<Map<string, PriceInfo>> {
    const priceMap = new Map<string, PriceInfo>();
    
    // Process in batches to avoid too many DB queries
    const batchSize = 10;
    for (let i = 0; i < domains.length; i += batchSize) {
      const batch = domains.slice(i, i + batchSize);
      const promises = batch.map(domain => 
        this.getDomainPrice(domain).then(price => ({ domain, price }))
      );
      
      const results = await Promise.all(promises);
      results.forEach(({ domain, price }) => {
        priceMap.set(domain, price);
      });
    }

    return priceMap;
  }

  /**
   * Calculate discount for quantity
   */
  static async calculateDiscount(
    quantity: number,
    subtotal: number,
    clientId?: string
  ): Promise<DiscountInfo> {
    // First check for client-specific rules
    let applicableRule = null;
    
    if (clientId) {
      applicableRule = await db.query.pricingRules.findFirst({
        where: and(
          eq(pricingRules.clientId, clientId),
          lte(pricingRules.minQuantity, quantity),
          or(
            isNull(pricingRules.maxQuantity),
            gte(pricingRules.maxQuantity, quantity)
          )
        ),
      });
    }

    // Fall back to global rules if no client-specific rule
    if (!applicableRule) {
      applicableRule = await db.query.pricingRules.findFirst({
        where: and(
          isNull(pricingRules.clientId),
          lte(pricingRules.minQuantity, quantity),
          or(
            isNull(pricingRules.maxQuantity),
            gte(pricingRules.maxQuantity, quantity)
          )
        ),
      });
    }

    const discountPercent = applicableRule ? parseFloat(applicableRule.discountPercent) : 0;
    const discountAmount = Math.floor(subtotal * (discountPercent / 100));

    // Find next tier for incentive
    let nextTier = undefined;
    if (applicableRule) {
      const nextRule = await db.query.pricingRules.findFirst({
        where: and(
          clientId ? eq(pricingRules.clientId, clientId) : isNull(pricingRules.clientId),
          lte(pricingRules.minQuantity, quantity + 1),
          or(
            isNull(pricingRules.maxQuantity),
            gte(pricingRules.maxQuantity, quantity + 1)
          ),
          gte(pricingRules.discountPercent, discountPercent.toString())
        ),
        orderBy: (pricingRules, { asc }) => [asc(pricingRules.minQuantity)],
      });

      if (nextRule && parseFloat(nextRule.discountPercent) > discountPercent) {
        const avgItemPrice = subtotal / quantity;
        const nextQuantity = nextRule.minQuantity;
        const itemsNeeded = nextQuantity - quantity;
        const nextSubtotal = avgItemPrice * nextQuantity;
        const nextDiscountAmount = Math.floor(nextSubtotal * (parseFloat(nextRule.discountPercent) / 100));
        const currentProjectedTotal = subtotal - discountAmount;
        const nextProjectedTotal = nextSubtotal - nextDiscountAmount;
        const additionalSavings = (avgItemPrice * itemsNeeded) - (nextProjectedTotal - currentProjectedTotal);

        nextTier = {
          quantity: itemsNeeded,
          percent: parseFloat(nextRule.discountPercent),
          additionalSavings: Math.max(0, additionalSavings),
        };
      }
    }

    return {
      percent: discountPercent,
      amount: discountAmount,
      ruleName: applicableRule?.name || 'No Discount',
      nextTier,
    };
  }

  /**
   * Format price for display (converts from cents)
   */
  static formatPrice(cents: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  }

  /**
   * Calculate margin percentage
   */
  static calculateMarginPercent(retail: number, wholesale: number): number {
    if (retail === 0) return 0;
    return Math.round(((retail - wholesale) / retail) * 100);
  }
}