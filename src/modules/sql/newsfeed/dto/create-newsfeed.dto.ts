import { OmitType } from '@nestjs/swagger';
import { Newsfeed } from '../entities/newsfeed.entity';

export class CreateNewsfeedDto extends OmitType(Newsfeed, ['active'] as const) {}
