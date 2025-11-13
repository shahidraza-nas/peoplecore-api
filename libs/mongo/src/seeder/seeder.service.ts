import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import seeds from 'src/seeds/mongo';
import { Seed, SeedItem, SeedReference } from './seeder.dto';

@Injectable()
export class SeederService {
  private logger: Logger = new Logger('MongoSeeder');

  constructor(@InjectConnection() private connection: Connection) {}

  private async shouldSkipSeed(seed: Seed<any>): Promise<boolean> {
    try {
      const count = await this.connection.models[seed.model].countDocuments();
      if (count > 0) {
        this.logger.log(`Ignoring - ${seed.model} already exist`);
        return true;
      }
    } catch (error) {
      this.logger.error(
        `Failed - count ${seed.model} ${error.message || error}`,
      );
      return true;
    }
    return false;
  }

  private async cleanExistingData(seed: Seed<any>): Promise<boolean> {
    try {
      if (seed.action !== 'always') return false;
      if (seed.alwaysRule === 'truncate') {
        await this.connection.models[seed.model].collection.drop();
      } else {
        await this.connection.models[seed.model].collection.deleteMany({});
      }
      return true;
    } catch (error) {
      this.logger.error(
        `Failed - empty ${seed.model} ${error.message || error}`,
      );
      return false;
    }
  }

  private async resolveReferences(item: SeedItem<any>) {
    const body = { ...item };
    for (const key in item) {
      if (Object.prototype.hasOwnProperty.call(item, key)) {
        const value = item[key];
        if (value instanceof SeedReference) {
          try {
            const parent = await this.connection.models[value.model].findOne(
              value.where,
            );
            if (parent) body[key] = parent.id;
            else body[key] = null;
          } catch (error) {
            this.logger.warn(`Reference - error  ${error.message || error}`);
            body[key] = null;
          }
        }
      }
    }
    return body;
  }

  private async seedData(seed: Seed<any>) {
    this.logger.log(`Seeding ${seed.model}`);
    for (let index = 0; index < seed.data.length; index++) {
      const body = await this.resolveReferences(seed.data[index]);

      if (
        seed.action === 'always' &&
        (seed.alwaysRule === 'create' || seed.alwaysRule === 'update')
      ) {
        try {
          const record = await this.connection.models[seed.model].findOne(
            seed.alwaysWhere(body),
          );

          if (!record) {
            await this.connection.models[seed.model].create(body);
          } else if (seed.alwaysRule === 'update') {
            record.set(body);
            await record.save();
          }
        } catch (error) {
          this.logger.error(
            `Failed - seed ${seed.model} ${error.message || error}`,
          );
          this.logger.debug(body);
        }
      } else {
        try {
          await this.connection.models[seed.model].create(body);
        } catch (error) {
          this.logger.error(
            `Failed - seed ${seed.model} ${error.message || error}`,
          );
          this.logger.debug(body);
        }
      }
    }
    this.logger.log(`Seeded ${seed.model}`);
  }

  async seed() {
    this.logger.log('Started');
    for (let index = 0; index < seeds.length; index++) {
      const seed = seeds[index];
      this.logger.log(`Model: ${seed.model}`);
      if (typeof this.connection.models[seed.model] === 'undefined') {
        this.logger.log(`Ignoring - ${seed.model} model not available`);
        continue;
      }
      if (seed.action === 'never') {
        this.logger.log(`Ignoring - ${seed.model} not required`);
        continue;
      } else if (
        seed.action === 'once' ||
        (seed.action === 'always' &&
          (seed.alwaysRule === 'delete' || seed.alwaysRule === 'truncate'))
      ) {
        if (seed.action === 'once' && (await this.shouldSkipSeed(seed))) {
          continue;
        }

        if (seed.action === 'always') {
          const cleaned = await this.cleanExistingData(seed);
          if (!cleaned) {
            continue;
          }
        }

        await this.seedData(seed);
      } else if (
        seed.action === 'always' &&
        (seed.alwaysRule === 'create' || seed.alwaysRule === 'update')
      ) {
        if (!seed.alwaysWhere) {
          this.logger.error(
            `Failed - where condition missing for ${seed.model}`,
          );
          continue;
        }
        await this.seedData(seed);
      } else {
        this.logger.error(`Failed - Rule missing for ${seed.model}`);
        continue;
      }
    }
    this.logger.log('Completed');
  }
}
