import { Logger } from '@nestjs/common';
import { registerAs } from '@nestjs/config';
import { SequelizeModuleOptions } from '@nestjs/sequelize';
import { sqlDialect } from 'src/app.config';

import { isPrimaryInstance } from 'src/core/core.utils';
import { env } from 'src/core/env';

const logger: Logger = new Logger('SqlQueryLog');

export default registerAs('sql', async (): Promise<SequelizeModuleOptions> => {
  await env.initialize();
  return {
    dialect: sqlDialect,
    host: env.get('DATABASE_HOST', 'localhost'),
    port: parseInt(env.get('DATABASE_PORT', '3306'), 10),
    username: env.get('DATABASE_USERNAME', 'root'),
    password: env.get('DATABASE_PASSWORD', ''),
    database: env.get('DATABASE_NAME', 'nest'),
    autoLoadModels: true,
    synchronize: isPrimaryInstance() && true, // avoid multiple sync while using pm2 cluster
    sync: {
      alter: process.env.DATABASE_ALTER_SYNC === 'Y',
    },
    dialectOptions: {
      ssl:
        process.env.DATABASE_DISABLE_SSL === 'Y'
          ? false
          : {
              require: true,
              rejectUnauthorized: false,
            },
    },
    logging: (sql: string) =>
      process.env.DATABASE_LOGGING === 'Y'
        ? logger.debug(`\x1B[0m${sql}`)
        : false,
  };
});
