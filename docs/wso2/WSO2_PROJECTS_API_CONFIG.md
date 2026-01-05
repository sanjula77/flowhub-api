# WSO2 API Manager - Projects API Configuration

## Overview

This guide explains how to expose `/projects` APIs through WSO2 API Manager with OAuth 2.0 protection, JWT assertion forwarding, and rate limiting.

---

## Prerequisites

- WSO2 API Manager 4.3.0 running (Docker container: `flowhub-wso2-1`)
- Backend API running (Docker container: `flowhub-backend-1`)
- Access to WSO2 Publisher Portal: `https://localhost:9443/publisher`
- Access to WSO2 Developer Portal: `https://localhost:9443/devportal`

---

## Step 1: Add Projects Resources to Existing API

### Option A: Add to Existing FlowHub API (Recommended)

If you already have a FlowHub API configured:

1. Login to Publisher: `https://localhost:9443/publisher`
2. Go to **"APIs"** → Find **"FlowHub API"** (or **"FlowHub Users & Teams API"**)
3. Click **"Edit"**
4. Go to **"Resources"** tab
5. Click **"Add New Resource"**

### Option B: Create New Projects API

If creating a separate API for Projects:

1. Click **"Create API"** → **"Design a New REST API"**
2. Fill in API details:
   - **Name:** `FlowHub Projects API`
   - **Context:** `/flowhub-projects`
   - **Version:** `1.0.0`
   - **Endpoint:** `http://flowhub-backend-1:3001`
   - **Description:** `API for managing projects`

---

## Step 2: Configure Project Resources

Add the following resources to your API:

| Method | Resource Path | Summary | Role Required |
|--------|---------------|---------|---------------|
| GET | `/projects` | Get all projects (role-based) | ADMIN + USER |
| GET | `/projects/my-projects` | Get user's projects | ADMIN + USER |
| GET | `/projects/:id` | Get project by ID | ADMIN + USER |
| POST | `/projects` | Create project | ADMIN |
| PUT | `/projects/:id` | Update project | ADMIN |
| DELETE | `/projects/:id` | Delete project | ADMIN |
| GET | `/projects/admin/all` | Get all projects (ADMIN) | ADMIN |
| GET | `/projects/admin/team/:teamId` | Get projects by team | ADMIN |

**Resource Configuration:**

1. For each resource, click **"Add New Resource"**
2. Configure:
   - **HTTP Verb:** Select method (GET, POST, PUT, DELETE)
   - **URL Pattern:** Enter path (e.g., `/projects`)
   - **Summary:** Enter description
   - **Request/Response:** Configure media types (application/json)

---

## Step 3: Configure OAuth 2.0 Security

### 3.1 Enable OAuth 2.0

1. Go to **"Security"** tab
2. Select **"OAuth 2.0"** as security type
3. Configure grant types:

   **OAuth 2.0 Settings:**
   - **Security Type:** `OAuth 2.0`
   - **Grant Types:**
     - ✅ Client Credentials
     - ✅ Password Grant
     - ✅ Authorization Code
     - ✅ Refresh Token
   - **Token Endpoint:** `https://localhost:8243/token`
   - **Authorize Endpoint:** `https://localhost:8243/authorize`

---

## Step 4: Configure JWT Assertion Forwarding

### 4.1 Enable JWT Forwarding

1. Go to **"Runtime Configuration"** tab
2. Scroll to **"JWT Configuration"** section
3. Enable **"JWT Assertion Forwarding"**:

   **JWT Settings:**
   - ✅ **Enable JWT Assertion Forwarding**
   - **JWT Header Name:** `X-JWT-Assertion` (default)
   - **Forward JWT Claims:** ✅ Enabled
   - **Forward User Claims:** ✅ Enabled
   - **Include Token Details:** ✅ Enabled

### 4.2 Configure Headers to Forward

WSO2 will forward these headers to the backend:

- `X-JWT-Assertion` - JWT token (if available)
- `X-WSO2-USERNAME` - Username from token
- `X-WSO2-API-CONTEXT` - API context (`/flowhub`)
- `X-WSO2-API-VERSION` - API version (`1.0.0`)
- `X-WSO2-API-NAME` - API name
- `X-WSO2-REQUEST-ID` - Request ID
- `activityid` - WSO2 activity ID

**Note:** Backend's `Wso2AuthGuard` reads these headers to extract user information.

---

## Step 5: Configure Rate Limiting

### 5.1 Create Throttle Policies (If Needed)

Go to **"Throttle Policies"** → **"Advanced Throttle Policies"**:

**Policy 1: Projects API Throttle**
- **Name:** `ProjectsAPIThrottle`
- **Type:** `Advanced Throttle Policy`
- **Request Count:** `1000`
- **Unit Time:** `1 minute`
- **Burst Control:** `100 requests/second`

