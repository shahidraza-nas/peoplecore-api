import { registerAs } from '@nestjs/config';
import { env } from 'src/core/env';

export default registerAs(
  'twilio',
  async (): Promise<{
    accountSid?: string;
    authToken?: string;
    from?: string;
  }> => {
    await env.initialize();
    return {
      accountSid: env.get('TWILIO_ACCOUNT_SID', ''),
      authToken: env.get('TWILIO_AUTH_TOKEN', ''),
      from: env.get('TWILIO_PHONE_NUMBER', ''),
    };
  },
);
