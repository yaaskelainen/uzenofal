import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

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
      const sqlPath = path.resolve(process.cwd(), 'src/db/schema.sql');
      const sql = fs.readFileSync(sqlPath, 'utf8');

      console.log('🔄 [DB INIT] Attempting to run idempotent migration (schema.sql)...');
      
      const pool = new Pool({ connectionString });
      
      // Execute the parsed SQL script
      await pool.query(sql);

      console.log('✅ [DB INIT] Database synced successfully.');
      await pool.end();
    } catch (e: any) {
      console.error('❌ [DB INIT] Error syncing database scheme:', e.message);
    }
  }
}
