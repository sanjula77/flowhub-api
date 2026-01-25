# WSO2 API Manager - Tasks API Configuration

Guide for exposing `/tasks` APIs through WSO2 API Manager with OAuth 2.0, JWT forwarding, and rate limiting.

## Prerequisites

- WSO2 API Manager 4.3.0 running (Docker: `flowhub-wso2-1`)
- Backend API running (Docker: `flowhub-backend-1`)
- Access to Publisher: `https://localhost:9443/publisher`
- Access to Developer Portal: `https://localhost:9443/devportal`

---

## Configuration Steps

### 1. Add Tasks Resources

**Option A: Add to Existing FlowHub API (Recommended)**
1. Login to Publisher
2. Go to **"APIs"** → Find **"FlowHub API"**
3. Click **"Edit"** → **"Resources"** tab
4. Click **"Add New Resource"**

**Option B: Create New Tasks API**
1. Click **"Create API"** → **"Design a New REST API"**
2. Fill in: Name: `FlowHub Tasks API`, Context: `/flowhub-tasks`, Version: `1.0.0`, Endpoint: `http://flowhub-backend-1:3001`

### 2. Configure Task Resources

Add the following resources:

| Method | Resource Path | Summary | Role Required |
|--------|---------------|---------|---------------|
| GET | `/tasks` | Get all tasks | ADMIN + USER |
| GET | `/tasks/:id` | Get task by ID | ADMIN + USER |
| GET | `/tasks/project/:projectId` | Get tasks by project | ADMIN + USER |
| GET | `/tasks/assigned/:userId` | Get tasks assigned to user | ADMIN + USER |
| POST | `/tasks` | Create task | ADMIN + USER (team-scoped) |
| PATCH | `/tasks/:id/assign` | Assign task to user | ADMIN + Project Creator |
| PATCH | `/tasks/:id/status` | Update task status | Assignee + ADMIN |
| PUT | `/tasks/:id` | Update task | ADMIN + Project Creator |
| DELETE | `/tasks/:id` | Delete task | ADMIN + Project Creator |

---

### 3. Configure OAuth 2.0 Security

1. Go to **"Security"** tab
2. Select **"OAuth 2.0"** as security type
3. Enable grant types: Client Credentials, Password Grant, Authorization Code, Refresh Token

---

### 4. Configure JWT Assertion Forwarding

1. Go to **"Runtime Configuration"** tab
2. Scroll to **"JWT Configuration"** section
3. Enable **"JWT Assertion Forwarding"**:
   - Enable JWT Assertion Forwarding
   - Forward JWT Claims
   - Forward User Claims
   - Include Token Details

**Headers Forwarded to Backend:**
- `X-JWT-Assertion` - JWT token
- `X-WSO2-USERNAME` - Username from token
- `X-WSO2-API-CONTEXT` - API context
- `activityid` - WSO2 activity ID

---

### 5. Configure Rate Limiting

Go to **"Runtime Configuration"** → **"Throttle Policies"**:

**Application-Level Throttling:**
- Policy: `TasksAPIThrottle` (or default)
- Limit: `2000 requests/minute`

**Resource-Level Throttling (Optional):**
- `POST /tasks`: `500 requests/minute`
- `PATCH /tasks/:id/status`: `1000 requests/minute` (frequent operation)
- `PUT /tasks/:id`: `500 requests/minute`
- `DELETE /tasks/:id`: `200 requests/minute`

---

### 6. Enable Analytics (Optional)

1. Go to **"Runtime Configuration"** tab
2. Scroll to **"Analytics"** section
3. Enable:
   - Enable Analytics
   - Enable Response Caching (optional, for GET requests)

---

### 7. Configure CORS

1. Go to **"Runtime Configuration"** → **"CORS"**
2. Enable CORS:
   - Enable CORS
   - **Allowed Origins:** `http://localhost:3000`, `https://localhost:9443`
   - Allow Credentials
   - **Allowed Methods:** GET, POST, PUT, PATCH, DELETE, OPTIONS
   - **Allowed Headers:** `Content-Type`, `Authorization`, `X-JWT-Assertion`

