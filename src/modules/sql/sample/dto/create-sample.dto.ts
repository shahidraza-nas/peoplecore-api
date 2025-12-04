import { PickType } from '@nestjs/swagger';
import { Sample } from '../entities/sample.entity';

export class CreateSampleDto extends PickType(Sample, ['name'] as const) {}
