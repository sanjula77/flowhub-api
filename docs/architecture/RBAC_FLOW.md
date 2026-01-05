# Role-Based Access Control (RBAC) Flow

## Overview

This document explains how role-based access control (RBAC) works in the NestJS application, including the flow, guard implementation, and security considerations.

## Components

### 1. RolesGuard

**File:** `auth/roles.guard.ts`

**Purpose:** Validates user roles and enforces access control

**Features:**
- Checks user role against required roles
- Prevents role escalation
- Throws proper HTTP exceptions
- Works seamlessly with JwtAuthGuard

### 2. @Roles() Decorator

**File:** `auth/roles.guard.ts`

**Purpose:** Declares required roles for a route

**Usage:**
```typescript
@Roles(UserRole.ADMIN)
@Roles(UserRole.ADMIN, UserRole.USER) // Multiple roles
```

### 3. JwtAuthGuard

**File:** `auth/jwt.guard.ts`

**Purpose:** Authenticates user and extracts JWT payload

**Integration:** Must be applied before RolesGuard

---

## Request Flow

### Step-by-Step Flow

```
1. Request arrives at endpoint
   ↓
2. JwtAuthGuard executes first
   - Extracts JWT token from cookie/header
   - Validates token signature
   - Decodes payload
   - Attaches user object to request (req.user)
   ↓
3. RolesGuard executes second
   - Reads @Roles() decorator metadata
   - Extracts user role from req.user
   - Validates role is valid enum value
   - Checks if user role matches required roles
   ↓
4. If authorized:
   - Request proceeds to controller handler
   ↓
5. If unauthorized:
   - Throws ForbiddenException (403)
```

---

## Guard Order

**CRITICAL:** Guards execute in the order they're declared!

### ✅ Correct Order

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)  // Auth first, then Roles
@Roles(UserRole.ADMIN)
```

**Why:** RolesGuard needs `req.user` which is set by JwtAuthGuard

### ❌ Wrong Order

```typescript
@UseGuards(RolesGuard, JwtAuthGuard)  // Won't work!
```

**Why:** RolesGuard executes first, but `req.user` doesn't exist yet

---

## Role Escalation Prevention

### What is Role Escalation?

**Definition:** When a user tries to gain higher privileges than they should have

**Example Attack:**
1. User has role: `USER`
2. User modifies JWT token to claim role: `ADMIN`
3. User tries to access admin-only endpoint

### How We Prevent It

#### 1. JWT Signature Validation

**JwtAuthGuard validates:**
- Token signature (cannot be forged)
- Token expiration
- Token structure

**Result:** User cannot modify token without invalidating signature

#### 2. Role Enum Validation

**RolesGuard validates:**
```typescript
private validateRole(role: string): void {
  const validRoles = Object.values(UserRole);
  if (!validRoles.includes(role as UserRole)) {
    throw new ForbiddenException('Invalid role detected');
  }
}
```

**Result:** Only valid enum values accepted

#### 3. Database Role Enforcement

**User entity:**
```typescript
@Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
role: UserRole;
```

**Result:** Database enforces valid role values

#### 4. Role Source Verification

**JWT payload includes role from database:**
```typescript
// When token is generated
const payload = {
  sub: user.id,
  email: user.email,
  role: user.role, // From database, not user input
};
```

**Result:** Role comes from trusted source (database)

---

## Usage Examples

### Example 1: Admin-Only Endpoint

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Post('admin-action')
adminAction() {
  // Only ADMIN can access
}
```

**Flow:**
1. JwtAuthGuard validates token
2. RolesGuard checks if user.role === 'ADMIN'
3. If yes → Allow access
4. If no → Throw 403 Forbidden

---

