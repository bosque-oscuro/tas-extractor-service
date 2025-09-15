const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const TimetableProcessor = require('./timetable-processor');

class DocumentProcessor {
  constructor() {
    this.timetableProcessor = new TimetableProcessor();
  }

  async processDocument(filePath) {
    const fileExtension = path.extname(filePath).toLowerCase();
    let extractedText = '';

    try {
      switch (fileExtension) {
        case '.pdf':
          extractedText = await this.extractFromPDF(filePath);
          break;
        case '.docx':
          extractedText = await this.extractFromDOCX(filePath);
          break;
        case '.txt':
          extractedText = await this.extractFromTXT(filePath);
          break;
        case '.jpg':
        case '.jpeg':
        case '.png':
        case '.gif':
        case '.bmp':
        case '.webp':
        case '.tiff':
          return await this.timetableProcessor.processImage(filePath);
        default:
          throw new Error(`Unsupported file type: ${fileExtension}`);
      }

      // Process the extracted text using the same timetable logic
      return this.processExtractedText(extractedText);

    } catch (error) {
      throw new Error(`Document processing failed: ${error.message}`);
    }
  }

  async extractFromPDF(filePath) {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      console.log('PDF text extracted:', data.text.substring(0, 200) + '...');
      return data.text;
    } catch (error) {
      throw new Error(`PDF extraction failed: ${error.message}`);
    }
  }

  async extractFromDOCX(filePath) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      console.log('DOCX text extracted:', result.value.substring(0, 200) + '...');
      return result.value;
    } catch (error) {
      throw new Error(`DOCX extraction failed: ${error.message}`);
    }
  }

  async extractFromTXT(filePath) {
    try {
      const text = fs.readFileSync(filePath, 'utf8');
      console.log('TXT text extracted:', text.substring(0, 200) + '...');
      return text;
    } catch (error) {
      throw new Error(`TXT extraction failed: ${error.message}`);
    }
  }

  processExtractedText(text) {
    // Use the same parsing logic as the timetable processor
    const structuredData = this.timetableProcessor.parseScheduleData(text, [], []);
    
    // Add document type detection based on text content
    structuredData.documentType = this.detectDocumentTypeFromText(text);
    structuredData.schedule.type = structuredData.documentType;
    
    return structuredData;
  }

  detectDocumentTypeFromText(text) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('daily schedule')) {
      return 'daily_schedule';
    } else if (lowerText.includes('reception')) {
      return 'reception_timetable';
    } else if (lowerText.includes('class:') || lowerText.includes('term:') || 
               lowerText.includes('teacher:') || lowerText.includes('primary school')) {
      return 'class_timetable';
    } else if (lowerText.includes('timetable') || lowerText.includes('schedule')) {
      return 'weekly_timetable';
    } else if (lowerText.includes('monday') && lowerText.includes('tuesday') && 
               lowerText.includes('wednesday')) {
      return 'class_timetable';
    }
    
    return 'class_timetable';
  }

  getSupportedFileTypes() {
    return [
      '.pdf',   // PDF documents
      '.docx',  // Microsoft Word documents
      '.txt',   // Plain text files
      '.jpg',   // JPEG images
      '.jpeg',  // JPEG images
      '.png',   // PNG images
      '.gif',   // GIF images
      '.bmp',   // Bitmap images
      '.webp',  // WebP images
      '.tiff'   // TIFF images
    ];
  }

  isFileTypeSupported(filePath) {
    const fileExtension = path.extname(filePath).toLowerCase();
    return this.getSupportedFileTypes().includes(fileExtension);
  }
}

module.exports = DocumentProcessor;
