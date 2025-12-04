import { PartialType, PickType } from '@nestjs/swagger';
import { Newsfeed } from '../entities/newsfeed.entity';

export class UpdateNewsfeedDto extends PartialType(
  PickType(Newsfeed, [
    'title',
    'content',
    'pinned',
    'publishDate',
    'published',
    'tags',
  ] as const),
) { }
