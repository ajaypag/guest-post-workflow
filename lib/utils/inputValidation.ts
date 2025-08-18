/**
 * Input validation and sanitization utilities
 * Prevents XSS, SQL injection, and other malicious inputs
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(input: string): string {
  if (!input) return '';
  
  // Configure DOMPurify to be strict
  const clean = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target'],
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    SAFE_FOR_TEMPLATES: true
  });
  
  return clean;
}

/**
 * Sanitize plain text input (remove all HTML/scripts)
 */
export function sanitizeText(input: string): string {
  if (!input) return '';
  
  // Remove all HTML tags and scripts
  const text = DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true 
  });
  
  // Additional cleanup for common attack patterns
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/[<>]/g, ''); // Remove any remaining angle brackets
}

/**
 * Validate and sanitize domain input
 */
export function validateDomain(domain: string): { valid: boolean; sanitized: string; error?: string } {
  if (!domain) {
    return { valid: false, sanitized: '', error: 'Domain is required' };
  }
  
  // Remove dangerous characters and whitespace
  let sanitized = domain.trim().toLowerCase();
  
  // Check for malicious patterns
  const dangerousPatterns = [
    /javascript:/i,
    /data:/i,
    /vbscript:/i,
    /file:/i,
    /<script/i,
    /onclick/i,
    /onerror/i,
    /';/,
    /--/,
    /\/\*/,
    /\*\//,
    /union.*select/i,
    /drop.*table/i,
    /insert.*into/i,
    /update.*set/i
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(sanitized)) {
      return { 
        valid: false, 
        sanitized: '', 
        error: 'Domain contains invalid characters or patterns' 
      };
    }
  }
  
  // Remove protocol if present
  sanitized = sanitized.replace(/^(https?:\/\/)?(www\.)?/, '');
  
  // Remove trailing slash and path
  sanitized = sanitized.split('/')[0];
  
  // Remove port if present
  sanitized = sanitized.split(':')[0];
  
  // Validate domain format
  const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/;
  
  if (!domainRegex.test(sanitized)) {
    return { 
      valid: false, 
      sanitized: '', 
      error: 'Invalid domain format' 
    };
  }
  
  // Check length limits
  if (sanitized.length > 253) {
    return { 
      valid: false, 
      sanitized: '', 
      error: 'Domain name too long (max 253 characters)' 
    };
  }
  
  // Check each label length
  const labels = sanitized.split('.');
  for (const label of labels) {
    if (label.length > 63) {
      return { 
        valid: false, 
        sanitized: '', 
        error: 'Domain label too long (max 63 characters per label)' 
      };
    }
  }
  
  return { valid: true, sanitized };
}

/**
 * Validate and sanitize price input
 */
export function validatePrice(price: string | number): { valid: boolean; sanitized: number; error?: string } {
  // Convert to string for validation
  const priceStr = String(price);
  
  // Check for dangerous patterns
  if (/[<>'"`;]/.test(priceStr)) {
    return { valid: false, sanitized: 0, error: 'Price contains invalid characters' };
  }
  
  // Check for special JavaScript values
  if (priceStr === 'Infinity' || priceStr === '-Infinity' || priceStr === 'NaN') {
    return { valid: false, sanitized: 0, error: 'Invalid price value' };
  }
  
  // Check for hex/octal notation
  if (/^0x|^0o|^0b/i.test(priceStr)) {
    return { valid: false, sanitized: 0, error: 'Invalid number format' };
  }
  
  // Parse as float
  const parsed = parseFloat(priceStr);
  
  // Check if valid number
  if (isNaN(parsed)) {
    return { valid: false, sanitized: 0, error: 'Price must be a valid number' };
  }
  
  // Check if negative
  if (parsed < 0) {
    return { valid: false, sanitized: 0, error: 'Price cannot be negative' };
  }
  
  // Check if too large
  if (parsed > 1000000) {
    return { valid: false, sanitized: 0, error: 'Price exceeds maximum allowed value' };
  }
  
  // Round to 2 decimal places (cents)
  const sanitized = Math.round(parsed * 100) / 100;
  
  return { valid: true, sanitized };
}

/**
 * Validate input length to prevent buffer overflow
 */
export function validateLength(input: string, maxLength: number, fieldName: string): { valid: boolean; error?: string } {
  if (!input) {
    return { valid: true }; // Empty is valid (use separate required validation)
  }
  
  if (input.length > maxLength) {
    return { 
      valid: false, 
      error: `${fieldName} exceeds maximum length of ${maxLength} characters` 
    };
  }
  
  // Check for null bytes which can cause issues
  if (input.includes('\0')) {
    return { 
      valid: false, 
      error: `${fieldName} contains invalid null characters` 
    };
  }
  
  return { valid: true };
}

/**
 * Validate email format and sanitize
 */
export function validateEmail(email: string): { valid: boolean; sanitized: string; error?: string } {
  if (!email) {
    return { valid: false, sanitized: '', error: 'Email is required' };
  }
  
  // Sanitize and lowercase
  const sanitized = sanitizeText(email).trim().toLowerCase();
  
  // Check length
  if (sanitized.length > 254) {
    return { valid: false, sanitized: '', error: 'Email too long' };
  }
  
  // Validate format
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
  
  if (!emailRegex.test(sanitized)) {
    return { valid: false, sanitized: '', error: 'Invalid email format' };
  }
  
  return { valid: true, sanitized };
}

/**
 * Validate and sanitize JSON input
 */
export function validateJson(input: string): { valid: boolean; parsed: any; error?: string } {
  if (!input) {
    return { valid: false, parsed: null, error: 'JSON input is required' };
  }
  
  try {
    // Check for dangerous patterns before parsing
    if (/<script|javascript:|on\w+=/i.test(input)) {
      return { valid: false, parsed: null, error: 'JSON contains potentially dangerous content' };
    }
    
    const parsed = JSON.parse(input);
    
    // Recursively sanitize string values in the parsed object
    const sanitizeObject = (obj: any): any => {
      if (typeof obj === 'string') {
        return sanitizeText(obj);
      }
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }
      if (obj && typeof obj === 'object') {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          // Sanitize the key as well
          const sanitizedKey = sanitizeText(key);
          sanitized[sanitizedKey] = sanitizeObject(value);
        }
        return sanitized;
      }
      return obj;
    };
    
    const sanitized = sanitizeObject(parsed);
    
    return { valid: true, parsed: sanitized };
  } catch (error) {
    return { valid: false, parsed: null, error: 'Invalid JSON format' };
  }
}

