import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Initialize with Mandrill SMTP settings
    this.transporter = nodemailer.createTransport({
      host: 'smtp.mandrillapp.com',
      port: 587,
      secure: false, // Use STARTTLS
      auth: {
        user: 'SAVVY PARTNERS MONOPROSOPI IKE', // Your Mandrill username (can be anything)
        pass: process.env.MANDRILL_API_KEY, // Your Mandrill API key
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 60000,
      greetingTimeout: 30000,
      socketTimeout: 60000,
    });
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
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@superstarprimer.com',
        to: userEmail,
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
            filename: `adidas-superstar-snapshot-${sessionId}.png`,
            content: snapshotBuffer,
            contentType: 'image/png',
          },
        ],
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${userEmail}`);
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
      await this.transporter.verify();
      console.log('Email server connection verified');
      return true;
    } catch (error) {
      console.error('Email server connection failed:', error);
      return false;
    }
  }
}
