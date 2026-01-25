# WSO2 API Manager - Projects API Configuration

Guide for exposing `/projects` APIs through WSO2 API Manager with OAuth 2.0, JWT forwarding, and rate limiting.

## Prerequisites

- WSO2 API Manager 4.3.0 running (Docker: `flowhub-wso2-1`)
- Backend API running (Docker: `flowhub-backend-1`)
- Access to Publisher: `https://localhost:9443/publisher`
- Access to Developer Portal: `https://localhost:9443/devportal`

---

## Configuration Steps

### 1. Add Projects Resources

**Option A: Add to Existing FlowHub API (Recommended)**
1. Login to Publisher
2. Go to **"APIs"** → Find **"FlowHub API"**
3. Click **"Edit"** → **"Resources"** tab
4. Click **"Add New Resource"**

**Option B: Create New Projects API**
1. Click **"Create API"** → **"Design a New REST API"**
2. Fill in: Name: `FlowHub Projects API`, Context: `/flowhub-projects`, Version: `1.0.0`, Endpoint: `http://flowhub-backend-1:3001`

### 2. Configure Project Resources

Add the following resources:

| Method | Resource Path | Summary | Role Required |
|--------|---------------|---------|---------------|
| GET | `/projects` | Get all projects | ADMIN + USER |
| GET | `/projects/my-projects` | Get user's projects | ADMIN + USER |
| GET | `/projects/:id` | Get project by ID | ADMIN + USER |
| POST | `/projects` | Create project | ADMIN |
| PUT | `/projects/:id` | Update project | ADMIN |
| DELETE | `/projects/:id` | Delete project | ADMIN |
| GET | `/projects/admin/all` | Get all projects (ADMIN) | ADMIN |
| GET | `/projects/admin/team/:teamId` | Get projects by team | ADMIN |

For each resource:
- **HTTP Verb:** Select method
- **URL Pattern:** Enter path
- **Summary:** Enter description
- **Request/Response:** Configure media types (application/json)

---

### 3. Configure OAuth 2.0 Security

1. Go to **"Security"** tab
2. Select **"OAuth 2.0"** as security type
3. Enable grant types:
   - Client Credentials
   - Password Grant
   - Authorization Code
   - Refresh Token

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
- `X-WSO2-API-VERSION` - API version
- `activityid` - WSO2 activity ID

---

### 5. Configure Rate Limiting

Go to **"Runtime Configuration"** → **"Throttle Policies"**:

**Application-Level Throttling:**
- Policy: `ProjectsAPIThrottle` (or default)
- Limit: `1000 requests/minute`

**Resource-Level Throttling (Optional):**
- `POST /projects`: `500 requests/minute`
- `PUT /projects/:id`: `500 requests/minute`
- `DELETE /projects/:id`: `200 requests/minute`

---

### 6. Enable Analytics (Optional)

1. Go to **"Runtime Configuration"** tab
2. Scroll to **"Analytics"** section
3. Enable:
   - Enable Analytics
   - Enable Response Caching (optional)

---

### 7. Configure CORS

1. Go to **"Runtime Configuration"** → **"CORS"**
2. Enable CORS:
   - Enable CORS
   - **Allowed Origins:** `http://localhost:3000`, `https://localhost:9443`
   - Allow Credentials
   - **Allowed Methods:** GET, POST, PUT, DELETE, OPTIONS
   - **Allowed Headers:** `Content-Type`, `Authorization`, `X-JWT-Assertion`

---

### 8. Publish API

1. Go to **"Lifecycle"** tab
2. Click **"Publish"** button
3. API status changes to **"Published"**

---

### 9. Create Application & Subscribe

1. Navigate to Developer Portal: `https://localhost:9443/devportal`
2. Login: `admin/admin`
3. **"Applications"** → **"Create New Application"**
   - Name: `FlowHub Projects App`
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

```
Client Request → WSO2 Gateway (OAuth2 Validation) → JWT Assertion → NestJS Backend → PostgreSQL
                                      ↓
                            Analytics & Rate Limiting
```

**Request Transformation:**

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
activityid: <ACTIVITY_ID>
```

---

## Example API Calls

### Get All Projects

```bash
curl -X GET "https://localhost:8243/flowhub/1.0.0/projects" \
  -H "Authorization: Bearer <OAUTH_ACCESS_TOKEN>" \
  -k
```

### Create Project (ADMIN Only)

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
- [ ] POST /projects tested (ADMIN)
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

### Issue: Headers not forwarded to backend
**Cause:** JWT forwarding not enabled  
**Solution:** Go to API Runtime Configuration, enable "JWT Assertion Forwarding", republish API

---

## Notes

- **Internal vs External:** Direct backend calls (port 3001) bypass WSO2 and use JWT from backend
- **WSO2 Gateway:** External calls (port 8243) go through WSO2 with OAuth 2.0
- **Backend Compatibility:** Backend's `Wso2AuthGuard` can detect WSO2 requests via headers
- **Token Types:** WSO2 uses OAuth tokens; backend uses JWT tokens (different)
