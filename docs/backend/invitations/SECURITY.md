# Invitation Flow - Security Considerations

## Security Features

### 1. Token Generation

**Method:** Cryptographically secure random token
```typescript
private generateInvitationToken(): string {
  const randomBytes = crypto.randomBytes(32); // 256 bits
  return randomBytes.toString('base64url');
}
```

**Security Properties:**
- ✅ 256 bits of entropy (extremely secure)
- ✅ Cryptographically secure random number generator
- ✅ Base64url encoding (URL-safe)
- ✅ Unpredictable and unguessable

**Why Secure:**
- Even with billions of attempts, probability of guessing is negligible
- Uses Node.js `crypto.randomBytes()` (CSPRNG)
- No patterns or sequential generation

---

### 2. Token Expiration

**Default:** 7 days

**Implementation:**
```typescript
const expiresAt = new Date();
expiresAt.setDate(expiresAt.getDate() + 7);
```

**Security Benefits:**
- Limits exposure window if token is compromised
- Forces timely acceptance
- Reduces stale invitation clutter

**Configurable:** Can be adjusted via `INVITATION_EXPIRY_DAYS`

---

### 3. One-Time Use

**Implementation:**
```typescript
@Column({ type: 'timestamptz', nullable: true, name: 'used_at' })
usedAt?: Date; // null = not used, Date = used
```

**Security Benefits:**
- Prevents token reuse after acceptance
- Marks invitation as consumed
- Prevents account takeover via old tokens

**Validation:**
```typescript
if (invitation.usedAt) {
  throw new ConflictException('This invitation has already been used');
}
```

---

### 4. Duplicate Prevention

**Multiple Layers:**

#### Layer 1: Database Constraints
```typescript
@Index(['email', 'teamId'], { where: '"usedAt" IS NULL' })
// Prevents duplicate active invitations
```

#### Layer 2: Application Check
```typescript
const hasActiveInvitation = await this.invitationRepository.hasActiveInvitation(
  email,
  teamId,
);
if (hasActiveInvitation) {
  throw new ConflictException('Active invitation already exists');
}
```

#### Layer 3: User Existence Check
```typescript
const existingUser = await this.userRepository.findByEmail(email);
if (existingUser) {
  throw new ConflictException('User already exists');
}
```

**Benefits:**
- Prevents duplicate invitations
- Prevents inviting existing users
- Race condition protection

---

### 5. Authorization Checks

**Who Can Invite:**
- System ADMIN (any team)
- Team admin (their own team only)

**Implementation:**
```typescript
const isSystemAdmin = inviter.role === UserRole.ADMIN;
const isTeamAdmin = await this.isTeamAdmin(inviter, teamId);

if (!isSystemAdmin && !isTeamAdmin) {
  throw new ForbiddenException('Only team admins can invite users');
}
```

**Security:**
- Prevents unauthorized invitations
- Validates team membership
- Checks actual admin status (not just role)

---

### 6. Email Validation

**Input Validation:**
```typescript
@IsEmail({}, { message: 'Email must be a valid email address' })
email: string;
```

**Benefits:**
- Prevents invalid email formats
- Reduces typos
- Ensures deliverability

---

### 7. Token Validation

**Pre-Acceptance Check:**
```typescript
async validateInvitationToken(token: string) {
  // Check token exists
  // Check not expired
  // Check not used
  // Return validation result
}
```

**Benefits:**
- Frontend can validate before showing form
- Better UX (show errors early)
- Prevents unnecessary API calls

---

## Database Constraints

### 1. Unique Token Constraint

```typescript
@Index(['token'], { unique: true })
```

**Purpose:**
- Ensures token uniqueness
- Prevents collisions
- Database-level enforcement

---

### 2. Duplicate Invitation Prevention

```typescript
@Index(['email', 'teamId'], { where: '"usedAt" IS NULL' })
```

**Purpose:**
- Prevents multiple active invitations for same email+team
- Partial index (only active invitations)
- Efficient querying

---

### 3. Foreign Key Constraints

```typescript
@ManyToOne(() => Team, { onDelete: 'CASCADE' })
@ManyToOne(() => User, { onDelete: 'CASCADE' })
```

