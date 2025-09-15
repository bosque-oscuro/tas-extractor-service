const express = require('express');
const multer = require('multer');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const DocumentProcessor = require('./document-processor');

const app = express();
const PORT = 3000;

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept multiple file types
  const allowedMimes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/tiff',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not supported! Allowed: Images, PDF, DOCX, TXT'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Initialize processors
const documentProcessor = new DocumentProcessor();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Image Extractor Service is running',
    timestamp: new Date().toISOString()
  });
});

// Universal document extraction endpoint - supports Images, PDF, DOCX, TXT
app.post('/extract', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided',
        message: 'Please upload a file (Image, PDF, DOCX, or TXT)'
      });
    }

    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    
    // Use the universal document processor
    const extractedData = await documentProcessor.processDocument(filePath);
    
    // Clean up uploaded file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Create unified response format
    const response = {
      success: true,
      extractionType: 'timetable',
      fileType: fileExtension,
      data: {
        documentInfo: {
          type: extractedData.documentType,
          school: extractedData.schoolInfo.name,
          class: extractedData.schoolInfo.class,
          term: extractedData.schoolInfo.term,
          teacher: extractedData.schoolInfo.teacher,
          week: extractedData.schoolInfo.week
        },
        schedule: {
          type: extractedData.schedule.type,
          sessions: extractedData.schedule.sessions,
          dailySchedules: extractedData.schedule.dailySchedules
        },
        ui: {
          displayTitle: `${extractedData.schoolInfo.name || 'School'} - ${extractedData.schoolInfo.class || 'Class'}`,
          subtitle: `${extractedData.schoolInfo.term || ''} ${extractedData.schoolInfo.week ? 'Week ' + extractedData.schoolInfo.week : ''}`.trim(),
          teacher: extractedData.schoolInfo.teacher,
          scheduleGrid: formatScheduleForUI(extractedData.schedule),
          summary: {
            totalSessions: extractedData.metadata.totalSessions,
            subjects: extractedData.metadata.subjects,
            days: extractedData.metadata.days,
            timeSlots: extractedData.metadata.timeSlots,
            timeRange: getTimeRange(extractedData.metadata.timeSlots)
          }
        },
        metadata: extractedData.metadata
      },
      processedAt: new Date().toISOString(),
      originalFileName: req.file.originalname,
      fileSize: req.file.size
    };
    
    res.json(response);
    
  } catch (error) {
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('Error processing document:', error);
    res.status(500).json({
      success: false,
      error: 'Document processing failed',
      message: error.message,
      fileType: req.file ? path.extname(req.file.originalname).toLowerCase() : 'unknown'
    });
  }
});

// Legacy timetable endpoint (redirects to main extract endpoint)
app.post('/extract/timetable', upload.single('image'), (req, res) => {
  // Simple redirect to main extract endpoint
  req.file.fieldname = 'document';
  req.url = '/extract';
  req.method = 'POST';
  app._router.handle(req, res);
});

// Helper function to format schedule data for UI consumption
function formatScheduleForUI(schedule) {
  if (schedule.type === 'daily_schedule') {
    return Object.keys(schedule.dailySchedules).map(day => ({
      day: day,
      activities: schedule.dailySchedules[day]
    }));
  } else {
    // Group sessions by day for weekly timetables
    const grouped = {};
    schedule.sessions.forEach(session => {
      if (!grouped[session.day]) {
        grouped[session.day] = [];
      }
      grouped[session.day].push(session);
    });
    
    return Object.keys(grouped).map(day => ({
      day: day,
      sessions: grouped[day]
    }));
  }
}

// Helper function to get time range
function getTimeRange(timeSlots) {
  if (!timeSlots || timeSlots.length === 0) return null;
  
  const times = timeSlots.map(slot => {
    const match = slot.match(/(\d{1,2}):(\d{2})/);
    return match ? parseInt(match[1]) * 60 + parseInt(match[2]) : 0;
  }).filter(time => time > 0);
  
  if (times.length === 0) return null;
  
  const earliest = Math.min(...times);
  const latest = Math.max(...times);
  
  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  };
  
  return `${formatTime(earliest)} - ${formatTime(latest)}`;
}

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large',
        message: 'File size should not exceed 10MB'
      });
    }
  }
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: 'The requested endpoint does not exist'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 TAS Extractor Service is running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`📤 Upload endpoint: http://localhost:${PORT}/extract`);
});

module.exports = app;
