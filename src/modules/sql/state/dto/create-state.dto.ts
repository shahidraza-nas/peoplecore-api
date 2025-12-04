import { PickType } from '@nestjs/swagger';
import { State } from '../entities/state.entity';

export class CreateStateDto extends PickType(State, [
  'country_id',
  'name',
  'code',
] as const) {}
