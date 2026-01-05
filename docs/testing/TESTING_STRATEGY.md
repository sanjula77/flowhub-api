# Testing Strategy - User & Team Management

## Overview

Comprehensive testing strategy covering unit tests, integration tests, manual testing, and edge cases.

---

## Test Types

### 1. Unit Tests

**Purpose:** Test individual components in isolation

**Coverage:**
- Services (business logic)
- Guards (authorization logic)
- DTOs (validation)
- Repositories (data access)

**Tools:**
- Jest
- @nestjs/testing

---

### 2. Integration Tests

**Purpose:** Test API endpoints end-to-end

**Coverage:**
- HTTP requests/responses
- Authentication/Authorization
- Database interactions
- Error handling

**Tools:**
- Jest
- Supertest
- Test database

---

### 3. Manual Tests

**Purpose:** Human verification of functionality

**Coverage:**
- UI interactions
- User workflows
- Edge cases
- Performance

---

## Unit Test Cases

### UsersService Tests

#### ✅ Create User
- **Test:** Create user successfully
- **Assert:** User created, password excluded from response
- **Edge Case:** Duplicate email throws ConflictException

#### ✅ Find User
- **Test:** Find user by ID
- **Assert:** Returns user, password excluded
- **Edge Case:** Non-existent user throws NotFoundException

#### ✅ Update User
- **Test:** Update user successfully
- **Assert:** User updated, password excluded
- **Edge Case:** Duplicate email throws ConflictException

#### ✅ Soft Delete
- **Test:** Soft delete user
- **Assert:** deletedAt set, user not physically deleted
- **Edge Case:** Non-existent user throws NotFoundException

---

### TeamsService Tests

#### ✅ Create Team
- **Test:** ADMIN creates team
- **Assert:** Team created successfully
- **Edge Case:** Non-ADMIN throws ForbiddenException

#### ✅ Get My Team
- **Test:** User gets own team
- **Assert:** Returns user's team
- **Edge Case:** User without team throws NotFoundException

#### ✅ Add User to Team
- **Test:** Team admin adds user
- **Assert:** User added to team
- **Edge Case:** Cross-team addition throws ForbiddenException

#### ✅ Soft Delete Team
- **Test:** Delete team without users
- **Assert:** Team soft deleted
- **Edge Case:** Team with users throws ConflictException

---

### RolesGuard Tests

#### ✅ Role Validation
- **Test:** User with required role
- **Assert:** Access allowed
- **Edge Case:** Wrong role throws ForbiddenException

#### ✅ Multiple Roles
- **Test:** User with one of multiple roles
- **Assert:** Access allowed
- **Edge Case:** No matching role throws ForbiddenException

#### ✅ No User
- **Test:** Request without user
- **Assert:** Throws UnauthorizedException
- **Edge Case:** Missing authentication

---

## Integration Test Cases

### User Endpoints

#### ✅ GET /users/me
- **Test:** Authenticated user gets profile
- **Status:** 200 OK
- **Assert:** Returns user, password excluded
- **Auth:** Required

#### ✅ GET /users
- **Test:** ADMIN gets all users
- **Status:** 200 OK
- **Assert:** Returns array of users
- **Auth:** ADMIN only

#### ✅ POST /users
- **Test:** ADMIN creates user
- **Status:** 201 Created
- **Assert:** User created, password excluded
- **Auth:** ADMIN only
- **Edge Case:** Duplicate email → 409 Conflict

#### ✅ PUT /users/:id
- **Test:** ADMIN updates user
- **Status:** 200 OK
- **Assert:** User updated
- **Auth:** ADMIN only

#### ✅ PUT /users/me
- **Test:** User updates own profile
- **Status:** 200 OK
- **Assert:** Profile updated, role/teamId unchanged
- **Auth:** Any authenticated user

#### ✅ DELETE /users/:id
- **Test:** ADMIN deletes user
- **Status:** 204 No Content
- **Assert:** User soft deleted
- **Auth:** ADMIN only

---

### Team Endpoints

#### ✅ GET /teams/me
- **Test:** User gets own team
- **Status:** 200 OK
- **Assert:** Returns user's team
- **Auth:** Required

#### ✅ GET /teams
- **Test:** ADMIN gets all teams
- **Status:** 200 OK
- **Assert:** Returns array of teams
- **Auth:** ADMIN only

