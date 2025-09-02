import { db } from '@/lib/db/connection';
import { publishers } from '@/lib/db/accountSchema';
import { publisherOfferings } from '@/lib/db/publisherSchemaActual';
import { eq, inArray } from 'drizzle-orm';

export interface PublisherInfo {
  id: string;
  name: string;
  email: string;
  isShadow: boolean;
  displayName: string;
}

export interface OfferingInfo {
  id: string;
  publisherId: string;
  offeringName: string | null;
  offeringType: string | null;
  basePrice: number | null;
  turnaroundDays: number | null;
  displayName: string;
}

export interface PublisherWithOffering extends PublisherInfo {
  offering?: OfferingInfo;
}

export class PublisherResolutionService {
  /**
   * Resolve a single publisher by ID
   */
  static async resolvePublisher(publisherId: string | null | undefined): Promise<PublisherInfo | null> {
    if (!publisherId) return null;

    try {
      const result = await db
        .select({
          id: publishers.id,
          contactName: publishers.contactName,
          companyName: publishers.companyName,
          email: publishers.email,
          accountStatus: publishers.accountStatus,
        })
        .from(publishers)
        .where(eq(publishers.id, publisherId))
        .limit(1);

      if (result.length === 0) return null;

      const publisher = result[0];
      const isShadow = publisher.accountStatus === 'shadow';
      return {
        id: publisher.id,
        name: publisher.contactName || publisher.companyName || 'Unknown Publisher',
        email: publisher.email,
        isShadow,
        displayName: this.formatPublisherName({
          name: publisher.contactName || publisher.companyName,
          email: publisher.email,
          isShadow
        }),
      };
    } catch (error) {
      console.error('[PublisherResolution] Error resolving publisher:', error);
      return null;
    }
  }

  /**
   * Resolve multiple publishers by IDs
   */
  static async resolvePublishers(publisherIds: string[]): Promise<Map<string, PublisherInfo>> {
    const map = new Map<string, PublisherInfo>();
    
    if (publisherIds.length === 0) return map;

    try {
      const results = await db
        .select({
          id: publishers.id,
          contactName: publishers.contactName,
          companyName: publishers.companyName,
          email: publishers.email,
          accountStatus: publishers.accountStatus,
        })
        .from(publishers)
        .where(inArray(publishers.id, publisherIds));

      for (const publisher of results) {
        const isShadow = publisher.accountStatus === 'shadow';
        map.set(publisher.id, {
          id: publisher.id,
          name: publisher.contactName || publisher.companyName || 'Unknown Publisher',
          email: publisher.email,
          isShadow,
          displayName: this.formatPublisherName({
            name: publisher.contactName || publisher.companyName,
            email: publisher.email,
            isShadow
          }),
        });
      }
    } catch (error) {
      console.error('[PublisherResolution] Error resolving publishers:', error);
    }

    return map;
  }

  /**
   * Resolve a single offering by ID
   */
  static async resolveOffering(offeringId: string | null | undefined): Promise<OfferingInfo | null> {
    if (!offeringId) return null;

    try {
      const result = await db
        .select({
          id: publisherOfferings.id,
          publisherId: publisherOfferings.publisherId,
          offeringName: publisherOfferings.offeringName,
          offeringType: publisherOfferings.offeringType,
          basePrice: publisherOfferings.basePrice,
          turnaroundDays: publisherOfferings.turnaroundDays,
        })
        .from(publisherOfferings)
        .where(eq(publisherOfferings.id, offeringId))
        .limit(1);

      if (result.length === 0) return null;

      const offering = result[0];
      return {
        id: offering.id,
        publisherId: offering.publisherId || '',
        offeringName: offering.offeringName,
        offeringType: offering.offeringType,
        basePrice: offering.basePrice,
        turnaroundDays: offering.turnaroundDays,
        displayName: this.formatOfferingName(offering),
      };
    } catch (error) {
      console.error('[PublisherResolution] Error resolving offering:', error);
      return null;
    }
  }

  /**
   * Resolve multiple offerings by IDs
   */
  static async resolveOfferings(offeringIds: string[]): Promise<Map<string, OfferingInfo>> {
    const map = new Map<string, OfferingInfo>();
    
    if (offeringIds.length === 0) return map;

    try {
      const results = await db
        .select({
          id: publisherOfferings.id,
          publisherId: publisherOfferings.publisherId,
          offeringName: publisherOfferings.offeringName,
          offeringType: publisherOfferings.offeringType,
          basePrice: publisherOfferings.basePrice,
          turnaroundDays: publisherOfferings.turnaroundDays,
        })
        .from(publisherOfferings)
        .where(inArray(publisherOfferings.id, offeringIds));

      for (const offering of results) {
        map.set(offering.id, {
          id: offering.id,
          publisherId: offering.publisherId || '',
          offeringName: offering.offeringName,
          offeringType: offering.offeringType,
          basePrice: offering.basePrice,
          turnaroundDays: offering.turnaroundDays,
          displayName: this.formatOfferingName(offering),
        });
      }
    } catch (error) {
      console.error('[PublisherResolution] Error resolving offerings:', error);
    }

    return map;
  }

