import React from 'react';
import { BaseEmail } from './BaseEmail';

interface InvitationEmailProps {
  inviteeEmail: string;
  userType: 'internal' | 'account' | 'publisher';
  role: 'user' | 'admin';
  invitationUrl: string;
  expiresAt: string;
  invitedBy: string;
}

export function InvitationEmail({
  inviteeEmail,
  userType,
  role,
  invitationUrl,
  expiresAt,
  invitedBy,
}: InvitationEmailProps) {
  const userTypeDisplay = {
    internal: 'Internal Team Member',
    account: 'Account',
    publisher: 'Publisher'
  }[userType];

  const roleDisplay = role === 'admin' ? 'Administrator' : 'User';

  return (
    <BaseEmail preview={`You're invited to join Linkio as a ${userTypeDisplay}`}>
      <div style={{ maxWidth: '600px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
        {/* Header */}
        <div style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '40px 20px',
          textAlign: 'center',
          borderRadius: '8px 8px 0 0'
        }}>
          <h1 style={{ 
            color: 'white', 
            margin: '0 0 10px 0', 
            fontSize: '28px',
            fontWeight: 'bold'
          }}>
            You're Invited!
          </h1>
          <p style={{ 
            color: 'rgba(255, 255, 255, 0.9)', 
            margin: '0',
            fontSize: '16px'
          }}>
            Join the Linkio Guest Post Workflow System
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: '40px 20px', backgroundColor: '#ffffff' }}>
          <p style={{ fontSize: '16px', lineHeight: '1.6', marginBottom: '20px', color: '#333' }}>
            Hello,
          </p>
          
          <p style={{ fontSize: '16px', lineHeight: '1.6', marginBottom: '20px', color: '#333' }}>
            <strong>{invitedBy}</strong> has invited you to join the Linkio Guest Post Workflow System as a <strong>{userTypeDisplay}</strong> with <strong>{roleDisplay}</strong> access.
          </p>

          {/* Invitation Details */}
          <div style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #e9ecef',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '30px'
          }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#495057', fontSize: '18px' }}>
              Invitation Details
            </h3>
            <div style={{ marginBottom: '10px' }}>
              <strong style={{ color: '#6c757d' }}>Email:</strong> {inviteeEmail}
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong style={{ color: '#6c757d' }}>Account Type:</strong> {userTypeDisplay}
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong style={{ color: '#6c757d' }}>Role:</strong> {roleDisplay}
            </div>
            <div>
              <strong style={{ color: '#6c757d' }}>Expires:</strong> {new Date(expiresAt).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>

          <p style={{ fontSize: '16px', lineHeight: '1.6', marginBottom: '30px', color: '#333' }}>
            To accept this invitation and create your account, click the button below:
          </p>

          {/* CTA Button */}
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <a
              href={invitationUrl}
              style={{
                display: 'inline-block',
                backgroundColor: '#007bff',
                color: 'white',
                padding: '15px 30px',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: 'bold',
                boxShadow: '0 2px 4px rgba(0, 123, 255, 0.2)'
              }}
            >
              Accept Invitation
            </a>
          </div>

          {/* Alternative Link */}
          <div style={{
            backgroundColor: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '6px',
            padding: '15px',
            marginBottom: '20px'
          }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#856404' }}>
              <strong>Can't click the button?</strong> Copy and paste this link into your browser:
            </p>
            <p style={{ 
              margin: '0', 
              fontSize: '12px', 
              color: '#6c757d', 
              wordBreak: 'break-all',
              fontFamily: 'monospace',
              backgroundColor: '#f8f9fa',
              padding: '8px',
              borderRadius: '4px'
            }}>
              {invitationUrl}
            </p>
          </div>

          {/* System Info */}
          <div style={{
            borderTop: '1px solid #e9ecef',
            paddingTop: '20px',
            fontSize: '14px',
            color: '#6c757d'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>What's Next?</h4>
            <ul style={{ paddingLeft: '20px', margin: '0' }}>
              <li style={{ marginBottom: '5px' }}>Click the invitation link above</li>
              <li style={{ marginBottom: '5px' }}>Complete your account setup with a secure password</li>
              <li style={{ marginBottom: '5px' }}>Start using the Linkio system immediately</li>
            </ul>
          </div>

          {/* Footer */}
          <div style={{
            borderTop: '1px solid #e9ecef',
            paddingTop: '20px',
            marginTop: '30px',
            fontSize: '12px',
            color: '#6c757d',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0 0 5px 0' }}>
              This invitation will expire on {new Date(expiresAt).toLocaleDateString()}.
            </p>
            <p style={{ margin: '0' }}>
              If you have any questions, please contact your administrator.
            </p>
          </div>
        </div>
      </div>
    </BaseEmail>
  );
}