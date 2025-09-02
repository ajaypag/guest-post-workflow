/**
 * Derived Pricing Service - Phase 6B Shadow Mode Implementation
 * 
 * This service manages the calculation and maintenance of derived guest_post_cost
 * values based on publisher offerings. Part of the pricing standardization initiative.
 */

import { db } from '../db/connection';
import { websites } from '../db/websiteSchema';
import { publisherOfferingRelationships, publisherOfferings } from '../db/publisherSchemaActual';
import { eq, and, isNotNull, gt } from 'drizzle-orm';

export interface PricingComparison {
  id: string;
  domain: string;
  currentPrice: number | null;
  derivedPrice: number | null;
  calculationMethod: string;
  calculatedAt: Date | null;
  overrideOfferingId: string | null;
  overrideReason: string | null;
  status: 'match' | 'mismatch' | 'current_null' | 'derived_null' | 'both_null';
  difference: number;
  percentDifference: number | null;
}

export interface DerivedPricingStats {
  totalWebsites: number;
  withDerivedPrices: number;
  matchingPrices: number;
  mismatchedPrices: number;
  missingDerived: number;
  readyPercentage: number;
}

export class DerivedPricingService {
  
  /**
   * Calculate derived price for a single website
   * Implements business rules from Phase 6 planning
   * FIXED: Now respects pricing_strategy (min_price, max_price, custom)
   * ENHANCED: Returns selected offering info for attribution
   */
  static async calculateDerivedPrice(websiteId: string): Promise<{
    price: number | null;
    selectedOfferingId: string | null;
    selectedPublisherId: string | null;
  }> {
    try {
      // First get website details including pricing strategy
      const websiteResult = await db.execute(`
        SELECT price_override_offering_id, pricing_strategy, custom_offering_id 
        FROM websites 
        WHERE id = '${websiteId}'
      `);
      
      const website = websiteResult.rows[0] as any;
      if (!website) {
        return { price: null, selectedOfferingId: null, selectedPublisherId: null };
      }

      // Check for manual override first (highest priority)
      if (website?.price_override_offering_id) {
        // Use manually selected offering
        const overrideResult = await db.execute(`
          SELECT po.base_price, po.id, po.publisher_id
          FROM publisher_offerings po
          WHERE po.id = '${website.price_override_offering_id}'
            AND po.is_active = true
            AND po.offering_type = 'guest_post'
        `);
        
        const override = overrideResult.rows[0] as any;
        return {
          price: override?.base_price || null,
          selectedOfferingId: override?.id || null,
          selectedPublisherId: override?.publisher_id || null
        };
      }
      
      // Handle custom pricing strategy
      if (website.pricing_strategy === 'custom' && website.custom_offering_id) {
        const customResult = await db.execute(`
          SELECT po.base_price, po.id, po.publisher_id
          FROM publisher_offerings po
          WHERE po.id = '${website.custom_offering_id}'
            AND po.is_active = true
            AND po.offering_type = 'guest_post'
        `);
        
        const custom = customResult.rows[0] as any;
        return {
          price: custom?.base_price || null,
          selectedOfferingId: custom?.id || null,
          selectedPublisherId: custom?.publisher_id || null
        };
      }
      
      // Get all qualified guest_post offerings with full details
      const offerings = await db
        .select({
          basePrice: publisherOfferings.basePrice,
          offeringId: publisherOfferings.id,
          publisherId: publisherOfferings.publisherId,
        })
        .from(publisherOfferingRelationships)
        .innerJoin(
          publisherOfferings,
          eq(publisherOfferingRelationships.offeringId, publisherOfferings.id)
        )
        .where(
          and(
            eq(publisherOfferingRelationships.websiteId, websiteId),
            eq(publisherOfferings.isActive, true),
            eq(publisherOfferings.offeringType, 'guest_post'),
            eq(publisherOfferings.currentAvailability, 'available'),
            isNotNull(publisherOfferings.basePrice),
            gt(publisherOfferings.basePrice, 0)
          )
        );
      
      if (offerings.length === 0) {
        return { price: null, selectedOfferingId: null, selectedPublisherId: null };
      }
      
      const validOfferings = offerings.filter(o => o.basePrice !== null && o.basePrice !== undefined && o.basePrice > 0);
      
      if (validOfferings.length === 0) {
        return { price: null, selectedOfferingId: null, selectedPublisherId: null };
      }

      // Apply pricing strategy and track which offering was selected
      const strategy = website.pricing_strategy || 'min_price';
      let selectedOffering;
      
      if (strategy === 'max_price') {
        const maxPrice = Math.max(...validOfferings.map(o => o.basePrice!));
        selectedOffering = validOfferings.find(o => o.basePrice === maxPrice);
      } else {
        // Default to min_price
        const minPrice = Math.min(...validOfferings.map(o => o.basePrice!));
        selectedOffering = validOfferings.find(o => o.basePrice === minPrice);
      }
      
      return {
        price: selectedOffering?.basePrice || null,
        selectedOfferingId: selectedOffering?.offeringId || null,
        selectedPublisherId: selectedOffering?.publisherId || null
      };
      
    } catch (error) {
      console.error(`Error calculating derived price for website ${websiteId}:`, error);
      return { price: null, selectedOfferingId: null, selectedPublisherId: null };
    }
  }
  
