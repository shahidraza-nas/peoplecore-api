import { ModelService, SearchFields, SqlService } from '@core/sql';
import { Injectable } from '@nestjs/common';
import { Template } from './entities/template.entity';

@Injectable()
export class TemplateService extends ModelService<Template> {
  /**
   * searchFields
   * @property array of fields to include in search
   */
  searchFields: SearchFields<Template> = ['name', 'title'];

  constructor(db: SqlService<Template>) {
    super(db);
  }
}
