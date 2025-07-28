import { 
  AirtableWebsite, 
  AirtableLinkPrice, 
  WebsiteFilters, 
  ProcessedWebsite,
  ProcessedContact,
  AirtableApiResponse 
} from '@/types/airtable';

export class AirtableService {
  private static readonly API_BASE_URL = 'https://api.airtable.com/v0';
  private static readonly BASE_ID = process.env.AIRTABLE_BASE_ID;
  private static readonly WEBSITE_TABLE_ID = 'tblT8P0fPHV5fdrT5';
  private static readonly LINK_PRICE_TABLE_ID = 'tblEnYjUwKHok7Y3K';
  private static readonly POSTFLOW_VIEW_ID = 'viwWrgaGb55n8iaVk';
  
  private static getHeaders() {
    if (!process.env.AIRTABLE_API_KEY) {
      throw new Error('Airtable API key not configured');
    }
    
    return {
      'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Build filter formula for Airtable API
   */
  private static buildFilterFormula(filters: WebsiteFilters): string {
    const conditions: string[] = [];
    
    if (filters.minDR !== undefined) {
      conditions.push(`{Domain Rating} >= ${filters.minDR}`);
    }
    
    if (filters.maxDR !== undefined) {
      conditions.push(`{Domain Rating} <= ${filters.maxDR}`);
    }
    
    if (filters.minTraffic !== undefined) {
      conditions.push(`{Total Traffic} >= ${filters.minTraffic}`);
    }
    
    if (filters.maxTraffic !== undefined) {
      conditions.push(`{Total Traffic} <= ${filters.maxTraffic}`);
    }
    
    if (filters.minCost !== undefined) {
      conditions.push(`{Guest Post Cost V2} >= ${filters.minCost}`);
    }
    
    if (filters.maxCost !== undefined) {
      conditions.push(`{Guest Post Cost V2} <= ${filters.maxCost}`);
    }
    
    if (filters.status && filters.status !== 'All') {
      conditions.push(`{Status} = '${filters.status}'`);
    }
    
    if (filters.hasGuestPost === true) {
      conditions.push(`{Guest Post Access?} = 'Yes'`);
    }
    
    if (filters.hasLinkInsert === true) {
      conditions.push(`{Link Insert Access?} = 'Yes'`);
    }
    
    if (filters.searchTerm) {
      conditions.push(`SEARCH("${filters.searchTerm}", {Website})`);
    }
    
    // For categories, we need to check if any category matches
    if (filters.categories && filters.categories.length > 0) {
      const categoryConditions = filters.categories.map(cat => 
        `FIND("${cat}", ARRAYJOIN({Category}, ",")) > 0`
      );
      conditions.push(`OR(${categoryConditions.join(', ')})`);
    }
    
    return conditions.length > 0 ? `AND(${conditions.join(', ')})` : '';
  }

  /**
   * Search websites with filters
   */
  static async searchWebsites(
    filters: WebsiteFilters, 
    limit: number = 100,
    offset?: string
  ): Promise<{ websites: ProcessedWebsite[], hasMore: boolean, nextOffset?: string }> {
    try {
      const params = new URLSearchParams({
        view: this.POSTFLOW_VIEW_ID,
        maxRecords: limit.toString(),
        ...(offset && { offset })
      });
      
      const filterFormula = this.buildFilterFormula(filters);
      if (filterFormula) {
        params.append('filterByFormula', filterFormula);
      }
      
      const url = `${this.API_BASE_URL}/${this.BASE_ID}/${this.WEBSITE_TABLE_ID}?${params}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Airtable API error: ${error.error?.message || response.statusText}`);
      }
      
      const data: AirtableApiResponse<AirtableWebsite> = await response.json();
      
      // Process websites to a cleaner format
      const processedWebsites = data.records.map(record => this.processWebsiteRecord(record));
      
      return {
        websites: processedWebsites,
        hasMore: !!data.offset,
        nextOffset: data.offset
      };
    } catch (error) {
      console.error('Error searching Airtable websites:', error);
      throw error;
    }
  }

  /**
   * Get link prices for a website
   */
  static async getLinkPricesForWebsite(websiteRecordId: string): Promise<AirtableLinkPrice[]> {
    try {
      const filterFormula = `SEARCH("${websiteRecordId}", ARRAYJOIN({Website}, ","))`;
      
      const params = new URLSearchParams({
        filterByFormula: filterFormula,
        maxRecords: '100'
      });
      
      const url = `${this.API_BASE_URL}/${this.BASE_ID}/${this.LINK_PRICE_TABLE_ID}?${params}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch link prices: ${response.statusText}`);
      }
      
