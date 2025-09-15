const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

// Test client specifically for timetable extraction
async function testTimetableExtraction(imagePath) {
  try {
    if (!fs.existsSync(imagePath)) {
      console.log('❌ Test image not found. Please provide a sample timetable image.');
      console.log('Usage: node timetable-test.js <path-to-timetable-image>');
      return;
    }

    console.log('🎓 Testing Timetable Extraction Service...');
    console.log(`📁 Image: ${imagePath}`);

    const form = new FormData();
    form.append('image', fs.createReadStream(imagePath));

    // Test the specialized timetable endpoint
    const response = await fetch('http://localhost:3000/extract/timetable', {
      method: 'POST',
      body: form
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Timetable extraction successful!');
      console.log('\n📋 Document Information:');
      console.log(`   School: ${result.data.documentInfo.school || 'N/A'}`);
      console.log(`   Class: ${result.data.documentInfo.class || 'N/A'}`);
      console.log(`   Term: ${result.data.documentInfo.term || 'N/A'}`);
      console.log(`   Teacher: ${result.data.documentInfo.teacher || 'N/A'}`);
      console.log(`   Type: ${result.data.documentInfo.type || 'N/A'}`);

      console.log('\n📊 Schedule Summary:');
      console.log(`   Total Sessions: ${result.data.ui.summary.totalSessions}`);
      console.log(`   Subjects: ${result.data.ui.summary.subjects.join(', ')}`);
      console.log(`   Days: ${result.data.ui.summary.days.join(', ')}`);
      console.log(`   Time Range: ${result.data.ui.summary.timeRange || 'N/A'}`);

      console.log('\n🗓️ Schedule Data:');
      if (result.data.schedule.type === 'daily_schedule') {
        Object.keys(result.data.schedule.dailySchedules).forEach(day => {
          console.log(`\n   ${day.toUpperCase()}:`);
          result.data.schedule.dailySchedules[day].forEach(activity => {
            console.log(`     ${activity.time} - ${activity.activity}`);
          });
        });
      } else {
        result.data.schedule.sessions.forEach(session => {
          console.log(`     ${session.day}: ${session.time} - ${session.subject}`);
        });
      }

      console.log('\n📱 UI-Ready Data Available:');
      console.log(`   Display Title: ${result.data.ui.displayTitle}`);
      console.log(`   Subtitle: ${result.data.ui.subtitle}`);
      console.log(`   Schedule Grid: ${result.data.ui.scheduleGrid.length} day(s) formatted`);

    } else {
      console.log('❌ Extraction failed:', result.error);
      console.log('   Message:', result.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('💡 Make sure the server is running: npm start');
  }
}

// Test both general and timetable extraction
async function testBothExtractionTypes(imagePath) {
  console.log('🔄 Testing both extraction types...\n');

  // Test general extraction
  console.log('1️⃣ General Extraction:');
  try {
    const form1 = new FormData();
    form1.append('image', fs.createReadStream(imagePath));

    const response1 = await fetch('http://localhost:3000/extract', {
      method: 'POST',
      body: form1
    });

    const result1 = await response1.json();
    if (result1.success) {
      console.log(`   ✅ Text extracted: ${result1.data.extractedText.substring(0, 100)}...`);
      console.log(`   📊 Confidence: ${result1.data.confidence}%`);
    }
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
  }

  console.log('\n2️⃣ Timetable Extraction:');
  await testTimetableExtraction(imagePath);
}

// Get image path from command line arguments
const imagePath = process.argv[2];
const testType = process.argv[3] || 'timetable';

if (imagePath) {
  if (testType === 'both') {
    testBothExtractionTypes(imagePath);
  } else {
    testTimetableExtraction(imagePath);
  }
} else {
  console.log('Usage: node timetable-test.js <path-to-image> [both]');
  console.log('Examples:');
  console.log('  node timetable-test.js ./timetable.jpg');
  console.log('  node timetable-test.js ./schedule.png both');
}
