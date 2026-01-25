# Role-Based Access Control (RBAC) Flow

How RBAC works in the NestJS application.

## Components

### RolesGuard

**File:** `auth/roles.guard.ts`

Validates user roles and enforces access control. Checks user role against required roles, prevents role escalation, and throws proper HTTP exceptions.

### @Roles() Decorator

**File:** `auth/roles.guard.ts`

Declares required roles for a route:

```typescript
@Roles(UserRole.ADMIN)
@Roles(UserRole.ADMIN, UserRole.USER) // Multiple roles
```

### JwtAuthGuard

**File:** `auth/jwt.guard.ts`

Authenticates user and extracts JWT payload. Must be applied before RolesGuard.

---

## Request Flow

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
4. If authorized: Request proceeds to controller handler
5. If unauthorized: Throws ForbiddenException (403)
```

---

## Guard Order

**CRITICAL:** Guards execute in the order they're declared!

**Correct Order:**
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)  // Auth first, then Roles
@Roles(UserRole.ADMIN)
```

**Why:** RolesGuard needs `req.user` which is set by JwtAuthGuard

**Wrong Order:**
```typescript
@UseGuards(RolesGuard, JwtAuthGuard)  // Won't work!
```

---

## Role Escalation Prevention

### Protection Layers

1. **JWT Signature Validation** - Token cannot be modified without invalidating signature
2. **Role Enum Validation** - Only valid enum values accepted
3. **Database Role Enforcement** - Database enum constraint prevents invalid roles
4. **Role Source Verification** - Role comes from database, not user input

**JWT Payload:**
```typescript
const payload = {
  sub: user.id,
  email: user.email,
  role: user.role, // From database, not user input
};
```

---

## Usage Examples

### Admin-Only Endpoint

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Post('admin-action')
adminAction() {
  // Only ADMIN can access
}
```

### Multiple Roles

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.USER)
@Get('shared-resource')
sharedResource() {
  // Both ADMIN and USER can access
}
```

### Authenticated Only (No Role Check)

```typescript
@UseGuards(JwtAuthGuard)
@Get('user-data')
userData() {
  // Any authenticated user can access
}
```

---

## Error Responses

### 401 Unauthorized

**When:** User not authenticated

```json
{
  "statusCode": 401,
  "message": "Authentication required",
  "error": "Unauthorized"
}
```

**Causes:**
- No JWT token provided
- Token expired
- Token invalid
- JwtAuthGuard not applied before RolesGuard

### 403 Forbidden

**When:** User authenticated but lacks required role

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

1. **Token Security:** Role comes from database, token signed with secret key
2. **Role Validation:** Multiple layers (database enum, TypeScript enum, RolesGuard)
3. **Guard Order:** JwtAuthGuard must come before RolesGuard

---

## Best Practices

1. **Always use JwtAuthGuard first:**
   ```typescript
   @UseGuards(JwtAuthGuard, RolesGuard)  // Good
   @UseGuards(RolesGuard, JwtAuthGuard)  // Bad
   ```

2. **Use enum values:**
   ```typescript
   @Roles(UserRole.ADMIN)  // Good
   @Roles('ADMIN')         // Bad (no type safety)
   ```

3. **Be explicit:**
   ```typescript
   @UseGuards(JwtAuthGuard, RolesGuard)
   @Roles(UserRole.ADMIN)  // Clear intent
   ```

---

## Summary

**Components:**
- **RolesGuard** - Validates user roles
- **@Roles() Decorator** - Declares required roles
- **JwtAuthGuard** - Authenticates users

**Security:**
- Role escalation prevention (multiple validation layers)
- Token security (signed JWTs prevent tampering)
- Enum validation (only valid roles accepted)

**Flow:**
1. Request arrives
2. JwtAuthGuard authenticates
3. RolesGuard validates role
4. Request proceeds or throws error
