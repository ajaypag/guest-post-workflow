/**
 * Extract a human-readable name from an email address
 * Examples:
 * - john.doe@example.com → John Doe
 * - john_doe@example.com → John Doe  
 * - johndoe@example.com → Johndoe
 * - ben@h2horganizing.com → Ben
 * - info@example.com → Info (keep as-is for generic emails)
 */
export function extractNameFromEmail(email: string): string {
  if (!email || !email.includes('@')) {
    return 'Unknown';
  }
  
  // Get the part before @
  const localPart = email.split('@')[0];
  
  // Common generic email prefixes to keep as-is
  const genericPrefixes = ['info', 'admin', 'contact', 'hello', 'support', 'editor', 'team', 'mail', 'email'];
  if (genericPrefixes.includes(localPart.toLowerCase())) {
    return localPart.charAt(0).toUpperCase() + localPart.slice(1).toLowerCase();
  }
  
  // Handle different separators
  let parts: string[] = [];
  
  if (localPart.includes('.')) {
    // john.doe → John Doe
    parts = localPart.split('.');
  } else if (localPart.includes('_')) {
    // john_doe → John Doe
    parts = localPart.split('_');
  } else if (localPart.includes('-')) {
    // john-doe → John Doe
    parts = localPart.split('-');
  } else if (localPart.match(/[a-z][A-Z]/)) {
    // johnDoe → John Doe (camelCase)
    parts = localPart.split(/(?=[A-Z])/).map(p => p.toLowerCase());
  } else {
    // Single word or no clear separator
    parts = [localPart];
  }
  
  // Filter out numbers and very short parts
  parts = parts.filter(part => part.length > 1 || parts.length === 1);
  
  // Capitalize each part
  const name = parts
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
  
  // Final cleanup
  return name.trim() || 'Unknown';
}

/**
 * Parse name from CSV if available, otherwise extract from email
 */
export function getContactName(csvName: string | undefined, email: string): string {
  // If CSV has a name and it's not empty/Unknown, use it
  if (csvName && csvName.trim() && csvName.trim().toLowerCase() !== 'unknown') {
    return csvName.trim();
  }
  
  // Otherwise extract from email
  return extractNameFromEmail(email);
}

// Test the function
if (require.main === module) {
  const testEmails = [
    'john.doe@example.com',
    'john_doe@example.com',
    'johndoe@example.com',
    'JohnDoe@example.com',
    'ben@h2horganizing.com',
    'info@example.com',
    'kelly@homeandjet.com',
    'rachael@tastefulspace.com',
    'florencedaigle2@gmail.com',
    'sheharyarn4@gmail.com',
    'editor@strangebuildings.com'
  ];
  
  console.log('Email → Name extraction tests:\n');
  testEmails.forEach(email => {
    console.log(`${email} → ${extractNameFromEmail(email)}`);
  });
}