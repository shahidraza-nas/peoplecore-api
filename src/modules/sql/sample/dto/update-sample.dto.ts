import { OmitType, PartialType } from '@nestjs/swagger';
import { Sample } from '../entities/sample.entity';

export class UpdateSampleDto extends PartialType(
  OmitType(Sample, [] as const),
) {}
