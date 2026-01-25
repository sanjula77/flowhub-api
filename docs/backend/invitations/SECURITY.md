# Invitation Security

Security features and threat mitigation for the invitation system.

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
- 256 bits of entropy (extremely secure)
- Cryptographically secure random number generator
- Base64url encoding (URL-safe)
- Unpredictable and unguessable

---

### 2. Token Expiration

**Default:** 7 days

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

1. **Database Constraints:**
   ```typescript
   @Index(['email', 'teamId'], { where: '"usedAt" IS NULL' })
   ```

2. **Application Check:**
   ```typescript
   const hasActiveInvitation = await this.invitationRepository.hasActiveInvitation(
     email,
     teamId,
   );
   ```

3. **User Existence Check:**
   ```typescript
   const existingUser = await this.userRepository.findByEmail(email);
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

---

## Database Constraints

### 1. Unique Token Constraint
```typescript
@Index(['token'], { unique: true })
```

### 2. Duplicate Invitation Prevention
```typescript
@Index(['email', 'teamId'], { where: '"usedAt" IS NULL' })
```

Prevents multiple active invitations for same email+team.

### 3. Foreign Key Constraints
```typescript
@ManyToOne(() => Team, { onDelete: 'CASCADE' })
@ManyToOne(() => User, { onDelete: 'CASCADE' })
```

---

## Threat Mitigation

### Threat 1: Token Guessing
**Mitigation:** 256-bit random tokens, cryptographically secure generation  
**Risk:** Negligible

### Threat 2: Token Interception
**Mitigation:** HTTPS required, email delivery (separate channel), short expiration, one-time use  
**Risk:** Low (with HTTPS)

### Threat 3: Replay Attacks
**Mitigation:** One-time use tokens, `usedAt` timestamp, database constraint  
**Risk:** None

### Threat 4: Duplicate Accounts
**Mitigation:** Email uniqueness check, database UNIQUE constraint  
**Risk:** None

### Threat 5: Unauthorized Invitations
**Mitigation:** Authorization checks, team admin verification  
**Risk:** None (with proper auth)

---

## Best Practices

### 1. Email Delivery
- Send invitation email with token
- Include expiration date
- Include team name
- Use secure email service (SendGrid, AWS SES)

### 2. Rate Limiting
- Limit invitation creation per admin
- Limit token validation attempts
- Prevent brute force token guessing

### 3. Token Storage
**Never:**
- Log tokens
- Include in error messages
- Return in API responses (except accept endpoint)

**Always:**
- Exclude from logs
- Use HTTPS
- Store securely

### 4. Cleanup
- Delete expired unused invitations
- Run cleanup job daily

---

## Summary

**Security Features:**
- Cryptographically secure tokens
- Token expiration (7 days)
- One-time use enforcement
- Duplicate prevention (multiple layers)
- Authorization checks
- Database constraints

**Threats Mitigated:**
- Token guessing (256-bit entropy)
- Token interception (HTTPS + expiration)
- Replay attacks (one-time use)
- Duplicate accounts (email uniqueness)
- Unauthorized invitations (authorization)
