export enum AppEngine {
  SQL = 'sql',
  Mongo = 'mongo',
}

export enum SqlDialect {
  MySQL = 'mysql',
  Postgres = 'postgres',
}

/**
 * @variable {AppEngine} defaultEngine
 * Default engine
 * @default sql
 */
export const defaultEngine: AppEngine =
  (process.env.APP_ENGINE as AppEngine) || AppEngine.SQL;

/**
 * @variable {SqlDialect} sqlDialect
 * Default sql dialect
 * @default postgres
 */
export const sqlDialect: SqlDialect = SqlDialect.Postgres;

/**
 * @variable {string} APP_NAME
 * Name of the application
 */
export const APP_NAME = 'NewAgeSmb Core Framework';

/**
 * @variable {number} APP_VERSION
 * Latest version of the application
 * @default 1
 */
export const APP_VERSION = 1;

/**
 * @variable {number} APP_MIN_VERSION
 * Minimum supported version of the application
 * @default 1
 */
export const APP_MIN_VERSION = 1;