/**
 * Check for SQL injection patterns
 */
export function containsSqlInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|FROM|WHERE|JOIN|ORDER BY|GROUP BY|HAVING)\b)/i,
    /(--|#|\/\*|\*\/)/,
    /('|")\s*(OR|AND)\s*('|")?(\s*=\s*|[0-9])/i,
    /\bWAITFOR\s+DELAY\b/i,
    /\bSLEEP\s*\(/i,
    /\bBENCHMARK\s*\(/i
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Main validation function that combines all checks
 */
export function validateInput(
  input: string,
  type: 'text' | 'html' | 'domain' | 'email' | 'price' | 'json',
  options: {
    required?: boolean;
    maxLength?: number;
    fieldName?: string;
  } = {}
): { valid: boolean; sanitized: any; errors: string[] } {
  const errors: string[] = [];
  
  // Check if required
  if (options.required && !input) {
    errors.push(`${options.fieldName || 'Field'} is required`);
    return { valid: false, sanitized: '', errors };
  }
  
  // Check for SQL injection
  if (containsSqlInjection(input)) {
    errors.push('Input contains potentially dangerous SQL patterns');
    return { valid: false, sanitized: '', errors };
  }
  
  // Type-specific validation
  let result: any;
  
  switch (type) {
    case 'text':
      result = { sanitized: sanitizeText(input), valid: true };
      break;
      
    case 'html':
      result = { sanitized: sanitizeHtml(input), valid: true };
      break;
      
    case 'domain':
      const domainResult = validateDomain(input);
      if (!domainResult.valid && domainResult.error) {
        errors.push(domainResult.error);
      }
      result = domainResult;
      break;
      
    case 'email':
      const emailResult = validateEmail(input);
      if (!emailResult.valid && emailResult.error) {
        errors.push(emailResult.error);
      }
      result = emailResult;
      break;
      
    case 'price':
      const priceResult = validatePrice(input);
      if (!priceResult.valid && priceResult.error) {
        errors.push(priceResult.error);
      }
      result = priceResult;
      break;
      
    case 'json':
      const jsonResult = validateJson(input);
      if (!jsonResult.valid && jsonResult.error) {
        errors.push(jsonResult.error);
      }
      result = { ...jsonResult, sanitized: jsonResult.parsed };
      break;
      
    default:
      result = { sanitized: input, valid: true };
  }
  
  // Check length if specified
  if (options.maxLength && result.valid) {
    const lengthResult = validateLength(
      String(result.sanitized), 
      options.maxLength, 
      options.fieldName || 'Input'
    );
    
    if (!lengthResult.valid && lengthResult.error) {
      errors.push(lengthResult.error);
      result.valid = false;
    }
  }
  
  return {
    valid: result.valid && errors.length === 0,
    sanitized: result.sanitized,
    errors
  };
}