### Example 2: Multiple Roles

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.USER)
@Get('shared-resource')
sharedResource() {
  // Both ADMIN and USER can access
}
```

**Flow:**
1. JwtAuthGuard validates token
2. RolesGuard checks if user.role is in ['ADMIN', 'USER']
3. If yes → Allow access
4. If no → Throw 403 Forbidden

---

### Example 3: Authenticated Only (No Role Check)

```typescript
@UseGuards(JwtAuthGuard)
@Get('user-data')
userData() {
  // Any authenticated user can access
  // No role check needed
}
```

**Flow:**
1. JwtAuthGuard validates token
2. No RolesGuard → No role check
3. Allow access

---

## Error Responses

### 401 Unauthorized

**When:** User not authenticated

**Example:**
```json
{
  "statusCode": 401,
  "message": "Authentication required. Please ensure JwtAuthGuard is applied before RolesGuard.",
  "error": "Unauthorized"
}
```

**Causes:**
- No JWT token provided
- Token expired
- Token invalid
- JwtAuthGuard not applied before RolesGuard

---

### 403 Forbidden

**When:** User authenticated but lacks required role

**Example:**
```json
{
  "statusCode": 403,
  "message": "Access denied. Required roles: ADMIN. Your role: USER",
  "error": "Forbidden"
}
```

**Causes:**
- User role doesn't match required roles
- Invalid role detected (role escalation attempt)

---

## Security Considerations

### 1. Token Security

**JWT tokens include role:**
- Role comes from database (trusted source)
- Token signed with secret key
- Cannot be modified without invalidating signature

**Protection:**
- ✅ Role cannot be escalated via token modification
- ✅ Token signature prevents tampering
- ✅ Database is source of truth for roles

---

### 2. Role Validation

**Multiple layers:**
1. Database enum constraint
2. TypeScript enum type
3. RolesGuard enum validation

**Protection:**
- ✅ Invalid roles rejected at multiple levels
- ✅ Role escalation attempts detected
- ✅ Clear error messages for security issues

---

### 3. Guard Order

**Enforced:**
- JwtAuthGuard must come before RolesGuard
- RolesGuard throws error if user not found

**Protection:**
- ✅ Prevents bypassing authentication
- ✅ Clear error messages for misconfiguration

---

## Testing RBAC

### Test Case 1: Admin Access

```typescript
// Login as ADMIN
const adminToken = await login('admin@example.com', 'password');

// Access admin endpoint
const response = await request(app)
  .post('/admin-action')
  .set('Authorization', `Bearer ${adminToken}`)
  .expect(200); // ✅ Should succeed
```

---

### Test Case 2: User Access Denied

```typescript
// Login as USER
const userToken = await login('user@example.com', 'password');

// Try to access admin endpoint
const response = await request(app)
  .post('/admin-action')
  .set('Authorization', `Bearer ${userToken}`)
  .expect(403); // ✅ Should fail with Forbidden
```

---

### Test Case 3: No Token

```typescript
// Try to access without token
const response = await request(app)
  .post('/admin-action')
  .expect(401); // ✅ Should fail with Unauthorized
```

---

## Best Practices

### 1. Always Use JwtAuthGuard First

```typescript
// ✅ Good
@UseGuards(JwtAuthGuard, RolesGuard)

// ❌ Bad
@UseGuards(RolesGuard, JwtAuthGuard)
```

---

### 2. Use Enum Values

```typescript
// ✅ Good
@Roles(UserRole.ADMIN)

// ❌ Bad
@Roles('ADMIN') // String literal, no type safety
```

---

### 3. Be Explicit

```typescript
// ✅ Good - Clear intent
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)

// ❌ Bad - Unclear
@UseGuards(JwtAuthGuard) // Missing role check?
```

---

### 4. Document Role Requirements

```typescript
/**
 * Admin-only endpoint
 * Only users with ADMIN role can access
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Post('admin-action')
adminAction() {
  // ...
}
```

---

## Summary

### Components:
- ✅ **RolesGuard** - Validates user roles
- ✅ **@Roles() Decorator** - Declares required roles
- ✅ **JwtAuthGuard** - Authenticates users

### Security:
- ✅ **Role escalation prevention** - Multiple validation layers
- ✅ **Token security** - Signed JWTs prevent tampering
- ✅ **Enum validation** - Only valid roles accepted

### Flow:
1. Request arrives
2. JwtAuthGuard authenticates
3. RolesGuard validates role
4. Request proceeds or throws error

The RBAC implementation is secure, well-tested, and follows NestJS best practices.

