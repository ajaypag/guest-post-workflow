/**
 * Publication Verification Service
 * Core logic for verifying published guest posts meet all requirements
 */

import { WebScrapingService } from './webScrapingService';
import { GuestPostWorkflow } from '@/types/workflow';

// Verification result interfaces
export interface CriticalChecks {
  urlIsLive: boolean | null;
  clientLinkPresent: boolean | null;
  anchorTextCorrect: boolean | null;
  linkIsDofollow: boolean | null;
  correctDomain: boolean | null;
  clientMentionPresent: boolean | null;
}

export interface AdditionalChecks {
  googleIndexed: boolean | null;
  imagesPresent: boolean | null;
  urlMatchesSuggestion: boolean | null;
}

export interface VerificationMetadata {
  verifiedAt: Date;
  scrapedContent?: string;
  clientLinkHtml?: string;
  googleIndexStatus?: 'indexed' | 'not_indexed' | 'pending' | 'error';
  errors: string[];
  verifiedBy?: string;
}

export interface VerificationResult {
  critical: CriticalChecks;
  additional: AdditionalChecks;
  metadata: VerificationMetadata;
  score: {
    criticalPassed: number;
    criticalTotal: number;
    additionalPassed: number;
    additionalTotal: number;
    overallPassed: boolean;
  };
}

export interface RequiredFields {
  missing: string[];
  values: Record<string, any>;
}

export class PublicationVerificationService {
  
  /**
   * Check for required fields before verification
   */
  static checkRequiredFields(
    lineItem: any,
    workflow: GuestPostWorkflow
  ): RequiredFields {
    const missing: string[] = [];
    const values: Record<string, any> = {};
    
    // Check line item fields
    if (!lineItem?.targetPageUrl) {
      missing.push('Target Page URL');
    } else {
      values.targetPageUrl = lineItem.targetPageUrl;
    }
    
    if (!lineItem?.anchorText) {
      missing.push('Anchor Text');
    } else {
      values.anchorText = lineItem.anchorText;
    }
    
    if (!lineItem?.assignedDomain) {
      missing.push('Assigned Domain');
    } else {
      values.assignedDomain = lineItem.assignedDomain;
    }
    
    // Check for client mention phrase in workflow
    const clientMentionStep = workflow.steps?.find(s => s.id === 'client-mention');
    if (!clientMentionStep?.outputs?.expectedPhrase) {
      missing.push('Client Mention Phrase');
    } else {
      values.clientMentionPhrase = clientMentionStep.outputs.expectedPhrase;
    }
    
    // Check for URL suggestion in workflow
    const urlSuggestionStep = workflow.steps?.find(s => s.id === 'url-suggestion');
    if (!urlSuggestionStep?.outputs?.suggestedUrl) {
      missing.push('URL Suggestion');
    } else {
      values.suggestedUrl = urlSuggestionStep.outputs.suggestedUrl;
    }
    
    // Get client name from workflow or line item
    values.clientName = workflow.clientName || lineItem?.metadata?.clientName || '';
    
    return { missing, values };
  }

  /**
   * Verify domain matches (exact or subdomain)
   */
  private static verifyDomain(
    publishedUrl: string,
    expectedDomain: string
  ): { match: 'exact' | 'subdomain' | 'none'; passed: boolean } {
    try {
      const publishedHost = new URL(publishedUrl).hostname.toLowerCase().replace('www.', '');
      const expected = expectedDomain.toLowerCase().replace('www.', '').replace(/\/$/, '');
      
      // Exact match
      if (publishedHost === expected) {
        return { match: 'exact', passed: true };
      }
      
      // Subdomain match (e.g., blog.example.com matches example.com)
      if (publishedHost.endsWith('.' + expected)) {
        return { match: 'subdomain', passed: true };
      }
      
      return { match: 'none', passed: false };
    } catch (error) {
      console.error('[PublicationVerificationService] Error verifying domain:', error);
      return { match: 'none', passed: false };
    }
  }

