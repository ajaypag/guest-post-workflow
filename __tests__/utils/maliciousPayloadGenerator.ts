/**
 * Malicious Payload Generator for Publisher Portal Security Testing
 * 
 * This utility generates various types of malicious inputs designed to test
 * the security and robustness of the publisher portal system.
 */

export interface MaliciousPayload {
  type: string;
  payload: string;
  description: string;
  expectedBehavior: 'reject' | 'sanitize' | 'error';
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export class MaliciousPayloadGenerator {
  
  /**
   * XSS (Cross-Site Scripting) payloads
   */
  static getXSSPayloads(): MaliciousPayload[] {
    return [
      {
        type: 'xss',
        payload: '<script>alert("XSS")</script>',
        description: 'Basic script tag injection',
        expectedBehavior: 'reject',
        severity: 'critical'
      },
      {
        type: 'xss',
        payload: '"><script>alert("XSS")</script><!--',
        description: 'Breaking out of attribute context',
        expectedBehavior: 'reject',
        severity: 'critical'
      },
      {
        type: 'xss',
        payload: 'javascript:alert("XSS")',
        description: 'JavaScript protocol injection',
        expectedBehavior: 'reject',
        severity: 'critical'
      },
      {
        type: 'xss',
        payload: '<img src="x" onerror="alert(\'XSS\')">',
        description: 'Event handler XSS',
        expectedBehavior: 'reject',
        severity: 'critical'
      },
      {
        type: 'xss',
        payload: '${alert("XSS")}',
        description: 'Template literal injection',
        expectedBehavior: 'reject',
        severity: 'high'
      },
      {
        type: 'xss',
        payload: '{{alert("XSS")}}',
        description: 'Template engine injection',
        expectedBehavior: 'reject',
        severity: 'high'
      },
      {
        type: 'xss',
        payload: '<svg onload="alert(\'XSS\')">',
        description: 'SVG-based XSS',
        expectedBehavior: 'reject',
        severity: 'high'
      },
      {
        type: 'xss',
        payload: 'data:text/html,<script>alert("XSS")</script>',
        description: 'Data URI XSS',
        expectedBehavior: 'reject',
        severity: 'high'
      },
      {
        type: 'xss',
        payload: '<scr<script>ipt>alert("XSS")</scr</script>ipt>',
        description: 'Filter bypass attempt',
        expectedBehavior: 'reject',
        severity: 'medium'
      },
      {
        type: 'xss',
        payload: '%3Cscript%3Ealert%28%27XSS%27%29%3C%2Fscript%3E',
        description: 'URL encoded XSS',
        expectedBehavior: 'reject',
        severity: 'medium'
      },
      {
        type: 'xss',
        payload: '&lt;script&gt;alert("XSS")&lt;/script&gt;',
        description: 'HTML entity encoded XSS',
        expectedBehavior: 'sanitize',
        severity: 'low'
      }
    ];
  }

  /**
   * SQL Injection payloads
   */
  static getSQLInjectionPayloads(): MaliciousPayload[] {
    return [
      {
        type: 'sql',
        payload: "'; DROP TABLE websites; --",
        description: 'Table dropping attempt',
        expectedBehavior: 'reject',
        severity: 'critical'
      },
      {
        type: 'sql',
        payload: "' OR '1'='1",
        description: 'Authentication bypass attempt',
        expectedBehavior: 'reject',
        severity: 'critical'
      },
      {
        type: 'sql',
        payload: "' UNION SELECT * FROM users --",
        description: 'Data extraction attempt',
        expectedBehavior: 'reject',
        severity: 'critical'
      },
      {
        type: 'sql',
        payload: "'; UPDATE publishers SET email='hacked@evil.com' WHERE id='1'; --",
        description: 'Data modification attempt',
        expectedBehavior: 'reject',
        severity: 'critical'
      },
      {
        type: 'sql',
        payload: "' OR 1=1 #",
        description: 'MySQL comment-based injection',
        expectedBehavior: 'reject',
        severity: 'critical'
      },
      {
        type: 'sql',
        payload: "'; INSERT INTO publishers VALUES('evil','hacked'); --",
        description: 'Data insertion attempt',
        expectedBehavior: 'reject',
        severity: 'critical'
      },
      {
        type: 'sql',
        payload: "' AND (SELECT SUBSTRING(password,1,1) FROM users WHERE username='admin')='a",
        description: 'Blind SQL injection attempt',
        expectedBehavior: 'reject',
        severity: 'high'
      },
      {
        type: 'sql',
        payload: "'; WAITFOR DELAY '00:00:10'; --",
        description: 'Time-based blind injection',
        expectedBehavior: 'reject',
        severity: 'high'
      },
      {
        type: 'sql',
        payload: "' AND SLEEP(5) --",
        description: 'MySQL time delay injection',
        expectedBehavior: 'reject',
        severity: 'high'
      },
      {
        type: 'sql',
        payload: "1' OR '1'='1' /*",
        description: 'Comment-based bypass',
        expectedBehavior: 'reject',
        severity: 'medium'
      }
    ];
  }

  /**
   * Buffer overflow and size attack payloads
   */
  static getOverflowPayloads(): MaliciousPayload[] {
    return [
      {
        type: 'overflow',
        payload: 'A'.repeat(1000),
        description: '1KB overflow test',
        expectedBehavior: 'reject',
        severity: 'low'
      },
      {
        type: 'overflow',
        payload: 'A'.repeat(10000),
        description: '10KB overflow test',
        expectedBehavior: 'reject',
        severity: 'medium'
      },
      {
        type: 'overflow',
        payload: 'A'.repeat(100000),
        description: '100KB overflow test',
        expectedBehavior: 'reject',
        severity: 'high'
      },
      {
        type: 'overflow',
        payload: 'A'.repeat(1000000),
        description: '1MB overflow test',
        expectedBehavior: 'reject',
        severity: 'critical'
      }
    ];
  }

  /**
   * Unicode and encoding attack payloads
   */
  static getUnicodePayloads(): MaliciousPayload[] {
    return [
      {
        type: 'unicode',
        payload: '🚀💀👾🎭🔥💩💯🌟⚡🎪',
        description: 'Emoji overflow test',
        expectedBehavior: 'sanitize',
        severity: 'low'
      },
      {
        type: 'unicode',
        payload: '测试中文字符',
        description: 'Chinese character test',
        expectedBehavior: 'sanitize',
        severity: 'low'
      },
      {
        type: 'unicode',
        payload: 'тест кириллицы',
        description: 'Cyrillic character test',
        expectedBehavior: 'sanitize',
        severity: 'low'
      },
      {
        type: 'unicode',
        payload: '𝕿𝖊𝖘𝖙 𝖚𝖓𝖎𝖈𝖔𝖉𝖊',
        description: 'Mathematical alphanumeric symbols',
        expectedBehavior: 'sanitize',
        severity: 'medium'
      },
      {
        type: 'unicode',
        payload: 'أختبار العربية',
        description: 'Arabic character test',
        expectedBehavior: 'sanitize',
        severity: 'low'
      },
      {
        type: 'unicode',
        payload: 'テスト日本語',
        description: 'Japanese character test',
        expectedBehavior: 'sanitize',
        severity: 'low'
      },
      {
        type: 'unicode',
        payload: '\u202E\u0041\u0042\u0043',
        description: 'Right-to-left override attack',
        expectedBehavior: 'reject',
        severity: 'high'
      },
      {
        type: 'unicode',
        payload: '\u200B\u200C\u200D\uFEFF',
        description: 'Invisible character injection',
        expectedBehavior: 'reject',
        severity: 'medium'
      }
    ];
  }

  /**
   * Special character and control character payloads
   */
  static getSpecialCharPayloads(): MaliciousPayload[] {
    return [
      {
        type: 'special',
        payload: '"\'\\`~!@#$%^&*()_+-={}[]|:";\'<>?,./\n\r\t',
        description: 'All common special characters',
        expectedBehavior: 'sanitize',
        severity: 'medium'
      },
      {
        type: 'special',
        payload: '\u0000\u0001\u0002\u0003\u0004\u0005',
        description: 'Null and control characters',
        expectedBehavior: 'reject',
        severity: 'high'
      },
      {
        type: 'special',
        payload: '\\x00\\x01\\x02',
        description: 'Escaped hex characters',
        expectedBehavior: 'sanitize',
        severity: 'medium'
      },
      {
        type: 'special',
        payload: '\\\\\\"""\'\'\'',
        description: 'Quote and escape character bombing',
        expectedBehavior: 'sanitize',
        severity: 'medium'
      },
      {
        type: 'special',
        payload: '\n\r\n\r\n\r',
        description: 'Line break injection',
        expectedBehavior: 'sanitize',
        severity: 'low'
      }
    ];
  }

  /**
   * Invalid domain format payloads
   */
  static getInvalidDomainPayloads(): MaliciousPayload[] {
    return [
      {
        type: 'domain',
        payload: '',
        description: 'Empty domain',
        expectedBehavior: 'reject',
        severity: 'medium'
      },
      {
        type: 'domain',
        payload: ' ',
        description: 'Whitespace domain',
        expectedBehavior: 'reject',
        severity: 'medium'
      },
      {
        type: 'domain',
        payload: 'not-a-domain',
        description: 'No TLD domain',
        expectedBehavior: 'reject',
        severity: 'medium'
      },
      {
        type: 'domain',
        payload: 'http://',
        description: 'Protocol only',
        expectedBehavior: 'reject',
        severity: 'medium'
      },
      {
        type: 'domain',
        payload: '://example.com',
        description: 'Malformed protocol',
        expectedBehavior: 'reject',
        severity: 'medium'
      },
      {
        type: 'domain',
        payload: 'example',
        description: 'No TLD',
        expectedBehavior: 'reject',
        severity: 'medium'
      },
      {
        type: 'domain',
        payload: '.com',
        description: 'TLD only',
        expectedBehavior: 'reject',
        severity: 'medium'
      },
      {
        type: 'domain',
        payload: 'example.',
        description: 'Trailing dot',
        expectedBehavior: 'sanitize',
        severity: 'low'
      },
      {
        type: 'domain',
        payload: 'example..com',
        description: 'Double dot',
        expectedBehavior: 'reject',
        severity: 'medium'
      },
      {
        type: 'domain',
        payload: 'example .com',
        description: 'Space in domain',
        expectedBehavior: 'reject',
        severity: 'medium'
      },
      {
        type: 'domain',
        payload: 'javascript://example.com',
        description: 'JavaScript protocol',
        expectedBehavior: 'reject',
        severity: 'high'
      },
      {
        type: 'domain',
        payload: 'data://example.com',
        description: 'Data protocol',
        expectedBehavior: 'reject',
        severity: 'high'
      },
      {
        type: 'domain',
        payload: 'file://example.com',
        description: 'File protocol',
        expectedBehavior: 'reject',
        severity: 'medium'
      }
    ];
  }

  /**
   * Price manipulation payloads
   */
  static getInvalidPricePayloads(): MaliciousPayload[] {
    return [
      {
        type: 'price',
        payload: '-100',
        description: 'Negative price',
        expectedBehavior: 'reject',
        severity: 'high'
      },
      {
        type: 'price',
        payload: '0',
        description: 'Zero price',
        expectedBehavior: 'reject',
        severity: 'medium'
      },
      {
        type: 'price',
        payload: '999999999999',
        description: 'Astronomical price',
        expectedBehavior: 'reject',
        severity: 'medium'
      },
      {
        type: 'price',
        payload: 'NaN',
        description: 'JavaScript NaN',
        expectedBehavior: 'reject',
        severity: 'medium'
      },
      {
        type: 'price',
        payload: 'Infinity',
        description: 'JavaScript Infinity',
        expectedBehavior: 'reject',
        severity: 'medium'
      },
      {
        type: 'price',
        payload: '1.2.3',
        description: 'Multiple decimal points',
        expectedBehavior: 'reject',
        severity: 'medium'
      },
      {
        type: 'price',
        payload: 'abc',
        description: 'Non-numeric characters',
        expectedBehavior: 'reject',
        severity: 'medium'
      },
      {
        type: 'price',
        payload: '1e100',
        description: 'Scientific notation',
        expectedBehavior: 'reject',
        severity: 'medium'
      },
      {
        type: 'price',
        payload: '0x1234',
        description: 'Hexadecimal notation',
        expectedBehavior: 'reject',
        severity: 'medium'
      },
      {
        type: 'price',
        payload: '0777',
        description: 'Octal notation',
        expectedBehavior: 'reject',
        severity: 'medium'
      }
    ];
  }

  /**
   * Get all payloads of a specific severity level
   */
  static getPayloadsBySeverity(severity: 'critical' | 'high' | 'medium' | 'low'): MaliciousPayload[] {
    const allPayloads = [
      ...this.getXSSPayloads(),
      ...this.getSQLInjectionPayloads(),
      ...this.getOverflowPayloads(),
      ...this.getUnicodePayloads(),
      ...this.getSpecialCharPayloads(),
      ...this.getInvalidDomainPayloads(),
      ...this.getInvalidPricePayloads()
    ];

    return allPayloads.filter(payload => payload.severity === severity);
  }

  /**
   * Get all payloads of a specific type
   */
  static getPayloadsByType(type: string): MaliciousPayload[] {
    const allPayloads = [
      ...this.getXSSPayloads(),
      ...this.getSQLInjectionPayloads(),
      ...this.getOverflowPayloads(),
      ...this.getUnicodePayloads(),
      ...this.getSpecialCharPayloads(),
      ...this.getInvalidDomainPayloads(),
      ...this.getInvalidPricePayloads()
    ];

    return allPayloads.filter(payload => payload.type === type);
  }

  /**
   * Get all payloads
   */
  static getAllPayloads(): MaliciousPayload[] {
    return [
      ...this.getXSSPayloads(),
      ...this.getSQLInjectionPayloads(),
      ...this.getOverflowPayloads(),
      ...this.getUnicodePayloads(),
      ...this.getSpecialCharPayloads(),
      ...this.getInvalidDomainPayloads(),
      ...this.getInvalidPricePayloads()
    ];
  }

  /**
   * Generate random malicious payloads for fuzzing
   */
  static generateRandomPayloads(count: number): MaliciousPayload[] {
    const templates = [
      '<script>{content}</script>',
      '"; {content}; --',
      '{{${content}}}',
      'javascript:{content}',
      '"><img src="x" onerror="{content}">',
      '\' OR 1=1; {content}; --'
    ];

    const contents = [
      'alert("random")',
      'console.log("test")',
      'DROP TABLE users',
      'SELECT * FROM passwords',
      'eval("evil")',
      'document.location="evil.com"'
    ];

    const payloads: MaliciousPayload[] = [];

    for (let i = 0; i < count; i++) {
      const template = templates[Math.floor(Math.random() * templates.length)];
      const content = contents[Math.floor(Math.random() * contents.length)];
      const payload = template.replace('{content}', content);

      payloads.push({
        type: 'random',
        payload,
        description: `Random generated payload ${i + 1}`,
        expectedBehavior: 'reject',
        severity: 'medium'
      });
    }

    return payloads;
  }

  /**
   * Generate domain normalization test cases
   */
  static getDomainNormalizationTests(): Array<{original: string, expected: string}> {
    const baseDomain = 'example.com';
    
    return [
      { original: 'example.com', expected: 'example.com' },
      { original: 'EXAMPLE.COM', expected: 'example.com' },
      { original: 'Example.Com', expected: 'example.com' },
      { original: 'www.example.com', expected: 'example.com' },
      { original: 'WWW.EXAMPLE.COM', expected: 'example.com' },
      { original: 'Www.Example.Com', expected: 'example.com' },
      { original: 'http://example.com', expected: 'example.com' },
      { original: 'https://example.com', expected: 'example.com' },
      { original: 'HTTP://EXAMPLE.COM', expected: 'example.com' },
      { original: 'HTTPS://EXAMPLE.COM', expected: 'example.com' },
      { original: 'http://www.example.com', expected: 'example.com' },
      { original: 'https://www.example.com', expected: 'example.com' },
      { original: 'example.com/', expected: 'example.com' },
      { original: 'example.com//', expected: 'example.com' },
      { original: 'example.com///', expected: 'example.com' },
      { original: 'www.example.com/', expected: 'example.com' },
      { original: 'http://example.com/', expected: 'example.com' },
      { original: 'https://www.example.com/', expected: 'example.com' },
      { original: 'example.com/path', expected: 'example.com' },
      { original: 'www.example.com/path', expected: 'example.com' },
      { original: 'http://example.com/path', expected: 'example.com' },
      { original: 'https://www.example.com/path', expected: 'example.com' },
      { original: 'example.com:80', expected: 'example.com' },
      { original: 'example.com:443', expected: 'example.com' },
      { original: 'www.example.com:80', expected: 'example.com' },
      { original: 'www.example.com:443', expected: 'example.com' },
      { original: 'http://example.com:80', expected: 'example.com' },
      { original: 'https://example.com:443', expected: 'example.com' }
    ];
  }
}