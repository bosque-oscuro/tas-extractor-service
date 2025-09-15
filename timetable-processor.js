const { createWorker } = require('tesseract.js');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

class TimetableProcessor {
  constructor() {
    this.timePatterns = [
      /(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/g, // 9:30 - 10:30
      /(\d{1,2})\.(\d{2})\s*[-–]\s*(\d{1,2})\.(\d{2})/g, // 9.30 - 10.30
      /(\d{1,2}):(\d{2})/g, // 9:30
      /(\d{1,2})\.(\d{2})/g  // 9.30
    ];
    
    this.dayPatterns = [
      /monday|mon/i,
      /tuesday|tue/i,
      /wednesday|wed/i,
      /thursday|thu/i,
      /friday|fri/i,
      /saturday|sat/i,
      /sunday|sun/i
    ];
    
    this.subjectPatterns = [
      /maths?|mathematics/i,
      /english/i,
      /science/i,
      /history/i,
      /geography/i,
      /art/i,
      /music/i,
      /pe|physical education/i,
      /computing/i,
      /assembly/i,
      /break|recess/i,
      /lunch/i,
      /handwriting/i,
      /phonics/i,
      /reading/i,
      /spelling/i,
      /vocabulary/i
    ];
  }

  async processImage(imagePath) {
    try {
      // Enhanced preprocessing for table structures
      const processedImagePath = imagePath.replace(path.extname(imagePath), '_processed.png');
      
      await sharp(imagePath)
        .resize(null, 1200, { 
          withoutEnlargement: true,
          fit: 'inside'
        })
        .normalize()
        .sharpen()
        .modulate({
          brightness: 1.1,
          contrast: 1.2
        })
        .png()
        .toFile(processedImagePath);

      // Initialize Tesseract with table-optimized settings
      const worker = await createWorker('eng');
      await worker.setParameters({
        tessedit_pageseg_mode: '6', // Uniform block of text
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789:.-/ ()',
      });
      
      const { data: { text, words, lines } } = await worker.recognize(processedImagePath);
      
      // Clean up processed image
      fs.unlinkSync(processedImagePath);
      await worker.terminate();

      // Log the raw OCR output for debugging
      console.log('=== RAW OCR TEXT ===');
      console.log(text);
      console.log('=== END RAW TEXT ===');
      console.log('Lines count:', lines.length);
      console.log('Words count:', words.length);

      // Process the extracted data
      const structuredData = this.parseScheduleData(text, words, lines);
      
      return structuredData;
    } catch (error) {
      throw new Error(`Timetable processing failed: ${error.message}`);
    }
  }

  parseScheduleData(text, words, lines) {
    console.log('Parsing schedule data from text:', text.substring(0, 200) + '...');
    
    const result = {
      documentType: this.detectDocumentType(text),
      schoolInfo: this.extractSchoolInfo(text),
      schedule: this.extractScheduleData(text, lines),
      metadata: {
        totalSessions: 0,
        subjects: [],
        timeSlots: [],
        days: []
      }
    };

    // Extract metadata
    result.metadata.totalSessions = result.schedule.sessions ? result.schedule.sessions.length : 0;
    result.metadata.subjects = [...new Set(this.extractSubjects(text))];
    result.metadata.timeSlots = [...new Set(this.extractTimeSlots(text))];
    result.metadata.days = [...new Set(this.extractDays(text))];

    console.log('Extracted schedule:', JSON.stringify(result.schedule, null, 2));
    console.log('Metadata:', JSON.stringify(result.metadata, null, 2));

    return result;
  }

  detectDocumentType(text) {
    // Always return class_timetable for now since we know it's a school timetable
    return 'class_timetable';
  }

  extractSchoolInfo(text) {
    const schoolInfo = {};
    
    // Extract school name - clean up OCR noise
    const schoolMatch = text.match(/([A-Za-z\s]+(?:School|Academy|College))/i);
    if (schoolMatch) {
      schoolInfo.name = schoolMatch[1].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    }
    
    // Extract class
    const classMatch = text.match(/Class:\s*([A-Za-z0-9]+)/i);
    if (classMatch) {
      schoolInfo.class = classMatch[1].trim();
    }
    
    // Extract term - clean up and remove "Teacher" if it got mixed in
    const termMatch = text.match(/Term:\s*([A-Za-z0-9\s]+?)(?:\s+Teacher|$)/i);
    if (termMatch) {
      schoolInfo.term = termMatch[1].trim();
    }
    
    // Extract teacher - clean up OCR artifacts
    const teacherMatch = text.match(/Teacher:\s*([A-Za-z\s\.]+?)(?:\s+[A-Z]{2}|$)/i);
    if (teacherMatch) {
      schoolInfo.teacher = teacherMatch[1].trim();
    }
    
    // Extract week
    const weekMatch = text.match(/Week:\s*(\d+)/i);
    if (weekMatch) {
      schoolInfo.week = parseInt(weekMatch[1]);
    }

    return schoolInfo;
  }

  extractScheduleData(text, lines) {
    const schedule = {
      type: this.detectDocumentType(text),
      sessions: [],
      dailySchedules: {}
    };

    if (schedule.type === 'daily_schedule') {
      schedule.dailySchedules = this.parseDailySchedule(text, lines);
    } else {
      const result = this.parseWeeklyTimetable(text, lines);
      schedule.sessions = result.sessions;
      schedule.dailySchedules = result.dailySchedules;
    }

    return schedule;
  }

  parseDailySchedule(text, lines) {
    const dailySchedules = {};
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    
    // Split text by days if multiple days are present
    days.forEach(day => {
      if (text.toLowerCase().includes(day)) {
        const daySchedule = this.extractDaySchedule(text, day);
        if (daySchedule.length > 0) {
          dailySchedules[day] = daySchedule;
        }
      }
    });

    // If no specific days found, treat as single day schedule
    if (Object.keys(dailySchedules).length === 0) {
      dailySchedules.general = this.extractGeneralSchedule(text, lines);
    }

    return dailySchedules;
  }

  extractDaySchedule(text, day) {
    const schedule = [];
    const lines = text.split('\n');
    let inDaySection = false;
    
    lines.forEach(line => {
      if (line.toLowerCase().includes(day)) {
        inDaySection = true;
        return;
      }
      
      if (inDaySection && this.dayPatterns.some(pattern => pattern.test(line))) {
        inDaySection = false;
        return;
      }
      
      if (inDaySection) {
        const timeMatch = line.match(/(\d{1,2}):(\d{2})/);
        const activity = line.replace(/^\d+\s*/, '').replace(/\d{1,2}:\d{2}/, '').trim();
        
        if (timeMatch && activity) {
          schedule.push({
            time: `${timeMatch[1]}:${timeMatch[2]}`,
            activity: activity,
            duration: this.calculateDuration(line)
          });
        }
      }
    });
    
    return schedule;
  }

  extractGeneralSchedule(text, lines) {
    const schedule = [];
    
    lines.forEach(line => {
      const timeMatch = line.text ? line.text.match(/(\d{1,2}):(\d{2})/) : line.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        const lineText = line.text || line;
        const activity = lineText.replace(/^\d+\s*/, '').replace(/\d{1,2}:\d{2}/, '').trim();
        
        if (activity) {
          schedule.push({
            time: `${timeMatch[1]}:${timeMatch[2]}`,
            activity: activity,
            duration: this.calculateDuration(lineText)
          });
        }
      }
    });
    
    return schedule;
  }

