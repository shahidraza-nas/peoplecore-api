import { registerAs } from '@nestjs/config';
import { env } from 'src/core/env';

export default registerAs('redis', async () => {
  await env.initialize();
  const host = env.get('REDIS_HOST', 'localhost');
  const port = parseInt(env.get('REDIS_PORT', '6379'), 10);
  const db = env.get('REDIS_DB', '0');

  return {
    host,
    port,
    db,
    prefix: 'nest_',
    ttl: 60 * 60 * 24 * 10 * 1000, // 10 days in milliseconds
    uri: `redis://${host}:${port}/${db}`,
  };
});
