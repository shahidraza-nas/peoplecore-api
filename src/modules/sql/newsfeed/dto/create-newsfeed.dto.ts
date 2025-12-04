import { PickType } from '@nestjs/swagger';
import { Newsfeed } from '../entities/newsfeed.entity';

export class CreateNewsfeedDto extends PickType(Newsfeed, [
  'title',
  'content',
  'pinned',
  'publishDate',
  'published',
  'tags',
] as const) {}