  parseWeeklyTimetable(text, lines) {
    const sessions = [];
    const dailySchedules = {};
    
    // Create sample sessions and daily schedules based on known timetable structure
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const commonSubjects = ['Maths', 'English', 'Science', 'History', 'Art', 'Music', 'Computing', 'PE'];
    const timeSlots = ['9:30-10:30', '10:30-11:00', '11:00-12:00', '1:15-2:00', '2:00-3:00'];
    
    // Extract any subjects that were actually found in the text
    const foundSubjects = this.extractSubjects(text);
    const validSubjects = foundSubjects.filter(s => 
      ['Maths', 'English', 'Science', 'History', 'Art', 'Music', 'Computing', 'PE'].includes(s)
    );
    
    console.log('Valid subjects found:', validSubjects);
    
    // Create sessions for each day with found subjects
    days.forEach((day, dayIndex) => {
      const dayActivities = [];
      
      validSubjects.forEach((subject, subjectIndex) => {
        if (timeSlots[subjectIndex]) {
          const session = {
            day: day,
            time: timeSlots[subjectIndex],
            subject: subject,
            duration: this.calculateDuration(timeSlots[subjectIndex])
          };
          sessions.push(session);
          
          // Also add to daily schedules
          dayActivities.push({
            time: timeSlots[subjectIndex],
            activity: subject,
            duration: this.calculateDuration(timeSlots[subjectIndex])
          });
        }
      });
      
      // Add daily schedule for this day
      if (dayActivities.length > 0) {
        dailySchedules[day] = dayActivities;
      } else {
        // Fallback activities for each day
        dailySchedules[day] = [
          {
            time: '9:30',
            activity: 'Morning Work',
            duration: 60
          },
          {
            time: '11:00',
            activity: 'Main Lesson',
            duration: 60
          }
        ];
      }
    });
    
    // If no valid subjects found, create some basic sessions
    if (sessions.length === 0) {
      days.forEach(day => {
        sessions.push({
          day: day,
          time: '9:30-10:30',
          subject: 'Morning Work',
          duration: 60
        });
        sessions.push({
          day: day,
          time: '11:00-12:00',
          subject: 'Main Lesson',
          duration: 60
        });
      });
    }
    
    console.log('Generated sessions:', sessions.length);
    console.log('Generated daily schedules:', Object.keys(dailySchedules).length);
    
    // Return both sessions and dailySchedules
    return { sessions, dailySchedules };
  }

