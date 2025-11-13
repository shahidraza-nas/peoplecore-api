import { MailerOptions } from '@nestjs-modules/mailer';
import { registerAs } from '@nestjs/config';
import { env } from 'src/core/env';

export default registerAs('email', async (): Promise<MailerOptions> => {
  await env.initialize();
  return {
    transport: {
      host: env.get('SMTP_HOST', 'localhost'),
      port: parseInt(env.get('SMTP_PORT', '587'), 10),
      auth: {
        user: env.get('SMTP_USER', ''),
        pass: env.get('SMTP_PASS', ''),
      },
      secure: false,
      tls: {
        rejectUnauthorized: false,
      },
    },
    defaults: {
      from: `"NewAgeSMB" <${env.get('SMTP_USER', '')}>`,
    },
  };
});
