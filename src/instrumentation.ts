// Static imports removed to prevent Edge runtime errors.
// Dynamic imports are used inside the register function.

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // We only execute migrations in the Node.js runtime, not on the Edge.
    const adapter = process.env.DB_ADAPTER;
    if (adapter === 'inMemory') {
      return; 
    }

    // In a Vercel-Supabase integration, deploying provides the `POSTGRES_URL` implicitly.
    const connectionString = process.env.POSTGRES_URL;

    if (!connectionString) {
      console.warn('⚠️ [DB INIT] Skipping schema sync: POSTGRES_URL environment variable is missing.');
      console.warn('⚠️ If using Supabase local, define POSTGRES_URL. If on Vercel, attach the DB to expose it.');
      return;
    }

    try {
      const { SCHEMA_SQL } = await import('./db/schema');
      const { Pool } = await import('pg');

      console.log('🔄 [DB INIT] Attempting to run idempotent migration...');
      
      const pool = new Pool({ 
        connectionString,
        ssl: {
          rejectUnauthorized: false
        }
      });
      
      // Execute the bundled SQL script
      await pool.query(SCHEMA_SQL);

      console.log('✅ [DB INIT] Database synced successfully.');
      await pool.end();
    } catch (e: any) {
      console.error('❌ [DB INIT] Error syncing database scheme:', e.message);
    }
  }
}
