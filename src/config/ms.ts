import { registerAs } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';
import { env } from 'src/core/env';

/* Micro service config */
export default registerAs('ms', async () => {
  await env.initialize();
  return {
    transport: Transport.REDIS,
    options: {
      host: env.get('REDIS_HOST', 'localhost'),
      port: parseInt(env.get('REDIS_PORT', '6379'), 10),
      retryAttempts: 5,
      retryDelay: 3000,
    },
  };
});
