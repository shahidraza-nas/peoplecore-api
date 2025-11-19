import { Seed } from '@core/sql/seeder/seeder.dto';
import { Newsfeed } from 'src/modules/sql/newsfeed/entities/newsfeed.entity';

const seed: Seed<Newsfeed> = {
    model: 'Newsfeed',
    action: 'once',
    data: [
        {
            title: 'Office Closed for Holidays',
            content: 'Our office will be closed from Dec 24 to Jan 2.',
            authorId: 1,
            pinned: true,
            published: true,
            tags: 'holiday,office',
            publishDate: '2025-12-20T09:00:00Z',
        },
        {
            title: 'New Project Launch',
            content: 'We are excited to announce the launch of Project Phoenix.',
            authorId: 1,
            pinned: false,
            published: true,
            tags: 'project,launch',
            publishDate: '2025-11-25T10:00:00Z',
        },
        {
            title: 'Quarterly Meeting',
            content: 'The quarterly meeting will be held on Jan 10 at 2 PM.',
            authorId: 1,
            pinned: false,
            published: false,
            tags: 'meeting,quarterly',
            publishDate: '2026-01-05T08:00:00Z',
        }
    ],
};
export default seed;