#### ✅ POST /teams
- **Test:** ADMIN creates team
- **Status:** 201 Created
- **Assert:** Team created
- **Auth:** ADMIN only
- **Edge Case:** Duplicate slug → 409 Conflict

#### ✅ DELETE /teams/:id
- **Test:** ADMIN deletes empty team
- **Status:** 204 No Content
- **Assert:** Team soft deleted
- **Auth:** ADMIN only
- **Edge Case:** Team with users → 409 Conflict

---

## Manual Test Checklist

### User Management

#### Create User
- [ ] Login as ADMIN
- [ ] Navigate to Users page
- [ ] Click "Create User"
- [ ] Fill form (email, password, team, role)
- [ ] Submit
- [ ] Verify user created
- [ ] Verify password not in response
- [ ] Try duplicate email → Verify error

#### View Users
- [ ] Login as ADMIN
- [ ] View all users list
- [ ] Verify passwords not visible
- [ ] Verify roles displayed
- [ ] Login as USER → Verify 403 error

#### Update User
- [ ] Login as ADMIN
- [ ] Update user email
- [ ] Update user role
- [ ] Verify changes saved
- [ ] Try duplicate email → Verify error
- [ ] Login as USER → Update own profile → Verify role/teamId unchanged

#### Delete User
- [ ] Login as ADMIN
- [ ] Delete user
- [ ] Verify user soft deleted (deletedAt set)
- [ ] Verify user not in active list
- [ ] Login as USER → Try delete → Verify 403

---

### Team Management

#### Create Team
- [ ] Login as ADMIN
- [ ] Navigate to Teams page
- [ ] Click "Create Team"
- [ ] Fill form (name, slug, description)
- [ ] Submit
- [ ] Verify team created
- [ ] Try duplicate slug → Verify error
- [ ] Login as USER → Try create → Verify 403

#### View Teams
- [ ] Login as ADMIN
- [ ] View all teams
- [ ] Verify team details
- [ ] Login as USER → View own team only

#### Update Team
- [ ] Login as ADMIN
- [ ] Update team name
- [ ] Update team slug
- [ ] Verify changes saved
- [ ] Try duplicate slug → Verify error

#### Delete Team
- [ ] Create empty team
- [ ] Delete team → Verify success
- [ ] Create team with users
- [ ] Try delete → Verify error (409)
- [ ] Remove users first
- [ ] Delete team → Verify success

---

### Role-Based Access

#### ADMIN Role
- [ ] Login as ADMIN
- [ ] Verify can access all endpoints
- [ ] Verify can create users/teams
- [ ] Verify can delete users/teams
- [ ] Verify can update any user

#### USER Role
- [ ] Login as USER
- [ ] Verify can view own profile
- [ ] Verify can view own team
- [ ] Verify cannot view all users (403)
- [ ] Verify cannot create users (403)
- [ ] Verify cannot delete users (403)

---

## Edge Cases

### 1. Duplicate Email

**Scenario:** Two requests create same email simultaneously

**Test:**
```typescript
// Race condition test
const promises = [
  service.create({ email: 'duplicate@test.com', ... }),
  service.create({ email: 'duplicate@test.com', ... }),
];

await expect(Promise.all(promises)).rejects.toThrow();
```

**Expected:** One succeeds, one throws ConflictException

**Protection:** Database UNIQUE constraint

---

### 2. Invalid Role

**Scenario:** Request with invalid role value

**Test:**
```typescript
await request(app)
  .post('/users')
  .send({ role: 'INVALID_ROLE' })
  .expect(400);
```

**Expected:** 400 Bad Request (validation error)

**Protection:** DTO enum validation

---

### 3. Cross-Team Access

**Scenario:** User from Team A tries to add user from Team B

**Test:**
```typescript
// User from team-1 tries to add user from team-2
await expect(
  service.addUserToTeam(team1Admin, team2User.id)
).rejects.toThrow(ForbiddenException);
```

**Expected:** 403 Forbidden

**Protection:** Service-level validation

---

### 4. Delete Team with Users

**Scenario:** Admin tries to delete team that has active users

**Test:**
```typescript
// Team has 5 active users
await expect(
  service.softDelete(teamWithUsers.id)
).rejects.toThrow(ConflictException);
```

**Expected:** 409 Conflict with message about active users

**Protection:** Service check + database RESTRICT

---

### 5. Token Expiration

**Scenario:** User's JWT token expires during session

