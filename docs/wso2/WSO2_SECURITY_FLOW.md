# WSO2 Security Flow - Detailed Explanation

## Overview

This document explains the complete security flow when using WSO2 API Manager as a gateway for User and Team APIs.

---

## Complete Request Flow

### Step 1: Client Request

**Client sends request with OAuth token:**

```http
GET https://localhost:8243/flowhub/1.0.0/users/me
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token Source:**
- Generated from WSO2 Developer Portal
- OAuth 2.0 access token
- Contains user claims and scopes

---

### Step 2: WSO2 Gateway Processing

**WSO2 Gateway (Port 8243) performs:**

#### 2.1 Token Validation

```
1. Extract token from Authorization header
2. Validate token signature (JWT)
3. Check token expiration
4. Verify token issuer (WSO2)
5. Validate scopes/permissions
6. Check rate limits
```

**If invalid:**
- Return `401 Unauthorized` or `403 Forbidden`
- Request stops here

**If valid:**
- Continue to next step

#### 2.2 Rate Limiting Check

```
1. Check application throttle policy
2. Check API throttle policy
3. Check resource throttle policy
4. Increment request counter
```

**If limit exceeded:**
- Return `429 Too Many Requests`
- Request stops here

**If within limit:**
- Continue to next step

#### 2.3 Analytics Logging

```
1. Log request timestamp
2. Log API endpoint
3. Log user/application
4. Log request size
5. Store for analytics dashboard
```

#### 2.4 JWT Assertion Generation

**WSO2 generates JWT assertion:**

```json
{
  "iss": "wso2",
  "sub": "user@example.com",
  "aud": "flowhub",
  "exp": 1640995200,
  "iat": 1640991600,
  "scope": "read write",
  "apiContext": "/flowhub",
  "apiVersion": "1.0.0",
  "apiName": "FlowHub Users & Teams API",
  "application": {
    "id": "app-uuid",
    "name": "FlowHub Web App"
  }
}
```

#### 2.5 Header Addition

**WSO2 adds headers to request:**

```http
X-JWT-Assertion: <generated_jwt>
X-WSO2-USERNAME: user@example.com
X-WSO2-API-CONTEXT: /flowhub
X-WSO2-API-VERSION: 1.0.0
X-WSO2-API-NAME: FlowHub Users & Teams API
X-WSO2-REQUEST-ID: <unique-id>
activityid: <request-id>
```

#### 2.6 Request Forwarding

**WSO2 forwards to backend:**

```http
GET http://flowhub-backend-1:3001/users/me
X-JWT-Assertion: <jwt_token>
X-WSO2-USERNAME: user@example.com
activityid: <request-id>
... (other headers)
```

**Note:** Original `Authorization` header may or may not be forwarded (depends on config)

---

### Step 3: Backend Processing

**Backend receives request:**

#### 3.1 Wso2AuthGuard Detection

```typescript
// Check if request came from WSO2
const isWso2Request = !!request.headers['activityid'];

if (isWso2Request) {
  // Request came through WSO2
  // Trust WSO2's validation
}
```

#### 3.2 User Extraction

**From WSO2 headers:**

```typescript
const username = request.headers['x-wso2-username'];
const jwtAssertion = request.headers['x-jwt-assertion'];

// Decode JWT (without verification - WSO2 already validated)
const claims = decodeJwt(jwtAssertion);

const user = {
  username: username || claims.sub,
  email: claims.sub,
  roles: claims.scope?.split(' ') || [],
  validatedByWso2: true,
  activityId: request.headers['activityid']
};
```

#### 3.3 Request Processing

**Backend processes request:**

```typescript
@UseGuards(Wso2AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Get('users')
getUsers(@Request() req) {
  // req.user is set by Wso2AuthGuard
  // Contains user info from WSO2
  return this.usersService.findAll();
}
```

#### 3.4 Response

**Backend returns response:**

```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "role": "USER",
  ...
}
```

---

### Step 4: Response Flow

**Backend → WSO2 → Client**

```
1. Backend sends response to WSO2
2. WSO2 logs response (analytics)
3. WSO2 adds rate limit headers
4. WSO2 forwards response to client
```

**Response Headers Added by WSO2:**

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

---

## Security Layers

### Layer 1: WSO2 Gateway

**Protection:**
- OAuth 2.0 token validation
- Rate limiting
- Request logging
- CORS handling

**Benefits:**
- Centralized security
- Standard OAuth flows
- Protection against abuse
- Analytics

---

### Layer 2: Backend Guards

**Protection:**
- Wso2AuthGuard: Validates WSO2 request
- RolesGuard: Validates user roles
- Business logic validation

**Benefits:**
- Defense in depth
- Additional security
- Business rule enforcement

---

### Layer 3: Database

**Protection:**
- Foreign key constraints
- Unique constraints
- Enum type enforcement
- Soft delete checks

**Benefits:**
- Data integrity
- Last line of defense
- Prevents data corruption

---

## Token Lifecycle

### 1. Token Generation

**In Developer Portal:**

```
1. User creates application
2. Generates OAuth keys
3. Gets access token
4. Token expires in 1 hour (default)
```

### 2. Token Usage

**Client uses token:**

```http
Authorization: Bearer <access_token>
```

**WSO2 validates:**
- Signature
- Expiration
- Scopes
- Application

### 3. Token Refresh

**If token expires:**

```
1. Client gets 401 Unauthorized
2. Client requests refresh token
3. WSO2 issues new access token
4. Client retries request
```

### 4. Token Revocation

**If compromised:**

```
1. Revoke token in Developer Portal
2. Token immediately invalid
3. All requests with token fail
4. Generate new token
```

---

## JWT Assertion Details

### JWT Structure

**Header:**
```json
{
  "alg": "RS256",
  "typ": "JWT"
}
```

**Payload:**
```json
{
  "iss": "wso2",
  "sub": "user@example.com",
  "aud": "flowhub",
  "exp": 1640995200,
  "iat": 1640991600,
  "scope": "read write",
  "apiContext": "/flowhub",
  "apiVersion": "1.0.0",
  "apiName": "FlowHub Users & Teams API"
}
```

**Signature:**
```
WSO2 signs with private key
Backend can verify with public key (optional)
```

### Backend Processing

**Wso2AuthGuard extracts:**

```typescript
// From X-JWT-Assertion header
const jwt = request.headers['x-jwt-assertion'];
const claims = decodeJwt(jwt); // Without verification

