import * as React from 'react';
import { Button, Text, Section, Link } from '@react-email/components';
import { BaseEmail, emailStyles } from './BaseEmail';

interface ContactOutreachEmailProps {
  contactName: string;
  websiteDomain: string;
  websiteMetrics: {
    domainRating: number;
    monthlyTraffic: number;
    categories: string[];
  };
  outreachType: 'guest-post' | 'link-insert' | 'partnership';
  message: string;
  senderName: string;
  senderEmail: string;
  replyToEmail?: string;
}

export function ContactOutreachEmail({
  contactName,
  websiteDomain,
  websiteMetrics,
  outreachType,
  message,
  senderName,
  senderEmail,
  replyToEmail,
}: ContactOutreachEmailProps) {
  const outreachTypeText = {
    'guest-post': 'Guest Post Opportunity',
    'link-insert': 'Link Insertion Request',
    'partnership': 'Partnership Proposal',
  }[outreachType];

  return (
    <BaseEmail
      preview={`${outreachTypeText} for ${websiteDomain}`}
      heading={`${outreachTypeText}`}
    >
      <Text style={emailStyles.text}>
        Hi {contactName},
      </Text>

      <Text style={emailStyles.text}>
        I hope this email finds you well. My name is {senderName}, and I'm reaching out
        regarding a potential collaboration opportunity with{' '}
        <Link href={`https://${websiteDomain}`} style={emailStyles.link}>
          {websiteDomain}
        </Link>.
      </Text>

      {/* Custom message */}
      <Section style={{ ...emailStyles.panel, whiteSpace: 'pre-wrap' }}>
        <Text style={{ ...emailStyles.text, margin: 0 }}>
          {message}
        </Text>
      </Section>

      {/* Website metrics */}
      <Text style={{ ...emailStyles.text, marginTop: '20px' }}>
        <strong>Why we chose {websiteDomain}:</strong>
      </Text>
      <Text style={{ ...emailStyles.text, fontSize: '14px' }}>
        • Domain Rating: {websiteMetrics.domainRating}<br />
        • Monthly Traffic: {websiteMetrics.monthlyTraffic.toLocaleString()} visitors<br />
        • Categories: {websiteMetrics.categories.join(', ')}
      </Text>

      <Text style={emailStyles.text}>
        I'd love to discuss this opportunity further and answer any questions you might
        have. Please feel free to reply to this email or reach out directly at{' '}
        <Link href={`mailto:${replyToEmail || senderEmail}`} style={emailStyles.link}>
          {replyToEmail || senderEmail}
        </Link>.
      </Text>

      <Text style={{ ...emailStyles.text, marginTop: '20px' }}>
        Looking forward to hearing from you!
      </Text>

      <Text style={emailStyles.text}>
        Best regards,<br />
        {senderName}
      </Text>

      {/* Unsubscribe notice */}
      <Text style={{ ...emailStyles.text, fontSize: '12px', color: '#9ca3af', marginTop: '32px' }}>
        This email was sent through PostFlow's outreach management system. If you'd
        prefer not to receive future collaboration requests, please let us know.
      </Text>
    </BaseEmail>
  );
}