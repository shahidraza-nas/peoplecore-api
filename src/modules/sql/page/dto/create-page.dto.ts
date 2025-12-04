import { PickType } from '@nestjs/swagger';
import { Page } from '../entities/page.entity';

export class CreatePageDto extends PickType(Page, [
  'name',
  'title',
  'content',
  'allow_html',
] as const) {}
