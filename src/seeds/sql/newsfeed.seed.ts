import { Seed } from '@core/sql/seeder/seeder.dto';
import { Newsfeed } from 'src/modules/sql/newsfeed/entities/newsfeed.entity';

const seed: Seed<Newsfeed> = {
    model: 'Newsfeed',
    action: 'once',
    data: [
        {
            uid: 'a926d382-6741-4d95-86cf-1f5c421cf654',
            created_by: 1,
            title: 'Office Closed for Holidays',
            content: 'Our office will be closed from Dec 24 to Jan 2.',
            pinned: true,
            published: true,
            tags: 'holiday,office',
            publishDate: '2025-12-20T09:00:00Z',
        },
        {
            uid: 'b926d382-6741-4d95-86cf-1f5c421cf655',
            created_by: 1,
            title: 'New Project Launch',
            content: 'We are excited to announce the launch of Project Phoenix.',
            pinned: false,
            published: true,
            tags: 'project,launch',
            publishDate: '2025-11-25T10:00:00Z',
        },
        {
            uid: 'c926d382-6741-4d95-86cf-1f5c421cf656',
            created_by: 1,
            title: 'Quarterly Meeting',
            content: 'The quarterly meeting will be held on Jan 10 at 2 PM.',
            pinned: false,
            published: false,
            tags: 'meeting,quarterly',
            publishDate: '2026-01-05T08:00:00Z',
        }
    ],
};
export default seed;
