import * as React from 'react';
import {
  Link,
  Section,
  Text,
} from '@react-email/components';
import { BaseEmail, emailStyles } from './BaseEmail';

interface VettedSitesRejectionEmailProps {
  recipientName?: string;
  targetUrls?: string[];
  replyEmail?: string;
}

export function VettedSitesRejectionEmail({
  recipientName = 'there',
  targetUrls = [],
  replyEmail = 'info@linkio.com',
}: VettedSitesRejectionEmailProps) {
  return (
    <BaseEmail
      preview="Update on your vetted sites request"
      heading="Update on your vetted sites request"
    >
      <Text style={emailStyles.text}>
        Hi {recipientName},
      </Text>

      <Text style={emailStyles.text}>
        We're unable to process this vetted sites request at this time.
      </Text>

      {targetUrls.length > 0 && (
        <Section style={infoBox}>
          <Text style={infoTitle}>Request details:</Text>
          {targetUrls.map((url, index) => (
            <Text key={index} style={urlItem}>
              • {url}
            </Text>
          ))}
        </Section>
      )}

      <Text style={emailStyles.text}>
        Reply to this email if you think this was a mistake and we'll take care of it.
      </Text>

      <Section style={contactSection}>
        <Text style={contactText}>
          📧 <Link href={`mailto:${replyEmail}`} style={link}>
            {replyEmail}
          </Link>
        </Text>
      </Section>
    </BaseEmail>
  );
}

// Styles specific to this template

const infoBox = {
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
};

const infoTitle = {
  color: '#1a1a1a',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 8px',
};

const urlItem = {
  color: '#525252',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '4px 0',
  wordBreak: 'break-all' as const,
};

const contactSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
  padding: '20px',
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
};

const contactText = {
  color: '#525252',
  fontSize: '16px',
  margin: '0',
};

const link = {
  color: '#7c3aed',
  textDecoration: 'none',
  fontWeight: '500' as const,
};

// Default export removed - use named export only