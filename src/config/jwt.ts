import { registerAs } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';
import { env } from 'src/core/env';

export default registerAs('jwt', async (): Promise<JwtModuleOptions> => {
  await env.initialize();
  return {
    secret: env.get('JWT_SECRET_KEY', '$3cR7!'),
    signOptions: { expiresIn: 24 * 60 * 60 },
  };
});
