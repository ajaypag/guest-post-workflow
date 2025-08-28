import * as React from 'react';
import {
  Button,
  Section,
  Text,
  Row,
  Column,
} from '@react-email/components';
import { BaseEmail, emailStyles } from './BaseEmail';

interface DomainData {
  domain: string;
  directKeywords: number;
  relatedKeywords: number;
  avgPosition?: number;
  dr?: number;
  traffic?: number;
  cost?: number;
  reasoning?: string;
}

interface VettedSitesFulfillmentEmailProps {
  recipientName?: string;
  totalQualified: number;
  topDomains: DomainData[];
  resultsUrl: string;
  clientWebsite?: string;
  avgKeywordOverlap?: number;
  strongAuthorityPercentage?: number;
}

export function VettedSitesFulfillmentEmail({
  recipientName = 'there',
  totalQualified = 0,
  topDomains = [],
  resultsUrl,
  clientWebsite,
  avgKeywordOverlap = 0,
  strongAuthorityPercentage = 0,
}: VettedSitesFulfillmentEmailProps) {
  return (
    <BaseEmail
      preview={`Your vetted sites analysis is ready! Found ${totalQualified} strategic matches`}
      heading="Your vetted sites analysis is ready! 🎯"
    >
      <Text style={emailStyles.text}>
        Hi {recipientName},
      </Text>

      <Text style={highlightText}>
        Great news! We found <strong>{totalQualified} strategic matches</strong> 
        {clientWebsite ? ` for ${clientWebsite}` : ''} that already rank for your keywords.
      </Text>

      {/* Key Insights */}
      <Section style={insightsSection}>
        <Text style={insightTitle}>Key Insights:</Text>
        <Row>
          <Column style={insightColumn}>
            <Text style={insightValue}>{Math.round(avgKeywordOverlap)}</Text>
            <Text style={insightLabel}>Avg Keywords per Site</Text>
          </Column>
          <Column style={insightColumn}>
            <Text style={insightValue}>{Math.round(strongAuthorityPercentage)}%</Text>
            <Text style={insightLabel}>Strong Authority</Text>
          </Column>
          <Column style={insightColumn}>
            <Text style={insightValue}>{totalQualified}</Text>
            <Text style={insightLabel}>Total Matches</Text>
          </Column>
        </Row>
      </Section>

      {/* Top Strategic Matches */}
      <Section style={tableSection}>
        <Text style={tableTitle}>Top Strategic Matches:</Text>
        
        <div style={tableContainer}>
          {/* Table Header */}
          <div style={tableHeader}>
            <div style={tableRow}>
              <div style={{...tableCell, ...tableCellHeader, flex: 2}}>Domain</div>
              <div style={{...tableCell, ...tableCellHeader}}>Keywords</div>
              <div style={{...tableCell, ...tableCellHeader}}>DR</div>
              <div style={{...tableCell, ...tableCellHeader}}>Traffic</div>
              <div style={{...tableCell, ...tableCellHeader}}>Cost</div>
            </div>
          </div>
          
          {/* Table Body */}
          {topDomains.slice(0, 5).map((domain, index) => (
            <div key={index}>
              <div style={tableRow}>
                <div style={{...tableCell, ...domainCell, flex: 2}}>
                  {domain.domain}
                </div>
                <div style={tableCell}>
                  {domain.directKeywords} direct<br/>
                  {domain.relatedKeywords} related
                </div>
                <div style={tableCell}>
                  {domain.dr || '-'}
                </div>
                <div style={tableCell}>
                  {domain.traffic ? `${(domain.traffic / 1000).toFixed(0)}K/mo` : '-'}
                </div>
                <div style={tableCell}>
                  {domain.cost ? `$${domain.cost}` : '-'}
                </div>
              </div>
              {domain.reasoning && (
                <div style={reasoningRow}>
                  <Text style={reasoningText}>
                    💡 {domain.reasoning}
                  </Text>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {totalQualified > 5 && (
          <Text style={moreText}>
            ...and {totalQualified - 5} more strategic matches
          </Text>
        )}
      </Section>

      {/* AI Visibility Note */}
      <Section style={aiSection}>
        <Text style={aiText}>
          <strong>🤖 AI Visibility:</strong> These sites appear in ChatGPT, Claude, 
          and AI Overviews for your keywords, making them valuable for both 
          traditional SEO and AI-driven discovery.
        </Text>
      </Section>

      {/* CTA */}
      <Section style={ctaSection}>
        <Button style={button} href={resultsUrl}>
          View Full Analysis & Justifications →
        </Button>
      </Section>

      <Text style={emailStyles.text}>
        Each site includes detailed justification showing exactly WHY it was 
        selected and which of your keywords it ranks for.
      </Text>
    </BaseEmail>
  );
}

// Styles specific to this template
const highlightText = {
  color: '#1a1a1a',
  fontSize: '18px',
  lineHeight: '26px',
  margin: '20px 0',
};

const insightsSection = {
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const insightTitle = {
  color: '#1a1a1a',
  fontSize: '14px',
  fontWeight: '600' as const,
  margin: '0 0 16px',
};

const insightColumn = {
  textAlign: 'center' as const,
  padding: '0 8px',
};

const insightValue = {
  color: '#7c3aed',
  fontSize: '28px',
  fontWeight: '700' as const,
  margin: '0',
};

const insightLabel = {
  color: '#525252',
  fontSize: '12px',
  margin: '4px 0 0',
};

const tableSection = {
  margin: '32px 0',
};

const tableTitle = {
  color: '#1a1a1a',
  fontSize: '16px',
  fontWeight: '600' as const,
  margin: '0 0 16px',
};

const tableContainer = {
  border: '1px solid #e6e6e6',
  borderRadius: '8px',
  overflow: 'hidden',
};

const tableHeader = {
  backgroundColor: '#f8f9fa',
  borderBottom: '2px solid #e6e6e6',
};

const tableRow = {
  display: 'flex',
  borderBottom: '1px solid #e6e6e6',
  alignItems: 'center',
};

const tableCell = {
  flex: 1,
  padding: '12px 8px',
  fontSize: '13px',
  color: '#525252',
  lineHeight: '18px',
};

const tableCellHeader = {
  fontWeight: '600' as const,
  color: '#1a1a1a',
  fontSize: '12px',
};

const domainCell = {
  color: '#1a1a1a',
  fontWeight: '500' as const,
  wordBreak: 'break-all' as const,
};

const reasoningRow = {
  padding: '8px 12px',
  backgroundColor: '#fffbf0',
  borderBottom: '1px solid #e6e6e6',
};

const reasoningText = {
  fontSize: '12px',
  color: '#6b6b6b',
  margin: '0',
  fontStyle: 'italic' as const,
};

const moreText = {
  textAlign: 'center' as const,
  color: '#6b6b6b',
  fontSize: '14px',
  margin: '16px 0 0',
};

const aiSection = {
  backgroundColor: '#f0f9ff',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
  border: '1px solid #bae6fd',
};

const aiText = {
  color: '#075985',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
};

const ctaSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#7c3aed',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};

// Default export removed - use named export only