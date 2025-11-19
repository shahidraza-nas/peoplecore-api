import { OmitType, PartialType } from '@nestjs/swagger';
import { Newsfeed } from '../entities/newsfeed.entity';

export class UpdateNewsfeedDto extends PartialType(
  OmitType(Newsfeed, [] as const),
) {}