**Policy 2: Admin Projects Throttle**
- **Name:** `AdminProjectsThrottle`
- **Type:** `Advanced Throttle Policy`
- **Request Count:** `2000`
- **Unit Time:** `1 minute`
- **Burst Control:** `200 requests/second`

### 5.2 Apply Throttle Policies

1. Go to **"Runtime Configuration"** tab
2. Scroll to **"Throttle Policies"** section
3. Configure:

   **Application-Level Throttling:**
   - **Policy:** `ProjectsAPIThrottle` (or default)
   - **Limit:** `1000 requests/minute`

   **Resource-Level Throttling (Optional):**
   - **POST /projects:** `500 requests/minute`
   - **PUT /projects/:id:** `500 requests/minute`
   - **DELETE /projects/:id:** `200 requests/minute`

---

## Step 6: Enable Analytics (Optional)

1. Go to **"Runtime Configuration"** tab
2. Scroll to **"Analytics"** section
3. Enable:
   - ✅ **Enable Analytics**
   - ✅ **Enable Response Caching** (optional)

---

## Step 7: Configure CORS

1. Go to **"Runtime Configuration"** → **"CORS"**
2. Enable CORS:
   - ✅ **Enable CORS**
   - **Allowed Origins:** 
     - `http://localhost:3000` (Frontend)
     - `https://localhost:9443` (WSO2 Portal)
   - ✅ **Allow Credentials**
   - **Allowed Methods:** GET, POST, PUT, DELETE, OPTIONS
   - **Allowed Headers:** `Content-Type`, `Authorization`, `X-JWT-Assertion`

---

## Step 8: Publish API

1. Go to **"Lifecycle"** tab
2. Click **"Publish"** button
3. API status changes to **"Published"**
4. API is now available in Developer Portal

---

## Step 9: Create Application & Subscribe

### 9.1 Access Developer Portal

1. Navigate to: `https://localhost:9443/devportal`
2. Login with admin credentials:
   - Username: `admin`
   - Password: `admin`

### 9.2 Create Application

1. Go to **"Applications"** → **"Create New Application"**
2. Fill in:
   - **Name:** `FlowHub Projects App`
   - **Description:** `Application for accessing Projects API`
   - **Token Type:** `JWT`
3. Click **"Create"**

### 9.3 Subscribe to API

1. Go to **"APIs"** tab
2. Find your **"FlowHub API"** (or **"FlowHub Projects API"**)
3. Click **"Subscribe"**
4. Select your application: **"FlowHub Projects App"**
5. Click **"Subscribe"**

---

## Step 10: Generate OAuth Token

### 10.1 Get Client Credentials

1. Go to **"Applications"** → Click on your app
2. Go to **"Production Keys"** tab
3. Copy:
   - **Consumer Key** (Client ID)
   - **Consumer Secret** (Client Secret)

### 10.2 Generate Access Token

Use one of these methods:

#### Method 1: Client Credentials Grant (Recommended for Server-to-Server)

```bash
curl -X POST https://localhost:8243/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -k \
  -d "grant_type=client_credentials" \
  -d "client_id=<CONSUMER_KEY>" \
  -d "client_secret=<CONSUMER_SECRET>"
```

#### Method 2: Password Grant (For Testing)

```bash
curl -X POST https://localhost:8243/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -k \
  -d "grant_type=password" \
  -d "username=admin" \
  -d "password=admin" \
  -d "client_id=<CONSUMER_KEY>" \
  -d "client_secret=<CONSUMER_SECRET>"
```

**Response:**
```json
{
  "access_token": "eyJ4NXQiOiJOVEF4Wm1NeE5ETXlaRGczTVRVMVpHTTBNekV6TkRKaFpXSTRORE5sWkRVM...",
  "refresh_token": "...",
  "scope": "am_application_scope default",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

---

## Gateway → Backend Flow

### Request Flow Diagram

```
┌─────────────┐
│   Client    │
│  (External) │
└──────┬──────┘
       │
       │ 1. HTTP Request
       │    Authorization: Bearer <OAUTH_TOKEN>
       │    GET https://localhost:8243/flowhub/1.0.0/projects
       │
       ▼
┌─────────────────────┐
│  WSO2 API Gateway   │
│  (Port 8243)        │
└──────┬──────────────┘
       │
       │ 2. OAuth 2.0 Validation
       │    ├─ Validate access token
       │    ├─ Check token expiry
       │    ├─ Verify API subscription
       │    └─ Check rate limits
       │
       │ 3. Rate Limiting Check
       │    ├─ Application-level throttle
       │    └─ Resource-level throttle
       │
       │ 4. JWT Assertion Forwarding
       │    ├─ Decode OAuth token
       │    ├─ Extract user claims
       │    └─ Add headers:
       │       - X-JWT-Assertion
       │       - X-WSO2-USERNAME
       │       - X-WSO2-API-CONTEXT
       │       - activityid
       │
       ▼
