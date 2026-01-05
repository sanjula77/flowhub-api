# WSO2 API Manager - Tasks API Configuration

## Overview

This guide explains how to expose `/tasks` APIs through WSO2 API Manager with OAuth 2.0 protection, JWT assertion forwarding, and rate limiting.

---

## Prerequisites

- WSO2 API Manager 4.3.0 running (Docker container: `flowhub-wso2-1`)
- Backend API running (Docker container: `flowhub-backend-1`)
- Access to WSO2 Publisher Portal: `https://localhost:9443/publisher`
- Access to WSO2 Developer Portal: `https://localhost:9443/devportal`

---

## Step 1: Add Tasks Resources to Existing API

### Option A: Add to Existing FlowHub API (Recommended)

If you already have a FlowHub API configured:

1. Login to Publisher: `https://localhost:9443/publisher`
2. Go to **"APIs"** → Find **"FlowHub API"** (or **"FlowHub Users & Teams API"**)
3. Click **"Edit"**
4. Go to **"Resources"** tab
5. Click **"Add New Resource"**

### Option B: Create New Tasks API

If creating a separate API for Tasks:

1. Click **"Create API"** → **"Design a New REST API"**
2. Fill in API details:
   - **Name:** `FlowHub Tasks API`
   - **Context:** `/flowhub-tasks`
   - **Version:** `1.0.0`
   - **Endpoint:** `http://flowhub-backend-1:3001`
   - **Description:** `API for managing tasks`

---

## Step 2: Configure Task Resources

Add the following resources to your API:

| Method | Resource Path | Summary | Role Required |
|--------|---------------|---------|---------------|
| GET | `/tasks` | Get all tasks (role-based) | ADMIN + USER |
| GET | `/tasks/:id` | Get task by ID | ADMIN + USER |
| GET | `/tasks/project/:projectId` | Get tasks by project | ADMIN + USER |
| GET | `/tasks/assigned/:userId` | Get tasks assigned to user | ADMIN + USER |
| POST | `/tasks` | Create task | ADMIN + USER (team-scoped) |
| PATCH | `/tasks/:id/assign` | Assign task to user | ADMIN + Project Creator |
| PATCH | `/tasks/:id/status` | Update task status | Assignee + ADMIN |
| PUT | `/tasks/:id` | Update task | ADMIN + Project Creator |
| DELETE | `/tasks/:id` | Delete task | ADMIN + Project Creator |

**Resource Configuration:**

1. For each resource, click **"Add New Resource"**
2. Configure:
   - **HTTP Verb:** Select method (GET, POST, PUT, PATCH, DELETE)
   - **URL Pattern:** Enter path (e.g., `/tasks`)
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

**Note:** Backend's `JwtAuthGuard` reads these headers to extract user information.

---

## Step 5: Configure Rate Limiting

### 5.1 Create Throttle Policies (If Needed)

Go to **"Throttle Policies"** → **"Advanced Throttle Policies"**:

**Policy 1: Tasks API Throttle**
- **Name:** `TasksAPIThrottle`
- **Type:** `Advanced Throttle Policy`
- **Request Count:** `2000`
- **Unit Time:** `1 minute`
- **Burst Control:** `200 requests/second`

**Policy 2: Task Write Operations Throttle**
- **Name:** `TaskWriteThrottle`
- **Type:** `Advanced Throttle Policy`
- **Request Count:** `500`
- **Unit Time:** `1 minute`
- **Burst Control:** `50 requests/second`

### 5.2 Apply Throttle Policies

1. Go to **"Runtime Configuration"** tab
2. Scroll to **"Throttle Policies"** section
3. Configure:

   **Application-Level Throttling:**
   - **Policy:** `TasksAPIThrottle` (or default)
   - **Limit:** `2000 requests/minute`

   **Resource-Level Throttling (Optional):**
   - **POST /tasks:** `500 requests/minute`
   - **PATCH /tasks/:id/status:** `1000 requests/minute` (frequent operation)
   - **PUT /tasks/:id:** `500 requests/minute`
   - **DELETE /tasks/:id:** `200 requests/minute`

---

## Step 6: Enable Analytics (Optional)

1. Go to **"Runtime Configuration"** tab
2. Scroll to **"Analytics"** section
3. Enable:
   - ✅ **Enable Analytics**
   - ✅ **Enable Response Caching** (optional, for GET requests)

---

## Step 7: Configure CORS

