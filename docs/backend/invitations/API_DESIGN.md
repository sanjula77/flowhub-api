# Invitation API Design

API endpoints and service logic for team invitations.

## API Endpoints

### 1. Create Invitation

**Endpoint:** `POST /invitations`

**Authentication:** Required (JWT)

**Authorization:** ADMIN or team admin

**Request Body:**
```json
{
  "email": "user@example.com",
  "teamId": "uuid-here",
  "role": "USER",
  "customMessage": "Welcome to our team!"
}
```

**Response (201 Created):**
```json
{
  "id": "invitation-uuid",
  "email": "user@example.com",
  "role": "USER",
  "teamId": "team-uuid",
  "invitedById": "admin-uuid",
  "expiresAt": "2024-01-15T00:00:00Z",
  "createdAt": "2024-01-08T00:00:00Z",
  "usedAt": null
}
```

**Error Responses:**
- `403 Forbidden` - Not team admin or system admin
- `404 Not Found` - Team not found
- `409 Conflict` - User already exists or active invitation exists
- `400 Bad Request` - Invalid input

---

### 2. Accept Invitation

**Endpoint:** `POST /invitations/accept`

**Authentication:** Not required (public endpoint)

**Request Body:**
```json
{
  "token": "invitation-token-here",
  "password": "secure-password-123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response (200 OK):**
```json
{
  "message": "Invitation accepted successfully. Account created.",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "role": "USER",
    "teamId": "team-uuid"
  },
  "accessToken": "jwt-token-here",
  "refreshToken": "refresh-token-here"
}
```

**Error Responses:**
- `404 Not Found` - Invalid or expired token
- `400 Bad Request` - Token expired or invalid password
- `409 Conflict` - Token already used or user already exists

---

### 3. Validate Invitation Token

**Endpoint:** `GET /invitations/validate/:token`

**Authentication:** Not required (public endpoint)

**Response (200 OK):**
```json
{
  "valid": true,
  "email": "user@example.com",
  "teamName": "Engineering Team",
  "expiresAt": "2024-01-15T00:00:00Z"
}
```

**Invalid Token Response:**
```json
{
  "valid": false,
  "message": "Invalid invitation token"
}
```

---

### 4. Get Team Invitations

**Endpoint:** `GET /invitations/team/:teamId`

**Authentication:** Required (JWT)

**Authorization:** Team admin or system ADMIN

**Response (200 OK):**
```json
[
  {
    "id": "invitation-uuid-1",
    "email": "user1@example.com",
    "role": "USER",
    "teamId": "team-uuid",
    "expiresAt": "2024-01-15T00:00:00Z",
    "createdAt": "2024-01-08T00:00:00Z",
    "usedAt": null
  }
]
```

**Error Responses:**
- `403 Forbidden` - Not team admin
- `401 Unauthorized` - Not authenticated

---

## Service Logic Flow

### Create Invitation Flow

```
1. Validate inviter permissions (ADMIN or team admin)
2. Validate team exists
3. Check if user already exists → Error if exists
4. Check if active invitation exists → Error if exists
5. Generate secure token (256-bit random)
6. Set expiration (7 days)
7. Create invitation record
8. Send invitation email (TODO)
9. Return invitation DTO (token excluded)
```

### Accept Invitation Flow

```
1. Find invitation by token
2. Validate token exists → Error if not found
3. Validate token not expired → Error if expired
4. Validate token not used → Error if used
5. Double-check user doesn't exist → Error if exists
6. Hash password
7. Create user account
8. Mark invitation as used
9. Generate JWT tokens
10. Return user + tokens
```

---

## Database Constraints

### 1. Unique Token
```sql
CREATE UNIQUE INDEX ON invitations(token);
```

### 2. Duplicate Prevention
```sql
CREATE UNIQUE INDEX ON invitations(email, team_id) 
WHERE used_at IS NULL;
```

Prevents multiple active invitations for same email+team.

### 3. Foreign Keys
```sql
FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;
FOREIGN KEY (invited_by_id) REFERENCES users(id) ON DELETE CASCADE;
```

---

## Security Considerations

1. **Token Security:** Cryptographically secure (256-bit), never logged or exposed
2. **Authorization:** Only ADMIN or team admin can invite
3. **Duplicate Prevention:** Database unique constraints + application validation
4. **Input Validation:** Email format, password strength, role enum validation

---

## Summary

**API Endpoints:**
- `POST /invitations` - Create invitation (protected)
- `POST /invitations/accept` - Accept invitation (public)
- `GET /invitations/validate/:token` - Validate token (public)
- `GET /invitations/team/:teamId` - List team invitations (protected)

**Service Logic:**
- Authorization checks
- Duplicate prevention
- Token generation
- User creation

**Security:**
- Secure token generation
- Token expiration
- One-time use
- Database constraints
