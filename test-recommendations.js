const { storage } = require('./server/storage');

/**
 * Test the recommendation system's ability to process a file and generate recommendations
 */
async function testRecommendations() {
  try {
    console.log("Testing recommendation system...");
    
    // 1. Create a test file with some content
    const testFilePath = 'sample-test-file.txt';
    
    // 2. Generate file recommendations
    console.log(`Generating recommendations for ${testFilePath}...`);
    const insertRec = {
      fileId: testFilePath,
      recommendationType: 'quality_improvement',
      recommendationText: 'This is a test recommendation',
      priority: 'medium',
      metadata: { source: 'test', focus_area: 'quality' }
    };
    
    const recommendation = await storage.createFileRecommendation(insertRec);
    console.log("Created recommendation:", recommendation);
    
    // 3. Get recommendations for the file
    console.log(`Fetching recommendations for ${testFilePath}...`);
    const fileRecommendations = await storage.getFileRecommendations(testFilePath);
    console.log(`Found ${fileRecommendations.length} recommendations for ${testFilePath}`);
    
    // 4. Get recommendations by type
    console.log("Fetching quality improvement recommendations...");
    const qualityRecommendations = await storage.getRecommendationsByType('quality_improvement');
    console.log(`Found ${qualityRecommendations.length} quality improvement recommendations`);
    
    if (fileRecommendations.length > 0) {
      // 5. Mark a recommendation as implemented
      const recId = fileRecommendations[0].id;
      console.log(`Marking recommendation ${recId} as implemented...`);
      const updatedRec = await storage.markRecommendationImplemented(recId, true);
      console.log("Updated recommendation:", updatedRec);
      
      // 6. Add feedback for a recommendation
      console.log(`Adding feedback for recommendation ${recId}...`);
      const feedback = await storage.addRecommendationFeedback({
        recommendationId: recId,
        helpful: true,
        feedbackText: "This recommendation was very helpful!"
      });
      console.log("Added feedback:", feedback);
    }
    
    console.log("Recommendation system tests completed successfully!");
  } catch (error) {
    console.error("Error testing recommendation system:", error);
  }
}

// Run the test
testRecommendations();