  /**
   * Detect client link in HTML
   */
  private static detectClientLink(
    html: string,
    targetUrl: string,
    anchorText: string
  ): {
    linkFound: boolean;
    anchorTextCorrect: boolean;
    isDofollow: boolean;
    linkHtml?: string;
  } {
    if (!html || !targetUrl) {
      return {
        linkFound: false,
        anchorTextCorrect: false,
        isDofollow: false
      };
    }
    
    // Normalize target URL for comparison
    const normalizedTarget = targetUrl.toLowerCase().replace(/\/$/, '');
    
    // Check if target URL exists in HTML
    const linkFound = html.toLowerCase().includes(normalizedTarget);
    
    if (!linkFound) {
      return {
        linkFound: false,
        anchorTextCorrect: false,
        isDofollow: false
      };
    }
    
    // Try to find the specific link HTML
    // Match <a> tags that contain the target URL
    const linkRegex = new RegExp(
      `<a[^>]*href=['"](${targetUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})['"#][^>]*>([^<]*)</a>`,
      'gi'
    );
    
    const matches = Array.from(html.matchAll(linkRegex));
    
    if (matches.length === 0) {
      // Try a more lenient search
      const lenientRegex = new RegExp(
        `<a[^>]*href=[^>]*${targetUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^>]*>([^<]*)</a>`,
        'gi'
      );
      const lenientMatches = Array.from(html.matchAll(lenientRegex));
      
      if (lenientMatches.length > 0) {
        const linkHtml = lenientMatches[0][0];
        const linkText = lenientMatches[0][1] || '';
        
        return {
          linkFound: true,
          anchorTextCorrect: linkText.trim() === anchorText.trim(),
          isDofollow: !linkHtml.includes('rel="nofollow"') && !linkHtml.includes("rel='nofollow'"),
          linkHtml
        };
      }
      
      // Link exists but we can't extract it properly
      return {
        linkFound: true,
        anchorTextCorrect: false,
        isDofollow: true, // Assume dofollow if we can't check
        linkHtml: undefined
      };
    }
    
    // We found the link, analyze it
    const linkHtml = matches[0][0];
    const linkText = matches[0][2] || '';
    
    return {
      linkFound: true,
      anchorTextCorrect: linkText.trim() === anchorText.trim(),
      isDofollow: !linkHtml.includes('rel="nofollow"') && !linkHtml.includes("rel='nofollow'"),
      linkHtml
    };
  }

  /**
   * Detect client mention (brand + keyword proximity)
   */
  private static detectClientMention(
    text: string,
    brandName: string,
    keyword: string
  ): {
    found: boolean;
    proximity: 'same-sentence' | 'same-paragraph' | 'not-found';
  } {
    if (!text || !brandName) {
      return { found: false, proximity: 'not-found' };
    }
    
    const lowerText = text.toLowerCase();
    const lowerBrand = brandName.toLowerCase();
    const lowerKeyword = keyword ? keyword.toLowerCase() : '';
    
    // Check if brand exists at all
    if (!lowerText.includes(lowerBrand)) {
      return { found: false, proximity: 'not-found' };
    }
    
    // If no keyword specified, just check for brand
    if (!lowerKeyword) {
      return { found: true, proximity: 'same-paragraph' };
    }
    
    // Split into paragraphs
    const paragraphs = text.split(/\n\n|\r\n\r\n/);
    
    for (const paragraph of paragraphs) {
      const lowerPara = paragraph.toLowerCase();
      
      if (lowerPara.includes(lowerBrand) && lowerPara.includes(lowerKeyword)) {
        // Check if they're in the same sentence
        const sentences = paragraph.split(/[.!?]+/);
        
        for (const sentence of sentences) {
          const lowerSent = sentence.toLowerCase();
          if (lowerSent.includes(lowerBrand) && lowerSent.includes(lowerKeyword)) {
            return { found: true, proximity: 'same-sentence' };
          }
        }
        
        // They're in the same paragraph but different sentences
        return { found: true, proximity: 'same-paragraph' };
      }
    }
    
    // Brand exists but keyword doesn't or they're in different paragraphs
    return { found: false, proximity: 'not-found' };
  }

