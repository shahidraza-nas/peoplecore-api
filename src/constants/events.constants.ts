/**
 * Application Event Queue Names
 * These constants define the microservice queue patterns for background job processing
 * Format: 'controller.{service-name}' for service-based queues
 */
export const APPEVENTS = {
  USER: 'controller.user',
  CHAT: 'controller.chat',
  MESSAGE: 'controller.message',
  SOCKET: 'controller.socket-event',
  NOTIFICATION: 'controller.notification',
  EMAIL: 'controller.email',
  FIREBASE_NOTIFICATION: 'controller.firebase-notification',
  TWILIO: 'controller.twilio',
  PAYMENT: 'controller.payment',
  SUBSCRIPTION: 'controller.subscription',
} as const;

export type AppEventType = (typeof APPEVENTS)[keyof typeof APPEVENTS];
