# Testing Strategy

Comprehensive testing strategy covering unit tests, integration tests, and manual testing.

## Test Types

### 1. Unit Tests

**Purpose:** Test individual components in isolation

**Coverage:**
- Services (business logic)
- Guards (authorization logic)
- DTOs (validation)
- Repositories (data access)

**Tools:** Jest, @nestjs/testing

---

### 2. Integration Tests

**Purpose:** Test API endpoints end-to-end

**Coverage:**
- HTTP requests/responses
- Authentication/Authorization
- Database interactions
- Error handling

**Tools:** Jest, Supertest, Test database

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

- Create user successfully
- Find user by ID
- Update user successfully
- Soft delete user
- **Edge Cases:** Duplicate email, non-existent user

### TeamsService Tests

- ADMIN creates team
- User gets own team
- Team admin adds user
- Soft delete team
- **Edge Cases:** Non-ADMIN, user without team, team with users

### RolesGuard Tests

- Role validation
- Multiple roles
- No user
- **Edge Cases:** Wrong role, missing authentication

---

## Integration Test Cases

### User Endpoints

- `GET /users/me` - Authenticated user gets profile
- `GET /users` - ADMIN gets all users
- `POST /users` - ADMIN creates user
- `PUT /users/:id` - ADMIN updates user
- `PUT /users/me` - User updates own profile
- `DELETE /users/:id` - ADMIN deletes user

### Team Endpoints

- `GET /teams/me` - User gets own team
- `GET /teams` - ADMIN gets all teams
- `POST /teams` - ADMIN creates team
- `DELETE /teams/:id` - ADMIN deletes empty team

---

## Edge Cases

### 1. Duplicate Email
**Scenario:** Two requests create same email simultaneously  
**Expected:** One succeeds, one throws ConflictException  
**Protection:** Database UNIQUE constraint

### 2. Invalid Role
**Scenario:** Request with invalid role value  
**Expected:** 400 Bad Request (validation error)  
**Protection:** DTO enum validation

### 3. Cross-Team Access
**Scenario:** User from Team A tries to add user from Team B  
**Expected:** 403 Forbidden  
**Protection:** Service-level validation

### 4. Delete Team with Users
**Scenario:** Admin tries to delete team that has active users  
**Expected:** 409 Conflict with message about active users  
**Protection:** Service check + database RESTRICT

### 5. Token Expiration
**Scenario:** User's JWT token expires during session  
**Expected:** 401 Unauthorized  
**Protection:** JWT expiration validation

### 6. Soft-Deleted User
**Scenario:** Try to use soft-deleted user  
**Expected:** 401 Unauthorized (user not found)  
**Protection:** Repository filters deletedAt IS NULL

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
- Unit tests (services, guards)
- Integration tests (E2E)
- Manual test checklist
- Edge cases covered

**Coverage:**
- Success scenarios
- Failure scenarios
- Edge cases
- Security scenarios

**Tools:**
- Jest
- Supertest
- @nestjs/testing