  /**
   * Resolve publisher with offering information
   */
  static async resolvePublisherWithOffering(
    publisherId: string | null | undefined,
    offeringId: string | null | undefined
  ): Promise<PublisherWithOffering | null> {
    const publisher = await this.resolvePublisher(publisherId);
    if (!publisher) return null;

    const offering = await this.resolveOffering(offeringId);
    
    return {
      ...publisher,
      offering: offering || undefined,
    };
  }

  /**
   * Batch resolve line items with publisher information
   */
  static async resolveLineItemPublishers(lineItems: Array<{
    publisherId?: string | null;
    publisherOfferingId?: string | null;
  }>): Promise<Map<string, PublisherWithOffering>> {
    const map = new Map<string, PublisherWithOffering>();

    // Collect unique IDs
    const publisherIds = [...new Set(
      lineItems
        .map(item => item.publisherId)
        .filter((id): id is string => !!id)
    )];

    const offeringIds = [...new Set(
      lineItems
        .map(item => item.publisherOfferingId)
        .filter((id): id is string => !!id)
    )];

    // Batch fetch
    const [publishersMap, offeringsMap] = await Promise.all([
      this.resolvePublishers(publisherIds),
      this.resolveOfferings(offeringIds),
    ]);

    // Combine results
    for (const item of lineItems) {
      if (!item.publisherId) continue;

      const publisher = publishersMap.get(item.publisherId);
      if (!publisher) continue;

      const key = `${item.publisherId}_${item.publisherOfferingId || 'none'}`;
      
      if (item.publisherOfferingId) {
        const offering = offeringsMap.get(item.publisherOfferingId);
        map.set(key, {
          ...publisher,
          offering: offering || undefined,
        });
      } else {
        map.set(key, publisher);
      }
    }

    return map;
  }

  /**
   * Format publisher name for display
   */
  private static formatPublisherName(publisher: {
    name: string | null;
    email: string;
    isShadow?: boolean | null;
  }): string {
    if (publisher.name) {
      return publisher.isShadow ? `${publisher.name} (Internal)` : publisher.name;
    }
    
    // Extract name from email if no name provided
    const emailPrefix = publisher.email.split('@')[0];
    const formattedName = emailPrefix
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
    
    return publisher.isShadow ? `${formattedName} (Internal)` : formattedName;
  }

  /**
   * Format offering name for display
   */
  private static formatOfferingName(offering: {
    offeringName: string | null;
    offeringType: string | null;
    basePrice: number | null;
  }): string {
    if (offering.offeringName) {
      return offering.offeringName;
    }

    const parts = [];
    
    if (offering.offeringType) {
      parts.push(offering.offeringType);
    }
    
    if (offering.basePrice !== null && offering.basePrice > 0) {
      parts.push(`$${(offering.basePrice / 100).toFixed(2)}`);
    }

    return parts.length > 0 ? parts.join(' - ') : 'Standard Offering';
  }

  /**
   * Get display text for a line item's publisher
   */
  static getLineItemPublisherDisplay(lineItem: {
    publisherId?: string | null;
    publisherOfferingId?: string | null;
    publisherPrice?: number | null;
    metadata?: any;
  }): {
    hasPublisher: boolean;
    publisherText: string;
    priceText: string;
    strategyText: string;
    isInternal: boolean;
  } {
    const hasPublisher = !!lineItem.publisherId;
    
    if (!hasPublisher) {
      return {
        hasPublisher: false,
        publisherText: 'No publisher assigned',
        priceText: '',
        strategyText: '',
        isInternal: false,
      };
    }

    const priceText = lineItem.publisherPrice 
      ? `$${(lineItem.publisherPrice / 100).toFixed(2)}`
      : '';

    const strategy = lineItem.metadata?.pricingStrategy;
    const strategyText = strategy 
      ? strategy.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
      : '';

    // Check if it's an internal/shadow publisher based on metadata
    const isInternal = lineItem.metadata?.attributionSource === 'shadow_publisher';

    return {
      hasPublisher: true,
      publisherText: 'Publisher assigned', // Will be replaced with actual name after resolution
      priceText,
      strategyText,
      isInternal,
    };
  }
}