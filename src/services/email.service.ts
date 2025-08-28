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
        from: process.env.EMAIL_FROM || 'noreply@adidas-superstar.com',
        to: userEmail,
        subject: 'Your Adidas Superstar Experience Snapshot',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Your Adidas Superstar Experience</h2>
            <p>Thank you for visiting our interactive store!</p>
            <p>Here's your personalized snapshot from your experience.</p>
            <p>We hope you enjoyed trying on our latest collection!</p>
            <br>
            <p>Best regards,<br>The Adidas Superstar Team</p>
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
