import * as React from 'react';
import { Button, Text, Section, Hr, Row, Column, Img } from '@react-email/components';
import { BaseEmail, emailStyles } from './BaseEmail';

interface Site {
  domain: string;
  domainRating: number;
  traffic: number;
  price: string;
  niche?: string;
  qualificationStatus?: string;
  authorityDirect?: string;
  authorityRelated?: string;
  overlapStatus?: string;
  aiReasoning?: string;
}

interface SitesReadyForReviewEmailProps {
  recipientName: string;
  companyName?: string;
  orderNumber: string;
  sitesCount: number;
  totalAmount: string;
  sites: Site[];
  reviewUrl: string;
  estimatedCompletionDate?: string;
  accountManagerName?: string;
  accountManagerEmail?: string;
}

export function SitesReadyForReviewEmail({
  recipientName,
  companyName,
  orderNumber,
  sitesCount,
  totalAmount,
  sites,
  reviewUrl,
  estimatedCompletionDate,
  accountManagerName,
  accountManagerEmail,
}: SitesReadyForReviewEmailProps) {
  // Show max 5 sites in email, rest will be "and X more..."
  const displaySites = sites.slice(0, 5);
  const remainingSites = Math.max(0, sites.length - 5);

  return (
    <BaseEmail
      preview={`Your ${sitesCount} guest post sites are ready for review`}
      heading="Your Sites Are Ready! 🎯"
    >
      <Text style={emailStyles.text}>
        Hi {recipientName},
      </Text>

      <Text style={emailStyles.text}>
        Great news! We've curated <strong>{sitesCount} high-quality sites</strong> for your guest posting campaign
        {companyName && ` for ${companyName}`}. These sites have been carefully selected to match your requirements
        and are ready for your review and approval.
      </Text>

      {/* Order Summary Card */}
      <Section style={{
        ...emailStyles.panel,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <Text style={{ 
          ...emailStyles.text, 
          color: 'white',
          fontSize: '14px',
          margin: '0 0 8px',
          opacity: 0.9,
        }}>
          Order #{orderNumber.substring(0, 8).toUpperCase()}
        </Text>
        <Text style={{ 
          ...emailStyles.text, 
          color: 'white',
          fontSize: '32px',
          fontWeight: 'bold',
          margin: '0 0 16px',
        }}>
          {sitesCount} Sites Selected
        </Text>
        <Text style={{ 
          ...emailStyles.text, 
          color: 'white',
          fontSize: '20px',
          margin: '0',
        }}>
          Total: {totalAmount}
        </Text>
      </Section>

      {/* Sample Sites Preview */}
      <Section style={{ marginBottom: '32px' }}>
        <Text style={{ 
          ...emailStyles.text, 
          fontSize: '18px',
          fontWeight: 'bold',
          marginBottom: '16px',
        }}>
          Preview of Selected Sites:
        </Text>

        {displaySites.map((site, index) => (
          <div
            key={index}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '12px',
              background: '#f9fafb',
            }}
          >
            <Row>
              <Column style={{ width: '60%' }}>
                <Text style={{ 
                  ...emailStyles.text,
                  fontSize: '16px',
                  fontWeight: 'bold',
                  margin: '0 0 4px',
                  color: '#1f2937',
                }}>
                  {site.domain}
                </Text>
                
                {/* AI Qualification Badge */}
                {site.qualificationStatus && (
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    background: site.qualificationStatus === 'high_quality' ? '#10b981' : '#3b82f6',
                    color: 'white',
                  }}>
                    {site.qualificationStatus === 'high_quality' ? '⭐ HIGH QUALITY' : '✓ GOOD QUALITY'}
                  </span>
                )}
                
                {/* AI Match Insights */}
                <Text style={{
                  ...emailStyles.text,
                  fontSize: '12px',
                  margin: '4px 0',
                  color: '#374151',
                  lineHeight: '1.5',
                }}>
                  <strong>AI Match:</strong> {site.overlapStatus === 'both' ? 'Direct & Related' : site.overlapStatus === 'direct' ? 'Direct Match' : 'Related Match'}<br/>
                  <strong>Authority:</strong> Direct {site.authorityDirect || 'N/A'} | Related {site.authorityRelated || 'N/A'}<br/>
                  {site.niche && <><strong>Scope:</strong> {site.niche}<br/></>}
                </Text>

                {/* Truncated AI Reasoning */}
                {site.aiReasoning && (
                  <Text style={{
                    ...emailStyles.text,
                    fontSize: '11px',
                    margin: '8px 0 0',
                    color: '#6b7280',
                    fontStyle: 'italic',
                    lineHeight: '1.4',
                  }}>
                    {site.aiReasoning.substring(0, 150)}...
                  </Text>
                )}
              </Column>
              <Column style={{ width: '40%', textAlign: 'right' }}>
                <Text style={{
                  ...emailStyles.text,
                  fontSize: '14px',
                  margin: '0 0 4px',
                  color: '#4b5563',
                }}>
                  DR: <strong>{site.domainRating}</strong> | Traffic: <strong>{site.traffic.toLocaleString()}</strong>
                </Text>
                <Text style={{
                  ...emailStyles.text,
                  fontSize: '16px',
                  margin: '0',
                  color: '#059669',
                  fontWeight: 'bold',
                }}>
                  {site.price}
                </Text>
              </Column>
            </Row>
          </div>
        ))}

        {remainingSites > 0 && (
          <Text style={{
            ...emailStyles.text,
            fontSize: '14px',
            textAlign: 'center',
            color: '#6b7280',
            fontStyle: 'italic',
            marginTop: '12px',
          }}>
            ...and {remainingSites} more high-quality sites
          </Text>
        )}
      </Section>

      {/* Call to Action */}
      <Section style={emailStyles.buttonContainer}>
        <Button 
          href={reviewUrl} 
          style={{
            ...emailStyles.button,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            fontSize: '18px',
            padding: '16px 32px',
          }}
        >
          Review & Approve Sites →
        </Button>
      </Section>

      {/* What Happens Next */}
      <Section style={{
        ...emailStyles.panel,
        background: '#f0fdf4',
        borderLeft: '4px solid #10b981',
        marginTop: '32px',
        marginBottom: '32px',
      }}>
        <Text style={{ 
          ...emailStyles.text,
          fontSize: '16px',
          fontWeight: 'bold',
          margin: '0 0 12px',
          color: '#065f46',
        }}>
          What Happens Next?
        </Text>
        <Text style={{ ...emailStyles.text, margin: '8px 0', fontSize: '14px' }}>
          <strong>1.</strong> Review the selected sites in your dashboard
        </Text>
        <Text style={{ ...emailStyles.text, margin: '8px 0', fontSize: '14px' }}>
          <strong>2.</strong> Approve the sites or request changes
        </Text>
        <Text style={{ ...emailStyles.text, margin: '8px 0', fontSize: '14px' }}>
          <strong>3.</strong> Once approved, we'll begin content creation
        </Text>
        <Text style={{ ...emailStyles.text, margin: '8px 0', fontSize: '14px' }}>
          <strong>4.</strong> You'll receive updates as posts go live
        </Text>
        {estimatedCompletionDate && (
          <Text style={{ 
            ...emailStyles.text, 
            margin: '16px 0 0', 
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#065f46',
          }}>
            Estimated Completion: {estimatedCompletionDate}
          </Text>
        )}
      </Section>

      <Hr style={{ borderColor: '#e5e7eb', margin: '32px 0' }} />

      {/* Account Manager Contact */}
      {accountManagerName && (
        <Section style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Text style={{ 
            ...emailStyles.text, 
            fontSize: '14px',
            color: '#6b7280',
            margin: '0 0 8px',
          }}>
            Questions about your selected sites?
          </Text>
          <Text style={{ 
            ...emailStyles.text, 
            fontSize: '14px',
            margin: '0',
          }}>
            Your account manager <strong>{accountManagerName}</strong> is here to help
          </Text>
          {accountManagerEmail && (
            <Text style={{ 
              ...emailStyles.text, 
              fontSize: '14px',
              margin: '4px 0 0',
            }}>
              <a 
                href={`mailto:${accountManagerEmail}`}
                style={{ color: '#6366f1', textDecoration: 'none' }}
              >
                {accountManagerEmail}
              </a>
            </Text>
          )}
        </Section>
      )}

      {/* Footer Note */}
      <Text style={{ 
        ...emailStyles.text, 
        fontSize: '13px',
        color: '#9ca3af',
        textAlign: 'center',
        marginTop: '24px',
      }}>
        This selection has been curated specifically for your brand and target audience.
        <br />
        All sites have been vetted for quality, relevance, and SEO value.
      </Text>
    </BaseEmail>
  );
}