1. Go to **"Runtime Configuration"** → **"CORS"**
2. Enable CORS:
   - ✅ **Enable CORS**
   - **Allowed Origins:** 
     - `http://localhost:3000` (Frontend)
     - `https://localhost:9443` (WSO2 Portal)
   - ✅ **Allow Credentials**
   - **Allowed Methods:** GET, POST, PUT, PATCH, DELETE, OPTIONS
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

### 9.2 Create Application (If Not Exists)

1. Go to **"Applications"** → **"Create New Application"** (or use existing)
2. Fill in:
   - **Name:** `FlowHub Tasks App` (or use existing FlowHub app)
   - **Description:** `Application for accessing Tasks API`
   - **Token Type:** `JWT`
3. Click **"Create"**

### 9.3 Subscribe to API

1. Go to **"APIs"** tab
2. Find your **"FlowHub API"** (or **"FlowHub Tasks API"**)
3. Click **"Subscribe"**
4. Select your application: **"FlowHub Tasks App"** (or existing app)
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

## Gateway → Backend Request Flow

### Request Flow Diagram

```
┌─────────────┐
│   Client    │
│  (External) │
└──────┬──────┘
       │
       │ 1. HTTP Request
       │    Authorization: Bearer <OAUTH_TOKEN>
       │    GET https://localhost:8243/flowhub/1.0.0/tasks
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
       │    ├─ Application-level throttle (2000 req/min)
       │    └─ Resource-level throttle (if configured)
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
       │ 5. JwtAuthGuard
       │    ├─ Extract token from header
       │    └─ Validate JWT signature
       │
       │ 6. TasksController
       │    ├─ Extract user from token
       │    └─ Call TasksService
       │
       │ 7. TasksService
       │    ├─ Team-based authorization
       │    ├─ Role-based filtering
       │    └─ Business logic validation
       │
       │ 8. TaskRepository
       │    ├─ Optimistic locking check
       │    └─ Database operations
       │
       │ 9. Response
       │    └─ Return JSON with version
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
GET /flowhub/1.0.0/tasks?projectId=xxx&status=TODO HTTP/1.1
Host: localhost:8243
Authorization: Bearer <OAUTH_ACCESS_TOKEN>
```

**WSO2 → Backend Request:**
```http
GET /tasks?projectId=xxx&status=TODO HTTP/1.1
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

### Example 1: Get All Tasks (Role-Based)

**Request:**
```bash
curl -X GET "https://localhost:8243/flowhub/1.0.0/tasks" \
  -H "Authorization: Bearer <OAUTH_ACCESS_TOKEN>" \
  -k \
  -v
```

**Response (ADMIN):**
```json
HTTP/1.1 200 OK
Content-Type: application/json

[
  {
    "id": "111e4567-e89b-12d3-a456-426614174000",
    "title": "Implement user authentication",
    "description": "Add JWT-based authentication",
    "status": "IN_PROGRESS",
    "projectId": "aaa11111-1111-1111-1111-111111111111",
    "teamId": "bbb22222-2222-2222-2222-222222222222",
    "assignedToId": "user-id-1",
    "priority": 1,
    "version": 3,
    "createdAt": "2024-01-10T10:00:00.000Z",
    "updatedAt": "2024-01-15T14:30:00.000Z"
  },
  {
    "id": "222e4567-e89b-12d3-a456-426614174000",
    "title": "Design database schema",
    "status": "DONE",
    "projectId": "aaa11111-1111-1111-1111-111111111111",
    "teamId": "bbb22222-2222-2222-2222-222222222222",
    "version": 5,
    "createdAt": "2024-01-08T09:00:00.000Z",
    "updatedAt": "2024-01-12T16:00:00.000Z"
  }
]
```

**Response (USER):**
```json
HTTP/1.1 200 OK
Content-Type: application/json

[
  {
    "id": "111e4567-e89b-12d3-a456-426614174000",
    "title": "Implement user authentication",
    "status": "IN_PROGRESS",
    "projectId": "aaa11111-1111-1111-1111-111111111111",
    "teamId": "bbb22222-2222-2222-2222-222222222222",
    "assignedToId": "user-id-1",
    "version": 3,
    ...
  }
]
```
*Note: USER only sees tasks from their team*

---

### Example 2: Get Task by ID

**Request:**
```bash
curl -X GET "https://localhost:8243/flowhub/1.0.0/tasks/111e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer <OAUTH_ACCESS_TOKEN>" \
  -k
