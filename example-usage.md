# Example Usage

## Starting the Service

```bash
# Install dependencies (if not already done)
npm install

# Start the service
npm start
```

The service will be available at `http://localhost:3000`

## Testing with cURL

```bash
# Test with a sample image
curl -X POST \
  http://localhost:3000/extract \
  -F 'image=@/path/to/your/image.jpg'
```

## Testing with the provided test client

```bash
# First, make sure you have a sample image
node test-client.js /path/to/your/sample-image.jpg
```

## Sample Response Format

When you upload an image, you'll get a response like this:

```json
{
  "success": true,
  "data": {
    "extractedText": "Your extracted text will appear here...",
    "confidence": 87.5,
    "metadata": {
      "totalWords": 25,
      "totalLines": 5,
      "totalParagraphs": 2
    },
    "detailedResults": {
      "words": [...],
      "lines": [...],
      "paragraphs": [...]
    }
  },
  "processedAt": "2025-09-15T08:13:18.000Z",
  "originalFileName": "sample.jpg",
  "fileSize": 245760
}
```

## Health Check

```bash
curl http://localhost:3000/health
```

## Supported Image Formats

- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- BMP (.bmp)
- WebP (.webp)
- TIFF (.tiff, .tif)

## File Size Limits

- Maximum file size: 10MB
- Rate limit: 100 requests per 15 minutes per IP address
