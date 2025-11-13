import { ModelService, SearchFields, SqlService } from '@core/sql';
import { Injectable } from '@nestjs/common';
import { Country } from './entities/country.entity';

@Injectable()
export class CountryService extends ModelService<Country> {
  /**
   * searchFields
   * @property array of fields to include in search
   */
  searchFields: SearchFields<Country> = ['name'];

  constructor(db: SqlService<Country>) {
    super(db);
  }
}
