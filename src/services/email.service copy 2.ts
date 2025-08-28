import { Injectable } from '@nestjs/common';

// Import Mailchimp Transactional
const mailchimp = require('@mailchimp/mailchimp_transactional');

@Injectable()
export class EmailService {
  private mailchimpClient: any;

  constructor() {
    // Initialize Mailchimp Transactional client with API key
    const apiKey = 'a085fa1a5d5f5bff1808ecb91f779550-us2';
    this.mailchimpClient = mailchimp(apiKey);
  }

  /**
   * Send snapshot email to user
   */
  async sendSnapshotEmail(
    userEmail: string,
    snapshotBuffer: Buffer,
    sessionId: string,
  ): Promise<boolean> {
    try {
      // Convert buffer to base64 for attachment
      const base64Image = snapshotBuffer.toString('base64');
      
      const message = {
        from_email: process.env.EMAIL_FROM || 'noreply@superstarprimer.com',
        from_name: 'Adidas Superstar',
        to: [
          {
            email: userEmail,
            type: 'to'
          }
        ],
        subject: 'Your Superstar Look is Here.',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <p>Your remix is ready. This is YOUR Superstar look! Drop it on your feed. </p>
            <p>Tag #SuperstarPrimer and enter the challenge to win tickets to Primer Festival.</p>
            <p>Ready to join?</p>
          </div>
        `,
        attachments: [
          {
            name: `adidas-superstar-snapshot-${sessionId}.png`,
            type: 'image/png',
            content: base64Image
          }
        ]
      };

      const result = await this.mailchimpClient.messages.send({
        message: message
      });

      console.log(`Email sent successfully to ${userEmail}:`, result);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  /**
   * Test email configuration
   */
  async testConnection(): Promise<boolean> {
    try {
      // Test by getting account info
      const info = await this.mailchimpClient.users.info();
      console.log('Mailchimp connection verified:', info);
      return true;
    } catch (error) {
      console.error('Mailchimp connection failed:', error);
      return false;
    }
  }
}
