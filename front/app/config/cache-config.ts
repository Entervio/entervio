/**
 * Cache Configuration
 * 
 * Adjust these values to control cache behavior across the application
 * 
 * Note: Cache expiry is checked "lazily" - expired entries are not automatically
 * removed, but are treated as cache misses when accessed. This prevents infinite
 * loops during hydration and keeps the implementation simple.
 */

export const CACHE_CONFIG = {
  /**
   * Time-To-Live (TTL) for job search results
   * After this duration, cached results are considered stale and will be refetched
   * 
   * Common values:
   * - 5 minutes:  5 * 60 * 1000
   * - 15 minutes: 15 * 60 * 1000
   * - 30 minutes: 30 * 60 * 1000
   * - 1 hour:     60 * 60 * 1000
   * - 2 hours:    2 * 60 * 60 * 1000
   * - 1 day:      24 * 60 * 60 * 1000
   */
  JOBS_CACHE_TTL: 60 * 60 * 1000, // 1 hour (default)

  /**
   * Maximum number of cached searches to keep
   * Oldest entries are removed when this limit is exceeded
   * Set to null for unlimited
   */
  MAX_CACHED_SEARCHES: 50,
} as const;

/**
 * Helper function to convert minutes to milliseconds
 */
export const minutesToMs = (minutes: number) => minutes * 60 * 1000;

/**
 * Helper function to convert hours to milliseconds
 */
export const hoursToMs = (hours: number) => hours * 60 * 60 * 1000;

/**
 * Helper function to convert days to milliseconds
 */
export const daysToMs = (days: number) => days * 24 * 60 * 60 * 1000;