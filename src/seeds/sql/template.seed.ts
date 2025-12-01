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
    {
      name: 'subscription_expiring',
      title: 'Subscription Expiring Soon',
      send_email: true,
      email_subject: 'Your Subscription is Expiring Soon',
      email_body: `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #dc2626; margin-bottom: 20px;">⚠️ Subscription Expiring Soon</h2>
            
            <p>Hi <strong>##TO_NAME##</strong>,</p>
            
            <p>This is a friendly reminder that your subscription will expire soon.</p>
            
            <div style="background-color: #fef2f2; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <p style="margin: 0; font-size: 18px;"><strong>Time Remaining:</strong></p>
              <p style="margin: 10px 0 0 0; font-size: 24px; color: #dc2626; font-weight: bold;">##DAYS_REMAINING## Days</p>
            </div>
            
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Subscription Details:</strong></p>
              <p style="margin: 10px 0 0 0;">Plan: <strong>##PLAN_TYPE##</strong></p>
              <p style="margin: 5px 0 0 0;">Expiry Date: <strong>##EXPIRY_DATE##</strong></p>
            </div>
            
            <p>Don't lose access to your chat features! Renew your subscription now to continue enjoying uninterrupted service.</p>
            
            <div style="margin: 30px 0; text-align: center;">
              <a href="##RENEW_URL##" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                Renew Subscription Now
              </a>
            </div>
            
            <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
              <p style="margin: 0;"><strong>What happens after expiration?</strong></p>
              <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                <li>You will lose access to chat features</li>
                <li>Your chat history will be preserved</li>
                <li>You can renew anytime to restore access</li>
              </ul>
            </div>
            
            <p>If you have any questions or need assistance, our support team is here to help.</p>
            
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
            
            <p style="color: #6b7280; font-size: 14px;">
              Thanks,<br>
              <strong>Team ##COMPANY_NAME##</strong>
            </p>
            
            <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
              This is an automated reminder. Please do not reply to this email.
            </p>
          </div>
        </div>
      `,
      send_sms: false,
      sms_body: null,
    },
    {
      name: 'subscription_created',
      title: 'Subscription Activated',
      send_email: true,
      email_subject: 'Welcome! Your Subscription is Active',
      email_body: `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #16a34a; margin-bottom: 20px;">🎉 Subscription Activated!</h2>
            
            <p>Hi <strong>##TO_NAME##</strong>,</p>
            
            <p>Thank you for subscribing! Your subscription has been successfully activated.</p>
            
            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #16a34a;">
              <p style="margin: 0;"><strong>Subscription Details:</strong></p>
              <p style="margin: 10px 0 0 0;">Plan: <strong>##PLAN_TYPE##</strong></p>
              <p style="margin: 5px 0 0 0;">Amount: <strong>##AMOUNT## ##CURRENCY##</strong></p>
              <p style="margin: 5px 0 0 0;">Next Billing: <strong>##NEXT_BILLING_DATE##</strong></p>
            </div>
            
            <p>You now have full access to all chat features. Start connecting with your team!</p>
            
            <div style="margin: 30px 0; text-align: center;">
              <a href="##CHAT_URL##" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                Start Chatting
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              Thanks,<br>
              <strong>Team ##COMPANY_NAME##</strong>
            </p>
          </div>
        </div>
      `,
      send_sms: false,
      sms_body: null,
    },
    {
      name: 'subscription_renewed',
      title: 'Subscription Renewed',
      send_email: true,
      email_subject: 'Your Subscription Has Been Renewed',
      email_body: `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #16a34a; margin-bottom: 20px;">✅ Subscription Renewed</h2>
            
            <p>Hi <strong>##TO_NAME##</strong>,</p>
            
            <p>Your subscription has been successfully renewed. Thank you for continuing with us!</p>
            
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Renewal Details:</strong></p>
              <p style="margin: 10px 0 0 0;">Plan: <strong>##PLAN_TYPE##</strong></p>
              <p style="margin: 5px 0 0 0;">Amount Paid: <strong>##AMOUNT## ##CURRENCY##</strong></p>
              <p style="margin: 5px 0 0 0;">Next Billing: <strong>##NEXT_BILLING_DATE##</strong></p>
            </div>
            
            <p>Your access to all features continues without interruption.</p>
            
            <p style="color: #6b7280; font-size: 14px;">
              Thanks,<br>
              <strong>Team ##COMPANY_NAME##</strong>
            </p>
          </div>
        </div>
      `,
      send_sms: false,
      sms_body: null,
    },
    {
      name: 'subscription_cancelled',
      title: 'Subscription Cancelled',
      send_email: true,
      email_subject: 'Your Subscription Has Been Cancelled',
      email_body: `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #dc2626; margin-bottom: 20px;">Subscription Cancelled</h2>
            
            <p>Hi <strong>##TO_NAME##</strong>,</p>
            
            <p>Your subscription has been cancelled as requested.</p>
            
            <div style="background-color: #fef2f2; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <p style="margin: 0;"><strong>Important:</strong></p>
              <p style="margin: 10px 0 0 0;">You will retain access until: <strong>##PERIOD_END##</strong></p>
            </div>
            
            <p>After this date, your subscription will end and you'll lose access to chat features.</p>
            
            <div style="margin: 30px 0; text-align: center;">
              <a href="##REACTIVATE_URL##" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                Reactivate Subscription
              </a>
            </div>
            
            <p>We're sorry to see you go. If you change your mind, you can reactivate your subscription anytime.</p>
            
            <p style="color: #6b7280; font-size: 14px;">
              Thanks,<br>
              <strong>Team ##COMPANY_NAME##</strong>
            </p>
          </div>
        </div>
      `,
      send_sms: false,
      sms_body: null,
    },
    {
      name: 'subscription_payment_failed',
      title: 'Subscription Payment Failed',
      send_email: true,
      email_subject: 'Action Required: Subscription Payment Failed',
      email_body: `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #dc2626; margin-bottom: 20px;">⚠️ Payment Failed</h2>
            
            <p>Hi <strong>##TO_NAME##</strong>,</p>
            
            <p>We were unable to process your subscription payment.</p>
            
            <div style="background-color: #fef2f2; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <p style="margin: 0;"><strong>Action Required:</strong></p>
              <p style="margin: 10px 0 0 0;">Please update your payment method to avoid service interruption.</p>
            </div>
            
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Payment Details:</strong></p>
              <p style="margin: 10px 0 0 0;">Amount: <strong>##AMOUNT## ##CURRENCY##</strong></p>
              <p style="margin: 5px 0 0 0;">Attempt: <strong>##ATTEMPT_COUNT##</strong></p>
            </div>
            
            <div style="margin: 30px 0; text-align: center;">
              <a href="##UPDATE_PAYMENT_URL##" style="display: inline-block; background-color: #dc2626; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                Update Payment Method
              </a>
            </div>
            
            <p>If payment continues to fail, your subscription may be cancelled.</p>
            
            <p style="color: #6b7280; font-size: 14px;">
              Thanks,<br>
              <strong>Team ##COMPANY_NAME##</strong>
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
