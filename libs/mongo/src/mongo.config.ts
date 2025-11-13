import { Connection } from 'mongoose';
import * as paginate from 'mongoose-paginate-v2';

import { registerAs } from '@nestjs/config';
import { MongooseModuleOptions } from '@nestjs/mongoose';
import { env } from 'src/core/env';

export default registerAs('mongo', async (): Promise<MongooseModuleOptions> => {
  await env.initialize();
  return {
    uri: env.get('MONGO_URI', 'mongodb://localhost/nest'),
    connectionFactory: (connection: Connection) => {
      connection.plugin(paginate);
      return connection;
    },
  };
});
