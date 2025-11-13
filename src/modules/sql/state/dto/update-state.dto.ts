import { OmitType, PartialType } from '@nestjs/swagger';
import { State } from '../entities/state.entity';

export class UpdateStateDto extends PartialType(OmitType(State, [] as const)) {}