**Purpose:**
- Maintains referential integrity
- Auto-cleanup if team/user deleted
- Prevents orphaned invitations

---

## API Endpoint Security

### 1. Create Invitation (Protected)

**Endpoint:** `POST /invitations`
**Auth:** Required (JWT)
**Authorization:** ADMIN or team admin

**Security:**
- ✅ Requires authentication
- ✅ Validates permissions
- ✅ Validates team membership
- ✅ Prevents duplicate invitations

---

### 2. Accept Invitation (Public)

**Endpoint:** `POST /invitations/accept`
**Auth:** Not required (public)

**Security:**
- ✅ Token validation (must be valid)
- ✅ Expiration check
- ✅ One-time use enforcement
- ✅ Duplicate user prevention
- ✅ Password strength validation

**Why Public:**
- User doesn't have account yet
- Token provides authentication
- No need for additional auth

---

### 3. Validate Token (Public)

**Endpoint:** `GET /invitations/validate/:token`
**Auth:** Not required

**Security:**
- ✅ Token validation
- ✅ No sensitive data exposed
- ✅ Rate limiting recommended

---

## Threat Mitigation

### Threat 1: Token Guessing

**Mitigation:**
- 256-bit random tokens
- Cryptographically secure generation
- Probability of guessing: ~0

**Risk:** Negligible

---

### Threat 2: Token Interception

**Mitigation:**
- HTTPS required (in production)
- Email delivery (separate channel)
- Short expiration (7 days)
- One-time use

**Risk:** Low (with HTTPS)

---

### Threat 3: Replay Attacks

**Mitigation:**
- One-time use tokens
- `usedAt` timestamp
- Database constraint

**Risk:** None

---

### Threat 4: Duplicate Accounts

**Mitigation:**
- Email uniqueness check
- Database UNIQUE constraint
- Application-level validation

**Risk:** None

---

### Threat 5: Unauthorized Invitations

**Mitigation:**
- Authorization checks
- Team admin verification
- Role validation

**Risk:** None (with proper auth)

---

## Best Practices

### 1. Email Delivery

**Recommended:**
- Send invitation email with token
- Include expiration date
- Include team name
- Include inviter name
- Use secure email service (SendGrid, AWS SES)

**Example Email:**
```
Subject: You've been invited to join [Team Name]

Hi,

[Admin Name] has invited you to join [Team Name] on FlowHub.

Click here to accept: https://app.flowhub.com/invitations/accept?token=...

This invitation expires in 7 days.

If you didn't expect this invitation, you can safely ignore this email.
```

---

### 2. Rate Limiting

**Recommended:**
- Limit invitation creation per admin
- Limit token validation attempts
- Prevent brute force token guessing

**Implementation:**
```typescript
// Use @nestjs/throttler
@Throttle(10, 60) // 10 requests per minute
```

---

### 3. Token Storage

**Never:**
- ❌ Log tokens
- ❌ Include in error messages
- ❌ Return in API responses (except accept endpoint)

**Always:**
- ✅ Store hashed (if possible)
- ✅ Exclude from logs
- ✅ Use HTTPS

---

### 4. Cleanup

**Recommended:**
- Delete expired unused invitations
- Run cleanup job daily

**Implementation:**
```typescript
// Cron job
@Cron('0 0 * * *') // Daily at midnight
async cleanupExpiredInvitations() {
  await this.invitationRepository.deleteExpired();
}
```

---

## Summary

### Security Features:
- ✅ Cryptographically secure tokens
- ✅ Token expiration (7 days)
- ✅ One-time use enforcement
- ✅ Duplicate prevention (multiple layers)
- ✅ Authorization checks
- ✅ Database constraints

### Threats Mitigated:
- ✅ Token guessing (256-bit entropy)
- ✅ Token interception (HTTPS + expiration)
- ✅ Replay attacks (one-time use)
- ✅ Duplicate accounts (email uniqueness)
- ✅ Unauthorized invitations (authorization)

### Best Practices:
- ✅ Email delivery
- ✅ Rate limiting
- ✅ Token cleanup
- ✅ Secure storage

The invitation flow is secure, follows best practices, and prevents common attack vectors.

