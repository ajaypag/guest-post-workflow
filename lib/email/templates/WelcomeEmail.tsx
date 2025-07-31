import * as React from 'react';
import { Button, Text, Section } from '@react-email/components';
import { BaseEmail, emailStyles } from './BaseEmail';

interface WelcomeEmailProps {
  userName: string;
  userEmail: string;
  loginUrl?: string;
}

export function WelcomeEmail({
  userName,
  userEmail,
  loginUrl = 'https://postflow.outreachlabs.net/login',
}: WelcomeEmailProps) {
  return (
    <BaseEmail
      preview="Welcome to PostFlow - Your guest post workflow management platform"
      heading={`Welcome to PostFlow, ${userName}!`}
    >
      <Text style={emailStyles.text}>
        We're excited to have you on board. PostFlow helps you manage your guest post
        workflows, track outreach campaigns, and streamline your content creation process.
      </Text>

      <Text style={emailStyles.text}>
        Your account has been created with the email: <strong>{userEmail}</strong>
      </Text>

      <Section style={emailStyles.buttonContainer}>
        <Button href={loginUrl} style={emailStyles.button}>
          Get Started
        </Button>
      </Section>

      <Section style={emailStyles.panel}>
        <Text style={{ ...emailStyles.text, margin: 0, fontSize: '14px' }}>
          <strong>What you can do with PostFlow:</strong>
        </Text>
        <Text style={{ ...emailStyles.text, margin: '8px 0 0', fontSize: '14px' }}>
          • Create and manage guest post workflows<br />
          • Track website outreach and contacts<br />
          • Analyze domain metrics and qualify prospects<br />
          • Collaborate with your team on content projects<br />
          • Generate AI-powered content drafts
        </Text>
      </Section>

      <Text style={emailStyles.text}>
        If you have any questions or need help getting started, feel free to reach out
        to our support team.
      </Text>

      <Text style={{ ...emailStyles.text, marginTop: '20px' }}>
        Best regards,<br />
        The PostFlow Team
      </Text>
    </BaseEmail>
  );
}