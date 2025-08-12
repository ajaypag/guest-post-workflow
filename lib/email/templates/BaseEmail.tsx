import * as React from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface BaseEmailProps {
  preview: string;
  heading?: string;
  children: React.ReactNode;
  footerText?: string;
}

export function BaseEmail({
  preview,
  heading,
  children,
  footerText = 'Linkio - Guest Post Workflow Management',
}: BaseEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Logo */}
          <Section style={logoContainer}>
            <Heading style={logo}>Linkio</Heading>
          </Section>

          {/* Main heading */}
          {heading && (
            <Heading style={h1}>{heading}</Heading>
          )}

          {/* Content */}
          {children}

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerTextStyle}>{footerText}</Text>
            <Link href="https://www.linkio.com" style={footerLink}>
              Visit Linkio
            </Link>
            <Text style={footerAddress}>
              © {new Date().getFullYear()} OutreachLabs. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const logoContainer = {
  padding: '32px 20px',
  textAlign: 'center' as const,
};

const logo = {
  fontSize: '32px',
  fontWeight: '700',
  color: '#3b82f6',
  margin: '0',
};

const h1 = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '40px',
  margin: '0 0 20px',
  padding: '0 20px',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '42px 0 26px',
};

const footer = {
  padding: '0 20px',
};

const footerTextStyle = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '0 0 10px',
};

const footerLink = {
  color: '#3b82f6',
  fontSize: '14px',
  textDecoration: 'underline',
};

const footerAddress = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '20px',
  margin: '16px 0 0',
};

// Export common styles for use in other templates
export const emailStyles = {
  text: {
    color: '#4b5563',
    fontSize: '16px',
    lineHeight: '26px',
    margin: '0 0 10px',
    padding: '0 20px',
  },
  link: {
    color: '#3b82f6',
    textDecoration: 'underline',
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'block',
    width: '100%',
    padding: '12px 20px',
  },
  buttonContainer: {
    padding: '20px',
  },
  code: {
    backgroundColor: '#f3f4f6',
    borderRadius: '4px',
    color: '#1f2937',
    fontFamily: 'monospace',
    fontSize: '14px',
    padding: '2px 4px',
  },
  panel: {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    margin: '20px',
    padding: '16px',
  },
};