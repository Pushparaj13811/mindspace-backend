export const openAPIInfo = {
  title: 'MindSpace API',
  version: '1.0.0',
  description: `
**MindSpace API** - AI-powered mental wellness platform with comprehensive features for mood tracking, journaling, and wellness insights.

## 🔐 Authentication

This API supports multiple authentication methods:

### 1. Email/Password Authentication
- **Register**: \`POST /api/v1/auth/register\` - Create new account
- **Login**: \`POST /api/v1/auth/login\` - Authenticate with credentials
- **Refresh**: \`POST /api/v1/auth/refresh\` - Renew access token

### 2. OAuth2 Authentication (Google)
Complete OAuth2 flow for seamless Google authentication:
1. **Initiate**: \`POST /api/v1/auth/oauth2/initiate\` - Get redirect URL
2. **Redirect**: User authenticates with Google
3. **Callback**: \`GET /api/v1/auth/oauth2/callback\` - Process authentication

### 3. Account Management
- **Email Verification**: \`GET /api/v1/auth/verify-email\` - Verify email address
- **Password Reset**: \`POST /api/v1/auth/reset-password\` - Request password reset
- **Password Confirm**: \`POST /api/v1/auth/confirm-password-reset\` - Reset password

## 🛡️ Authorization & Security

**Role-Based Access Control (RBAC)** with granular permissions:

### User Roles:
- **SUPER_ADMIN**: Full platform management
- **COMPANY_ADMIN**: Company management and user administration
- **COMPANY_MANAGER**: Department management and analytics
- **COMPANY_USER**: Basic company features access
- **INDIVIDUAL_USER**: Personal data and features only

### Permission System:
- **Platform**: \`manage_platform\`, \`view_platform_analytics\`, \`manage_companies\`
- **Company**: \`manage_company\`, \`view_company_analytics\`, \`manage_company_users\`
- **User**: \`manage_profile\`, \`create_journal\`, \`view_own_data\`, \`delete_account\`

**Authentication Header:**
\`\`\`
Authorization: Bearer <your-access-token>
\`\`\`

## 📊 Data & Features

### Core Features:
- **Mood Tracking**: Log and analyze mood patterns with context
- **Journaling**: Rich text entries with AI insights and attachments
- **AI Integration**: Personalized wellness insights and recommendations
- **Company Management**: Multi-tenant organization support
- **Analytics**: Personal and organizational wellness metrics

### Data Management:
- **Pagination**: All list endpoints support \`page\`, \`limit\`, \`sortBy\`, \`sortOrder\`
- **Filtering**: Advanced filtering by date ranges, tags, moods, etc.
- **Search**: Full-text search across journals and entries
- **Attachments**: Image and voice recording support

## ⚡ Rate Limiting & Performance

- Authentication endpoints: Role-based rate limiting
- API calls: Standard rate limiting per user tier
- File uploads: Size and type restrictions enforced
- AI features: Usage quotas based on subscription tier

## 🔧 Error Handling

**Consistent Error Format:**
\`\`\`json
{
  "success": false,
  "error": "Human-readable error message",
  "message": "Additional context or debugging info",
  "code": "MACHINE_READABLE_ERROR_CODE",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
\`\`\`

**Common HTTP Status Codes:**
- \`200\` OK - Success
- \`201\` Created - Resource created
- \`400\` Bad Request - Invalid input
- \`401\` Unauthorized - Authentication required
- \`403\` Forbidden - Insufficient permissions
- \`404\` Not Found - Resource not found
- \`409\` Conflict - Resource already exists
- \`422\` Unprocessable Entity - Validation error
- \`429\` Too Many Requests - Rate limited
- \`500\` Internal Server Error - Server error

## 📱 Integration Notes

- All timestamps are in ISO 8601 format (UTC)
- File uploads use multipart/form-data
- All text content supports UTF-8 encoding
- WebSocket support available for real-time features
- Comprehensive audit logging for all user actions
`,
  contact: {
    name: 'MindSpace Support',
    email: 'support@mindspace.com',
    url: 'https://mindspace.com/support'
  },
  license: {
    name: 'Proprietary',
    url: 'https://mindspace.com/terms'
  }
};