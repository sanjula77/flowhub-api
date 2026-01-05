import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import { format } from 'winston';
import {
  maskSensitiveData,
  maskSensitiveString,
} from '../utils/data-masking.util';

/**
 * Production-grade Winston logger configuration
 *
 * Features:
 * - JSON formatted logs for structured logging
 * - Environment-based log levels
 * - Async, non-blocking logging
 * - OWASP-compliant sensitive data masking
 * - Separate transports for console and file
 */
export const loggerConfig: WinstonModuleOptions = {
  level:
    process.env.LOG_LEVEL ||
    (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    format.errors({ stack: true }),
    format.json(),
    // Custom format to mask sensitive data
    format((info) => {
      // Mask sensitive data in message string
      if (info.message && typeof info.message === 'string') {
        info.message = maskSensitiveString(info.message, {
          strategy:
            process.env.MASKING_STRATEGY === 'partial' ? 'partial' : 'full',
        });
      }

      // Mask sensitive data in all metadata fields
      if (info.metadata) {
        info.metadata = maskSensitiveData(info.metadata, {
          strategy:
            process.env.MASKING_STRATEGY === 'partial' ? 'partial' : 'full',
        });
      }

      // Mask sensitive data in context
      if (info.context && typeof info.context === 'object') {
        info.context = maskSensitiveData(info.context, {
          strategy:
            process.env.MASKING_STRATEGY === 'partial' ? 'partial' : 'full',
        });
      }

      // Mask sensitive data in error objects
      if (info.error && typeof info.error === 'object') {
        info.error = maskSensitiveData(info.error, {
          strategy:
            process.env.MASKING_STRATEGY === 'partial' ? 'partial' : 'full',
        });
      }

      // Mask sensitive data in stack traces (optional - can be disabled for debugging)
      if (
        info.stack &&
        typeof info.stack === 'string' &&
        process.env.MASK_STACK_TRACES !== 'false'
      ) {
        info.stack = maskSensitiveString(info.stack, {
          strategy: 'full',
        });
      }

      // Mask any other top-level sensitive fields
      const maskedInfo: any = { ...info };
      for (const [key, value] of Object.entries(info)) {
        if (
          typeof value === 'object' &&
          value !== null &&
          !['timestamp', 'level', 'message'].includes(key)
        ) {
          maskedInfo[key] = maskSensitiveData(value, {
            strategy:
              process.env.MASKING_STRATEGY === 'partial' ? 'partial' : 'full',
          });
        }
      }

      return maskedInfo;
    })(),
  ),
  transports: [
    // Console transport with colorized output for development
    new winston.transports.Console({
      format:
        process.env.NODE_ENV === 'production'
          ? format.combine(format.json(), format.timestamp())
          : format.combine(
              format.colorize(),
              format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
              format.printf(
                ({
                  timestamp,
                  level,
                  message,
                  context,
                  requestId,
                  ...meta
                }) => {
                  const contextStr = context
                    ? `[${typeof context === 'string' ? context : JSON.stringify(context)}]`
                    : '';
                  const requestIdStr = requestId
                    ? `[${typeof requestId === 'string' ? requestId : JSON.stringify(requestId)}]`
                    : '';
                  const metaStr = Object.keys(meta).length
                    ? JSON.stringify(meta, null, 2)
                    : '';
                  const messageStr =
                    typeof message === 'string' ? message : String(message);
                  const levelStr =
                    typeof level === 'string' ? level : String(level);
                  const timestampStr =
                    typeof timestamp === 'string'
                      ? timestamp
                      : String(timestamp);
                  return `${timestampStr} ${levelStr} ${contextStr} ${requestIdStr} ${messageStr} ${metaStr}`;
                },
              ),
            ),
    }),
    // File transport for production (optional)
    ...(process.env.NODE_ENV === 'production' && process.env.LOG_FILE_PATH
      ? [
          new winston.transports.File({
            filename: process.env.LOG_FILE_PATH,
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            format: format.combine(format.timestamp(), format.json()),
          }),
        ]
      : []),
  ],
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.Console({
      format: format.combine(format.timestamp(), format.json()),
    }),
  ],
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.Console({
      format: format.combine(format.timestamp(), format.json()),
    }),
  ],
  // Exit on error (set to false in production for graceful shutdown)
  exitOnError: false,
};
