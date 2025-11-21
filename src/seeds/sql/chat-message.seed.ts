import { Seed } from '@core/sql/seeder/seeder.dto';
import { ChatMessage } from '../../modules/sql/chat-message/entities/chat-message.entity';

const seed: Seed<Partial<ChatMessage>> = {
  model: 'ChatMessage',
  action: 'once',
  data: [
    // Chat 1: Admin (1) <-> Shahid (9) - Work discussion
    {
      chatId: 1,
      fromUserId: 1,
      toUserId: 9,
      message: 'Hey Shahid, how is the PeopleCore project coming along?',
      isRead: true,
    },
    {
      chatId: 1,
      fromUserId: 9,
      toUserId: 1,
      message: 'Going well! Just finished implementing the chat feature with real-time messaging.',
      isRead: true,
    },
    {
      chatId: 1,
      fromUserId: 1,
      toUserId: 9,
      message: 'Great! Can you show me a demo later today?',
      isRead: true,
    },
    {
      chatId: 1,
      fromUserId: 9,
      toUserId: 1,
      message: 'Sure, I\'ll schedule a meeting for 3 PM.',
      isRead: true,
    },

    // Chat 2: Admin (1) <-> Reed (12) - Onboarding
    {
      chatId: 2,
      fromUserId: 1,
      toUserId: 12,
      message: 'Welcome to the team, Reed! Hope you had a good first day.',
      isRead: true,
    },
    {
      chatId: 2,
      fromUserId: 12,
      toUserId: 1,
      message: 'Thank you! Everyone has been very welcoming.',
      isRead: true,
    },
    {
      chatId: 2,
      fromUserId: 1,
      toUserId: 12,
      message: 'Do you have any questions about the project structure?',
      isRead: true,
    },
    {
      chatId: 2,
      fromUserId: 12,
      toUserId: 1,
      message: 'Yes, I\'m trying to understand the dual database architecture. Could we discuss it tomorrow?',
      isRead: true,
    },

    // Chat 3: Shahid (9) <-> Test User (2) - Testing
    {
      chatId: 3,
      fromUserId: 9,
      toUserId: 2,
      message: 'Hi! Testing the chat functionality.',
      isRead: true,
    },
    {
      chatId: 3,
      fromUserId: 2,
      toUserId: 9,
      message: 'Test message received. Everything looks good!',
      isRead: true,
    },
    {
      chatId: 3,
      fromUserId: 9,
      toUserId: 2,
      message: 'Perfect! Let me know if you notice any issues.',
      isRead: true,
    },

    // Chat 4: Shahid (9) <-> Reed (12) - Technical discussion
    {
      chatId: 4,
      fromUserId: 9,
      toUserId: 12,
      message: 'Hey Reed, have you worked with NestJS before?',
      isRead: true,
    },
    {
      chatId: 4,
      fromUserId: 12,
      toUserId: 9,
      message: 'Yes, I used it in my previous project. Really enjoying the framework!',
      isRead: true,
    },
    {
      chatId: 4,
      fromUserId: 9,
      toUserId: 12,
      message: 'Awesome! If you need any help with the @newagesmb/api-cli patterns, just let me know.',
      isRead: true,
    },
    {
      chatId: 4,
      fromUserId: 12,
      toUserId: 9,
      message: 'Thanks! I\'ll definitely reach out. The custom decorators are interesting.',
      isRead: true,
    },

    // Chat 5: Admin (1) <-> Test User (2) - System check
    {
      chatId: 5,
      fromUserId: 1,
      toUserId: 2,
      message: 'Running a system health check. Please confirm you can receive this.',
      isRead: true,
    },
    {
      chatId: 5,
      fromUserId: 2,
      toUserId: 1,
      message: 'Confirmed! All systems operational.',
      isRead: true,
    },

    // Chat 6: Reed (12) <-> Gretchen (13) - Casual conversation
    {
      chatId: 6,
      fromUserId: 12,
      toUserId: 13,
      message: 'Hi Gretchen! Are you joining the team meeting tomorrow?',
      isRead: true,
    },
    {
      chatId: 6,
      fromUserId: 13,
      toUserId: 12,
      message: 'Yes, I\'ll be there. Looking forward to it!',
      isRead: true,
    },
    {
      chatId: 6,
      fromUserId: 12,
      toUserId: 13,
      message: 'Great! See you then.',
      isRead: true,
    },
  ],
};

export default seed;