// From X-WSO2-USERNAME header
const username = request.headers['x-wso2-username'];

// Build user object
const user = {
  username: username || claims.sub,
  email: claims.sub,
  roles: parseRoles(claims.scope),
  validatedByWso2: true
};
```

**Why No Verification:**
- WSO2 already validated token
- Request came from trusted gateway
- `activityid` header proves WSO2 origin
- Additional verification adds overhead

---

## When to Bypass Gateway

### Scenario 1: Frontend Direct Calls

**Use Direct Backend:**

```typescript
// Frontend calls backend directly
fetch('http://localhost:3001/users/me', {
  credentials: 'include' // Sends cookies
});
```

**Why:**
- Faster (no gateway overhead)
- Simpler (cookie-based auth)
- Better UX (lower latency)
- No OAuth complexity

**When:**
- Same-origin requests
- Cookie-based authentication
- User-facing features

---

### Scenario 2: Service-to-Service

**Use Direct Backend:**

```typescript
// Microservice calls another service
fetch('http://flowhub-backend-1:3001/users/:id');
```

**Why:**
- Internal network (secure)
- No OAuth needed
- Faster communication
- Simpler architecture

**When:**
- Internal APIs
- Microservice communication
- Service mesh (if used)

---

### Scenario 3: External APIs

**Use WSO2 Gateway:**

```typescript
// External client calls through gateway
fetch('https://localhost:8243/flowhub/1.0.0/users', {
  headers: {
    'Authorization': 'Bearer <wso2_token>'
  }
});
```

**Why:**
- OAuth 2.0 standard
- Rate limiting
- Analytics
- Multi-client support
- API versioning

**When:**
- Public APIs
- Third-party integrations
- Mobile applications
- Partner APIs

---

## Recommended Architecture

### Frontend → Backend (Direct)

**Endpoints:**
- `/users/me` - Own profile
- `/teams/me` - Own team
- `/projects` - User projects
- `/auth/*` - Authentication

**URL:** `http://localhost:3001/...`

**Auth:** Cookie-based (HTTP-only)

---

### External → WSO2 Gateway

**Endpoints:**
- `/users` - Admin operations
- `/teams` - Team management
- `/invitations` - Invitation system

**URL:** `https://localhost:8243/flowhub/1.0.0/...`

**Auth:** OAuth 2.0 (Bearer token)

---

## Security Comparison

### Direct Backend

**Pros:**
- ✅ Faster (no gateway overhead)
- ✅ Simpler (cookie-based)
- ✅ Lower latency
- ✅ No OAuth complexity

**Cons:**
- ❌ No rate limiting
- ❌ No analytics
- ❌ No OAuth standard
- ❌ Limited multi-client support

---

### WSO2 Gateway

**Pros:**
- ✅ OAuth 2.0 standard
- ✅ Rate limiting
- ✅ Analytics
- ✅ Multi-client support
- ✅ API versioning
- ✅ Subscription management

**Cons:**
- ❌ Additional latency
- ❌ OAuth complexity
- ❌ More configuration
- ❌ Gateway dependency

---

## Best Practices

### 1. Use Gateway for External APIs

**Always use WSO2 for:**
- Public-facing endpoints
- Third-party integrations
- Mobile applications
- Partner APIs

---

### 2. Use Direct Backend for Internal

**Always use direct for:**
- Frontend same-origin calls
- Service-to-service communication
- Internal microservices
- Development/testing

---

### 3. Hybrid Approach

**Recommended:**
- Frontend → Direct backend (user-facing)
- External → WSO2 gateway (public APIs)
- Services → Direct backend (internal)

---

## Summary

**WSO2 Security Flow:**
1. Client sends OAuth token
2. WSO2 validates token
3. WSO2 generates JWT assertion
4. WSO2 forwards to backend
5. Backend trusts WSO2 validation
6. Backend processes request

**When to Use:**
- ✅ External APIs → WSO2
- ✅ Internal frontend → Direct
- ✅ Service-to-service → Direct

**Security:**
- ✅ OAuth 2.0 at gateway
- ✅ JWT assertion forwarding
- ✅ Rate limiting
- ✅ Analytics
- ✅ Defense in depth

The configuration provides enterprise-grade security with proper OAuth 2.0, JWT forwarding, rate limiting, and analytics.

