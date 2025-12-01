import { registerAs } from '@nestjs/config';
import { env } from 'src/core/env';

export default registerAs('stripe', async () => {
  await env.initialize();
  return {
    apiKey: env.get('STRIPE_SECRET_KEY', ''),
    webhookSecret: env.get('STRIPE_WEBHOOK_SECRET', ''),
    publishableKey: env.get('STRIPE_PUBLISHABLE_KEY', ''),
    priceMonthly: env.get('STRIPE_PRICE_MONTHLY', ''),
    priceYearly: env.get('STRIPE_PRICE_YEARLY', ''),
  };
});
