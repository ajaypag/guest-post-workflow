import * as React from 'react';
import {
  Button,
  Link,
  Section,
  Text,
} from '@react-email/components';
import { BaseEmail, emailStyles } from './BaseEmail';

interface VettedSitesApprovalEmailProps {
  recipientName?: string;
  targetUrls: string[];
  statusUrl: string;
}

export function VettedSitesApprovalEmail({
  recipientName = 'there',
  targetUrls = [],
  statusUrl,
}: VettedSitesApprovalEmailProps) {
  return (
    <BaseEmail
      preview="Your vetted sites request has been approved ✅"
      heading="Good news! Your request has been approved ✅"
    >
      <Text style={emailStyles.text}>
        Hi {recipientName},
      </Text>

      <Text style={emailStyles.text}>
        Great news! Your vetted sites request has been approved and we're beginning the analysis.
      </Text>

      <Section style={infoBox}>
        <Text style={infoTitle}>What we're analyzing:</Text>
        {targetUrls.map((url, index) => (
          <Text key={index} style={urlItem}>
            • {url}
          </Text>
        ))}
      </Section>

      <Text style={emailStyles.text}>
        <strong>What happens next:</strong>
      </Text>
      
      <Text style={listItem}>
        1. Our team generates targeted keywords for each URL
      </Text>
      <Text style={listItem}>
        2. We identify sites already ranking for your keywords
      </Text>
      <Text style={listItem}>
        3. Each site is qualified based on relevance and authority
      </Text>
      <Text style={listItem}>
        4. You receive a detailed report with strategic matches
      </Text>

      <Text style={emailStyles.text}>
        <strong>Expected timeline:</strong> 3-5 business days
      </Text>

      <Section style={ctaSection}>
        <Button style={button} href={statusUrl}>
          Check Status & Progress →
        </Button>
      </Section>

      <Text style={emailStyles.text}>
        We'll email you as soon as your analysis is ready! Questions? Just reply to this email.
      </Text>
    </BaseEmail>
  );
}

// Styles for custom components not in BaseEmail
const infoBox = {
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  padding: '16px',
  margin: '20px 0',
};

const infoTitle = {
  color: '#1a1a1a',
  fontSize: '14px',
  fontWeight: '600' as const,
  margin: '0 0 8px',
};

const urlItem = {
  color: '#525252',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '4px 0',
  wordBreak: 'break-all' as const,
};

const listItem = {
  color: '#525252',
  fontSize: '15px',
  lineHeight: '22px',
  margin: '8px 0',
  paddingLeft: '8px',
};

const ctaSection = {
  textAlign: 'center' as const,
  margin: '24px 0',
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