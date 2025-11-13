import { registerAs } from '@nestjs/config';
import * as NodeGeocoder from 'node-geocoder';
import { env } from 'src/core/env';

export default registerAs(
  'geocoder',
  async (): Promise<NodeGeocoder.Options> => {
    await env.initialize();
    return {
      provider: 'google',
      apiKey: env.get('GOOGLE_MAP_API_KEY', ''),
    };
  },
);