---

### 8. Publish API

1. Go to **"Lifecycle"** tab
2. Click **"Publish"** button

---

### 9. Create Application & Subscribe

1. Navigate to Developer Portal: `https://localhost:9443/devportal`
2. Login: `admin/admin`
3. **"Applications"** → **"Create New Application"** (or use existing)
   - Name: `FlowHub Tasks App`
   - Token Type: `JWT`
4. **"APIs"** → Find **"FlowHub API"** → Click **"Subscribe"**
5. Select your application → Click **"Subscribe"**

---

### 10. Generate OAuth Token

1. Go to **"Applications"** → Your app
2. **"Production Keys"** tab
3. Copy **Consumer Key** and **Consumer Secret**

**Generate Token:**

```bash
curl -X POST https://localhost:8243/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -k \
  -d "grant_type=client_credentials" \
  -d "client_id=<CONSUMER_KEY>" \
  -d "client_secret=<CONSUMER_SECRET>"
```

---

## Gateway → Backend Request Flow

```
Client → WSO2 Gateway (OAuth2 Validation) → Rate Limiting → JWT Assertion → Backend → PostgreSQL
                                      ↓
                            Analytics & Rate Limiting
```

**Request Transformation:**

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
activityid: <ACTIVITY_ID>
```

---

## Example API Calls

### Get All Tasks

```bash
curl -X GET "https://localhost:8243/flowhub/1.0.0/tasks" \
  -H "Authorization: Bearer <OAUTH_ACCESS_TOKEN>" \
  -k
```

### Create Task

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
    "priority": 2
  }'
```

### Update Task Status

```bash
curl -X PATCH "https://localhost:8243/flowhub/1.0.0/tasks/:id/status" \
  -H "Authorization: Bearer <OAUTH_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -k \
  -d '{
    "status": "DONE"
  }'
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
- [ ] POST /tasks tested
- [ ] PATCH /tasks/:id/status tested
- [ ] Optimistic locking tested (concurrent updates)
- [ ] Headers verified in backend logs

---

## Security Features Summary

**OAuth 2.0 Protection:** All endpoints require valid OAuth access token  
**JWT Assertion Forwarding:** User claims forwarded to backend  
**Rate Limiting:** Application and resource-level throttling  
**Analytics:** Request logging and monitoring  
**CORS:** Cross-origin resource sharing configured  
**Token Validation:** WSO2 validates tokens before forwarding  
**API Subscription:** Only subscribed applications can access  
**Team-Based Authorization:** Backend enforces team isolation  
**Optimistic Locking:** Version conflicts handled gracefully

---

## Troubleshooting

### Issue: "Invalid Credentials" (900901)
**Cause:** Invalid or expired OAuth token  
**Solution:** Generate new token, check token expiry, verify Consumer Key and Secret

### Issue: "API Subscription not found" (900908)
**Cause:** Application not subscribed to API  
**Solution:** Go to Developer Portal, subscribe application to API, ensure API is published

### Issue: "Throttle limit exceeded" (900800)
**Cause:** Rate limit exceeded  
**Solution:** Wait for throttle window to reset, increase throttle limits in Publisher

### Issue: Optimistic Lock Conflict (409)
**Cause:** Task was modified by another user between read and update  
**Solution:** Fetch latest task version, retry update with current version

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

### Issue: Headers not forwarded to backend
**Cause:** JWT forwarding not enabled  
**Solution:** Go to API Runtime Configuration, enable "JWT Assertion Forwarding", republish API

---

## Notes

- **Internal vs External:** Direct backend calls (port 3001) bypass WSO2 and use JWT from backend
- **WSO2 Gateway:** External calls (port 8243) go through WSO2 with OAuth 2.0
- **Backend Compatibility:** Backend's `JwtAuthGuard` can detect WSO2 requests via headers
- **Token Types:** WSO2 uses OAuth tokens; backend uses JWT tokens (different)
- **Version Field:** Always include `version` in update requests to prevent conflicts
- **Team Isolation:** Backend enforces team-based access even if WSO2 allows request
