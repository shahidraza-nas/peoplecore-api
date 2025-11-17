import { Seed } from '@core/sql/seeder/seeder.dto';
import { Chat } from '../../modules/sql/chat/entities/chat.entity';

const seed: Seed<Partial<Chat>> = {
  model: 'Chat',
  action: 'once',
  data: [
    {
      // Chat 1: Admin (1) <-> Shahid (9)
      user1Id: 1,
      user2Id: 9,
    },
    {
      // Chat 2: Admin (1) <-> Reed (12)
      user1Id: 1,
      user2Id: 12,
    },
    {
      // Chat 3: Shahid (9) <-> Test User (2)
      user1Id: 9,
      user2Id: 2,
    },
    {
      // Chat 4: Shahid (9) <-> Reed (12)
      user1Id: 9,
      user2Id: 12,
    },
    {
      // Chat 5: Admin (1) <-> Test User (2)
      user1Id: 1,
      user2Id: 2,
    },
    {
      // Chat 6: Reed (12) <-> Gretchen (13)
      user1Id: 12,
      user2Id: 13,
    },
  ],
};

export default seed;
