// Script to mark previously run migrations as complete
// Run this after deploying to mark migrations that were run before migration_history table existed

const migrationsToMark = [
  '0035_publisher_offerings_system_fixed',
  '0038_publisher_relations_and_permissions', 
  '0039_website_publisher_columns',
  '0040_add_missing_publisher_offering_columns',
  '0041_add_missing_performance_columns',
  '0037_normalize_existing_domains',
  '0040_add_publisher_fields'
];

async function markMigrationsComplete() {
  try {
    const response = await fetch('https://www.linkio.com/api/admin/migrations/mark-as-complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // You'll need to add your session cookie here
      },
      body: JSON.stringify({ migrations: migrationsToMark })
    });

    const result = await response.json();
    console.log('Result:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Instructions:
console.log(`
To mark these migrations as complete:

1. Log into the admin panel
2. Open browser DevTools (F12)
3. Go to Console tab
4. Paste and run this code:

fetch('/api/admin/migrations/mark-as-complete', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    migrations: ${JSON.stringify(migrationsToMark, null, 2)}
  })
}).then(r => r.json()).then(console.log)
`);