```

**Response:**
```json
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "111e4567-e89b-12d3-a456-426614174000",
  "title": "Implement user authentication",
  "description": "Add JWT-based authentication",
  "status": "IN_PROGRESS",
  "projectId": "aaa11111-1111-1111-1111-111111111111",
  "teamId": "bbb22222-2222-2222-2222-222222222222",
  "assignedToId": "user-id-1",
  "priority": 1,
  "version": 3,
  "createdAt": "2024-01-10T10:00:00.000Z",
  "updatedAt": "2024-01-15T14:30:00.000Z"
}
```

---

### Example 3: Create Task

**Request:**
```bash
curl -X POST "https://localhost:8243/flowhub/1.0.0/tasks" \
  -H "Authorization: Bearer <OAUTH_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -k \
  -d '{
    "title": "Fix bug in authentication",
    "description": "Resolve JWT token expiration issue",
    "projectId": "aaa11111-1111-1111-1111-111111111111",
    "assignedToId": "user-id-1",
    "priority": 2,
    "dueDate": "2024-01-20T17:00:00Z"
  }'
```

**Response:**
```json
HTTP/1.1 201 Created
Content-Type: application/json

{
  "id": "333e4567-e89b-12d3-a456-426614174000",
  "title": "Fix bug in authentication",
  "description": "Resolve JWT token expiration issue",
  "status": "TODO",
  "projectId": "aaa11111-1111-1111-1111-111111111111",
  "teamId": "bbb22222-2222-2222-2222-222222222222",
  "assignedToId": "user-id-1",
  "priority": 2,
  "dueDate": "2024-01-20T17:00:00.000Z",
  "version": 1,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

---

### Example 4: Assign Task to User

**Request:**
```bash
curl -X PATCH "https://localhost:8243/flowhub/1.0.0/tasks/111e4567-e89b-12d3-a456-426614174000/assign" \
  -H "Authorization: Bearer <OAUTH_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -k \
  -d '{
    "assignedToId": "user-id-2"
  }'
```

**Response:**
```json
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "111e4567-e89b-12d3-a456-426614174000",
  "title": "Implement user authentication",
  "status": "IN_PROGRESS",
  "assignedToId": "user-id-2",
  "version": 4,
  ...
}
```

---

### Example 5: Update Task Status

**Request:**
```bash
curl -X PATCH "https://localhost:8243/flowhub/1.0.0/tasks/111e4567-e89b-12d3-a456-426614174000/status" \
  -H "Authorization: Bearer <OAUTH_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -k \
  -d '{
    "status": "DONE"
  }'
```

**Response:**
```json
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "111e4567-e89b-12d3-a456-426614174000",
  "title": "Implement user authentication",
  "status": "DONE",
  "version": 5,
  ...
}
```

**Error Response (Invalid Transition):**
```json
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "statusCode": 400,
  "message": "Invalid status transition: Cannot change status from TODO to DONE. Allowed transitions: IN_PROGRESS",
  "error": "Bad Request"
}
```

---

### Example 6: Update Task

**Request:**
```bash
curl -X PUT "https://localhost:8243/flowhub/1.0.0/tasks/111e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer <OAUTH_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -k \
  -d '{
    "title": "Updated task title",
    "description": "Updated description",
    "priority": 3
  }'
```

**Response:**
```json
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "111e4567-e89b-12d3-a456-426614174000",
  "title": "Updated task title",
  "description": "Updated description",
  "status": "IN_PROGRESS",
  "priority": 3,
  "version": 4,
  ...
}
```

**Error Response (Optimistic Lock Conflict):**
```json
HTTP/1.1 409 Conflict
Content-Type: application/json

{
  "statusCode": 409,
  "message": "Task has been modified by another user. Please refresh and try again.",
  "error": "Conflict"
}
```

---

### Example 7: Get Tasks by Project

**Request:**
```bash
curl -X GET "https://localhost:8243/flowhub/1.0.0/tasks/project/aaa11111-1111-1111-1111-111111111111" \
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
    "title": "Task 1",
    "status": "TODO",
    "projectId": "aaa11111-1111-1111-1111-111111111111",
    "version": 1,
    ...
  },
  {
    "id": "222e4567-e89b-12d3-a456-426614174000",
    "title": "Task 2",
    "status": "IN_PROGRESS",
    "projectId": "aaa11111-1111-1111-1111-111111111111",
    "version": 2,
    ...
  }
]
```

---

### Example 8: Get Tasks with Filters

**Request:**
```bash
curl -X GET "https://localhost:8243/flowhub/1.0.0/tasks?projectId=aaa11111-1111-1111-1111-111111111111&status=IN_PROGRESS" \
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
    "title": "Task in progress",
    "status": "IN_PROGRESS",
    "projectId": "aaa11111-1111-1111-1111-111111111111",
    "version": 3,
    ...
  }
]
```

---

### Example 9: Delete Task

**Request:**
```bash
curl -X DELETE "https://localhost:8243/flowhub/1.0.0/tasks/111e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer <OAUTH_ACCESS_TOKEN>" \
  -k
```

**Response:**
```http
HTTP/1.1 204 No Content
```

**Error Response (Completed Task):**
```json
HTTP/1.1 409 Conflict
Content-Type: application/json

{
  "statusCode": 409,
  "message": "Cannot delete completed tasks",
  "error": "Conflict"
}
```

---

## Complete API Endpoint URLs

**Base URL:** `https://localhost:8243/flowhub/1.0.0`

| Endpoint | Method | Full URL |
|----------|--------|----------|
| Get all tasks | GET | `https://localhost:8243/flowhub/1.0.0/tasks` |
| Get task by ID | GET | `https://localhost:8243/flowhub/1.0.0/tasks/:id` |
| Get tasks by project | GET | `https://localhost:8243/flowhub/1.0.0/tasks/project/:projectId` |
| Get tasks assigned to user | GET | `https://localhost:8243/flowhub/1.0.0/tasks/assigned/:userId` |
| Create task | POST | `https://localhost:8243/flowhub/1.0.0/tasks` |
| Assign task | PATCH | `https://localhost:8243/flowhub/1.0.0/tasks/:id/assign` |
| Update task status | PATCH | `https://localhost:8243/flowhub/1.0.0/tasks/:id/status` |
| Update task | PUT | `https://localhost:8243/flowhub/1.0.0/tasks/:id` |
| Delete task | DELETE | `https://localhost:8243/flowhub/1.0.0/tasks/:id` |

---

## Query Parameters

### GET /tasks

**Query Parameters:**
- `projectId` (optional): Filter tasks by project ID
- `status` (optional): Filter tasks by status (TODO, IN_PROGRESS, DONE)

**Examples:**
- `GET /tasks` - Get all tasks (role-based)
- `GET /tasks?projectId=xxx` - Get tasks for specific project
- `GET /tasks?status=IN_PROGRESS` - Get all in-progress tasks
- `GET /tasks?projectId=xxx&status=TODO` - Get TODO tasks for project

---

## Testing Checklist

- [ ] Resources added to API
- [ ] OAuth 2.0 enabled
- [ ] JWT forwarding enabled
- [ ] Rate limiting configured
- [ ] CORS configured
- [ ] API published
- [ ] Application created/subscribed
- [ ] OAuth token generated
- [ ] GET /tasks tested
- [ ] GET /tasks/:id tested
- [ ] POST /tasks tested
- [ ] PATCH /tasks/:id/assign tested
- [ ] PATCH /tasks/:id/status tested
- [ ] PUT /tasks/:id tested
- [ ] DELETE /tasks/:id tested
- [ ] Optimistic locking tested (concurrent updates)
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
✅ **Team-Based Authorization:** Backend enforces team isolation  
✅ **Optimistic Locking:** Version conflicts handled gracefully  

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

### Issue: Optimistic Lock Conflict (409)

**Cause:** Task was modified by another user between read and update

**Solution:**
1. Fetch latest task version
2. Retry update with current version
3. Frontend should refresh task data before update

**Example Retry Flow:**
```javascript
// 1. Fetch current task
const task = await getTask(id);

// 2. Update with current version
try {
  await updateTask(id, { title: 'New Title', version: task.version });
} catch (error) {
  if (error.status === 409) {
    // Refresh and retry
    const refreshed = await getTask(id);
    await updateTask(id, { title: 'New Title', version: refreshed.version });
  }
}
```

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
- **Backend Compatibility:** Backend's `JwtAuthGuard` can detect WSO2 requests via headers
- **Token Types:** WSO2 uses OAuth tokens; backend uses JWT tokens (different)
- **Version Field:** Always include `version` in update requests to prevent conflicts
- **Team Isolation:** Backend enforces team-based access even if WSO2 allows request

