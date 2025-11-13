import { Seed } from '@core/sql/seeder/seeder.dto';
import { Template } from '../../modules/sql/template/entities/template.entity';

const seed: Seed<Template> = {
  model: 'Template',
  action: 'always',
  alwaysRule: 'update',
  alwaysWhere: (item) => ({ name: item.name }),
  data: [
    {
      name: 'forgot_password',
      title: 'Forgot Password',
      send_email: true,
      email_subject: 'Forgot Password',
      email_body:
        '<p>Hi ##TO_NAME##,</p><br><p>##OTP## is your OTP for reset password.</p><br><p>Thanks</p>',
      send_sms: true,
      sms_body: '##OTP## is your OTP for reset password',
    },
    {
      name: '2fa_otp',
      title: '2FA OTP Verification',
      send_email: true,
      email_subject: 'OTP Verification',
      email_body:
        '<p>Hi ##TO_NAME##,</p><br><p>##OTP## is your OTP.</p><br><p>Thanks</p>',
      send_sms: true,
      sms_body: '##OTP## is your OTP',
    },
    {
      name: 'welcome_email',
      title: 'Welcome Email',
      send_email: true,
      email_subject: 'Welcome to ##COMPANY_NAME##!',
      email_body: `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #2563eb; margin-bottom: 20px;">Welcome to ##COMPANY_NAME##!</h2>
            
            <p>Hi <strong>##TO_NAME##</strong>,</p>
            
            <p>We're excited to have you as part of our team at <strong>##COMPANY_NAME##</strong>!</p>
            
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Your Account Details:</strong></p>
              <p style="margin: 10px 0 0 0;">Email: <strong>##TO_EMAIL##</strong></p>
            </div>
            
            <p>Your account has been successfully created. You can now log in using your registered email address.</p>
            
            <div style="margin: 30px 0;">
              <a href="##LOGIN_URL##" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Login to Your Account
              </a>
            </div>
            
            <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Getting Started:</strong></p>
              <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                <li>Complete your profile information</li>
                <li>Explore the dashboard and features</li>
                <li>Connect with your team members</li>
              </ul>
            </div>
            
            <p>If you have any questions or need assistance, feel free to reach out to our support team.</p>
            
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
            
            <p style="color: #6b7280; font-size: 14px;">
              Thanks,<br>
              <strong>Team ##COMPANY_NAME##</strong>
            </p>
            
            <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      `,
      send_sms: false,
      sms_body: null,
    },
  ],
};

export default seed;
