/**
 * Email Qualification Service
 * 
 * Determines if an email response qualifies for paid link building database inclusion.
 * Only emails with explicit paid offerings should create publisher records.
 */

import { ParsedEmailV2 } from './emailParserServiceV2';

export interface QualificationResult {
  isQualified: boolean;
  status: 'qualified' | 'disqualified';
  reason?: string;
  notes?: string;
}

export class EmailQualificationService {
  
  /**
   * Main qualification check - determines if email should create publisher/website records
   */
  async qualifyEmail(
    emailContent: string, 
    parsedData: ParsedEmailV2,
    senderEmail: string
  ): Promise<QualificationResult> {
    
    // Extract the actual reply content (before quoted original email)
    const replyContent = this.extractReplyContent(emailContent);
    
    // Check 1: Must have offerings with pricing
    if (!parsedData.offerings || parsedData.offerings.length === 0) {
      return this.disqualify('no_offerings', 'No paid offerings found in email');
    }

    // Check 2: Must have actual pricing (not zero)
    const hasValidPricing = parsedData.offerings.some(offer => 
      offer.basePrice && offer.basePrice > 0
    );
    
    if (!hasValidPricing) {
      return this.disqualify('no_pricing', 'No valid pricing information found');
    }

    // Check 3: If they mention prices/costs, they're qualified (trumps everything else)
    const hasPricing = this.checkForPricingMentions(replyContent);
    if (hasPricing) {
      return {
        isQualified: true,
        status: 'qualified',
        notes: `Qualified - mentions pricing (${parsedData.offerings.length} offerings)`
      };
    }

    // Check 4: Only check for rejections/link swaps if no pricing mentioned
    const rejectionCheck = this.checkForRejection(replyContent);
    if (rejectionCheck.isRejection) {
      return this.disqualify('rejection', rejectionCheck.reason || 'Rejection detected');
    }

    const linkSwapCheck = this.checkForLinkSwapIndicators(replyContent);
    if (linkSwapCheck.isLinkSwap) {
      return this.disqualify('link_swap', linkSwapCheck.reason || 'Link swap detected');
    }

    const vaguenessCheck = this.checkForVagueResponse(replyContent, parsedData);
    if (vaguenessCheck.isVague) {
      return this.disqualify('vague_response', vaguenessCheck.reason || 'Vague response');
    }

    // Passed all checks - qualified!
    return {
      isQualified: true,
      status: 'qualified',
      notes: `Qualified with ${parsedData.offerings.length} offerings`
    };
  }

  /**
   * Check for link swap/exchange language
   */
  private checkForLinkSwapIndicators(content: string): { isLinkSwap: boolean; reason?: string } {
    const lowerContent = content.toLowerCase();
    
    const linkSwapPhrases = [
      'in return',
      'in exchange',
      'reciprocal',
      'mutual link',
      'link swap',
      'link exchange',
      'link back to your site',
      'exchange links',
      'free link',
      'free collaboration',
      'no cost',
      'at no charge'
    ];

    for (const phrase of linkSwapPhrases) {
      if (lowerContent.includes(phrase)) {
        return {
          isLinkSwap: true,
          reason: `Contains link swap language: "${phrase}"`
        };
      }
    }

    return { isLinkSwap: false };
  }

  /**
   * Check for rejection responses
   */
  private checkForRejection(content: string): { isRejection: boolean; reason?: string } {
    const lowerContent = content.toLowerCase();
    
    const rejectionPhrases = [
      'no thanks',
      'not interested',
      'pass on this',
      'we\'ll pass',
      'remove',
      'unsubscribe',
      'don\'t contact',
      'stop emailing',
      'not a fit',
      'decline'
    ];

    for (const phrase of rejectionPhrases) {
      if (lowerContent.includes(phrase)) {
        return {
          isRejection: true,
          reason: `Contains rejection language: "${phrase}"`
        };
      }
    }

    return { isRejection: false };
  }

  /**
   * Check for vague responses without concrete pricing
   */
  private checkForVagueResponse(content: string, parsedData: ParsedEmailV2): { isVague: boolean; reason?: string } {
    const lowerContent = content.toLowerCase();
    
    // If it has concrete pricing, it's not vague
    if (parsedData.offerings.some(offer => offer.basePrice > 0)) {
      return { isVague: false };
    }

    // Look for vague interest without pricing
    const vagueInterestPhrases = [
      'yes, interested',
      'sounds good',
      'we\'d be interested',
      'happy to collaborate',
      'how would you like to proceed',
      'let me know',
      'tell me more'
    ];

    const hasVagueInterest = vagueInterestPhrases.some(phrase => 
      lowerContent.includes(phrase)
    );

    if (hasVagueInterest) {
      return {
        isVague: true,
        reason: 'Shows interest but no concrete pricing provided'
      };
    }

    return { isVague: false };
  }

  /**
   * Helper to create disqualification result
   */
  private disqualify(reason: string, notes: string): QualificationResult {
    return {
      isQualified: false,
      status: 'disqualified',
      reason,
      notes
    };
  }

  /**
   * Extract the actual reply content, removing quoted original emails
   */
  private extractReplyContent(emailContent: string): string {
    // Common email thread separators
    const separators = [
      'wrote:',
      'On ',
      '-----Original Message-----',
      'From:',
      '> ',
      '&gt;',
      '________________________________'
    ];

    let replyContent = emailContent;
    
    // Find the first occurrence of any separator and split there
    for (const separator of separators) {
      const index = emailContent.indexOf(separator);
      if (index !== -1) {
        replyContent = emailContent.substring(0, index);
        break;
      }
    }
    
    return replyContent.trim();
  }

  /**
   * Check if email mentions pricing (trumps all other checks)
   */
  private checkForPricingMentions(content: string): boolean {
    const lowerContent = content.toLowerCase();
    
    // If they mention ANY pricing/cost terms, they're qualified
    const pricingTerms = [
      'price',
      'cost',
      'fee',
      'charge',
      'rate',
      '$',
      'usd',
      'eur',
      'gbp',
      'payment',
      'invoice',
      'paypal'
    ];

    return pricingTerms.some(term => lowerContent.includes(term));
  }

  /**
   * Get human-readable disqualification reasons
   */
  static getDisqualificationReasonText(reason: string): string {
    const reasonMap: Record<string, string> = {
      'no_offerings': 'No paid offerings found',
      'no_pricing': 'No pricing information provided',
      'link_swap': 'Link swap/exchange offer (not paid)',
      'rejection': 'Declined/rejected the offer',
      'vague_response': 'Vague response without concrete details'
    };

    return reasonMap[reason] || 'Unknown reason';
  }
}

// Export singleton instance
export const emailQualificationService = new EmailQualificationService();