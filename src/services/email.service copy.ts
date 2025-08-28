import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Initialize with SMTP settings with TLS certificate validation disabled
    this.transporter = nodemailer.createTransport({
      host: 'webmail.superstarprimer.com', // Replace with your SMTP host
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER || 'noreply@superstarprimer.com',
        pass: process.env.EMAIL_PASS || 'g!9BJ5b?_nW64P',
      },
      tls: {
        // Disable certificate validation (for development/testing only)
        rejectUnauthorized: false,
        // Alternative: specify the correct servername if known
        // servername: 'papaki.gr'
      },
      // Add connection timeout and other reliability options
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
