/**
 * Data Masking Utility
 *
 * Implements OWASP-compliant sensitive data masking to prevent:
 * - Password leakage
 * - Token exposure
 * - API key disclosure
 * - PII (Personally Identifiable Information) leakage
 *
 * Follows security best practices:
 * - Consistent masking patterns
 * - Configurable masking strategies
 * - Deep object traversal
 * - Array handling
 */

export type MaskingStrategy = 'full' | 'partial' | 'hash';

export interface MaskingConfig {
  strategy?: MaskingStrategy;
  visibleChars?: number; // For partial masking
  maskChar?: string;
}

/**
 * Default sensitive field patterns (case-insensitive)
 * Based on OWASP recommendations and common field names
 */
const SENSITIVE_FIELD_PATTERNS = [
  // Authentication & Authorization
  'password',
  'passwd',
  'pwd',
  'token',
  'accessToken',
  'refreshToken',
  'authToken',
  'bearer',
  'authorization',
  'apiKey',
  'apikey',
  'secret',
  'secretKey',
  'privateKey',
  'publicKey',
  'sessionId',
  'session',
  'cookie',

  // Financial Information
  'creditCard',
  'creditcard',
  'cardNumber',
  'cvv',
  'cvc',
  'pin',
  'ssn',
  'socialSecurityNumber',

  // Personal Identifiable Information (PII)
  'email',
  'phone',
  'phoneNumber',
  'mobile',
  'address',
  'streetAddress',
  'postalCode',
  'zipCode',
  'dateOfBirth',
  'dob',
  'nationalId',
  'passport',
  'driversLicense',

  // Database & Connection Strings
  'connectionString',
  'connectionstring',
  'dbPassword',
  'databasePassword',
  'dbUrl',
  'databaseUrl',

  // OAuth & OIDC
  'clientSecret',
  'clientId',
  'oauthToken',
  'idToken',
];

/**
 * Mask a string value based on strategy
 */
function maskValue(value: string, config: MaskingConfig = {}): string {
  const { strategy = 'full', visibleChars = 4, maskChar = '*' } = config;

  if (!value || value.length === 0) {
    return value;
  }

  switch (strategy) {
    case 'full': {
      // Full masking: replace all characters
      return maskChar.repeat(Math.min(value.length, 20)); // Max 20 chars for readability
    }

    case 'partial': {
      // Partial masking: show first N and last N characters
      if (value.length <= visibleChars * 2) {
        return maskChar.repeat(value.length);
      }
      const start = value.substring(0, visibleChars);
      const end = value.substring(value.length - visibleChars);
      const middle = maskChar.repeat(
        Math.max(0, value.length - visibleChars * 2),
      );
      return `${start}${middle}${end}`;
    }

    case 'hash': {
      // Hash-based masking (simple hash for demonstration)
      // In production, consider using crypto.createHash
      const hash = value.split('').reduce((acc, char) => {
        return (acc << 5) - acc + char.charCodeAt(0);
      }, 0);
      return `[HASH:${Math.abs(hash).toString(36)}]`;
    }

    default:
      return maskChar.repeat(Math.min(value.length, 20));
  }
}

/**
 * Check if a field name matches sensitive patterns
 */
function isSensitiveField(fieldName: string): boolean {
  const lowerField = fieldName.toLowerCase();
  return SENSITIVE_FIELD_PATTERNS.some((pattern) =>
    lowerField.includes(pattern.toLowerCase()),
  );
}

/**
 * Recursively mask sensitive data in an object
 *
 * @param obj - Object to mask
 * @param config - Masking configuration
 * @param depth - Current recursion depth (prevents infinite loops)
 * @param seen - Set of seen objects (for circular reference detection)
 */
export function maskSensitiveData(
  obj: any,
  config: MaskingConfig = {},
  depth: number = 0,
  seen: WeakSet<object> = new WeakSet(),
): any {
  // Prevent infinite recursion
  if (depth > 10) {
    return '[MAX_DEPTH_REACHED]';
  }

  // Handle null/undefined
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle primitives
  if (typeof obj !== 'object') {
    return obj;
  }

  // Handle Date objects
  if (obj instanceof Date) {
    return obj;
  }

  // Handle circular references
  if (typeof obj === 'object' && seen.has(obj)) {
    return '[CIRCULAR_REFERENCE]';
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    seen.add(obj);
    return obj.map((item) => maskSensitiveData(item, config, depth + 1, seen));
  }

  // Handle objects
  seen.add(obj);
  const masked: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Check if field name is sensitive
    if (isSensitiveField(key)) {
      if (typeof value === 'string') {
        masked[key] = maskValue(value, config);
      } else if (value !== null && value !== undefined) {
        // For non-string sensitive values, still mask but indicate type
        masked[key] = '[REDACTED]';
      } else {
        masked[key] = value;
      }
    } else if (typeof value === 'object' && value !== null) {
      // Recursively mask nested objects
      masked[key] = maskSensitiveData(value, config, depth + 1, seen);
    } else {
      // Keep non-sensitive primitive values as-is
      masked[key] = value;
    }
  }

  return masked;
}

/**
 * Mask sensitive data in a string (for log messages)
 * Attempts to detect and mask sensitive patterns in plain text
 */
export function maskSensitiveString(
  text: string,
  config: MaskingConfig = {},
): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  // Patterns to detect sensitive data in strings
  const patterns = [
    // JWT tokens
    /(Bearer\s+)([A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+)/gi,
    // API keys (alphanumeric strings longer than 20 chars)
    /(api[_-]?key[=:]\s*)([A-Za-z0-9]{20,})/gi,
    // Passwords in URLs or strings
    /(password[=:]\s*)([^\s&]+)/gi,
    // Email addresses (optional - can be configured)
    /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
  ];

  let masked = text;

  patterns.forEach((pattern) => {
    masked = masked.replace(pattern, (match, prefix, value) => {
      if (pattern === patterns[3]) {
        // Email masking: show first char and domain
        const [localPart, domain] = value.split('@');
        if (localPart && domain) {
          const maskedLocal =
            localPart[0] + '*'.repeat(Math.max(0, localPart.length - 1));
          return `${maskedLocal}@${domain}`;
        }
      }
      return prefix + maskValue(value, config);
    });
  });

  return masked;
}

/**
 * Create a masking function with predefined configuration
 */
export function createMasker(config: MaskingConfig = {}) {
  return {
    mask: (data: any) => maskSensitiveData(data, config),
    maskString: (text: string) => maskSensitiveString(text, config),
  };
}
