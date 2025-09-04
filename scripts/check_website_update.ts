import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5434/guest_post_prod';

async function check() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    const result = await pool.query(`
      SELECT domain, niche, suggested_niches, last_niche_check 
      FROM websites 
      WHERE domain = '1800officesolutions.com'
    `);
    
    if (result.rows.length > 0) {
      const site = result.rows[0];
      console.log('\n📊 Website Status:');
      console.log('Domain:', site.domain);
      console.log('Niches:', site.niche || '(empty)');
      console.log('Suggested:', site.suggested_niches || '(empty)');
      console.log('Last check:', site.last_niche_check || 'Never');
      
      if (!site.niche || site.niche.length === 0) {
        console.log('\n❌ Website was NOT updated with niches');
      } else {
        console.log('\n✅ Website has niches!');
      }
    } else {
      console.log('Website not found');
    }
  } finally {
    await pool.end();
  }
}

check();