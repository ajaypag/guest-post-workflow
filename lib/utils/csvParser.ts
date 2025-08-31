import fs from 'fs';
import path from 'path';

export interface AirtableRecord {
  website: string;
  domain: string; // normalized domain
  niche: string;
  type: string;
  guestPostContact: string;
  domainRating: number;
  totalTraffic: number;
  guestPostCost: number | null;
  postflowContactEmails: string[];
  postflowGuestPostPrices: (number | null)[];
  postflowBloggerRequirements: string[];
  postflowContactStatus: string[];
  postflowContactNames?: string[]; // Optional - for when you add names to CSV
}

/**
 * Get all unique emails from an Airtable record
 */
export function getAllEmailsFromRecord(record: AirtableRecord): string[] {
  const allEmails = new Set<string>();
  
  // Add emails from postflowContactEmails
  record.postflowContactEmails.forEach(email => {
    if (email && email.trim()) {
      allEmails.add(email.trim().toLowerCase());
    }
  });
  
  // Add emails from guestPostContact
  if (record.guestPostContact) {
    const contactEmails = record.guestPostContact.split(',').map(e => e.trim().toLowerCase());
    contactEmails.forEach(email => {
      if (email && email.includes('@')) {
        allEmails.add(email);
      }
    });
  }
  
  return Array.from(allEmails);
}

export function parseAirtableCSV(): AirtableRecord[] {
  const csvPath = path.join(process.cwd(), 'docs/06-planning/pricing-standardization/Website-PostFlow.csv');
  
  if (!fs.existsSync(csvPath)) {
    throw new Error('CSV file not found at ' + csvPath);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',');
  
  const records: AirtableRecord[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV line (handle commas in quotes)
    const values = parseCSVLine(line);
    
    if (values.length < headers.length) continue;
    
    const website = values[0];
    const domain = normalizeDomain(website);
    
    // Parse multiple emails and prices if they exist
    const postflowEmails = parseMultipleValues(values[10]);
    const postflowPrices = parseMultipleValues(values[11]).map(p => parsePriceToNumber(p));
    const postflowRequirements = parseMultipleValues(values[12]);
    const postflowStatuses = parseMultipleValues(values[13]);
    // Parse names if column exists (column 14 - you can add this to CSV)
    const postflowNames = values[14] ? parseMultipleValues(values[14]) : [];
    
    records.push({
      website,
      domain,
      niche: values[2] || '',
      type: values[4] || '',
      guestPostContact: values[5] || '',
      domainRating: parseFloat(values[6]) || 0,
      totalTraffic: parseFloat(values[7]) || 0,
      guestPostCost: parsePriceToNumber(values[8]),
      postflowContactEmails: postflowEmails,
      postflowGuestPostPrices: postflowPrices,
      postflowBloggerRequirements: postflowRequirements,
      postflowContactStatus: postflowStatuses,
      postflowContactNames: postflowNames
    });
  }
  
  return records;
}

function parseCSVLine(line: string): string[] {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

function parseMultipleValues(value: string): string[] {
  if (!value || value === '') return [];
  
  // Remove outer quotes if present
  value = value.replace(/^"|"$/g, '');
  
  // If value contains commas, split by comma
  if (value.includes(',')) {
    return value.split(',').map(v => v.trim()).filter(v => v);
  }
  
  return [value.trim()].filter(v => v);
}

function parsePriceToNumber(price: string): number | null {
  if (!price) return null;
  
  // Remove $ and commas, then parse
  const cleaned = price.replace(/[$,]/g, '').trim();
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? null : parsed;
}

function normalizeDomain(url: string): string {
  if (!url) return '';
  
  // Remove protocol
  let domain = url.replace(/^https?:\/\//, '');
  
  // Remove www
  domain = domain.replace(/^www\./, '');
  
  // Remove trailing slash and path
  domain = domain.split('/')[0];
  
  // Convert to lowercase
  return domain.toLowerCase();
}