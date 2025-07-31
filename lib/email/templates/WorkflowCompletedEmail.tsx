import * as React from 'react';
import { Button, Text, Section, Hr } from '@react-email/components';
import { BaseEmail, emailStyles } from './BaseEmail';

interface WorkflowCompletedEmailProps {
  userName: string;
  workflowName: string;
  clientName: string;
  completedSteps: number;
  totalSteps: number;
  completedAt: string;
  viewUrl: string;
}

export function WorkflowCompletedEmail({
  userName,
  workflowName,
  clientName,
  completedSteps,
  totalSteps,
  completedAt,
  viewUrl,
}: WorkflowCompletedEmailProps) {
  return (
    <BaseEmail
      preview={`Workflow "${workflowName}" has been completed`}
      heading="Workflow Completed! 🎉"
    >
      <Text style={emailStyles.text}>
        Hi {userName},
      </Text>

      <Text style={emailStyles.text}>
        Great news! The workflow <strong>"{workflowName}"</strong> for{' '}
        <strong>{clientName}</strong> has been successfully completed.
      </Text>

      <Section style={emailStyles.panel}>
        <Text style={{ ...emailStyles.text, margin: '0 0 12px', fontSize: '14px' }}>
          <strong>Workflow Summary:</strong>
        </Text>
        <Text style={{ ...emailStyles.text, margin: '4px 0', fontSize: '14px' }}>
          • Workflow: {workflowName}
        </Text>
        <Text style={{ ...emailStyles.text, margin: '4px 0', fontSize: '14px' }}>
          • Client: {clientName}
        </Text>
        <Text style={{ ...emailStyles.text, margin: '4px 0', fontSize: '14px' }}>
          • Steps Completed: {completedSteps} of {totalSteps}
        </Text>
        <Text style={{ ...emailStyles.text, margin: '4px 0', fontSize: '14px' }}>
          • Completed: {completedAt}
        </Text>
      </Section>

      <Section style={emailStyles.buttonContainer}>
        <Button href={viewUrl} style={emailStyles.button}>
          View Workflow Results
        </Button>
      </Section>

      <Hr style={{ borderColor: '#e5e7eb', margin: '32px 0' }} />

      <Text style={{ ...emailStyles.text, fontSize: '14px', color: '#6b7280' }}>
        All workflow data and generated content has been saved and is available for
        review. You can access the complete workflow history and export the results
        from your dashboard.
      </Text>
    </BaseEmail>
  );
}