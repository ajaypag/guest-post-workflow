// Airtable API Response Types
export interface AirtableApiResponse<T> {
  records: T[];
  offset?: string;
}

export interface AirtableRecord {
  id: string;
  fields: Record<string, any>;
  createdTime: string;
}

// Airtable Website Record
export interface AirtableWebsite extends AirtableRecord {
  fields: {
    Website: string;
    'Domain Rating': number;
    'Total Traffic': number;
    'Guest Post Cost V2': number;
    Category: string[];
    Type: string[];
    'Guest Post Contact': string[];
    'Count of Published Opportunities': number;
    Status: string;
    'Guest Post Access?': string;
    'Link Insert Access?': string;
    'Overall Website Quality': string;
    // PostFlow lookup fields
    'PostFlow Contact Emails'?: string[];
    'PostFlow Guest Post Prices'?: number[];
    'PostFlow Blogger Requirements'?: string[];
    'PostFlow Contact Status'?: string[];
  };
}

// Airtable Link Price Record
export interface AirtableLinkPrice extends AirtableRecord {
  fields: {
    Name: string;
    Website: string[];
    'Post type': string;
    Requirement: string;
    Status: string;
    'Guest Post Cost': number;
    'Link Insert Cost': number;
  };
}

// Processed Types (for our application)
export interface ProcessedContact {
  email: string;
  isPrimary: boolean;
  hasPaidGuestPost: boolean;
  hasSwapOption: boolean;
  guestPostCost?: number;
  linkInsertCost?: number;
  requirement?: string;
}

export interface ProcessedWebsite {
  id: string;
  domain: string;
  domainRating: number | null;
  totalTraffic: number | null;
  guestPostCost: number | null;
  categories: string[];
  type: string[];
  contacts: ProcessedContact[];
  publishedOpportunities: number;
  status: string;
  hasGuestPost: boolean;
  hasLinkInsert: boolean;
  overallQuality?: string;
}

// Filter Types
export interface WebsiteFilters {
  minDR?: number;
  maxDR?: number;
  minTraffic?: number;
  maxTraffic?: number;
  minCost?: number;
  maxCost?: number;
  status?: 'All' | 'Active' | 'Inactive';
  hasGuestPost?: boolean;
  hasLinkInsert?: boolean;
  categories?: string[];
  searchTerm?: string;
  forceAllRecords?: boolean; // Skip view filtering for full sync
}