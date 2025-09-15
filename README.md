# TAS Extractor Service

A Node.js service for extracting timetable and schedule data from multiple document formats including images, PDFs, DOCX, and text files. Built with OCR technology and specialized timetable processing.

## 🚀 Features

- **Multi-format Support**: Images (JPEG, PNG, GIF, BMP, WebP, TIFF), PDF, DOCX, TXT
- **OCR Processing**: Tesseract.js integration with image preprocessing
- **Timetable Intelligence**: Specialized extraction for educational timetables and schedules
- **Structured Output**: UI-ready JSON format optimized for frontend consumption
- **Security**: Helmet.js, CORS, rate limiting, file validation
- **Health Monitoring**: Health check endpoint for service monitoring

## 📦 Installation

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd TAS-Extractor-Service
   npm install
   ```

2. **Start the Service**
   ```bash
   npm start
   ```

The service will start on port 3000 by default.

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |

## 📡 API Endpoints

### Universal Document Extraction
```http
POST /extract
Content-Type: multipart/form-data
```

**Request Body:**
- `document`: File (Image, PDF, DOCX, or TXT)

**Response:**
```json
{
  "success": true,
  "extractionType": "timetable",
  "fileType": ".jpg",
  "data": {
    "documentInfo": {
      "type": "weekly_timetable",
      "school": "Example School",
      "class": "Grade 5A",
      "term": "Term 1",
      "teacher": "Ms. Smith",
      "week": "Week 3"
    },
    "schedule": {
      "type": "weekly_grid",
      "sessions": [...],
      "dailySchedules": {...}
    },
    "ui": {
      "displayTitle": "Example School - Grade 5A",
      "subtitle": "Term 1 Week 3",
      "teacher": "Ms. Smith",
      "scheduleGrid": [...],
      "summary": {
        "totalSessions": 25,
        "subjects": ["Math", "English", "Science"],
        "days": ["Monday", "Tuesday", "Wednesday"],
        "timeSlots": ["9:00-10:00", "10:00-11:00"],
        "timeRange": "9:00 AM - 3:00 PM"
      }
    },
    "metadata": {
      "totalSessions": 25,
      "subjects": ["Math", "English", "Science"],
      "days": ["Monday", "Tuesday", "Wednesday"],
      "timeSlots": ["9:00-10:00", "10:00-11:00"],
      "processingMethod": "ocr",
      "confidence": 0.95
    }
  },
  "processedAt": "2024-01-15T10:30:00.000Z",
  "originalFileName": "timetable.jpg",
  "fileSize": 2048576
}
```

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "OK",
  "message": "Image Extractor Service is running",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🔒 Security Features

- **File Type Validation**: Only allows supported document formats
- **File Size Limits**: 10MB maximum file size
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS Protection**: Allows all origins for local development
- **Security Headers**: Helmet.js for enhanced security

## 📁 File Support

### Supported Formats
- **Images**: JPEG, PNG, GIF, BMP, WebP, TIFF
- **Documents**: PDF, DOCX, TXT

### Processing Methods
- **Images**: OCR with Tesseract.js + image preprocessing with Sharp
- **PDF**: Text extraction with pdf-parse
- **DOCX**: Document parsing with mammoth
- **TXT**: Direct text processing

## 🚀 Usage Examples

### Upload Image for Timetable Extraction
```bash
curl -X POST http://localhost:3000/extract \
  -F "document=@timetable.jpg"
```

### Upload PDF Document
```bash
curl -X POST http://localhost:3000/extract \
  -F "document=@schedule.pdf"
```

### Check Service Health
```bash
curl http://localhost:3000/health
```

## 🛠 Development

### Prerequisites
- Node.js 16+
- npm

### Local Development
```bash
# Install dependencies
npm install

# Start server
npm start

# Service will be available at http://localhost:3000
```

### Testing
```bash
# Test with sample image
node test-client.js
```

## 📊 Performance

- **Average Processing Time**: 2-5 seconds per document
- **Supported File Size**: Up to 10MB
- **Rate Limited**: For stability
- **Memory Usage**: Optimized with automatic cleanup

## 🐛 Troubleshooting

### Common Issues

1. **File Upload Fails**
   - Check file size (max 10MB)
   - Verify file format is supported
   - Ensure proper Content-Type header

2. **OCR Quality Issues**
   - Use high-resolution images
   - Ensure good contrast and lighting
   - Avoid skewed or rotated images

3. **Service Not Starting**
   - Check if port 3000 is available
   - Verify Node.js version (16+)
   - Check for missing dependencies

### Error Codes

- `400`: Bad request (missing file, invalid format)
- `413`: File too large (>10MB)
- `429`: Rate limit exceeded
- `500`: Internal server error

## 📝 API Response Format

All API responses follow a consistent structure:

```json
{
  "success": boolean,
  "error": "string (if success=false)",
  "message": "string (if success=false)",
  "data": object,
  "processedAt": "ISO timestamp",
  "originalFileName": "string",
  "fileSize": number
}
```

## 🔧 Configuration

### File Limits

- Maximum file size: 10MB
- Supported formats: Images, PDF, DOCX, TXT
- Rate limit: 100 requests per 15 minutes

## 📚 Dependencies

### Core Dependencies
- **express**: Web framework
- **multer**: File upload handling
- **tesseract.js**: OCR processing
- **sharp**: Image preprocessing
- **pdf-parse**: PDF text extraction
- **mammoth**: DOCX document parsing

### Security Dependencies
- **helmet**: Security headers
- **cors**: Cross-origin resource sharing
- **express-rate-limit**: Rate limiting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));
```

## Dependencies

- **Express.js**: Web framework
- **Multer**: File upload handling
- **Tesseract.js**: OCR engine
- **Sharp**: Image processing and optimization
- **CORS**: Cross-origin resource sharing
- **Helmet**: Security headers
- **Express Rate Limit**: Rate limiting middleware

## Architecture

The service follows a clean architecture pattern:

1. **Input Validation**: Validates file type and size
2. **Image Preprocessing**: Enhances image quality using Sharp
3. **OCR Processing**: Extracts text using Tesseract.js
4. **Data Structuring**: Organizes results into generalized JSON
5. **Cleanup**: Removes temporary files
6. **Response**: Returns structured data to client

## Performance Considerations

- Images are preprocessed for optimal OCR results
- Temporary files are automatically cleaned up
- Memory usage is optimized through streaming
- Rate limiting prevents abuse
- File size limits prevent memory exhaustion

## Security Features

- File type validation
- File size limits
- Rate limiting per IP
- Security headers via Helmet
- CORS configuration
- Input sanitization
- Automatic file cleanup

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions, please create an issue in the repository or contact the development team.
