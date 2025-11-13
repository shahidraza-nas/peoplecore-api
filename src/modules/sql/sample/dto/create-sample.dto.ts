import { OmitType } from '@nestjs/swagger';
import { Sample } from '../entities/sample.entity';

export class CreateSampleDto extends OmitType(Sample, ['active'] as const) {}
