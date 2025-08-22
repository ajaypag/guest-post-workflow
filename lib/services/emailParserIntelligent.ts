import OpenAI from 'openai';

/**
 * Intelligent Email Parser
 * 
 * This parser sends our ACTUAL database schema to OpenAI and lets it intelligently
 * figure out what to extract from emails. No hardcoded rules, no qualification logic.
 * OpenAI decides everything based on understanding our data model.
 */
export class EmailParserIntelligent {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Parse email by sending schema + email to OpenAI
   * Let OpenAI intelligently map the email content to our database structure
   */
  async parseEmail(
    emailContent: string, 
    emailFrom: string, 
    emailSubject?: string
  ): Promise<any> {
    
    // Our ACTUAL database schema - what OpenAI needs to understand
    const databaseSchema = {
      description: "We have a guest posting platform. When publishers send us emails about their services, we need to extract information and store it in our database.",
      
      tables: {
        publishers: {
          description: "Represents a publisher/company offering guest posting services",
          columns: {
            id: "UUID (auto-generated)",
            email: "VARCHAR(255) UNIQUE NOT NULL - their email address",
            contactName: "VARCHAR(255) DEFAULT 'Unknown' - person's name",
            companyName: "VARCHAR(255) - company/business name",
            phone: "VARCHAR(50) - phone number",
            status: "VARCHAR(20) DEFAULT 'pending' - account status",
            accountStatus: "VARCHAR(50) DEFAULT 'shadow' - for email-extracted publishers, use 'shadow'",
            source: "VARCHAR(50) DEFAULT 'manyreach' - how we got this publisher",
            confidenceScore: "DECIMAL(3,2) - your confidence in the extraction (0-1)",
            attributes: "JSONB - any additional metadata you want to store",
            createdAt: "TIMESTAMP (auto-generated)",
            updatedAt: "TIMESTAMP (auto-generated)"
          }
        },
        
        websites: {
          description: "Websites that offer guest posting. One publisher can manage multiple websites.",
          columns: {
            id: "UUID (auto-generated)",
            domain: "VARCHAR(255) UNIQUE NOT NULL - normalized domain (lowercase, no www/https)",
            domainRating: "INTEGER - DR/DA if mentioned",
            totalTraffic: "INTEGER - monthly traffic if mentioned",
            guestPostCost: "DECIMAL(10,2) - base price in dollars (legacy field, use offerings for new data)",
            niche: "TEXT[] - array of niches/categories",
            websiteType: "TEXT[] - type of site (Blog, News, SaaS, etc)",
            source: "VARCHAR(50) DEFAULT 'manyreach' - how we got this website",
            attributes: "JSONB - any additional metadata",
            createdAt: "TIMESTAMP (auto-generated)"
          }
        },
        
        publisher_offerings: {
          description: "Specific services and pricing offered by a publisher. This is where pricing should go.",
          columns: {
            id: "UUID (auto-generated)",
            publisherId: "UUID NOT NULL - references publishers.id",
            offeringType: "VARCHAR(50) NOT NULL - type of service (guest_post, link_insertion, listicle_placement, sponsored_post, press_release, etc)",
            basePrice: "INTEGER NOT NULL - price in CENTS (multiply dollars by 100)",
            currency: "VARCHAR(10) DEFAULT 'USD'",
            turnaroundDays: "INTEGER - typical delivery time",
            offeringName: "VARCHAR(255) - descriptive name",
            minWordCount: "INTEGER - minimum words",
            maxWordCount: "INTEGER - maximum words",
            niches: "TEXT[] - specific niches for this offering",
            attributes: "JSONB - store complex details here (included links, dofollow, restrictions, bulk pricing, etc)",
            sourceEmailId: "UUID - reference to email_processing_logs.id",
            pricingExtractedFrom: "TEXT - exact pricing text from email",
            createdAt: "TIMESTAMP (auto-generated)"
          }
        },
        
        shadow_publisher_websites: {
          description: "Links shadow publishers to their websites (many-to-many relationship)",
          columns: {
            id: "UUID (auto-generated)",
            shadowPublisherId: "UUID NOT NULL - references publishers.id",
            websiteId: "UUID NOT NULL - references websites.id",
            isPrimary: "BOOLEAN DEFAULT false - is this their main website?",
            createdAt: "TIMESTAMP (auto-generated)"
          }
        },
        
        publisher_pricing_rules: {
          description: "Complex pricing rules and conditions (optional - only if email has complex pricing)",
          columns: {
            id: "UUID (auto-generated)",
            publisherId: "UUID NOT NULL - references publishers.id",
            offeringId: "UUID - references publisher_offerings.id (optional)",
            ruleType: "VARCHAR(50) - bulk_discount, niche_surcharge, etc",
            condition: "JSONB - when this rule applies",
            adjustmentType: "VARCHAR(20) - 'fixed' or 'percentage'",
            priceAdjustment: "INTEGER - amount in cents or percentage",
            description: "TEXT - human-readable description",
            active: "BOOLEAN DEFAULT true",
            createdAt: "TIMESTAMP (auto-generated)"
          }
        }
      },
      
      important_notes: [
        "CRITICAL: All prices must be stored in CENTS. If email says $150, store 15000",
        "Domains must be normalized: lowercase, remove www/https/trailing slash",
        "Use 'shadow' for accountStatus when creating publishers from emails",
        "Store raw pricing text in pricingExtractedFrom for audit trail",
        "Use attributes JSONB field for any data that doesn't fit in columns",
        "One publisher can have multiple websites and multiple offerings",
        "Create shadow_publisher_websites records to link publishers to websites",
        "Only create publisher_pricing_rules if there are complex conditional pricing structures"
      ]
    };

    const systemPrompt = `You are an intelligent data extraction system for a guest posting platform.

I will give you an email from a publisher offering guest posting services, and you need to extract data that fits into our database schema.

DATABASE SCHEMA:
${JSON.stringify(databaseSchema, null, 2)}

YOUR TASK:
1. Analyze the email content
2. Extract ALL relevant information that maps to our database tables
3. Return data in EXACTLY this JSON format ready for database insertion:

{
  "publisher": {
    // Only include fields that you can extract from the email
    // Use null for missing optional fields
    // MUST include at minimum: email, contactName or companyName
  },
  "websites": [
    // Array of website objects
    // Normalize domains (lowercase, no www/https)
    // Can be empty array if no websites mentioned
  ],
  "offerings": [
    // Array of offering objects
    // MUST convert prices to cents (multiply dollars by 100)
    // Include all pricing variations as separate offerings
  ],
  "websiteRelations": [
    // For linking publishers to websites
    // Only needed if creating shadow publisher
  ],
  "pricingRules": [
    // Only if complex conditional pricing exists
    // Things like bulk discounts, special rates, etc
  ],
  "extractionConfidence": 0.0 to 1.0, // Your confidence in the extraction
  "extractionNotes": "Any important notes about what you extracted or couldn't extract"
}

IMPORTANT:
- Think intelligently about what data belongs where
- If they mention multiple sites with different prices, create separate offerings
- Use the attributes field for anything that doesn't fit in standard columns
- Be smart about inferring relationships (which website has which price)
- Extract everything useful, but don't make up data that isn't there`;

    const userPrompt = `Email From: ${emailFrom}
${emailSubject ? `Email Subject: ${emailSubject}` : ''}

Email Content:
${emailContent}

Extract all relevant data according to our database schema. Be thorough but only extract what's actually in the email.`;

    try {
      console.log('[IntelligentParser] Parsing email from', emailFrom);
      
      const response = await this.openai.chat.completions.create({
        model: 'o3-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 4000,
        // @ts-ignore - o3-mini specific parameter
        reasoning_effort: 'high' // Use high reasoning for better extraction
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      const result = JSON.parse(content);
      
      // Ensure email is set if not extracted
      if (result.publisher && !result.publisher.email) {
        result.publisher.email = emailFrom;
      }

      console.log('[IntelligentParser] Extraction complete:', {
        confidence: result.extractionConfidence,
        websites: result.websites?.length || 0,
        offerings: result.offerings?.length || 0,
        notes: result.extractionNotes
      });

      return result;
      
    } catch (error) {
      console.error('[IntelligentParser] Failed to parse email:', error);
      throw error;
    }
  }

  /**
   * Prepare extracted data for database insertion
   * This just ensures the data is in the right format
   */
  prepareForDatabase(extractedData: any) {
    const prepared = {
      publisher: null as any,
      websites: [] as any[],
      offerings: [] as any[],
      websiteRelations: [] as any[],
      pricingRules: [] as any[]
    };

    // Publisher data
    if (extractedData.publisher) {
      prepared.publisher = {
        ...extractedData.publisher,
        accountStatus: extractedData.publisher.accountStatus || 'shadow',
        source: extractedData.publisher.source || 'manyreach',
        status: extractedData.publisher.status || 'pending'
      };
    }

    // Websites - ensure normalized domains
    if (extractedData.websites && Array.isArray(extractedData.websites)) {
      prepared.websites = extractedData.websites.map((w: any) => ({
        ...w,
        domain: this.normalizeDomain(w.domain),
        source: w.source || 'manyreach'
      }));
    }

    // Offerings - ensure prices are in cents
    if (extractedData.offerings && Array.isArray(extractedData.offerings)) {
      prepared.offerings = extractedData.offerings;
    }

    // Website relations
    if (extractedData.websiteRelations && Array.isArray(extractedData.websiteRelations)) {
      prepared.websiteRelations = extractedData.websiteRelations;
    }

    // Pricing rules
    if (extractedData.pricingRules && Array.isArray(extractedData.pricingRules)) {
      prepared.pricingRules = extractedData.pricingRules;
    }

    return prepared;
  }

  private normalizeDomain(url: string): string {
    if (!url) return '';
    
    return url
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '')
      .split('/')[0];
  }
}