import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: false,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASSWORD'),
      },
    });
  }

  async sendOTP(to: string, otp: string, name: string): Promise<void> {
    const mailOptions = {
      from: this.configService.get<string>('SMTP_FROM', '"CoreChat" <noreply@corechat.com>'),
      to,
      subject: 'CoreChat - Your Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0D7C66; margin: 0;">CoreChat</h1>
            <p style="color: #666;">by Corework</p>
          </div>
          <h2>Hello ${name}!</h2>
          <p>Your verification code is:</p>
          <div style="background: #0D7C66; color: white; padding: 20px; text-align: center; border-radius: 10px; font-size: 32px; letter-spacing: 8px; margin: 20px 0;">
            ${otp}
          </div>
          <p>This code will expire in 5 minutes.</p>
          <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Email sending failed:', error);
      // Don't throw - in dev, we log OTP to console
      console.log(`[DEV] OTP for ${to}: ${otp}`);
    }
  }

  async sendMessageNotification(
    to: string,
    senderName: string,
    messagePreview: string,
  ): Promise<void> {
    const mailOptions = {
      from: this.configService.get<string>('SMTP_FROM', '"CoreChat" <noreply@corechat.com>'),
      to,
      subject: `CoreChat - New message from ${senderName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0D7C66; margin: 0;">CoreChat</h1>
            <p style="color: #666;">by Corework</p>
          </div>
          <h2>New message from ${senderName}</h2>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 10px; margin: 20px 0;">
            <p style="margin: 0;">${messagePreview}</p>
          </div>
          <p><a href="${this.configService.get('CLIENT_URL')}" style="color: #0D7C66;">Open CoreChat</a> to reply.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Notification email failed:', error);
    }
  }

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    const mailOptions = {
      from: this.configService.get<string>('SMTP_FROM', '"CoreChat" <noreply@corechat.com>'),
      to,
      subject: 'Welcome to CoreChat!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0D7C66; margin: 0;">CoreChat</h1>
            <p style="color: #666;">by Corework</p>
          </div>
          <h2>Welcome, ${name}!</h2>
          <p>Your account has been created successfully. Start connecting with friends and family today!</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${this.configService.get('CLIENT_URL')}" 
               style="background: #0D7C66; color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-size: 16px;">
              Open CoreChat
            </a>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Welcome email failed:', error);
    }
  }
}
