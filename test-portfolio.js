import pg from 'pg';
const { Pool } = pg;

// Connect to the database
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function testPortfolioIntegration() {
  try {
    // Create a portfolio item
    const portfolioResult = await pool.query(`
      INSERT INTO portfolio_items (title, description, category, visibility, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      'Sample Portfolio Project',
      'This is a sample portfolio project for Midnight Magnolia integration',
      'design',
      'public',
      JSON.stringify({
        client: 'Test Client',
        year: 2025,
        tools: ['Photoshop', 'Figma', 'Illustrator']
      })
    ]);

    const portfolioItem = portfolioResult.rows[0];
    console.log('Portfolio item created:', portfolioItem);

    // Add a tag to the portfolio item
    const tagResult = await pool.query(`
      INSERT INTO portfolio_tags (portfolio_item_id, tag)
      VALUES ($1, $2)
      RETURNING *
    `, [
      portfolioItem.id,
      'design'
    ]);

    console.log('Portfolio tag added:', tagResult.rows[0]);

    // Retrieve all portfolio items with their tags
    const itemsWithTagsQuery = `
      SELECT pi.*, 
             ARRAY_AGG(pt.tag) AS tags
      FROM portfolio_items pi
      LEFT JOIN portfolio_tags pt ON pi.id = pt.portfolio_item_id
      GROUP BY pi.id
    `;
    
    const portfolioItems = await pool.query(itemsWithTagsQuery);
    console.log('Portfolio items with tags:', portfolioItems.rows);

    // Test complete
    console.log('Portfolio integration test successful!');
  } catch (error) {
    console.error('Portfolio integration test failed:', error);
  } finally {
    // Close the connection
    await pool.end();
  }
}

// Run the test
testPortfolioIntegration().catch(console.error);