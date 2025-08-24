import { db } from '@/lib/db/connection';
import { websites } from '@/lib/db/websiteSchema';
import { publisherOfferingsService } from './publisherOfferingsService';
import { OFFERING_TYPES } from '@/lib/db/publisherSchemaActual';
import { eq, or } from 'drizzle-orm';

export class EnhancedOrderPricingService {
  /**
   * Get the best price for a website, checking publisher offerings first,
   * then falling back to legacy pricing
   */
  static async getWebsitePrice(
    websiteId: string | null,
    domain: string,
    orderContext?: {
      quantity?: number;
      niche?: string;
      clientType?: string;
      urgency?: 'standard' | 'express' | 'rush';
      accountId?: string;
    }
  ): Promise<{
    retailPrice: number;
    wholesalePrice: number;
    source: 'publisher_offerings' | 'legacy_pricing';
    currency: string;
    appliedRules?: any[];
  }> {
    // First, try to get website by ID or domain
    let website = null;
    
    if (websiteId) {
      website = await db.query.websites.findFirst({
        where: eq(websites.id, websiteId),
      });
    } else if (domain) {
      website = await db.query.websites.findFirst({
        where: or(
          eq(websites.domain, domain),
          eq(websites.domain, `www.${domain}`),
          eq(websites.domain, domain.replace('www.', ''))
        ),
      });
    }
    
    if (!website) {
      return {
        retailPrice: 0,
        wholesalePrice: 0,
        source: 'legacy_pricing',
        currency: 'USD'
      };
    }
    
    // Try to get price from publisher offerings
    try {
      const offerings = await publisherOfferingsService.getOfferingsByType(
        website.id,
        'GUEST_POST'
      );
      
      if (offerings.length > 0) {
        // Get the best (lowest) price offering
        let bestOffering = offerings[0];
        let bestPrice = Number(bestOffering.offering.basePrice);
        
        // If we have order context, calculate price with rules
        if (orderContext) {
          for (const item of offerings) {
            const priceCalculation = await publisherOfferingsService.calculatePrice(
              item.offering.id,
              orderContext
            );
            
            if (priceCalculation.finalPrice < bestPrice) {
              bestPrice = priceCalculation.finalPrice;
              bestOffering = item;
            }
          }
          
          // Get the final calculation for the best offering
          const finalCalculation = await publisherOfferingsService.calculatePrice(
            bestOffering.offering.id,
            orderContext
          );
          
          // Convert to cents if needed (assuming finalPrice is in dollars)
          // finalPrice IS the wholesale price (what we pay publishers)
          const wholesaleInCents = finalCalculation.finalPrice < 1000 ? Math.floor(finalCalculation.finalPrice * 100) : finalCalculation.finalPrice;
          const retailInCents = wholesaleInCents + 7900; // Add $79 service fee
          
          return {
            retailPrice: retailInCents,
            wholesalePrice: wholesaleInCents,
            source: 'publisher_offerings',
            currency: finalCalculation.currency,
            appliedRules: finalCalculation.appliedRules
          };
        } else {
          // No context, just use base price
          // Convert to cents if needed (assuming bestPrice is in dollars)
          // bestPrice IS the wholesale price (what we pay publishers)
          const wholesaleInCents = bestPrice < 1000 ? Math.floor(bestPrice * 100) : bestPrice;
          const retailInCents = wholesaleInCents + 7900; // Add $79 service fee
          
          return {
            retailPrice: retailInCents,
            wholesalePrice: wholesaleInCents,
            source: 'publisher_offerings',
            currency: bestOffering.offering.currency
          };
        }
      }
    } catch (error) {
      console.error('Error getting publisher offerings price:', error);
      // Fall through to legacy pricing
    }
    
    // Fall back to legacy pricing from websites table
    const legacyPrice = website.guestPostCost ? parseFloat(website.guestPostCost) : 0;
    
    // Convert to cents (prices in DB are in dollars)
    const wholesalePriceInCents = Math.floor(legacyPrice * 100);
    const retailPriceInCents = wholesalePriceInCents + 7900; // $79 markup
    
    return {
      retailPrice: retailPriceInCents,
      wholesalePrice: wholesalePriceInCents,
      source: 'legacy_pricing',
      currency: 'USD'
    };
  }
  
  /**
   * Get link insertion price for a website
   */
  static async getLinkInsertionPrice(
    websiteId: string,
    orderContext?: Record<string, any>
  ): Promise<{
    retailPrice: number;
    wholesalePrice: number;
    source: 'publisher_offerings' | 'legacy_pricing';
    currency: string;
  }> {
    try {
      const offerings = await publisherOfferingsService.getOfferingsByType(
        websiteId,
        'LINK_INSERTION'
      );
      
      if (offerings.length > 0) {
        // Get the best price
        let bestPrice = Number(offerings[0].offering.basePrice);
        let bestOffering = offerings[0];
        
        if (orderContext) {
          for (const item of offerings) {
            const priceCalculation = await publisherOfferingsService.calculatePrice(
              item.offering.id,
              orderContext
            );
            
            if (priceCalculation.finalPrice < bestPrice) {
              bestPrice = priceCalculation.finalPrice;
              bestOffering = item;
            }
          }
        }
        
        // bestPrice is the wholesale price (what we pay publishers)
        const wholesaleInCents = bestPrice < 1000 ? Math.floor(bestPrice * 100) : bestPrice;
        const retailInCents = wholesaleInCents + 7900; // Add $79 service fee
        
        return {
          retailPrice: retailInCents,
          wholesalePrice: wholesaleInCents,
          source: 'publisher_offerings',
          currency: bestOffering.offering.currency
        };
      }
    } catch (error) {
      console.error('Error getting link insertion price:', error);
    }
    
    // Fall back to guest post price with discount
    // Link insertions are typically cheaper than guest posts
    const guestPostPrice = await this.getWebsitePrice(websiteId, '', orderContext);
    // Take 30% off the wholesale price for link insertions
    const linkInsertionWholesale = Math.floor(guestPostPrice.wholesalePrice * 0.7);
    const linkInsertionRetail = linkInsertionWholesale + 7900; // Add $79 service fee
    
    return {
      retailPrice: linkInsertionRetail,
      wholesalePrice: linkInsertionWholesale,
      source: 'legacy_pricing',
      currency: 'USD'
    };
  }
  
  /**
   * Calculate bulk discount based on quantity
   */
  static calculateBulkDiscount(
    basePrice: number,
    quantity: number
  ): {
    discountPercent: number;
    discountedPrice: number;
  } {
    let discountPercent = 0;
    
    if (quantity >= 50) {
      discountPercent = 20;
    } else if (quantity >= 25) {
      discountPercent = 15;
    } else if (quantity >= 10) {
      discountPercent = 10;
    } else if (quantity >= 5) {
      discountPercent = 5;
    }
    
    const discountedPrice = basePrice * (1 - discountPercent / 100);
    
    return {
      discountPercent,
      discountedPrice
    };
  }
  
  /**
   * Get express pricing for a website
   */
  static async getExpressPrice(
    websiteId: string,
    basePrice: number
  ): Promise<number> {
    try {
      const offerings = await publisherOfferingsService.getWebsiteOfferings(websiteId);
      
      for (const item of offerings) {
        if (item.offering.expressAvailable && item.offering.expressPrice) {
          return Number(item.offering.expressPrice);
        }
      }
    } catch (error) {
      console.error('Error getting express price:', error);
    }
    
    // Default to 50% surcharge
    return basePrice * 1.5;
  }
}

export default EnhancedOrderPricingService;