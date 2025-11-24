import { registerAs } from '@nestjs/config';
import { env } from 'src/core/env';

export default registerAs('stripe', async () => {
  await env.initialize();
  return {
    apiKey: env.get('STRIPE_SECRET_KEY', ''), // EXISTING
    webhookSecret: env.get('STRIPE_WEBHOOK_SECRET', ''), // NEWLY ADDED
    publishableKey: env.get('STRIPE_PUBLISHABLE_KEY', ''), // NEWLY ADDED
  };
});
