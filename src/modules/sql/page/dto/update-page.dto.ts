import { PartialType, PickType } from '@nestjs/swagger';
import { Page } from '../entities/page.entity';

export class UpdatePageDto extends PartialType(
  PickType(Page, ['title', 'content'] as const),
) {}
