const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

// Simple test client for the Image Extractor Service
async function testImageExtraction(imagePath) {
  try {
    if (!fs.existsSync(imagePath)) {
      console.log('❌ Test image not found. Please provide a sample image.');
      console.log('Usage: node test-client.js <path-to-image>');
      return;
    }

    console.log('🚀 Testing Image Extractor Service...');
    console.log(`📁 Image: ${imagePath}`);

    const form = new FormData();
    form.append('image', fs.createReadStream(imagePath));

    const response = await fetch('http://localhost:3000/extract', {
      method: 'POST',
      body: form
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Extraction successful!');
      console.log(`📝 Extracted Text: ${result.data.extractedText.substring(0, 200)}...`);
      console.log(`🎯 Confidence: ${result.data.confidence}%`);
      console.log(`📊 Words: ${result.data.metadata.totalWords}, Lines: ${result.data.metadata.totalLines}, Paragraphs: ${result.data.metadata.totalParagraphs}`);
    } else {
      console.log('❌ Extraction failed:', result.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('💡 Make sure the server is running: npm start');
  }
}

// Get image path from command line arguments
const imagePath = process.argv[2];
if (imagePath) {
  testImageExtraction(imagePath);
} else {
  console.log('Usage: node test-client.js <path-to-image>');
  console.log('Example: node test-client.js ./sample.jpg');
}