  /**
   * Update derived price for a single website
   * FIXED: Now correctly sets calculation method based on strategy
   * ENHANCED: Stores selected offering and publisher for attribution
   */
  static async updateDerivedPrice(websiteId: string): Promise<void> {
    try {
      const result = await this.calculateDerivedPrice(websiteId);
      
      // Check website configuration to determine calculation method
      const websiteResult = await db.execute(`
        SELECT price_override_offering_id, pricing_strategy, custom_offering_id 
        FROM websites 
        WHERE id = '${websiteId}'
      `);
      
      const website = websiteResult.rows[0] as any;
      let calculationMethod = 'auto_min';
      
      if (website?.price_override_offering_id) {
        calculationMethod = 'manual_override';
      } else if (website?.pricing_strategy === 'custom' && website?.custom_offering_id) {
        calculationMethod = 'custom';
      } else if (website?.pricing_strategy === 'max_price') {
        calculationMethod = 'auto_max';
      } else {
        calculationMethod = 'auto_min';
      }
      
      await db.execute(`
        UPDATE websites 
        SET 
          derived_guest_post_cost = ${result.price || 'NULL'},
          price_calculation_method = '${calculationMethod}',
          price_calculated_at = NOW(),
          selected_offering_id = ${result.selectedOfferingId ? `'${result.selectedOfferingId}'` : 'NULL'},
          selected_publisher_id = ${result.selectedPublisherId ? `'${result.selectedPublisherId}'` : 'NULL'},
          selected_at = ${result.selectedOfferingId ? 'NOW()' : 'NULL'}
        WHERE id = '${websiteId}'
      `);
      
    } catch (error) {
      console.error(`Error updating derived price for website ${websiteId}:`, error);
      throw error;
    }
  }
  
  /**
   * Bulk update derived prices for all websites
   * Used for maintenance and scheduled jobs
   */
  static async updateAllDerivedPrices(): Promise<{ updated: number; errors: number }> {
    try {
      const websitesList = await db
        .select({
          id: websites.id,
        })
        .from(websites)
        .where(isNotNull(websites.guestPostCost));
      
      let updated = 0;
      let errors = 0;
      
      console.log(`Starting bulk update for ${websitesList.length} websites...`);
      
      for (const website of websitesList) {
        try {
          await this.updateDerivedPrice(website.id);
          updated++;
          
          if (updated % 100 === 0) {
            console.log(`Updated ${updated}/${websitesList.length} websites...`);
          }
        } catch (error) {
          errors++;
          console.error(`Failed to update website ${website.id}:`, error);
        }
      }
      
      console.log(`Bulk update completed: ${updated} updated, ${errors} errors`);
      return { updated, errors };
      
    } catch (error) {
      console.error('Bulk update failed:', error);
      throw error;
    }
  }
  
