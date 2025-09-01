import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

interface DynamicData {
  NICHE_COUNT: number;
  NICHE_LIST: string;
  CATEGORY_COUNT: number;
  CATEGORY_LIST: string;
  TYPE_COUNT: number;
  TYPE_LIST: string;
  [key: string]: any;
}

export class ManyReachPromptGenerator {
  private templateDir = path.join(process.cwd(), 'prompts', 'templates');
  private cache: Map<string, { data: DynamicData; timestamp: number }> = new Map();
  private cacheTimeout = 1000 * 60 * 60; // 1 hour cache
  
  async generateExtractionPrompt(tableName: string): Promise<string> {
    // Load base template
    const template = await this.loadTemplate(tableName);
    
    // Fetch current data from database (with caching)
    const dynamicData = await this.fetchDynamicData();
    
    // Inject data into template
    return this.injectData(template, dynamicData);
  }
  
  private async loadTemplate(tableName: string): Promise<string> {
    const templatePath = path.join(this.templateDir, `${tableName}-extraction.md`);
    try {
      return await fs.readFile(templatePath, 'utf-8');
    } catch (error) {
      throw new Error(`Template not found for table: ${tableName}`);
    }
  }
  
  private async fetchDynamicData(): Promise<DynamicData> {
    // Check cache first
    const cached = this.cache.get('dynamic-data');
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    
    // Fetch fresh data
    const [niches, categories, types] = await Promise.all([
      db.execute(sql`
        SELECT DISTINCT unnest(niche) as value 
        FROM websites 
        WHERE niche IS NOT NULL 
        ORDER BY value
      `),
      db.execute(sql`
        SELECT DISTINCT unnest(categories) as value 
        FROM websites 
        WHERE categories IS NOT NULL 
        ORDER BY value
      `),
      db.execute(sql`
        SELECT DISTINCT unnest(website_type) as value 
        FROM websites 
        WHERE website_type IS NOT NULL 
        ORDER BY value
      `)
    ]);
    
    const data: DynamicData = {
      NICHE_COUNT: niches.rows.length,
      NICHE_LIST: niches.rows.map((r: any) => r.value).join(', '),
      CATEGORY_COUNT: categories.rows.length,
      CATEGORY_LIST: categories.rows.map((r: any) => r.value).join(', '),
      TYPE_COUNT: types.rows.length,
      TYPE_LIST: types.rows.map((r: any) => r.value).join(', '),
      GENERATION_TIME: new Date().toISOString()
    };
    
    // Cache the data
    this.cache.set('dynamic-data', { data, timestamp: Date.now() });
    
    return data;
  }
  
  private injectData(template: string, data: DynamicData): string {
    let result = template;
    
    // Replace all placeholders
    for (const [key, value] of Object.entries(data)) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(placeholder, String(value));
    }
    
    return result;
  }
  
  // Utility method to invalidate cache when data changes
  invalidateCache(): void {
    this.cache.clear();
  }
  
  // Get current dynamic data without template (for debugging/inspection)
  async getCurrentData(): Promise<DynamicData> {
    return this.fetchDynamicData();
  }
}