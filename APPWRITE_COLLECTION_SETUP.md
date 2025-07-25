# Appwrite Collection Setup Guide

## Quick Setup (Recommended)

Run the automated setup script:

```bash
cd /Users/hompushparajmehta/Pushparaj/github/placement/mindspace/backend
node setup-appwrite-collections.js
```

## Manual Setup via Appwrite Console

### 1. Journals Collection

1. Go to Appwrite Console → Database → Collections
2. Create/Edit the `journals` collection
3. Add these attributes:

| Attribute | Type | Size | Required | Array | Default |
|-----------|------|------|----------|-------|---------|
| userId | String | 36 | ✅ | ❌ | - |
| title | String | 200 | ✅ | ❌ | - |
| content | String | 10000 | ✅ | ❌ | - |
| mood | String | 1000 | ✅ | ❌ | - |
| tags | String | 50 | ❌ | ✅ | - |
| aiInsights | String | 2000 | ❌ | ❌ | - |
| attachments | String | 1000 | ❌ | ❌ | - |
| encrypted | Boolean | - | ✅ | ❌ | false |

4. Create indexes:
   - `userId_index` (Key) on `userId`
   - `createdAt_index` (Key) on `$createdAt` (DESC)

### 2. Companies Collection

Add these attributes:

| Attribute | Type | Size | Required | Array | Default |
|-----------|------|------|----------|-------|---------|
| name | String | 100 | ✅ | ❌ | - |
| domain | String | 100 | ✅ | ❌ | - |
| logo | String | 255 | ❌ | ❌ | - |
| adminId | String | 36 | ✅ | ❌ | - |
| settings | String | 1000 | ❌ | ❌ | - |
| subscription | String | 1000 | ❌ | ❌ | - |

Create indexes:
- `domain_unique` (Unique) on `domain`
- `adminId_index` (Key) on `adminId`

### 3. Moods Collection

Add these attributes:

| Attribute | Type | Size/Range | Required | Array | Default |
|-----------|------|------------|----------|-------|---------|
| userId | String | 36 | ✅ | ❌ | - |
| current | String | 20 | ✅ | ❌ | - |
| intensity | Integer | 1-10 | ✅ | ❌ | - |
| timestamp | DateTime | - | ✅ | ❌ | - |
| triggers | String | 100 | ❌ | ✅ | - |
| notes | String | 500 | ❌ | ❌ | - |

Create indexes:
- `userId_timestamp_index` (Key) on `userId` (ASC), `timestamp` (DESC)

## Data Format Notes

### Mood Field (JSON String)
```json
{
  "current": "anxious",
  "intensity": 6,
  "timestamp": "2025-07-25T07:17:48.623Z",
  "triggers": ["work stress", "deadline pressure"],
  "notes": "Feeling overwhelmed today"
}
```

### Attachments Field (JSON String)
```json
{
  "images": ["image-url-1", "image-url-2"],
  "voiceRecording": "audio-file-url"
}
```

### Tags Field (Array of Strings)
```json
["self-reflection", "work", "stress", "growth"]
```

### AI Insights Field (JSON String)
```json
{
  "sentiment": 0.3,
  "emotions": ["anxiety", "determination"],
  "themes": ["work-life balance", "personal growth"],
  "suggestions": ["Try meditation", "Take regular breaks"]
}
```

## Permissions Setup

For each collection, set these permissions:

### Read Permissions:
- `users` (authenticated users can read their own data)

### Write Permissions:
- `users` (authenticated users can write their own data)

### Create Permissions:
- `users` (authenticated users can create documents)

### Update Permissions:
- `users` (authenticated users can update their own documents)

### Delete Permissions:
- `users` (authenticated users can delete their own documents)

## After Setup

Once completed, your journal creation should work without the "Unknown attribute" error.

Test with:
```bash
curl -X POST http://localhost:3000/api/v1/journal \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Test Entry",
    "content": "This is a test journal entry",
    "mood": {
      "current": "happy",
      "intensity": 7,
      "timestamp": ""
    },
    "tags": ["test"]
  }'
```