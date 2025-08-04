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
    console.log('🔧 Checking Airtable environment variables...');
    
    if (!process.env.AIRTABLE_API_KEY) {
      console.error('❌ AIRTABLE_API_KEY not configured');
      throw new Error('Airtable API key not configured');
    }
    
    if (!process.env.AIRTABLE_BASE_ID) {
      console.error('❌ AIRTABLE_BASE_ID not configured');
      throw new Error('Airtable Base ID not configured');
    }
    
    console.log('✅ Environment variables configured:', {
      hasApiKey: !!process.env.AIRTABLE_API_KEY,
      hasBaseId: !!process.env.AIRTABLE_BASE_ID,
      baseId: process.env.AIRTABLE_BASE_ID?.substring(0, 8) + '...'
    });
    
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
    console.log('🔍 AirtableService.searchWebsites called with:', { filters, limit, offset });
    
    try {
      // Only request the fields we actually need
      const fields = [
        'Website',
        'Domain Rating', 
        'Total Traffic',
        'Guest Post Cost V2',
        'Category',
        'Type',
        'Status',
        'Guest Post Access?',
        'Link Insert Access?',
        'Count of Published Opportunities',
        'Overall Website Quality',
        // PostFlow lookup fields
        'PostFlow Contact Emails',
        'PostFlow Guest Post Prices',
        'PostFlow Blogger Requirements',
        'PostFlow Contact Status'
      ];
      
      const params = new URLSearchParams({
        view: this.POSTFLOW_VIEW_ID,
        // Don't use maxRecords as it limits TOTAL records across all pages
        // pageSize controls records per page
        pageSize: '100',
        ...(offset && { offset })
      });
      
      // Add field filtering
      fields.forEach(field => {
        params.append('fields[]', field);
      });
      
      const filterFormula = this.buildFilterFormula(filters);
      console.log('📋 Built filter formula:', filterFormula);
      if (filterFormula) {
        params.append('filterByFormula', filterFormula);
      }
      
      const url = `${this.API_BASE_URL}/${this.BASE_ID}/${this.WEBSITE_TABLE_ID}?${params}`;
      console.log('🌐 Making Airtable API request to:', url);
      console.log('📋 Request params:', {
        view: this.POSTFLOW_VIEW_ID,
        pageSize: limit,
        offset: offset || 'none',
        hasFilter: !!filterFormula
      });
      
      const headers = this.getHeaders();
      console.log('📝 Request headers:', { ...headers, Authorization: 'Bearer [REDACTED]' });
      
      const response = await fetch(url, {
        method: 'GET',
        headers
      });
      
      console.log('📊 Airtable API response status:', response.status, response.statusText);
      
      if (!response.ok) {
        console.error('❌ Airtable API error response');
        const errorText = await response.text();
        console.error('❌ Error response body:', errorText);
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: { message: errorText } };
        }
        throw new Error(`Airtable API error: ${error.error?.message || response.statusText}`);
      }
      
      const data: AirtableApiResponse<AirtableWebsite> = await response.json();
      console.log('✅ Airtable API success, received records:', data.records?.length || 0);
      console.log('📄 Raw Airtable response structure:', {
        hasRecords: !!data.records,
        recordCount: data.records?.length || 0,
        hasOffset: !!data.offset,
        offsetValue: data.offset || 'none',
        // Log all keys in the response to see what Airtable is returning
        responseKeys: Object.keys(data),
        // Check if there's any indication of more pages
        rawData: JSON.stringify(data).substring(0, 200) + '...'
      });
      console.log('📄 Sample record:', data.records?.[0] ? { 
        id: data.records[0].id, 
        fields: Object.keys(data.records[0].fields),
        hasPostFlowFields: {
          emails: !!data.records[0].fields['PostFlow Contact Emails'],
          prices: !!data.records[0].fields['PostFlow Guest Post Prices'],
          requirements: !!data.records[0].fields['PostFlow Blogger Requirements'],
          statuses: !!data.records[0].fields['PostFlow Contact Status']
        }
      } : 'No records');
      
      // Process websites to a cleaner format
      const processedWebsites = data.records.map(record => this.processWebsiteRecord(record));
      console.log('🔄 Processed websites:', processedWebsites.length);
      
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
    
    // Debug: Check the structure of fields
    console.log('🔍 Processing record:', {
      recordId: record.id,
      fieldsType: typeof fields,
      isArray: Array.isArray(fields),
      fieldsKeys: fields && typeof fields === 'object' && !Array.isArray(fields) ? Object.keys(fields).slice(0, 5) : 'Not an object',
      sampleFieldValue: fields?.Website,
      postFlowFields: {
        emails: fields['PostFlow Contact Emails'],
        prices: fields['PostFlow Guest Post Prices'],
        requirements: fields['PostFlow Blogger Requirements'],
        statuses: fields['PostFlow Contact Status']
      }
    });
    
    // Extract domain from URL
    let domain = fields.Website || '';
    try {
      const url = new URL(domain);
      domain = url.hostname;
    } catch {
      // If URL parsing fails, use as-is
    }
    
    // Process PostFlow contacts if available
    const contacts = this.processPostFlowContacts(fields);
    
    return {
      id: record.id,
      domain,
      domainRating: fields['Domain Rating'] || null,
      totalTraffic: fields['Total Traffic'] || null,
      guestPostCost: fields['Guest Post Cost V2'] || null,
      categories: fields.Category || [],
      type: fields.Type || [], // Keep existing for backward compatibility
      websiteType: fields.Type || [], // Map Type field to websiteType (SaaS, Blog, News, eCommerce, etc.)
      niche: fields.Niche || [], // Multiple niches
      contacts, // Now populated from PostFlow lookup fields
      publishedOpportunities: fields['Count of Published Opportunities'] || 0,
      status: fields.Status || 'Unknown',
      hasGuestPost: fields['Guest Post Access?'] === 'Yes',
      hasLinkInsert: fields['Link Insert Access?'] === 'Yes',
      overallQuality: fields['Overall Website Quality']
    };
  }

  /**
   * Process PostFlow contacts from lookup fields
   */
  private static processPostFlowContacts(fields: AirtableWebsite['fields']): ProcessedContact[] {
    const emails = fields['PostFlow Contact Emails'] || [];
    const prices = fields['PostFlow Guest Post Prices'] || [];
    const requirements = fields['PostFlow Blogger Requirements'] || [];
    const statuses = fields['PostFlow Contact Status'] || [];
    
    if (emails.length === 0) {
      return [];
    }
    
    const contacts: ProcessedContact[] = [];
    let bestPaidIndex = -1;
    let lowestCost = Infinity;
    
    // Process all contacts
    for (let i = 0; i < emails.length; i++) {
      // Handle record IDs vs actual emails
      const email = emails[i];
      if (!email) continue;
      
      // For now, skip record IDs (starting with 'rec')
      // TODO: In Airtable, add a "Contact Email" lookup field in Link Price table
      // that pulls the actual email from Contacts table
      if (typeof email === 'string' && email.startsWith('rec')) {
        console.log(`⚠️ PostFlow Contact Emails is returning record IDs. Need to lookup actual email field in Airtable.`);
        continue;
      }
      
      // Skip inactive contacts
      if (statuses[i] !== 'Active') continue;
      
      const isPaid = requirements[i] === 'Paid' && prices[i] > 0;
      const isSwap = requirements[i] === 'Swap';
      
      // Skip unqualified contacts
      if (!isPaid && !isSwap) continue;
      
      // Track cheapest paid option
      if (isPaid && prices[i] < lowestCost) {
        bestPaidIndex = contacts.length; // Index in contacts array
        lowestCost = prices[i];
      }
      
      contacts.push({
        email: emails[i],
        isPrimary: false, // Will set later
        hasPaidGuestPost: isPaid,
        hasSwapOption: isSwap,
        guestPostCost: prices[i] || undefined,
        requirement: requirements[i]
      });
    }
    
    // Mark primary contact (cheapest paid, or first swap if no paid)
    if (bestPaidIndex >= 0) {
      contacts[bestPaidIndex].isPrimary = true;
    } else if (contacts.length > 0) {
      contacts[0].isPrimary = true;
    }
    
    return contacts;
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
    console.log('🔄 Enhancing websites with Link Price data...');
    
    // Batch fetch link prices for all websites
    const enhancedWebsites = await Promise.all(
      websites.map(async (website) => {
        const linkPrices = await this.getLinkPricesForWebsite(website.id);
        
        // Extract unique contacts from Link Price records
        const contactsMap = new Map<string, ProcessedContact>();
        
        linkPrices.forEach(lp => {
          const email = lp.fields.Name;
          if (!email || lp.fields.Status !== 'Active') return;
          
          // Skip if we already have a better option for this contact
          const existing = contactsMap.get(email);
          if (existing && existing.hasPaidGuestPost && lp.fields.Requirement !== 'Paid') {
            return; // Skip swap if we already have paid
          }
          
          contactsMap.set(email, {
            email,
            isPrimary: false, // Will be set later
            hasPaidGuestPost: lp.fields['Post type'] === 'Guest Post' && lp.fields.Requirement === 'Paid',
            hasSwapOption: lp.fields.Requirement === 'Swap',
            guestPostCost: lp.fields['Guest Post Cost'] || undefined,
            linkInsertCost: lp.fields['Link Insert Cost'] || undefined,
            requirement: lp.fields.Requirement
          });
        });
        
        // Convert to array and sort by priority
        const contacts = Array.from(contactsMap.values());
        contacts.sort((a, b) => {
          // Paid guest posts first
          if (a.hasPaidGuestPost && !b.hasPaidGuestPost) return -1;
          if (!a.hasPaidGuestPost && b.hasPaidGuestPost) return 1;
          // Then swap options
          if (a.hasSwapOption && !b.hasSwapOption) return -1;
          if (!a.hasSwapOption && b.hasSwapOption) return 1;
          // Then by cost (lower cost first)
          if (a.guestPostCost && b.guestPostCost) {
            return a.guestPostCost - b.guestPostCost;
          }
          return 0;
        });
        
        // Mark the first contact as primary
        if (contacts.length > 0) {
          contacts[0].isPrimary = true;
        }
        
        return {
          ...website,
          contacts
        };
      })
    );
    
    console.log('✅ Enhanced websites with contacts from Link Price table');
    return enhancedWebsites;
  }
}