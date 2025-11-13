import { registerAs } from '@nestjs/config';
import { AppOptions, credential } from 'firebase-admin';
import { resolve } from 'path';
import { env } from 'src/core/env';

export default registerAs('firebase', async (): Promise<AppOptions> => {
  await env.initialize();
  return {
    credential: env.get('FIREBASE_KEY_PATH')
      ? credential.cert(resolve(env.get('FIREBASE_KEY_PATH')))
      : credential.applicationDefault(),
    databaseURL: env.get('FIREBASE_DATABASE_URL', ''),
    serviceAccountId: env.get('FIREBASE_SERVICE_ACCOUNT_ID', ''),
  };
});
