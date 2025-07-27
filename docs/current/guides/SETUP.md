# MindSpace Backend Setup Guide

## 🚀 Quick Start

This guide will help you set up and run the MindSpace backend locally for development.

## 📋 Prerequisites

### Required Software
- **Bun**: v1.0.0 or higher (JavaScript runtime)
- **Node.js**: v18.0.0 or higher (for compatibility)
- **Git**: Latest version
- **Code Editor**: VS Code recommended

### External Services
- **Appwrite**: Backend-as-a-Service (database, auth, storage)
- **Google Cloud**: For OAuth2 and Gemini AI integration
- **Email Service**: SMTP provider (optional for development)

## 🛠️ Installation

### 1. Install Bun
```bash
# Install Bun (macOS/Linux)
curl -fsSL https://bun.sh/install | bash

# Install Bun (Windows)
powershell -c "irm bun.sh/install.ps1 | iex"

# Verify installation
bun --version
```

### 2. Clone Repository
```bash
git clone <repository-url>
cd mindspace/backend
```

### 3. Install Dependencies
```bash
# Install all dependencies
bun install

# This installs:
# - Elysia.js (web framework)
# - Appwrite SDK (backend services)
# - Zod (validation)
# - Winston (logging)
# - And other dependencies
```

## ⚙️ Environment Configuration

### 1. Create Environment File
```bash
# Copy example environment file
cp .env.example .env

# Edit with your values
nano .env
```

### 2. Required Environment Variables

```bash
# === SERVER CONFIGURATION ===
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:8081

# === APPWRITE CONFIGURATION ===
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key

# === JWT CONFIGURATION ===
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-too
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# === AI CONFIGURATION ===
GEMINI_API_KEY=your_gemini_api_key

# === EMAIL CONFIGURATION (Optional for development) ===
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@mindspace.com

# === GOOGLE OAUTH2 (Optional) ===
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# === LOGGING ===
LOG_LEVEL=debug
```

## 🗄️ Database Setup (Appwrite)

### 1. Create Appwrite Project
1. Go to [Appwrite Cloud](https://cloud.appwrite.io/) or self-host
2. Create a new project
3. Copy Project ID to your `.env` file

### 2. Generate API Key
1. Go to Settings → API Keys
2. Create a new API key with all permissions
3. Copy API key to your `.env` file

### 3. Setup Database Collections
```bash
# Run the database setup script
bun run setup:database

# This creates:
# - Users collection with proper attributes
# - Journal entries collection
# - Mood tracking collection
# - Company collection (enterprise)
# - File storage buckets
```

### 4. Manual Collection Setup (if script fails)
If the automatic setup fails, create collections manually:

#### Users Collection (`users`)
```json
{
  "attributes": [
    {"key": "email", "type": "string", "size": 255, "required": true},
    {"key": "name", "type": "string", "size": 255, "required": true},
    {"key": "avatar", "type": "string", "size": 2048, "required": false},
    {"key": "role", "type": "string", "size": 50, "required": true},
    {"key": "companyId", "type": "string", "size": 255, "required": false},
    {"key": "permissions", "type": "string", "size": 1000, "required": true},
    {"key": "subscription", "type": "string", "size": 500, "required": true},
    {"key": "preferences", "type": "string", "size": 1000, "required": true},
    {"key": "lastLogin", "type": "datetime", "required": false},
    {"key": "isActive", "type": "boolean", "required": true}
  ],
  "indexes": [
    {"key": "email_idx", "type": "unique", "attributes": ["email"]},
    {"key": "company_idx", "type": "key", "attributes": ["companyId"]},
    {"key": "role_idx", "type": "key", "attributes": ["role"]}
  ]
}
```

#### Journal Entries Collection (`journal_entries`)
```json
{
  "attributes": [
    {"key": "userId", "type": "string", "size": 255, "required": true},
    {"key": "title", "type": "string", "size": 255, "required": true},
    {"key": "content", "type": "string", "size": 10000, "required": true},
    {"key": "mood", "type": "string", "size": 1000, "required": true},
    {"key": "tags", "type": "string", "size": 1000, "required": false},
    {"key": "attachments", "type": "string", "size": 2000, "required": false},
    {"key": "aiInsights", "type": "string", "size": 2000, "required": false},
    {"key": "encrypted", "type": "boolean", "required": true}
  ],
  "indexes": [
    {"key": "user_idx", "type": "key", "attributes": ["userId"]},
    {"key": "created_idx", "type": "key", "attributes": ["$createdAt"]},
    {"key": "title_idx", "type": "fulltext", "attributes": ["title", "content"]}
  ]
}
```

#### Mood Entries Collection (`mood_entries`)
```json
{
  "attributes": [
    {"key": "userId", "type": "string", "size": 255, "required": true},
    {"key": "mood", "type": "string", "size": 1000, "required": true},
    {"key": "location", "type": "string", "size": 255, "required": false},
    {"key": "weather", "type": "string", "size": 100, "required": false},
    {"key": "activities", "type": "string", "size": 1000, "required": false},
    {"key": "sleepQuality", "type": "integer", "min": 1, "max": 10, "required": false},
    {"key": "stressLevel", "type": "integer", "min": 1, "max": 10, "required": false},
    {"key": "energyLevel", "type": "integer", "min": 1, "max": 10, "required": false},
    {"key": "socialInteraction", "type": "string", "size": 255, "required": false}
  ],
  "indexes": [
    {"key": "user_idx", "type": "key", "attributes": ["userId"]},
    {"key": "timestamp_idx", "type": "key", "attributes": ["$createdAt"]}
  ]
}
```

## 🎨 Google Services Setup (Optional)

### 1. Google Cloud Console Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable APIs:
   - Google+ API (for OAuth2)
   - Google AI Studio API (for Gemini)

### 2. OAuth2 Credentials
1. Go to APIs & Services → Credentials
2. Create OAuth 2.0 Client ID
3. Add authorized redirect URIs:
   ```
   http://localhost:3000/api/v1/auth/oauth2/callback
   ```
4. Copy Client ID and Secret to `.env`

### 3. Gemini AI API Key
1. Go to [Google AI Studio](https://makersuite.google.com/)
2. Create API key
3. Copy key to `.env` file

## 🚀 Running the Application

### Development Mode
```bash
# Start development server with hot reload
bun run dev

# The server will start on http://localhost:3000
# API documentation available at http://localhost:3000/swagger
```

### Production Mode
```bash
# Build the application
bun run build

# Start production server
bun run start
```

### Other Useful Commands
```bash
# Type checking
bun run type-check

# Run tests
bun test

# View logs
tail -f logs/app.log

# Check health
curl http://localhost:3000/health
```

## ✅ Verification

### 1. Health Check
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2025-01-27T10:30:00.000Z",
    "version": "1.0.0",
    "services": {
      "total": 5,
      "healthy": 5,
      "unhealthy": 0
    }
  }
}
```

### 2. API Documentation
Visit: `http://localhost:3000/swagger`

