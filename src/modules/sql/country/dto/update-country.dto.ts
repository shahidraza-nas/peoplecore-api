import { PartialType, PickType } from '@nestjs/swagger';
import { Country } from '../entities/country.entity';

export class UpdateCountryDto extends PartialType(
  PickType(Country, ['name', 'code'] as const),
) {}