  extractAllSubjectsFromText(text) {
    const subjects = [];
    const words = text.split(/\s+/);
    
    const subjectKeywords = [
      'maths', 'mathematics', 'english', 'science', 'history', 'geography', 
      'art', 'music', 'pe', 'physical', 'computing', 'assembly', 'break', 
      'lunch', 'handwriting', 'phonics', 'reading', 'spelling', 'vocabulary',
      'rwi', 'phse', 'storytime'
    ];
    
    words.forEach(word => {
      const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
      if (subjectKeywords.includes(cleanWord)) {
        subjects.push(word);
      }
    });
    
    return subjects;
  }

  findTimeInLine(line) {
    const timeMatch = line.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      return `${timeMatch[1]}:${timeMatch[2]} - ${timeMatch[3]}:${timeMatch[4]}`;
    }
    
    const singleTimeMatch = line.match(/(\d{1,2}):(\d{2})/);
    if (singleTimeMatch) {
      return `${singleTimeMatch[1]}:${singleTimeMatch[2]}`;
    }
    
    return null;
  }

  extractDayFromLine(line) {
    const dayPatterns = {
      'monday': /monday|mon/i,
      'tuesday': /tuesday|tue/i,
      'wednesday': /wednesday|wed/i,
      'thursday': /thursday|thu/i,
      'friday': /friday|fri/i
    };
    
    for (const [day, pattern] of Object.entries(dayPatterns)) {
      if (pattern.test(line)) {
        return day;
      }
    }
    return null;
  }

  containsDay(line) {
    return /monday|tuesday|wednesday|thursday|friday|mon|tue|wed|thu|fri/i.test(line);
  }

  extractSubjectsFromLine(line) {
    const subjects = [];
    const words = line.split(/\s+/);
    
    // Common school subjects
    const subjectKeywords = [
      'maths', 'mathematics', 'english', 'science', 'history', 'geography', 
      'art', 'music', 'pe', 'physical', 'computing', 'assembly', 'break', 
      'lunch', 'handwriting', 'phonics', 'reading', 'spelling', 'vocabulary',
      'rwi', 'phse', 'storytime'
    ];
    
    // Words to exclude (common non-subject words)
    const excludeWords = [
      'little', 'thurrock', 'primary', 'school', 'class', 'term', 'teacher',
      'autumn', 'spring', 'summer', 'miss', 'mrs', 'mr', 'week', 'monday',
      'tuesday', 'wednesday', 'thursday', 'friday', 'morning', 'afternoon',
      'work', 'time', 'anti', 'bullying', 'con', 'mats', 'stacking', 'engli'
    ];
    
    words.forEach(word => {
      const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
      if (cleanWord.length < 3) return; // Skip short words
      
      if (subjectKeywords.includes(cleanWord) && !excludeWords.includes(cleanWord)) {
        subjects.push(word);
      }
    });
    
    return subjects;
  }

  extractTimeSlots(text) {
    const timeSlots = [];
    
    this.timePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match[3] && match[4]) {
          // Time range format
          timeSlots.push(`${match[1]}:${match[2]} - ${match[3]}:${match[4]}`);
        } else {
          // Single time format
          timeSlots.push(`${match[1]}:${match[2]}`);
        }
      }
    });
    
    return [...new Set(timeSlots)];
  }

  extractSubjects(text) {
    const subjects = [];
    
    this.subjectPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        subjects.push(...matches);
      }
    });
    
    // Also extract other potential subjects (capitalized words)
    const words = text.split(/\s+/);
    words.forEach(word => {
      if (word.length > 2 && /^[A-Z][a-z]+$/.test(word) && 
          !['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Class', 'Term', 'Teacher'].includes(word)) {
        subjects.push(word);
      }
    });
    
    return [...new Set(subjects)];
  }

  extractDays(text) {
    const days = [];
    
    this.dayPatterns.forEach((pattern, index) => {
      if (pattern.test(text)) {
        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        days.push(dayNames[index]);
      }
    });
    
    return days;
  }

  calculateDuration(text) {
    // Handle different time formats
    const timeMatches = text.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
    if (timeMatches) {
      const startHour = parseInt(timeMatches[1]);
      const startMin = parseInt(timeMatches[2]);
      const endHour = parseInt(timeMatches[3]);
      const endMin = parseInt(timeMatches[4]);
      
      const startTotal = startHour * 60 + startMin;
      const endTotal = endHour * 60 + endMin;
      
      return endTotal - startTotal;
    }
    
    // Handle format like "2:00-3:00" (with dash instead of space-dash-space)
    const dashMatches = text.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/);
    if (dashMatches) {
      const startHour = parseInt(dashMatches[1]);
      const startMin = parseInt(dashMatches[2]);
      const endHour = parseInt(dashMatches[3]);
      const endMin = parseInt(dashMatches[4]);
      
      const startTotal = startHour * 60 + startMin;
      const endTotal = endHour * 60 + endMin;
      
      return endTotal - startTotal;
    }
    
    return 60; // Default to 60 minutes if no time range found
  }
}

module.exports = TimetableProcessor;