  /**
   * Main verification method
   */
  static async autoVerify(
    publishedUrl: string,
    lineItem: any,
    workflow: GuestPostWorkflow
  ): Promise<VerificationResult> {
    const errors: string[] = [];
    
    // Initialize result
    const result: VerificationResult = {
      critical: {
        urlIsLive: null,
        clientLinkPresent: null,
        anchorTextCorrect: null,
        linkIsDofollow: null,
        correctDomain: null,
        clientMentionPresent: null
      },
      additional: {
        googleIndexed: null,
        imagesPresent: null,
        urlMatchesSuggestion: null
      },
      metadata: {
        verifiedAt: new Date(),
        errors: []
      },
      score: {
        criticalPassed: 0,
        criticalTotal: 6,
        additionalPassed: 0,
        additionalTotal: 3,
        overallPassed: false
      }
    };
    
    try {
      console.log(`[PublicationVerificationService] Starting verification for ${publishedUrl}`);
      
      // 1. Scrape the page
      const scrapeResult = await WebScrapingService.scrapeArticle(publishedUrl);
      
      if (scrapeResult.success && scrapeResult.html) {
        result.critical.urlIsLive = true;
        result.metadata.scrapedContent = scrapeResult.markdown || scrapeResult.text || '';
        
        const html = scrapeResult.html;
        const text = scrapeResult.text || '';
        
        // 2. Check for client link
        const targetUrl = lineItem.targetPageUrl || '';
        const anchorText = lineItem.anchorText || '';
        
        const linkDetection = this.detectClientLink(html, targetUrl, anchorText);
        result.critical.clientLinkPresent = linkDetection.linkFound;
        result.critical.anchorTextCorrect = linkDetection.anchorTextCorrect;
        result.critical.linkIsDofollow = linkDetection.isDofollow;
        
        if (linkDetection.linkHtml) {
          result.metadata.clientLinkHtml = linkDetection.linkHtml;
        }
        
        // 3. Check domain
        const expectedDomain = lineItem.assignedDomain || '';
        const domainCheck = this.verifyDomain(publishedUrl, expectedDomain);
        result.critical.correctDomain = domainCheck.passed;
        
        // 4. Check client mention
        const clientMentionStep = workflow.steps?.find(s => s.id === 'client-mention');
        const expectedPhrase = clientMentionStep?.outputs?.expectedPhrase || '';
        
        if (expectedPhrase) {
          // Parse the phrase to extract brand and keyword
          // Expected format: "BrandName keyword phrase" or just "BrandName"
          const parts = expectedPhrase.split(' ');
          const brandName = parts[0] || workflow.clientName || '';
          const keyword = parts.slice(1).join(' ') || '';
          
          const mentionCheck = this.detectClientMention(text, brandName, keyword);
          result.critical.clientMentionPresent = mentionCheck.found;
        } else {
          // No expected phrase defined, check for client name at least
          const clientName = workflow.clientName || '';
          if (clientName) {
            result.critical.clientMentionPresent = text.toLowerCase().includes(clientName.toLowerCase());
          } else {
            result.critical.clientMentionPresent = null; // Can't check
          }
        }
        
        // 5. Check images
        const hasImages = html.includes('<img') || html.includes('<picture');
        result.additional.imagesPresent = hasImages;
        
        // 6. Check URL suggestion match
        const urlSuggestionStep = workflow.steps?.find(s => s.id === 'url-suggestion');
        const suggestedUrl = urlSuggestionStep?.outputs?.suggestedUrl || '';
        
        if (suggestedUrl) {
          // Normalize both URLs for comparison
          const normalizedPublished = publishedUrl.toLowerCase().replace(/\/$/, '');
          const normalizedSuggested = suggestedUrl.toLowerCase().replace(/\/$/, '');
          result.additional.urlMatchesSuggestion = normalizedPublished === normalizedSuggested;
        } else {
          result.additional.urlMatchesSuggestion = null; // No suggestion to compare
        }
        
      } else {
        result.critical.urlIsLive = false;
        errors.push(scrapeResult.error || 'Failed to scrape article');
      }
      
      // 7. Check Google indexing (separate API call)
      const indexResult = await WebScrapingService.checkGoogleIndexed(publishedUrl);
      
      if (indexResult.error) {
        result.additional.googleIndexed = null;
        result.metadata.googleIndexStatus = 'error';
        errors.push(indexResult.error);
      } else {
        result.additional.googleIndexed = indexResult.indexed;
        
        // If not indexed, mark as pending (might be too new)
        if (!indexResult.indexed && result.critical.urlIsLive) {
          result.metadata.googleIndexStatus = 'pending';
        } else if (indexResult.indexed) {
          result.metadata.googleIndexStatus = 'indexed';
        } else {
          result.metadata.googleIndexStatus = 'not_indexed';
        }
      }
      
    } catch (error) {
      console.error('[PublicationVerificationService] Verification error:', error);
      errors.push(error instanceof Error ? error.message : 'Unknown error during verification');
    }
    
    // Calculate scores
    let criticalPassed = 0;
    for (const check of Object.values(result.critical)) {
      if (check === true) criticalPassed++;
    }
    
    let additionalPassed = 0;
    for (const check of Object.values(result.additional)) {
      if (check === true) additionalPassed++;
    }
    
    result.score = {
      criticalPassed,
      criticalTotal: 6,
      additionalPassed,
      additionalTotal: 3,
      overallPassed: criticalPassed === 6 // All critical must pass
    };
    
    result.metadata.errors = errors;
    
    console.log(`[PublicationVerificationService] Verification complete. Score: ${criticalPassed}/6 critical, ${additionalPassed}/3 additional`);
    
    return result;
  }

  /**
   * Recheck Google indexing status
   */
  static async recheckIndexing(publishedUrl: string): Promise<{
    indexed: boolean | null;
    status: 'indexed' | 'not_indexed' | 'pending' | 'error';
    error?: string;
  }> {
    const result = await WebScrapingService.checkGoogleIndexed(publishedUrl);
    
    if (result.error) {
      return {
        indexed: null,
        status: 'error',
        error: result.error
      };
    }
    
    return {
      indexed: result.indexed,
      status: result.indexed ? 'indexed' : 'pending'
    };
  }
}