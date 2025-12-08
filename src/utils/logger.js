/**
 * Production-Safe Logger Utility
 *
 * This logger automatically disables debug logging in production builds
 * while preserving error and warning logs for debugging production issues.
 *
 * Usage:
 *   import { logger } from '../utils/logger';
 *   logger.log('Debug info');      // Only in development
 *   logger.error('Error occurred'); // Always logged
 *   logger.warn('Warning');         // Only in development
 *
 * Replace all console.log with logger.log throughout the codebase
 */

// Check if running in development mode
const __DEV__ = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

/**
 * Environment-aware logger
 * - Development: All logs enabled
 * - Production: Only errors logged (warnings and debug logs suppressed)
 */
export const logger = {
  /**
   * Debug logging - Only enabled in development
   * Use for general debugging, flow tracking, and non-critical information
   * @param {...any} args - Arguments to log
   */
  log: (...args) => {
    if (__DEV__) {
      console.log(...args);
    }
  },

  /**
   * Error logging - Always enabled
   * Use for errors that need to be tracked in production
   * @param {...any} args - Arguments to log
   */
  error: (...args) => {
    // Always log errors, even in production
    console.error(...args);

    // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
    // if (!__DEV__) {
    //   sendToErrorTracker('error', ...args);
    // }
  },

  /**
   * Warning logging - Only enabled in development
   * Use for deprecated features, potential issues, etc.
   * @param {...any} args - Arguments to log
   */
  warn: (...args) => {
    if (__DEV__) {
      console.warn(...args);
    }
  },

  /**
   * Info logging - Only enabled in development
   * Use for important information that's not an error
   * @param {...any} args - Arguments to log
   */
  info: (...args) => {
    if (__DEV__) {
      console.info(...args);
    }
  },

  /**
   * Table logging - Only enabled in development
   * Use for displaying arrays/objects in table format
   * @param {any} data - Data to display in table format
   */
  table: (data) => {
    if (__DEV__ && console.table) {
      console.table(data);
    }
  },

  /**
   * Group logging - Only enabled in development
   * Use for grouping related logs
   * @param {string} label - Group label
   */
  group: (label) => {
    if (__DEV__ && console.group) {
      console.group(label);
    }
  },

  /**
   * End group logging - Only enabled in development
   */
  groupEnd: () => {
    if (__DEV__ && console.groupEnd) {
      console.groupEnd();
    }
  },

  /**
   * Collapsed group logging - Only enabled in development
   * @param {string} label - Group label
   */
  groupCollapsed: (label) => {
    if (__DEV__ && console.groupCollapsed) {
      console.groupCollapsed(label);
    }
  },
};

/**
 * Network request logger
 * Logs API requests in development, silent in production
 * @param {string} method - HTTP method
 * @param {string} url - Request URL
 * @param {object} data - Request data
 * @param {object} response - Response data
 */
export const logRequest = (method, url, data = null, response = null) => {
  if (__DEV__) {
    logger.group(`🌐 ${method} ${url}`);
    if (data) logger.log('📤 Request:', data);
    if (response) logger.log('📥 Response:', response);
    logger.groupEnd();
  }
};

/**
 * Performance logger
 * Measures and logs execution time in development
 * @param {string} label - Performance label
 * @param {Function} fn - Function to measure
 */
export const logPerformance = async (label, fn) => {
  if (__DEV__) {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    logger.log(`⏱️ ${label}: ${(end - start).toFixed(2)}ms`);
    return result;
  }
  return await fn();
};

/**
 * Analytics event logger
 * Logs user actions for analytics (integrate with service)
 * @param {string} event - Event name
 * @param {object} properties - Event properties
 */
export const logEvent = (event, properties = {}) => {
  if (__DEV__) {
    logger.log(`📊 Analytics Event: ${event}`, properties);
  }

  // TODO: Integrate with analytics service
  // trackEvent(event, properties);
};

/**
 * User action logger for debugging user flows
 * @param {string} action - User action description
 * @param {object} context - Additional context
 */
export const logUserAction = (action, context = {}) => {
  if (__DEV__) {
    logger.log(`👤 User Action: ${action}`, context);
  }
};

/**
 * Navigation logger for debugging navigation issues
 * @param {string} from - Previous screen
 * @param {string} to - Next screen
 * @param {object} params - Navigation params
 */
export const logNavigation = (from, to, params = {}) => {
  if (__DEV__) {
    logger.log(`🧭 Navigation: ${from} → ${to}`, params);
  }
};

/**
 * Database operation logger
 * @param {string} operation - DB operation (SELECT, INSERT, UPDATE, DELETE)
 * @param {string} table - Table name
 * @param {object} details - Operation details
 */
export const logDatabase = (operation, table, details = {}) => {
  if (__DEV__) {
    logger.log(`💾 DB ${operation} on ${table}`, details);
  }
};

export default logger;
