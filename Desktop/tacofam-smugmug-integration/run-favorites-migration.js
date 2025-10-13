/**
 * Favorites Sessions Table Migration
 * Creates the favorites_sessions table for Favorites Manager tool
 */

require('dotenv').config();

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('🚀 Starting favorites_sessions migration...\n');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'prisma', 'migrations', 'add_favorites_sessions.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📖 Loaded migration file: add_favorites_sessions.sql');
    console.log('📊 Executing SQL statements...\n');

    // Execute the migration
    await pool.query(migrationSQL);

    console.log('✅ Migration completed successfully!');
    console.log('\n📋 Created:');
    console.log('   - favorites_sessions table');
    console.log('   - 4 indexes for fast lookups');

    // Verify the table was created
    const verifyResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'favorites_sessions'
      ORDER BY ordinal_position;
    `);

    console.log('\n✅ Table structure verified:');
    verifyResult.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });

    console.log('\n🎉 Favorites Manager is ready to use!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration();
