import { PartialType, PickType } from '@nestjs/swagger';
import { State } from '../entities/state.entity';

export class UpdateStateDto extends PartialType(
  PickType(State, ['country_id', 'name', 'code'] as const),
) {}
