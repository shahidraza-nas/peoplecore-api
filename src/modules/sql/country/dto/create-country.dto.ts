import { PickType } from '@nestjs/swagger';
import { Country } from '../entities/country.entity';

export class CreateCountryDto extends PickType(Country, [
  'name',
  'code',
] as const) {}
