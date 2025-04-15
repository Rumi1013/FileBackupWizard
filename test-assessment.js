import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';
const { Pool } = pg;

// Connect to the database
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function testFileAssessment() {
  try {
    // First, create a test file 
    const testDir = path.join(process.cwd(), 'uploads');
    const testFilePath = path.join(testDir, 'test-assessment.txt');
    
    try {
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(testFilePath, 'This is a test file for assessment in the Midnight Magnolia integration.');
      console.log('Test file created at:', testFilePath);
    } catch (err) {
      console.error('Error creating test file:', err);
      return;
    }
    
    // Add file record to database
    const fileResult = await pool.query(`
      INSERT INTO mm_files (name, path, type, size, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      'test-assessment.txt',
      testFilePath,
      '.txt',
      100,
      JSON.stringify({ description: 'Test file for assessment' })
    ]);
    
    const file = fileResult.rows[0];
    console.log('File record created:', file);
    
    // Create file assessment record
    const assessmentResult = await pool.query(`
      INSERT INTO mm_file_assessments (
        file_id, 
        quality_score, 
        monetization_eligible, 
        needs_deletion, 
        metadata
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      file.id,
      'Good',
      true,
      false,
      JSON.stringify({
        documentQuality: {
          readability: 0.9,
          formatting: 0.8,
          completeness: 0.7
        }
      })
    ]);
    
    console.log('File assessment created:', assessmentResult.rows[0]);
    
    // Add a file operation record
    const operationResult = await pool.query(`
      INSERT INTO mm_file_operations (
        file_id,
        operation_type,
        status,
        details
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [
      file.id,
      'assess',
      'completed',
      JSON.stringify({ message: 'File assessment completed successfully' })
    ]);
    
    console.log('File operation record created:', operationResult.rows[0]);
    
    // Query file with its assessment
    const fileWithAssessmentQuery = `
      SELECT f.*, 
             a.quality_score, 
             a.monetization_eligible, 
             a.needs_deletion,
             a.metadata as assessment_metadata
      FROM mm_files f
      JOIN mm_file_assessments a ON f.id = a.file_id
      WHERE f.id = $1
    `;
    
    const fileWithAssessment = await pool.query(fileWithAssessmentQuery, [file.id]);
    console.log('File with assessment:', fileWithAssessment.rows[0]);
    
    // Test complete
    console.log('File assessment integration test successful!');
  } catch (error) {
    console.error('File assessment test failed:', error);
  } finally {
    // Close the connection
    await pool.end();
  }
}

// Run the test
testFileAssessment().catch(console.error);