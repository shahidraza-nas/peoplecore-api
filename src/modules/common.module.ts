import { DynamicModule, Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { SettingsInterceptor } from 'src/core/interceptors/sql/settings.interceptors';
import { AppEngine } from '../app.config';
import { HistoryModule } from './mongo/history/history.module';
import { LoginLogModule } from './mongo/login-log/login-log.module';
import { OtpSessionModule } from './mongo/otp-session/otp-session.module';
import { TaskModule } from './mongo/task/task.module';
import { TrashModule } from './mongo/trash/trash.module';
import { AuthModule } from './sql/auth/auth.module';
import { RolesGuard } from './sql/auth/roles.guard';
import { JwtAuthGuard } from './sql/auth/strategies/jwt/jwt-auth.guard';
import { LocalAuthModule } from './sql/auth/strategies/local/local-auth.module';
import { CountryModule } from './sql/country/country.module';
import { NotificationModule } from './sql/notification/notification.module';
import { PageModule } from './sql/page/page.module';
import { SettingModule } from './sql/setting/setting.module';
import { StateModule } from './sql/state/state.module';
import { TemplateModule } from './sql/template/template.module';
import { UserModule } from './sql/user/user.module';
import { JobLogModule } from './mongo/job-log/job-log.module';
import { ChatModule } from './sql/chat/chat.module';
import { ChatMessageModule } from './sql/chat-message/chat-message.module';

export interface CommonModuleOption {
  defaultEngine?: AppEngine;
}

@Module({})
export class CommonModule {
  static register(): DynamicModule {
    // common imports
    const imports = [
      TaskModule,
      HistoryModule,
      TrashModule,
      LoginLogModule,
      OtpSessionModule,
      AuthModule,
      LocalAuthModule,
      UserModule,
      PageModule,
      TemplateModule,
      SettingModule,
      CountryModule,
      StateModule,
      NotificationModule,
      TaskModule,
      HistoryModule,
      TrashModule,
      LoginLogModule,
      OtpSessionModule,
      JobLogModule,
      ChatModule,
      ChatMessageModule,
    ];

    // common providers
    const providers: any = [
      { provide: APP_GUARD, useClass: JwtAuthGuard },
      { provide: APP_GUARD, useClass: RolesGuard },
      { provide: APP_INTERCEPTOR, useClass: SettingsInterceptor },
    ];

    // checking the default engine
    return {
      module: CommonModule,
      imports,
      providers,
    };
  }
}