┌─────────────────────┐
│  Backend Service    │
│  (Port 3001)        │
└──────┬──────────────┘
       │
       │ 5. Wso2AuthGuard (Optional)
       │    ├─ Read X-JWT-Assertion header
       │    ├─ Read X-WSO2-USERNAME
       │    ├─ Extract user info
       │    └─ Set req.user
       │
       │ 6. JwtAuthGuard
       │    ├─ Extract token from header
       │    └─ Validate JWT signature
       │
       │ 7. RolesGuard (If applicable)
       │    └─ Check user role
       │
       │ 8. Controller Handler
       │    └─ Process request
       │
       │ 9. Response
       │    └─ Return JSON
       │
       ▼
┌─────────────────────┐
│  WSO2 Gateway       │
└──────┬──────────────┘
       │
       │ 10. Response Processing
       │     ├─ Log analytics
       │     ├─ Update rate limit counters
       │     └─ Forward response
       │
       ▼
┌─────────────┐
│   Client    │
│  (External) │
└─────────────┘
```

### Header Transformation

**Client Request:**
```http
GET /flowhub/1.0.0/projects HTTP/1.1
Host: localhost:8243
Authorization: Bearer <OAUTH_ACCESS_TOKEN>
```

**WSO2 → Backend Request:**
```http
GET /projects HTTP/1.1
Host: flowhub-backend-1:3001
Authorization: Bearer <OAUTH_ACCESS_TOKEN>
X-JWT-Assertion: <JWT_TOKEN>
X-WSO2-USERNAME: admin
X-WSO2-API-CONTEXT: /flowhub
X-WSO2-API-VERSION: 1.0.0
X-WSO2-API-NAME: FlowHub API
X-WSO2-REQUEST-ID: <REQUEST_ID>
activityid: <ACTIVITY_ID>
```

---

## Example External API Calls

### Example 1: Get All Projects (ADMIN)

**Request:**
```bash
curl -X GET "https://localhost:8243/flowhub/1.0.0/projects" \
  -H "Authorization: Bearer <OAUTH_ACCESS_TOKEN>" \
  -k \
  -v
```

**Response:**
```json
HTTP/1.1 200 OK
Content-Type: application/json

[
  {
    "id": "111e4567-e89b-12d3-a456-426614174000",
    "name": "Marketing Campaign",
    "description": "Q1 2024 campaign",
    "teamId": "aaa11111-1111-1111-1111-111111111111",
    "createdById": "user-id-1",
    "createdAt": "2024-01-10T10:00:00.000Z",
    "updatedAt": "2024-01-10T10:00:00.000Z"
  },
  {
    "id": "222e4567-e89b-12d3-a456-426614174000",
    "name": "Product Launch",
    "description": "New product release",
    "teamId": "bbb22222-2222-2222-2222-222222222222",
    "createdById": "user-id-2",
    "createdAt": "2024-01-12T14:30:00.000Z",
    "updatedAt": "2024-01-12T14:30:00.000Z"
  }
]
```

---

### Example 2: Get Project by ID

**Request:**
```bash
curl -X GET "https://localhost:8243/flowhub/1.0.0/projects/111e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer <OAUTH_ACCESS_TOKEN>" \
  -k
```

**Response:**
```json
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "111e4567-e89b-12d3-a456-426614174000",
  "name": "Marketing Campaign",
  "description": "Q1 2024 campaign",
  "teamId": "aaa11111-1111-1111-1111-111111111111",
  "createdById": "user-id-1",
  "createdAt": "2024-01-10T10:00:00.000Z",
  "updatedAt": "2024-01-10T10:00:00.000Z"
}
```

---

### Example 3: Create Project (ADMIN Only)

**Request:**
```bash
curl -X POST "https://localhost:8243/flowhub/1.0.0/projects" \
  -H "Authorization: Bearer <OAUTH_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -k \
  -d '{
    "name": "New Project",
    "description": "Project description",
    "teamId": "aaa11111-1111-1111-1111-111111111111"
  }'
```

**Response:**
```json
HTTP/1.1 201 Created
Content-Type: application/json

