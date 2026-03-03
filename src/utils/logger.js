/**
 * Simple logging utility
 * Provides controlled logging that can be easily disabled in production
 */

// Set to false to disable debug logs in production
const DEBUG_ENABLED = import.meta.env.DEV || false;

const logger = {
  /**
   * Debug log - only shows in development
   */
  debug: (...args) => {
    if (DEBUG_ENABLED) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Info log - shows in all environments
   */
  info: (...args) => {
    console.log('[INFO]', ...args);
  },

  /**
   * Warning log - shows in all environments
   */
  warn: (...args) => {
    console.warn('[WARN]', ...args);
  },

  /**
   * Error log - shows in all environments
   */
  error: (...args) => {
    console.error('[ERROR]', ...args);
  },
};

export default logger;

