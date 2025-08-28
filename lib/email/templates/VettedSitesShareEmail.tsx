import * as React from 'react';
import { Button, Text, Section, Hr, Link } from '@react-email/components';
import { BaseEmail, emailStyles } from './BaseEmail';

interface DomainMatch {
  domain: string;
  directKeywords: number;
  relatedKeywords: number;
  avgPosition?: number;
  dr?: number;
  traffic?: number;
  cost?: number;
  reasoning?: string;
}

interface VettedSitesShareEmailProps {
  recipientName: string;
  clientWebsite: string;
  totalMatches: number;
  topDomains: DomainMatch[];
  proposalVideoUrl?: string;
  customMessage?: string;
  claimUrl: string;
  expiryDays?: number;
}

export function VettedSitesShareEmail({
  recipientName,
  clientWebsite,
  totalMatches,
  topDomains,
  proposalVideoUrl,
  customMessage,
  claimUrl,
  expiryDays = 30,
}: VettedSitesShareEmailProps) {
  return (
    <BaseEmail
      preview={`${totalMatches} keyword-matched sites identified for ${clientWebsite}`}
      heading={`${totalMatches} keyword-matched sites identified for ${clientWebsite}`}
    >
      <Text style={emailStyles.text}>
        Hi {recipientName},
      </Text>

      <Text style={emailStyles.text}>
        We found <strong>{totalMatches} websites with significant keyword overlap</strong> to your target terms - our approach to building links that actually influence how AI systems understand your expertise.
      </Text>

      <Text style={emailStyles.text}>
        Instead of backlinks from random high DR sites, we identified websites with proven expertise in your space that already rank for your target keywords.
      </Text>

      {/* Top Strategic Matches Table */}
      <Section style={matchesPanel}>
        <Text style={panelHeader}>
          TOP STRATEGIC MATCHES:
        </Text>
        
        {topDomains.map((domain, index) => (
          <Section key={domain.domain} style={domainRow}>
            <Text style={domainName}>{domain.domain}</Text>
            
            <Section style={metricsGrid}>
              <Section style={metricItem}>
                <Text style={metricLabel}>Keyword Match</Text>
                <Text style={metricValue}>
                  {domain.directKeywords} direct, {domain.relatedKeywords} related
                </Text>
              </Section>
              
              {domain.avgPosition && (
                <Section style={metricItem}>
                  <Text style={metricLabel}>Avg Position</Text>
                  <Text style={metricValue}>#{domain.avgPosition}</Text>
                </Section>
              )}
              
              {domain.dr && (
                <Section style={metricItem}>
                  <Text style={metricLabel}>DR</Text>
                  <Text style={metricValue}>{domain.dr}</Text>
                </Section>
              )}
              
              {domain.traffic && (
                <Section style={metricItem}>
                  <Text style={metricLabel}>Traffic</Text>
                  <Text style={metricValue}>{formatTraffic(domain.traffic)}</Text>
                </Section>
              )}
              
              {domain.cost && (
                <Section style={metricItem}>
                  <Text style={metricLabel}>Cost</Text>
                  <Text style={metricValue}>${domain.cost}</Text>
                </Section>
              )}
            </Section>
            
            {domain.reasoning && (
              <Text style={reasoningText}>
                Why: "{domain.reasoning}"
              </Text>
            )}
            
            {index < topDomains.length - 1 && <Hr style={domainSeparator} />}
          </Section>
        ))}
        
        {totalMatches > topDomains.length && (
          <Text style={moreMatches}>
            ...and {totalMatches - topDomains.length} more strategic matches
          </Text>
        )}
      </Section>

      {/* Optional Video Section */}
      {proposalVideoUrl && (
        <Section style={videoSection}>
          <Text style={sectionHeader}>📹 Personal Analysis Overview:</Text>
          <Section style={emailStyles.buttonContainer}>
            <Button style={videoButton} href={proposalVideoUrl}>
              ▶️ Watch Analysis Video
            </Button>
          </Section>
        </Section>
      )}

      {/* Optional Custom Message */}
      {customMessage && (
        <Section style={customMessageSection}>
          <Text style={sectionHeader}>💬 From our team:</Text>
          <Text style={customMessageText}>"{customMessage}"</Text>
        </Section>
      )}

      {/* Main CTA */}
      <Section style={emailStyles.buttonContainer}>
        <Button style={emailStyles.button} href={claimUrl}>
          → View Full Analysis & Create Your Account ←
        </Button>
      </Section>

      <Text style={emailStyles.text}>
        This analysis includes detailed justifications for each site and AI-powered matching to your exact keywords. 
        The link above will expire in {expiryDays} days.
      </Text>

      <Text style={emailStyles.text}>
        Questions? Just reply to this email.
      </Text>

      <Text style={emailStyles.text}>
        Best regards,<br />
        The Linkio Team
      </Text>
    </BaseEmail>
  );
}

// Helper function to format traffic numbers
function formatTraffic(traffic: number): string {
  if (traffic >= 1000000) {
    return `${(traffic / 1000000).toFixed(1)}M/mo`;
  } else if (traffic >= 1000) {
    return `${Math.round(traffic / 1000)}K/mo`;
  } else {
    return `${traffic}/mo`;
  }
}

// Custom styles for the vetted sites email
const matchesPanel = {
  ...emailStyles.panel,
  backgroundColor: '#f8fafc',
  border: '2px solid #e2e8f0',
  fontFamily: 'monospace',
};

const panelHeader = {
  fontSize: '14px',
  fontWeight: '700',
  color: '#1e293b',
  margin: '0 0 16px',
  letterSpacing: '0.5px',
  fontFamily: 'monospace',
};

const domainRow = {
  margin: '0 0 16px',
};

const domainName = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#1e293b',
  margin: '0 0 8px',
  fontFamily: 'monospace',
};

const metricsGrid = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '12px',
  margin: '8px 0',
};

const metricItem = {
  flex: '0 1 auto',
  minWidth: '100px',
};

const metricLabel = {
  fontSize: '12px',
  color: '#64748b',
  margin: '0 0 2px',
  fontFamily: 'monospace',
};

const metricValue = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#334155',
  margin: '0',
  fontFamily: 'monospace',
};

const reasoningText = {
  fontSize: '13px',
  color: '#475569',
  fontStyle: 'italic',
  margin: '8px 0 0',
  fontFamily: 'monospace',
};

const domainSeparator = {
  borderColor: '#cbd5e1',
  margin: '12px 0',
};

const moreMatches = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#475569',
  textAlign: 'center' as const,
  margin: '16px 0 0',
  fontFamily: 'monospace',
};

const videoSection = {
  margin: '32px 20px',
  padding: '20px',
  backgroundColor: '#fef3c7',
  border: '1px solid #fbbf24',
  borderRadius: '8px',
};

const videoButton = {
  ...emailStyles.button,
  backgroundColor: '#f59e0b',
};

const customMessageSection = {
  margin: '32px 20px',
  padding: '20px',
  backgroundColor: '#dbeafe',
  border: '1px solid #3b82f6',
  borderRadius: '8px',
};

const sectionHeader = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#1e293b',
  margin: '0 0 12px',
};

const customMessageText = {
  fontSize: '16px',
  color: '#1e293b',
  fontStyle: 'italic',
  margin: '0',
  lineHeight: '24px',
};