{
  "id": "333e4567-e89b-12d3-a456-426614174000",
  "name": "New Project",
  "description": "Project description",
  "teamId": "aaa11111-1111-1111-1111-111111111111",
  "createdById": "admin-user-id",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

---

### Example 4: Update Project (ADMIN Only)

**Request:**
```bash
curl -X PUT "https://localhost:8243/flowhub/1.0.0/projects/333e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer <OAUTH_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -k \
  -d '{
    "name": "Updated Project Name",
    "description": "Updated description"
  }'
```

**Response:**
```json
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "333e4567-e89b-12d3-a456-426614174000",
  "name": "Updated Project Name",
  "description": "Updated description",
  "teamId": "aaa11111-1111-1111-1111-111111111111",
  "createdById": "admin-user-id",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T11:00:00.000Z"
}
```

---

### Example 5: Delete Project (ADMIN Only)

**Request:**
```bash
curl -X DELETE "https://localhost:8243/flowhub/1.0.0/projects/333e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer <OAUTH_ACCESS_TOKEN>" \
  -k
```

**Response:**
```http
HTTP/1.1 204 No Content
```

---

### Example 6: Get Projects by Team (ADMIN Only)

**Request:**
```bash
curl -X GET "https://localhost:8243/flowhub/1.0.0/projects/admin/team/aaa11111-1111-1111-1111-111111111111" \
  -H "Authorization: Bearer <OAUTH_ACCESS_TOKEN>" \
  -k
```

**Response:**
```json
HTTP/1.1 200 OK
Content-Type: application/json

[
  {
    "id": "111e4567-e89b-12d3-a456-426614174000",
    "name": "Marketing Campaign",
    "teamId": "aaa11111-1111-1111-1111-111111111111",
    ...
  }
]
```

---

## Complete API Endpoint URLs

**Base URL:** `https://localhost:8243/flowhub/1.0.0`

| Endpoint | Method | Full URL |
|----------|--------|----------|
| Get all projects | GET | `https://localhost:8243/flowhub/1.0.0/projects` |
| Get user's projects | GET | `https://localhost:8243/flowhub/1.0.0/projects/my-projects` |
| Get project by ID | GET | `https://localhost:8243/flowhub/1.0.0/projects/:id` |
| Create project | POST | `https://localhost:8243/flowhub/1.0.0/projects` |
| Update project | PUT | `https://localhost:8243/flowhub/1.0.0/projects/:id` |
| Delete project | DELETE | `https://localhost:8243/flowhub/1.0.0/projects/:id` |
| Get all (ADMIN) | GET | `https://localhost:8243/flowhub/1.0.0/projects/admin/all` |
| Get by team (ADMIN) | GET | `https://localhost:8243/flowhub/1.0.0/projects/admin/team/:teamId` |

---

## Testing Checklist

- [ ] Resources added to API
- [ ] OAuth 2.0 enabled
- [ ] JWT forwarding enabled
- [ ] Rate limiting configured
- [ ] CORS configured
- [ ] API published
- [ ] Application created
- [ ] API subscribed to application
- [ ] OAuth token generated
- [ ] GET /projects tested
- [ ] GET /projects/:id tested
- [ ] POST /projects tested (ADMIN)
- [ ] PUT /projects/:id tested (ADMIN)
- [ ] DELETE /projects/:id tested (ADMIN)
- [ ] Headers verified in backend logs
- [ ] Rate limiting tested
- [ ] Analytics data visible

---

## Security Features Summary

✅ **OAuth 2.0 Protection:** All endpoints require valid OAuth access token  
✅ **JWT Assertion Forwarding:** User claims forwarded to backend  
✅ **Rate Limiting:** Application and resource-level throttling  
✅ **Analytics:** Request logging and monitoring  
✅ **CORS:** Cross-origin resource sharing configured  
✅ **Token Validation:** WSO2 validates tokens before forwarding  
✅ **API Subscription:** Only subscribed applications can access  

---

## Troubleshooting

### Issue: "Invalid Credentials" (900901)

**Cause:** Invalid or expired OAuth token

**Solution:**
1. Generate new token using token endpoint
2. Check token expiry time
3. Verify Consumer Key and Secret

---

### Issue: "API Subscription not found" (900908)

**Cause:** Application not subscribed to API

**Solution:**
1. Go to Developer Portal
2. Subscribe application to API
3. Ensure API is published

---

### Issue: "Throttle limit exceeded" (900800)

**Cause:** Rate limit exceeded

**Solution:**
1. Wait for throttle window to reset
2. Increase throttle limits in Publisher
3. Check burst control settings

---

### Issue: Headers not forwarded to backend

**Cause:** JWT forwarding not enabled

**Solution:**
1. Go to API Runtime Configuration
2. Enable "JWT Assertion Forwarding"
3. Ensure "Forward User Claims" is enabled
4. Republish API

---

## Notes

- **Internal vs External:** Direct backend calls (port 3001) bypass WSO2 and use JWT from backend
- **WSO2 Gateway:** External calls (port 8243) go through WSO2 with OAuth 2.0
- **Backend Compatibility:** Backend's `Wso2AuthGuard` can detect WSO2 requests via headers
- **Token Types:** WSO2 uses OAuth tokens; backend uses JWT tokens (different)