  /**
   * Get pricing comparison for a single website
   */
  static async getPricingComparison(websiteId: string): Promise<PricingComparison | null> {
    try {
      const result = await db.execute(`
        SELECT 
          w.id,
          w.domain,
          w.guest_post_cost as current_price,
          w.derived_guest_post_cost as derived_price,
          w.price_calculation_method,
          w.price_calculated_at,
          w.price_override_offering_id,
          w.price_override_reason,
          CASE 
            WHEN w.guest_post_cost IS NULL AND w.derived_guest_post_cost IS NULL THEN 'both_null'
            WHEN w.guest_post_cost IS NULL AND w.derived_guest_post_cost IS NOT NULL THEN 'current_null'
            WHEN w.guest_post_cost IS NOT NULL AND w.derived_guest_post_cost IS NULL THEN 'derived_null'
            WHEN w.guest_post_cost = w.derived_guest_post_cost THEN 'match'
            ELSE 'mismatch'
          END as status,
          COALESCE(w.derived_guest_post_cost, 0) - COALESCE(w.guest_post_cost, 0) as difference,
          CASE 
            WHEN w.guest_post_cost > 0 THEN 
              ROUND(((COALESCE(w.derived_guest_post_cost, 0) - w.guest_post_cost)::DECIMAL / w.guest_post_cost * 100), 2)
            ELSE NULL
          END as percent_difference
        FROM websites w
        WHERE w.id = '${websiteId}'
          AND (w.guest_post_cost IS NOT NULL OR w.derived_guest_post_cost IS NOT NULL)
      `);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0] as any;
      return {
        id: row.id,
        domain: row.domain,
        currentPrice: row.current_price,
        derivedPrice: row.derived_price,
        calculationMethod: row.price_calculation_method,
        calculatedAt: row.price_calculated_at,
        overrideOfferingId: row.price_override_offering_id,
        overrideReason: row.price_override_reason,
        status: row.status,
        difference: row.difference,
        percentDifference: row.percent_difference,
      };
      
    } catch (error) {
      console.error(`Error getting pricing comparison for website ${websiteId}:`, error);
      return null;
    }
  }
  
  /**
   * Get all pricing comparisons with filtering
   */
  static async getAllPricingComparisons(filter?: 'match' | 'mismatch' | 'derived_null'): Promise<PricingComparison[]> {
    try {
      let whereClause = '';
      if (filter) {
        const filterCondition = {
          'match': "w.guest_post_cost = w.derived_guest_post_cost",
          'mismatch': "w.guest_post_cost != w.derived_guest_post_cost AND w.guest_post_cost IS NOT NULL AND w.derived_guest_post_cost IS NOT NULL",
          'derived_null': "w.guest_post_cost IS NOT NULL AND w.derived_guest_post_cost IS NULL"
        };
        whereClause = `AND ${filterCondition[filter]}`;
      }
      
      const result = await db.execute(`
        SELECT 
          w.id,
          w.domain,
          w.guest_post_cost as current_price,
          w.derived_guest_post_cost as derived_price,
          w.price_calculation_method,
          w.price_calculated_at,
          w.price_override_offering_id,
          w.price_override_reason,
          CASE 
            WHEN w.guest_post_cost IS NULL AND w.derived_guest_post_cost IS NULL THEN 'both_null'
            WHEN w.guest_post_cost IS NULL AND w.derived_guest_post_cost IS NOT NULL THEN 'current_null'
            WHEN w.guest_post_cost IS NOT NULL AND w.derived_guest_post_cost IS NULL THEN 'derived_null'
            WHEN w.guest_post_cost = w.derived_guest_post_cost THEN 'match'
            ELSE 'mismatch'
          END as status,
          COALESCE(w.derived_guest_post_cost, 0) - COALESCE(w.guest_post_cost, 0) as difference,
          CASE 
            WHEN w.guest_post_cost > 0 THEN 
              ROUND(((COALESCE(w.derived_guest_post_cost, 0) - w.guest_post_cost)::DECIMAL / w.guest_post_cost * 100), 2)
            ELSE NULL
          END as percent_difference
        FROM websites w
        WHERE (w.guest_post_cost IS NOT NULL OR w.derived_guest_post_cost IS NOT NULL)
          ${whereClause}
        ORDER BY 
          CASE 
            WHEN w.guest_post_cost IS NOT NULL AND w.derived_guest_post_cost IS NULL THEN 0
            WHEN w.guest_post_cost != w.derived_guest_post_cost THEN 1
            ELSE 2
          END,
          w.domain
      `);
      
      return result.rows.map((row: any) => ({
        id: row.id,
        domain: row.domain,
        currentPrice: row.current_price,
        derivedPrice: row.derived_price,
        calculationMethod: row.price_calculation_method,
        calculatedAt: row.price_calculated_at,
        overrideOfferingId: row.price_override_offering_id,
        overrideReason: row.price_override_reason,
        status: row.status,
        difference: row.difference,
        percentDifference: row.percent_difference,
      }));
      
    } catch (error) {
      console.error('Error getting all pricing comparisons:', error);
      return [];
    }
  }
  
  /**
   * Get derived pricing statistics
   */
  static async getDerivedPricingStats(): Promise<DerivedPricingStats> {
    try {
      const result = await db.execute(`
        SELECT 
          COUNT(*) as total_websites,
          COUNT(CASE WHEN derived_guest_post_cost IS NOT NULL THEN 1 END) as with_derived_prices,
          COUNT(CASE WHEN guest_post_cost = derived_guest_post_cost THEN 1 END) as matching_prices,
          COUNT(CASE WHEN guest_post_cost != derived_guest_post_cost AND guest_post_cost IS NOT NULL AND derived_guest_post_cost IS NOT NULL THEN 1 END) as mismatched_prices,
          COUNT(CASE WHEN guest_post_cost IS NOT NULL AND derived_guest_post_cost IS NULL THEN 1 END) as missing_derived
        FROM websites 
        WHERE guest_post_cost IS NOT NULL
      `);
      
      const row = result.rows[0] as any;
      const readyPercentage = row.total_websites > 0 
        ? (row.matching_prices / row.total_websites) * 100 
        : 0;
      
      return {
        totalWebsites: row.total_websites,
        withDerivedPrices: row.with_derived_prices,
        matchingPrices: row.matching_prices,
        mismatchedPrices: row.mismatched_prices,
        missingDerived: row.missing_derived,
        readyPercentage: Math.round(readyPercentage * 10) / 10, // Round to 1 decimal
      };
      
    } catch (error) {
      console.error('Error getting derived pricing stats:', error);
      return {
        totalWebsites: 0,
        withDerivedPrices: 0,
        matchingPrices: 0,
        mismatchedPrices: 0,
        missingDerived: 0,
        readyPercentage: 0,
      };
    }
  }
  
  /**
   * Set manual price override for a website
   */
  static async setManualOverride(
    websiteId: string, 
    offeringId: string, 
    reason: string
  ): Promise<void> {
    try {
      // Verify the offering exists and is a valid guest_post offering
      const offering = await db.execute(`
        SELECT base_price, offering_type, current_availability
        FROM publisher_offerings 
        WHERE id = '${offeringId}' 
          AND is_active = true 
          AND offering_type = 'guest_post'
          AND current_availability = 'available'
          AND base_price > 0
      `);
      
      if (offering.rows.length === 0) {
        throw new Error('Invalid offering: must be an active, available guest_post offering with price > 0');
      }
      
      const offeringData = offering.rows[0] as any;
      
      // Update website with manual override
      await db.execute(`
        UPDATE websites 
        SET 
          price_override_offering_id = '${offeringId}',
          price_override_reason = '${reason.replace(/'/g, "''")}',
          derived_guest_post_cost = ${offeringData.base_price},
          price_calculation_method = 'manual_override',
          price_calculated_at = NOW()
        WHERE id = '${websiteId}'
      `);
      
    } catch (error) {
      console.error(`Error setting manual override for website ${websiteId}:`, error);
      throw error;
    }
  }
  
  /**
   * Remove manual price override and revert to automatic calculation
   */
  static async removeManualOverride(websiteId: string): Promise<void> {
    try {
      // Calculate new automatic price
      const derivedPrice = await this.calculateDerivedPrice(websiteId);
      
      // Update website to remove override
      await db.execute(`
        UPDATE websites 
        SET 
          price_override_offering_id = NULL,
          price_override_reason = NULL,
          derived_guest_post_cost = ${derivedPrice || 'NULL'},
          price_calculation_method = 'auto_min',
          price_calculated_at = NOW()
        WHERE id = '${websiteId}'
      `);
      
    } catch (error) {
      console.error(`Error removing manual override for website ${websiteId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get the effective price for a website (for use in pricing calculations)
   * Returns derived price if available, falls back to current price
   */
  static async getEffectivePrice(websiteId: string, useDerivePricing = false): Promise<number | null> {
    try {
      const result = await db.execute(`
        SELECT guest_post_cost, derived_guest_post_cost
        FROM websites 
        WHERE id = '${websiteId}'
      `);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0] as any;
      
      if (useDerivePricing && row.derived_guest_post_cost !== null) {
        return row.derived_guest_post_cost;
      }
      
      return row.guest_post_cost;
      
    } catch (error) {
      console.error(`Error getting effective price for website ${websiteId}:`, error);
      return null;
    }
  }
}

export default DerivedPricingService;