**Test:**
```typescript
// Wait for token to expire
await new Promise(resolve => setTimeout(resolve, 16 * 60 * 1000));

await request(app)
  .get('/users/me')
  .set('Authorization', `Bearer ${expiredToken}`)
  .expect(401);
```

**Expected:** 401 Unauthorized

**Protection:** JWT expiration validation

---

### 6. Soft-Deleted User

**Scenario:** Try to use soft-deleted user

**Test:**
```typescript
// Soft delete user
await service.softDelete(userId);

// Try to login
await request(app)
  .post('/auth/login')
  .send({ email: deletedUser.email, password: 'password' })
  .expect(401);
```

**Expected:** 401 Unauthorized (user not found)

**Protection:** Repository filters deletedAt IS NULL

---

### 7. Empty Team Slug

**Scenario:** Create team with empty slug

**Test:**
```typescript
await request(app)
  .post('/teams')
  .send({ name: 'Team', slug: '' })
  .expect(400);
```

**Expected:** 400 Bad Request (validation error)

**Protection:** DTO validation

---

### 8. SQL Injection Attempt

**Scenario:** Malicious input in email field

**Test:**
```typescript
await request(app)
  .post('/users')
  .send({ 
    email: "'; DROP TABLE users; --",
    password: 'password',
    teamId: teamId
  })
  .expect(400); // Should be caught by validation
```

**Expected:** 400 Bad Request (invalid email format)

**Protection:** DTO email validation + TypeORM parameterized queries

---

## Failure Scenarios

### Scenario 1: Database Connection Lost

**Test:**
```typescript
// Simulate database disconnect
await disconnectDatabase();

await expect(service.findAll()).rejects.toThrow();
```

**Expected:** Database error, proper error handling

**Mitigation:** Connection pooling, retry logic

---

### Scenario 2: Invalid UUID

**Test:**
```typescript
await request(app)
  .get('/users/invalid-uuid')
  .set('Authorization', `Bearer ${adminToken}`)
  .expect(404);
```

**Expected:** 404 Not Found

**Protection:** UUID validation in DTOs

---

### Scenario 3: Missing Required Fields

**Test:**
```typescript
await request(app)
  .post('/users')
  .set('Authorization', `Bearer ${adminToken}`)
  .send({ email: 'test@test.com' }) // Missing password, teamId
  .expect(400);
```

**Expected:** 400 Bad Request (validation errors)

**Protection:** DTO validation

---

### Scenario 4: Role Escalation Attempt

**Test:**
```typescript
// USER tries to set own role to ADMIN
await request(app)
  .put('/users/me')
  .set('Authorization', `Bearer ${userToken}`)
  .send({ role: UserRole.ADMIN })
  .expect(200);

// Verify role unchanged
const user = await service.findById(userId);
expect(user.role).toBe(UserRole.USER);
```

**Expected:** Role unchanged (service removes role from DTO)

**Protection:** Service-level filtering

---

### Scenario 5: Concurrent Updates

**Test:**
```typescript
// Two simultaneous updates
const promises = [
  service.update(userId, { firstName: 'First' }),
  service.update(userId, { lastName: 'Last' }),
];

await Promise.all(promises);

// Verify both updates applied
const user = await service.findById(userId);
expect(user.firstName).toBe('First');
expect(user.lastName).toBe('Last');
```

**Expected:** Last write wins (or optimistic locking if implemented)

**Mitigation:** Optimistic locking, transaction isolation

---

## Test Execution

### Run All Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:e2e

# Coverage
npm run test:cov
```

### Run Specific Tests

```bash
# Users service tests
npm test users.service.spec

# Teams service tests
npm test teams.service.spec

# E2E tests
npm run test:e2e users.e2e-spec
```

---

## Test Coverage Goals

### Unit Tests
- **Services:** 90%+
- **Guards:** 100%
- **DTOs:** 100% (validation)

### Integration Tests
- **Endpoints:** 80%+
- **Auth flows:** 100%
- **Error cases:** 70%+

---

## Summary

**Test Types:**
- ✅ Unit tests (services, guards)
- ✅ Integration tests (E2E)
- ✅ Manual test checklist
- ✅ Edge cases covered

**Coverage:**
- ✅ Success scenarios
- ✅ Failure scenarios
- ✅ Edge cases
- ✅ Security scenarios

**Tools:**
- ✅ Jest
- ✅ Supertest
- ✅ @nestjs/testing

The testing strategy provides comprehensive coverage for User & Team Management with proper unit, integration, and manual testing.

