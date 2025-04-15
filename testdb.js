import pg from 'pg';
const { Pool } = pg;

// Connect to the database
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function testDBConnection() {
  try {
    // Insert a test file record
    const result = await pool.query(`
      INSERT INTO mm_files (name, path, type, size, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      'test-file.txt',
      '/uploads/test-file.txt',
      '.txt',
      1024,
      JSON.stringify({ description: 'Test file for Midnight Magnolia integration' })
    ]);

    console.log('Test file created:', result.rows[0]);

    // Retrieve all files
    const files = await pool.query('SELECT * FROM mm_files');
    console.log('All files:', files.rows);

    // Test complete
    console.log('Database connection and operations successful!');
  } catch (error) {
    console.error('Database test failed:', error);
  } finally {
    // Close the connection
    await pool.end();
  }
}

// Run the test
testDBConnection().catch(console.error);