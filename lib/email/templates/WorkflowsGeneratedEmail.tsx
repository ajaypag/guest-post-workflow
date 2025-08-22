import * as React from 'react';
import { Button, Text, Section, Hr, Row, Column } from '@react-email/components';
import { BaseEmail, emailStyles } from './BaseEmail';

interface WorkflowSite {
  domain: string;
  qualificationStatus?: string;
  workflowId: string;
  completionPercentage: number;
}

interface WorkflowsGeneratedEmailProps {
  recipientName: string;
  companyName?: string;
  orderNumber: string;
  workflowCount: number;
  sites: WorkflowSite[];
  dashboardUrl: string;
  estimatedCompletionDate?: string;
  accountManagerName?: string;
  accountManagerEmail?: string;
}

export function WorkflowsGeneratedEmail({
  recipientName,
  companyName,
  orderNumber,
  workflowCount,
  sites,
  dashboardUrl,
  estimatedCompletionDate,
  accountManagerName,
  accountManagerEmail,
}: WorkflowsGeneratedEmailProps) {
  // Show first 5 sites
  const displaySites = sites.slice(0, 5);
  const remainingSites = Math.max(0, sites.length - 5);

  return (
    <BaseEmail
      preview={`Production has started on your ${workflowCount} guest posts`}
      heading="Production Started! 🚀"
    >
      <Text style={emailStyles.text}>
        Hi {recipientName},
      </Text>

      <Text style={emailStyles.text}>
        We've initiated content creation workflows for your order
        {companyName && ` for ${companyName}`}. Production is now underway.
      </Text>

      {/* Status Card */}
      <Section style={{
        ...emailStyles.panel,
        background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
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
          fontSize: '28px',
          fontWeight: 'bold',
          margin: '0 0 8px',
        }}>
          {workflowCount} Workflows Created
        </Text>
        <Text style={{ 
          ...emailStyles.text, 
          color: 'white',
          fontSize: '16px',
          margin: '0',
          opacity: 0.95,
        }}>
          ✅ Production has officially begun
        </Text>
      </Section>

      {/* What This Means */}
      <Section style={{
        ...emailStyles.panel,
        borderLeft: '4px solid #06b6d4',
        marginBottom: '24px',
      }}>
        <Text style={{ 
          ...emailStyles.text,
          fontSize: '16px',
          fontWeight: 'bold',
          margin: '0 0 12px',
          color: '#0e7490',
        }}>
          What This Means:
        </Text>
        <Text style={{ ...emailStyles.text, margin: '8px 0', fontSize: '14px' }}>
          ✅ <strong>{workflowCount} content workflows created</strong> - one for each domain
        </Text>
        <Text style={{ ...emailStyles.text, margin: '8px 0', fontSize: '14px' }}>
          ✅ <strong>Dedicated tracking</strong> - monitor progress in real-time
        </Text>
        <Text style={{ ...emailStyles.text, margin: '8px 0', fontSize: '14px' }}>
          ✅ <strong>Content creation beginning</strong> - our team is starting work
        </Text>
        <Text style={{ ...emailStyles.text, margin: '8px 0', fontSize: '14px' }}>
          ✅ <strong>Systematic process</strong> - each post follows our proven workflow
        </Text>
      </Section>

      {/* Domains in Production */}
      <Section style={{ marginBottom: '32px' }}>
        <Text style={{ 
          ...emailStyles.text, 
          fontSize: '18px',
          fontWeight: 'bold',
          marginBottom: '16px',
        }}>
          Your Domains in Production:
        </Text>

        {displaySites.map((site, index) => (
          <div
            key={index}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '8px',
              background: '#ffffff',
            }}
          >
            <Row>
              <Column style={{ width: '70%' }}>
                <Text style={{ 
                  ...emailStyles.text,
                  fontSize: '15px',
                  fontWeight: 'bold',
                  margin: '0 0 4px',
                  color: '#1f2937',
                }}>
                  {site.domain}
                </Text>
                {site.qualificationStatus && (
                  <Text style={{
                    ...emailStyles.text,
                    fontSize: '12px',
                    margin: '0',
                    color: site.qualificationStatus === 'high_quality' ? '#059669' : '#2563eb',
                  }}>
                    {site.qualificationStatus === 'high_quality' ? '⭐ High Quality' : '✓ Good Quality'}
                  </Text>
                )}
              </Column>
              <Column style={{ width: '30%', textAlign: 'right' }}>
                <div style={{
                  background: '#f3f4f6',
                  borderRadius: '20px',
                  padding: '4px 12px',
                  display: 'inline-block',
                }}>
                  <Text style={{
                    ...emailStyles.text,
                    fontSize: '13px',
                    margin: '0',
                    color: '#4b5563',
                    fontWeight: 'bold',
                  }}>
                    {site.completionPercentage}% Complete
                  </Text>
                </div>
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
            ...and {remainingSites} more domains in production
          </Text>
        )}
      </Section>

      {/* Progress Stages */}
      <Section style={{
        ...emailStyles.panel,
        background: '#f9fafb',
        marginBottom: '32px',
      }}>
        <Text style={{ 
          ...emailStyles.text,
          fontSize: '16px',
          fontWeight: 'bold',
          margin: '0 0 16px',
          color: '#111827',
        }}>
          Production Pipeline:
        </Text>
        
        <div style={{ marginBottom: '12px' }}>
          <Row>
            <Column style={{ width: '30%' }}>
              <Text style={{ ...emailStyles.text, fontSize: '13px', margin: '0', fontWeight: 'bold' }}>
                📝 Content Creation
              </Text>
            </Column>
            <Column style={{ width: '70%' }}>
              <div style={{ background: '#e5e7eb', height: '8px', borderRadius: '4px', position: 'relative' }}>
                <div style={{ 
                  background: '#06b6d4', 
                  height: '8px', 
                  width: '25%', 
                  borderRadius: '4px',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                }}></div>
              </div>
              <Text style={{ ...emailStyles.text, fontSize: '11px', margin: '4px 0 0', color: '#6b7280' }}>
                0% → 25%
              </Text>
            </Column>
          </Row>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <Row>
            <Column style={{ width: '30%' }}>
              <Text style={{ ...emailStyles.text, fontSize: '13px', margin: '0' }}>
                ✏️ Editorial Review
              </Text>
            </Column>
            <Column style={{ width: '70%' }}>
              <div style={{ background: '#e5e7eb', height: '8px', borderRadius: '4px' }}></div>
              <Text style={{ ...emailStyles.text, fontSize: '11px', margin: '4px 0 0', color: '#6b7280' }}>
                25% → 50%
              </Text>
            </Column>
          </Row>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <Row>
            <Column style={{ width: '30%' }}>
              <Text style={{ ...emailStyles.text, fontSize: '13px', margin: '0' }}>
                📧 Publisher Outreach
              </Text>
            </Column>
            <Column style={{ width: '70%' }}>
              <div style={{ background: '#e5e7eb', height: '8px', borderRadius: '4px' }}></div>
              <Text style={{ ...emailStyles.text, fontSize: '11px', margin: '4px 0 0', color: '#6b7280' }}>
                50% → 75%
              </Text>
            </Column>
          </Row>
        </div>

        <div>
          <Row>
            <Column style={{ width: '30%' }}>
              <Text style={{ ...emailStyles.text, fontSize: '13px', margin: '0' }}>
                ✅ Live & Verified
              </Text>
            </Column>
            <Column style={{ width: '70%' }}>
              <div style={{ background: '#e5e7eb', height: '8px', borderRadius: '4px' }}></div>
              <Text style={{ ...emailStyles.text, fontSize: '11px', margin: '4px 0 0', color: '#6b7280' }}>
                75% → 100%
              </Text>
            </Column>
          </Row>
        </div>
      </Section>

      {/* Call to Action */}
      <Section style={emailStyles.buttonContainer}>
        <Button 
          href={dashboardUrl} 
          style={{
            ...emailStyles.button,
            background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
            fontSize: '16px',
            padding: '14px 28px',
          }}
        >
          Track Progress in Dashboard →
        </Button>
      </Section>

      {/* Estimated Completion */}
      {estimatedCompletionDate && (
        <Section style={{ textAlign: 'center', marginTop: '24px', marginBottom: '32px' }}>
          <Text style={{ 
            ...emailStyles.text, 
            fontSize: '15px',
            color: '#374151',
            margin: '0',
          }}>
            <strong>Estimated Completion:</strong> {estimatedCompletionDate}
          </Text>
          <Text style={{ 
            ...emailStyles.text, 
            fontSize: '13px',
            color: '#6b7280',
            margin: '4px 0 0',
          }}>
            We'll notify you as links go live
          </Text>
        </Section>
      )}

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
            Questions about production?
          </Text>
          <Text style={{ 
            ...emailStyles.text, 
            fontSize: '14px',
            margin: '0',
          }}>
            Your account manager <strong>{accountManagerName}</strong> is monitoring this order
          </Text>
          {accountManagerEmail && (
            <Text style={{ 
              ...emailStyles.text, 
              fontSize: '14px',
              margin: '4px 0 0',
            }}>
              <a 
                href={`mailto:${accountManagerEmail}`}
                style={{ color: '#0891b2', textDecoration: 'none' }}
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
        You'll receive updates as your content progresses through each stage.
        <br />
        Track real-time progress anytime in your dashboard.
      </Text>
    </BaseEmail>
  );
}