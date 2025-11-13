import { DocumentBuilder, SwaggerCustomOptions } from '@nestjs/swagger';
import { APP_NAME, APP_VERSION } from 'src/app.config';

declare global {
  interface Window {
    ui: any;
  }
}

export const SwaggerConfig = new DocumentBuilder()
  .setTitle(APP_NAME)
  .setDescription(`${APP_NAME} API description`)
  .setVersion(`v${APP_VERSION}`)
  .addBearerAuth()
  .build();

export const SwaggerOptions: SwaggerCustomOptions = {
  swaggerOptions: {
    responseInterceptor: (res: any) => {
      try {
        const url = res.url || '';
        if (url.includes('/auth/local') && res?.body?.data?.token) {
          const token = res.body.data.token;
          localStorage.setItem('swagger-token', token);
          window.ui.preauthorizeApiKey('bearer', token);
        }
      } catch (e) {
        console.error(e);
      }
      return res;
    },
    onComplete: () => {
      const savedToken = localStorage.getItem('swagger-token');
      if (savedToken) {
        window.ui.preauthorizeApiKey('bearer', savedToken);
      }
    },
  },
};
