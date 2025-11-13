import { OmitType, PartialType } from '@nestjs/swagger';
import { Page } from '../entities/page.entity';

export class UpdatePageDto extends PartialType(
  OmitType(Page, ['name', 'allow_html'] as const),
) {}