      const data: AirtableApiResponse<AirtableLinkPrice> = await response.json();
      return data.records;
    } catch (error) {
      console.error('Error fetching link prices:', error);
      return [];
    }
  }

  /**
   * Process a website record into a cleaner format
   */
  private static processWebsiteRecord(record: AirtableWebsite): ProcessedWebsite {
    const fields = record.fields;
    
    // Extract domain from URL
    let domain = fields.Website || '';
    try {
      const url = new URL(domain);
      domain = url.hostname;
    } catch {
      // If URL parsing fails, use as-is
    }
    
    return {
      id: record.id,
      domain,
      domainRating: fields['Domain Rating'] || null,
      totalTraffic: fields['Total Traffic'] || null,
      guestPostCost: fields['Guest Post Cost V2'] || null,
      categories: fields.Category || [],
      type: fields.Type || [],
      contacts: this.processContacts(fields['Guest Post Contact'] || []),
      publishedOpportunities: fields['Count of Published Opportunities'] || 0,
      status: fields.Status || 'Unknown',
      hasGuestPost: fields['Guest Post Access?'] === 'Yes',
      hasLinkInsert: fields['Link Insert Access?'] === 'Yes',
      overallQuality: fields['Overall Website Quality']
    };
  }

  /**
   * Process contact emails into structured format
   */
  private static processContacts(emails: string[]): ProcessedContact[] {
    // For now, we don't have link price data, so we'll mark all as potentially available
    // This will be enhanced when we fetch link prices
    return emails.map((email, index) => ({
      email,
      isPrimary: index === 0, // First contact is primary by default
      hasPaidGuestPost: false, // Will be updated with link price data
      hasSwapOption: false, // Will be updated with link price data
    }));
  }

  /**
   * Get all available categories from Airtable
   */
  static async getCategories(): Promise<string[]> {
    try {
      // Fetch a large number of records to get all unique categories
      const { websites } = await this.searchWebsites({}, 1000);
      
      const categoriesSet = new Set<string>();
      websites.forEach(website => {
        website.categories.forEach(cat => categoriesSet.add(cat));
      });
      
      return Array.from(categoriesSet).sort();
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  /**
   * Enhance websites with link price data
   */
  static async enhanceWebsitesWithLinkPrices(websites: ProcessedWebsite[]): Promise<ProcessedWebsite[]> {
    // Batch fetch link prices for all websites
    const enhancedWebsites = await Promise.all(
      websites.map(async (website) => {
        const linkPrices = await this.getLinkPricesForWebsite(website.id);
        
        // Update contacts with link price information
        const enhancedContacts = website.contacts.map(contact => {
          const linkPriceRecords = linkPrices.filter(lp => 
            lp.fields.Name.includes(contact.email)
          );
          
          const paidGuestPost = linkPriceRecords.find(lp => 
            lp.fields['Post type'] === 'Guest Post' && 
            lp.fields.Requirement === 'Paid' &&
            lp.fields.Status === 'Active'
          );
          
          const swapOption = linkPriceRecords.find(lp => 
            lp.fields.Requirement === 'Swap' &&
            lp.fields.Status === 'Active'
          );
          
          return {
            ...contact,
            hasPaidGuestPost: !!paidGuestPost,
            hasSwapOption: !!swapOption,
            guestPostCost: paidGuestPost?.fields['Guest Post Cost'],
            linkInsertCost: linkPriceRecords.find(lp => 
              lp.fields['Post type'] === 'Link Insert'
            )?.fields['Link Insert Cost'],
            requirement: paidGuestPost?.fields.Requirement || swapOption?.fields.Requirement
          };
        });
        
        // Sort contacts: paid first, then swap, then others
        enhancedContacts.sort((a, b) => {
          if (a.hasPaidGuestPost && !b.hasPaidGuestPost) return -1;
          if (!a.hasPaidGuestPost && b.hasPaidGuestPost) return 1;
          if (a.hasSwapOption && !b.hasSwapOption) return -1;
          if (!a.hasSwapOption && b.hasSwapOption) return 1;
          return 0;
        });
        
        // Update primary contact based on link prices
        if (enhancedContacts.length > 0) {
          enhancedContacts.forEach((c, i) => c.isPrimary = i === 0);
        }
        
        return {
          ...website,
          contacts: enhancedContacts
        };
      })
    );
    
    return enhancedWebsites;
  }
}