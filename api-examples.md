# API Examples for Timetable Extraction

## Endpoints

### 1. General Extraction
```
POST /extract
```

### 2. Specialized Timetable Extraction
```
POST /extract/timetable
```

## Usage Examples

### cURL Examples

#### General Extraction
```bash
curl -X POST \
  http://localhost:3000/extract \
  -F 'image=@timetable.jpg'
```

#### Timetable-Specific Extraction
```bash
curl -X POST \
  http://localhost:3000/extract/timetable \
  -F 'image=@timetable.jpg'
```

#### General Extraction with Type Parameter
```bash
curl -X POST \
  http://localhost:3000/extract \
  -F 'image=@timetable.jpg' \
  -F 'type=timetable'
```

### JavaScript/Fetch Examples

#### Timetable Extraction
```javascript
const formData = new FormData();
formData.append('image', fileInput.files[0]);

fetch('http://localhost:3000/extract/timetable', {
  method: 'POST',
  body: formData
})
.then(response => response.json())
.then(data => {
  if (data.success) {
    console.log('School:', data.data.documentInfo.school);
    console.log('Class:', data.data.documentInfo.class);
    console.log('Subjects:', data.data.ui.summary.subjects);
    console.log('Schedule:', data.data.schedule);
  }
});
```

## Sample Response Formats

### Timetable Extraction Response
```json
{
  "success": true,
  "extractionType": "timetable",
  "data": {
    "documentInfo": {
      "type": "class_timetable",
      "school": "Little Thurrock Primary School",
      "class": "2EJ",
      "term": "Autumn 2 2024",
      "teacher": "Miss Joynes",
      "week": null
    },
    "schedule": {
      "type": "class_timetable",
      "sessions": [
        {
          "day": "monday",
          "time": "9:30 - 10:30",
          "subject": "Maths",
          "duration": 60
        }
      ],
      "dailySchedules": {}
    },
    "ui": {
      "displayTitle": "Little Thurrock Primary School - 2EJ",
      "subtitle": "Autumn 2 2024",
      "teacher": "Miss Joynes",
      "scheduleGrid": [
        {
          "day": "monday",
          "sessions": [
            {
              "day": "monday",
              "time": "9:30 - 10:30",
              "subject": "Maths",
              "duration": 60
            }
          ]
        }
      ],
      "summary": {
        "totalSessions": 25,
        "subjects": ["Maths", "English", "Science", "History", "Art"],
        "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "timeRange": "8:35 - 15:15"
      }
    },
    "metadata": {
      "totalSessions": 25,
      "subjects": ["Maths", "English", "Science"],
      "timeSlots": ["9:30 - 10:30", "10:30 - 11:00"],
      "days": ["Monday", "Tuesday", "Wednesday"]
    }
  },
  "processedAt": "2025-09-15T08:20:02.000Z",
  "originalFileName": "timetable.jpg",
  "fileSize": 245760
}
```

### Daily Schedule Response
```json
{
  "success": true,
  "extractionType": "timetable",
  "data": {
    "documentInfo": {
      "type": "daily_schedule",
      "school": null,
      "class": null,
      "term": null,
      "teacher": null
    },
    "schedule": {
      "type": "daily_schedule",
      "sessions": [],
      "dailySchedules": {
        "monday": [
          {
            "time": "8:35",
            "activity": "Students are allowed inside",
            "duration": null
          },
          {
            "time": "9:00",
            "activity": "Late Bell Rings",
            "duration": null
          }
        ]
      }
    },
    "ui": {
      "displayTitle": "School - Class",
      "subtitle": "",
      "teacher": null,
      "scheduleGrid": [
        {
          "day": "monday",
          "activities": [
            {
              "time": "8:35",
              "activity": "Students are allowed inside"
            }
          ]
        }
      ],
      "summary": {
        "totalSessions": 0,
        "subjects": [],
        "days": ["Monday"],
        "timeRange": "8:35 - 15:15"
      }
    }
  }
}
```

## UI Integration Guide

### Displaying Timetable Data

The API provides UI-ready data in the `data.ui` section:

```javascript
// Extract UI-ready data
const uiData = response.data.ui;

// Display header information
document.getElementById('title').textContent = uiData.displayTitle;
document.getElementById('subtitle').textContent = uiData.subtitle;
document.getElementById('teacher').textContent = uiData.teacher;

// Display schedule grid
uiData.scheduleGrid.forEach(dayData => {
  const dayElement = document.createElement('div');
  dayElement.className = 'day-schedule';
  
  // For weekly timetables
  if (dayData.sessions) {
    dayData.sessions.forEach(session => {
      const sessionElement = document.createElement('div');
      sessionElement.innerHTML = `
        <span class="time">${session.time}</span>
        <span class="subject">${session.subject}</span>
      `;
      dayElement.appendChild(sessionElement);
    });
  }
  
  // For daily schedules
  if (dayData.activities) {
    dayData.activities.forEach(activity => {
      const activityElement = document.createElement('div');
      activityElement.innerHTML = `
        <span class="time">${activity.time}</span>
        <span class="activity">${activity.activity}</span>
      `;
      dayElement.appendChild(activityElement);
    });
  }
});

// Display summary statistics
document.getElementById('total-sessions').textContent = uiData.summary.totalSessions;
document.getElementById('subjects').textContent = uiData.summary.subjects.join(', ');
document.getElementById('time-range').textContent = uiData.summary.timeRange;
```

## Testing

Use the provided test scripts:

```bash
# Test timetable extraction
node timetable-test.js path/to/timetable.jpg

# Test both general and timetable extraction
node timetable-test.js path/to/timetable.jpg both

# Test with the original test client
node test-client.js path/to/image.jpg
```
