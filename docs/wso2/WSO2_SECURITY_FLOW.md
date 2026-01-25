# WSO2 Security Flow

Complete security flow when using WSO2 API Manager as a gateway.

## Request Flow

### Step 1: Client Request

**Client sends request with OAuth token:**
```http
GET https://localhost:8243/flowhub/1.0.0/users/me
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token Source:** Generated from WSO2 Developer Portal, OAuth 2.0 access token

---

### Step 2: WSO2 Gateway Processing

**WSO2 Gateway (Port 8243) performs:**

#### 2.1 Token Validation
- Extract token from Authorization header
- Validate token signature (JWT)
- Check token expiration
- Verify token issuer (WSO2)
- Validate scopes/permissions
- Check rate limits

**If invalid:** Return `401 Unauthorized` or `403 Forbidden`

#### 2.2 Rate Limiting Check
- Check application throttle policy
- Check API throttle policy
- Check resource throttle policy
- Increment request counter

**If limit exceeded:** Return `429 Too Many Requests`

#### 2.3 JWT Assertion Generation

WSO2 generates JWT assertion with user claims and forwards to backend.

#### 2.4 Header Addition

WSO2 adds headers:
```http
X-JWT-Assertion: <generated_jwt>
X-WSO2-USERNAME: user@example.com
X-WSO2-API-CONTEXT: /flowhub
X-WSO2-API-VERSION: 1.0.0
activityid: <request-id>
```

#### 2.5 Request Forwarding

WSO2 forwards to backend:
```http
GET http://flowhub-backend-1:3001/users/me
X-JWT-Assertion: <jwt_token>
X-WSO2-USERNAME: user@example.com
activityid: <request-id>
```

---

### Step 3: Backend Processing

**Backend receives request:**

#### 3.1 Wso2AuthGuard Detection
```typescript
const isWso2Request = !!request.headers['activityid'];
```

#### 3.2 User Extraction
```typescript
const username = request.headers['x-wso2-username'];
const jwtAssertion = request.headers['x-jwt-assertion'];
const claims = decodeJwt(jwtAssertion);
```

#### 3.3 Request Processing
```typescript
@UseGuards(Wso2AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Get('users')
getUsers(@Request() req) {
  return this.usersService.findAll();
}
```

---

### Step 4: Response Flow

**Backend → WSO2 → Client**

1. Backend sends response to WSO2
2. WSO2 logs response (analytics)
3. WSO2 adds rate limit headers
4. WSO2 forwards response to client

---

## Security Layers

### Layer 1: WSO2 Gateway
- OAuth 2.0 token validation
- Rate limiting
- Request logging
- CORS handling

### Layer 2: Backend Guards
- Wso2AuthGuard: Validates WSO2 request
- RolesGuard: Validates user roles
- Business logic validation

### Layer 3: Database
- Foreign key constraints
- Unique constraints
- Enum type enforcement
- Soft delete checks

---

## Token Lifecycle

### 1. Token Generation
- User creates application
- Generates OAuth keys
- Gets access token
- Token expires in 1 hour (default)

### 2. Token Usage
- Client uses token in Authorization header
- WSO2 validates: signature, expiration, scopes, application

### 3. Token Refresh
- If token expires: Client gets 401, requests refresh token, WSO2 issues new access token

### 4. Token Revocation
- If compromised: Revoke token in Developer Portal, token immediately invalid

---

## When to Bypass Gateway

### Scenario 1: Frontend Direct Calls
**Use Direct Backend:**
- Faster (no gateway overhead)
- Simpler (cookie-based auth)
- Better UX (lower latency)

**When:** Same-origin requests, cookie-based authentication

### Scenario 2: Service-to-Service
**Use Direct Backend:**
- Internal network (secure)
- No OAuth needed
- Faster communication

**When:** Internal APIs, microservice communication

### Scenario 3: External APIs
**Use WSO2 Gateway:**
- OAuth 2.0 standard
- Rate limiting
- Analytics
- Multi-client support

**When:** Public APIs, third-party integrations, mobile applications

---

## Recommended Architecture

### Frontend → Backend (Direct)
**Endpoints:** `/users/me`, `/teams/me`, `/projects`, `/auth/*`  
**URL:** `http://localhost:3001/...`  
**Auth:** Cookie-based (HTTP-only)

### External → WSO2 Gateway
**Endpoints:** `/users`, `/teams`, `/invitations`  
**URL:** `https://localhost:8243/flowhub/1.0.0/...`  
**Auth:** OAuth 2.0 (Bearer token)

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
- External APIs → WSO2
- Internal frontend → Direct
- Service-to-service → Direct

**Security:**
- OAuth 2.0 at gateway
- JWT assertion forwarding
- Rate limiting
- Analytics
- Defense in depth
