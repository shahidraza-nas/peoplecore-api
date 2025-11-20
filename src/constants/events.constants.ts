// Application Event Queue Names
export const APPEVENTS = {
  USER: 'USER',
  CHAT: 'CHAT',
  MESSAGE: 'MESSAGE',
  SOCKET: 'SOCKET',
  NOTIFICATION: 'NOTIFICATION',
  FIREBASE_NOTIFICATION: 'controller.firebase-notification',
  EMAIL: 'EMAIL',
} as const;

export type AppEventType = (typeof APPEVENTS)[keyof typeof APPEVENTS];
