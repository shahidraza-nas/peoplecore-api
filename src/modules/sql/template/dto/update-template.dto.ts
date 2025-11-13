import { OmitType, PartialType } from '@nestjs/swagger';
import { Template } from '../entities/template.entity';

export class UpdateTemplateDto extends PartialType(
  OmitType(Template, ['name', 'active'] as const),
) {}
