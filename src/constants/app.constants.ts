/**
 * Application-wide configuration constants
 * These values are used throughout the application for business logic
 */
export const APPCONFIGS = {
  /**
   * Admin email for system notifications and support
   */
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@peoplecore.com',
  
  /**
   * Admin name for display purposes
   */
  ADMIN_NAME: process.env.ADMIN_NAME || 'PeopleCore Admin',
  
  /**
   * Minimum age limit for app usage (GDPR/COPPA compliance)
   */
  AGE_LIMIT_APP_USAGE: 18,
  
  /**
   * Trial period duration in days for premium features
   */
  TRIAL_PERIOD_DAYS: 7,
  
  /**
   * Maximum file upload size in bytes (5MB)
   */
  MAX_UPLOAD_SIZE: 5 * 1024 * 1024,
  
  /**
   * Default pagination limit
   */
  DEFAULT_PAGE_LIMIT: 10,
  
  /**
   * Maximum pagination limit
   */
  MAX_PAGE_LIMIT: 100,
} as const;

export type AppConfigKey = keyof typeof APPCONFIGS;