You should see the interactive API documentation with all endpoints.

### 3. Test Registration
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123",
    "name": "Test User"
  }'
```

### 4. Database Verification
1. Go to your Appwrite console
2. Check that collections were created
3. Verify test user was created in users collection

## 🛠️ Development Tools

### Recommended VS Code Extensions
```json
{
  "recommendations": [
    "oven.bun-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-json"
  ]
}
```

### VS Code Settings
Create `.vscode/settings.json`:
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.autoImports": true,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## 🐛 Troubleshooting

### Common Issues

#### 1. "Connection refused" Error
**Problem**: Cannot connect to Appwrite
**Solution**: 
- Check Appwrite endpoint URL in `.env`
- Verify project ID is correct
- Ensure API key has proper permissions

#### 2. "JWT_SECRET is not defined"
**Problem**: Missing JWT configuration
**Solution**: 
- Add JWT_SECRET to `.env` file
- Make sure it's a long, random string
- Restart the server

#### 3. "Port already in use"
**Problem**: Port 3000 is occupied
**Solution**: 
```bash
# Kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Or change port in .env
PORT=3001
```

#### 4. Database Collections Not Created
**Problem**: Setup script failed
**Solution**: 
- Check Appwrite API key permissions
- Create collections manually (see setup section)
- Verify project ID is correct

#### 5. OAuth2 Not Working
**Problem**: Google OAuth fails
**Solution**: 
- Check Google client ID/secret
- Verify redirect URLs in Google Console
- Ensure OAuth is enabled in Appwrite

### Debug Mode
```bash
# Enable debug logging
LOG_LEVEL=debug bun run dev

# Check logs
tail -f logs/app.log
tail -f logs/app-error.log
```

### Reset Development Environment
```bash
# Clear all data and start fresh
bun run reset:dev

# This will:
# - Clear all database collections
# - Reset API keys (if needed)
# - Clear logs
```

## 📚 Next Steps

After successful setup:

1. **Read the API Documentation**: Visit `/swagger` for interactive docs
2. **Check Architecture Guide**: `docs/current/architecture/README.md`
3. **Review Features**: `docs/current/reference/FEATURES.md`
4. **Development Workflow**: `docs/current/guides/DEVELOPMENT.md`

## 🤝 Getting Help

If you encounter issues:

1. Check the logs in `logs/` directory
2. Review environment variables
3. Verify Appwrite configuration
4. Check the troubleshooting section above
5. Consult the architecture documentation

---

**🎉 You're ready to start developing with the MindSpace backend!**

The server should now be running at `http://localhost:3000` with full API documentation available at `/swagger`.