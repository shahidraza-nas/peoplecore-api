import { ModelService, SearchFields, SqlService } from '@core/sql';
import { Injectable } from '@nestjs/common';
import { Sample } from './entities/sample.entity';

@Injectable()
export class SampleService extends ModelService<Sample> {
  /**
   * searchFields
   * @property array of fields to include in search
   */
  searchFields: SearchFields<Sample> = ['name'];

  constructor(db: SqlService<Sample>) {
    super(db);
  }
}
