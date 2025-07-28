// Airtable data types for PostFlow integration

export interface AirtableWebsite {
  id: string; // Airtable record ID (e.g., "rec0HSqkOddx2sucx")
  fields: {
    Website: string; // URL (e.g., "https://nikolaroza.com/")
    Summary?: string;
    Type?: string[]; // Array because it's a multiple select field
    'Guest Post Contact'?: string[]; // Array of email addresses
    'Domain Rating'?: number;
    'Total Traffic'?: number;
    'Guest Post Cost V2'?: number;
    'Count of Published Opportunities'?: number;
    'Retail Price (inclusive of Guest Post) V1 (For Filter)'?: number;
    Category?: string[]; // Array of categories
    Status?: string;
    'Overall Website Quality'?: string;
    'Guest Post Access?'?: string; // "Yes" or "No"
    'Link Insert Access?'?: string; // "Yes" or "No"
  };
}

export interface AirtableLinkPrice {
  id: string;
  fields: {
    Name: string; // Format: "Post Type - Price - Website - Email"
    'Default Cost': number;
    Status: 'Active' | 'Inactive';
    Website: string[]; // Array of record IDs linking to Website table
    Contacts: string[]; // Array of record IDs linking to Contacts table
    'Guest Post Cost'?: number;
    'Link Insert Cost'?: number;
    'Post type': 'Guest Post' | 'Link Insert';
    Requirement: 'Paid' | 'Swap';
    'Contact Name'?: string[];
    'Payment Terms'?: string[];
    'Payment Method'?: string[];
  };
}

export interface WebsiteFilters {
  minDR?: number;
  maxDR?: number;
  minTraffic?: number;
  maxTraffic?: number;
  categories?: string[];
  minCost?: number;
  maxCost?: number;
  hasGuestPost?: boolean;
  hasLinkInsert?: boolean;
  status?: 'Active' | 'Inactive' | 'All';
  searchTerm?: string; // For domain name search
}

export interface ProcessedWebsite {
  id: string; // Airtable record ID
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

export interface ProcessedContact {
  email: string;
  isPrimary: boolean;
  hasPaidGuestPost: boolean;
  hasSwapOption: boolean;
  guestPostCost?: number;
  linkInsertCost?: number;
  requirement?: 'Paid' | 'Swap';
}

export interface AirtableApiResponse<T> {
  records: T[];
  offset?: string; // For pagination
}