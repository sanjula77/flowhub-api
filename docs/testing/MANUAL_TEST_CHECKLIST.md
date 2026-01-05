# Manual Test Checklist - User & Team Management

## Pre-Testing Setup

- [ ] Backend running on `http://localhost:3001`
- [ ] Database connected and migrated
- [ ] Test users created (admin@test.com, user@test.com)
- [ ] Test teams created
- [ ] Postman/Thunder Client ready
- [ ] Browser ready for frontend testing

---

## User Management Tests

### Create User

#### Test 1: Admin Creates User
- [ ] Login as admin
- [ ] POST `/users` with valid data
- [ ] Verify 201 Created
- [ ] Verify user in database
- [ ] Verify password NOT in response
- [ ] Verify role assigned correctly

#### Test 2: Duplicate Email
- [ ] Try to create user with existing email
- [ ] Verify 409 Conflict
- [ ] Verify error message: "User with this email already exists"

#### Test 3: Invalid Email Format
- [ ] Try to create user with invalid email
- [ ] Verify 400 Bad Request
- [ ] Verify validation error message

#### Test 4: Missing Required Fields
- [ ] Try to create user without password
- [ ] Verify 400 Bad Request
- [ ] Verify validation errors listed

#### Test 5: Non-Admin Creates User
- [ ] Login as regular user
- [ ] Try to create user
- [ ] Verify 403 Forbidden

---

### View Users

#### Test 6: Get Own Profile
- [ ] Login as any user
- [ ] GET `/users/me`
- [ ] Verify 200 OK
- [ ] Verify own data returned
- [ ] Verify password NOT in response

#### Test 7: Admin Gets All Users
- [ ] Login as admin
- [ ] GET `/users`
- [ ] Verify 200 OK
- [ ] Verify array of users
- [ ] Verify all passwords excluded
- [ ] Verify users have roles

#### Test 8: User Gets All Users (Should Fail)
- [ ] Login as regular user
- [ ] GET `/users`
- [ ] Verify 403 Forbidden

#### Test 9: Get User by ID (Admin)
- [ ] Login as admin
- [ ] GET `/users/:id` with valid ID
- [ ] Verify 200 OK
- [ ] Verify user data returned

#### Test 10: Get User by ID (Non-Existent)
- [ ] Login as admin
- [ ] GET `/users/invalid-uuid`
- [ ] Verify 404 Not Found

---

### Update User

#### Test 11: Admin Updates User
- [ ] Login as admin
- [ ] PUT `/users/:id` with updates
- [ ] Verify 200 OK
- [ ] Verify user updated in database
- [ ] Verify password NOT in response

#### Test 12: User Updates Own Profile
- [ ] Login as regular user
- [ ] PUT `/users/me` with updates
- [ ] Verify 200 OK
- [ ] Verify profile updated
- [ ] Verify role unchanged (even if sent)
- [ ] Verify teamId unchanged (even if sent)

#### Test 13: User Tries to Update Other User
- [ ] Login as regular user
- [ ] PUT `/users/:otherUserId`
- [ ] Verify 403 Forbidden

#### Test 14: Duplicate Email on Update
- [ ] Login as admin
- [ ] Update user email to existing email
- [ ] Verify 409 Conflict

---

### Delete User

#### Test 15: Admin Deletes User
- [ ] Login as admin
- [ ] DELETE `/users/:id`
- [ ] Verify 204 No Content
- [ ] Verify user soft deleted (deletedAt set)
- [ ] Verify user NOT in active list
- [ ] Verify user still in database

#### Test 16: User Tries to Delete User
- [ ] Login as regular user
- [ ] DELETE `/users/:id`
- [ ] Verify 403 Forbidden

#### Test 17: Delete Non-Existent User
- [ ] Login as admin
- [ ] DELETE `/users/invalid-uuid`
- [ ] Verify 404 Not Found

---

## Team Management Tests

### Create Team

#### Test 18: Admin Creates Team
- [ ] Login as admin
- [ ] POST `/teams` with valid data
- [ ] Verify 201 Created
- [ ] Verify team in database
- [ ] Verify admin set correctly

#### Test 19: Duplicate Slug
- [ ] Try to create team with existing slug
- [ ] Verify 409 Conflict
- [ ] Verify error message

#### Test 20: Invalid Slug Format
- [ ] Try to create team with invalid slug (uppercase, spaces)
- [ ] Verify 400 Bad Request
- [ ] Verify validation error

#### Test 21: User Tries to Create Team
- [ ] Login as regular user
- [ ] POST `/teams`
- [ ] Verify 403 Forbidden

---

### View Teams

#### Test 22: Get Own Team
- [ ] Login as any user
- [ ] GET `/teams/me`
- [ ] Verify 200 OK
- [ ] Verify own team returned
- [ ] Verify team details correct

#### Test 23: User Without Team
- [ ] Create user without team
- [ ] Login as that user
- [ ] GET `/teams/me`
- [ ] Verify 404 Not Found

#### Test 24: Admin Gets All Teams
- [ ] Login as admin
- [ ] GET `/teams`
- [ ] Verify 200 OK
- [ ] Verify array of teams

#### Test 25: User Gets All Teams (Should Fail)
- [ ] Login as regular user
- [ ] GET `/teams`
- [ ] Verify 403 Forbidden

---

### Update Team

#### Test 26: Admin Updates Team
- [ ] Login as admin
- [ ] PUT `/teams/:id` with updates
- [ ] Verify 200 OK
- [ ] Verify team updated

#### Test 27: Duplicate Slug on Update
- [ ] Update team slug to existing slug
- [ ] Verify 409 Conflict

---

### Delete Team

#### Test 28: Admin Deletes Empty Team
- [ ] Create empty team
- [ ] Login as admin
- [ ] DELETE `/teams/:id`
- [ ] Verify 204 No Content
- [ ] Verify team soft deleted

#### Test 29: Admin Tries to Delete Team with Users
- [ ] Create team with users
- [ ] Login as admin
- [ ] DELETE `/teams/:id`
- [ ] Verify 409 Conflict
- [ ] Verify error message mentions users

#### Test 30: User Tries to Delete Team
- [ ] Login as regular user
- [ ] DELETE `/teams/:id`
- [ ] Verify 403 Forbidden

---

## Authorization Tests

### Role-Based Access

#### Test 31: ADMIN Full Access
- [ ] Login as admin
- [ ] Access all endpoints
- [ ] Verify all succeed (200/201/204)

#### Test 32: USER Limited Access
- [ ] Login as regular user
- [ ] Try admin-only endpoints
- [ ] Verify 403 Forbidden for all

#### Test 33: Unauthenticated Access
- [ ] Don't login
- [ ] Try protected endpoints
- [ ] Verify 401 Unauthorized

---

## Edge Cases

### Test 34: Concurrent Requests
- [ ] Send two create requests simultaneously
- [ ] Verify one succeeds, one fails (duplicate)
- [ ] Verify no data corruption

### Test 35: Very Long Inputs
- [ ] Try email with 300 characters
- [ ] Verify 400 Bad Request
- [ ] Try name with 1000 characters
- [ ] Verify 400 Bad Request

### Test 36: Special Characters
- [ ] Try email with special characters
- [ ] Verify proper validation
- [ ] Try slug with special characters
- [ ] Verify 400 Bad Request

### Test 37: SQL Injection Attempt
- [ ] Try SQL in email field: `'; DROP TABLE users; --`
- [ ] Verify 400 Bad Request (validation)
- [ ] Verify database not affected

### Test 38: XSS Attempt
- [ ] Try script tags in name field
- [ ] Verify proper sanitization
- [ ] Verify stored safely

---

## Performance Tests

### Test 39: Load Test
- [ ] Create 100 users
- [ ] Verify performance acceptable
- [ ] Verify no timeouts

### Test 40: Large Team
- [ ] Create team with 1000 users
- [ ] GET `/teams/:id`
- [ ] Verify response time acceptable

---

## Security Tests

### Test 41: Token Expiration
- [ ] Use expired token
- [ ] Verify 401 Unauthorized
- [ ] Refresh token
- [ ] Verify new token works

### Test 42: Invalid Token
- [ ] Use malformed token
- [ ] Verify 401 Unauthorized

### Test 43: Token Manipulation
- [ ] Modify token payload
- [ ] Verify 401 Unauthorized (signature invalid)

---

## Integration Tests

### Test 44: Complete User Flow
- [ ] Create user
- [ ] Login as user
- [ ] Get profile
- [ ] Update profile
- [ ] Get team
- [ ] All steps succeed

### Test 45: Complete Team Flow
- [ ] Create team (admin)
- [ ] Add users to team
- [ ] View team members
- [ ] Update team
- [ ] All steps succeed

---

## Browser Testing (Frontend)

### Test 46: Team Dashboard
- [ ] Login via frontend
- [ ] Navigate to `/team`
- [ ] Verify team displayed
- [ ] Verify members listed (if admin)
- [ ] Verify invite button (if admin)

### Test 47: Invite User
- [ ] Login as team admin
- [ ] Click "Invite Member"
- [ ] Fill form
- [ ] Submit
- [ ] Verify invitation sent
- [ ] Verify member appears in list

### Test 48: Role-Based UI
- [ ] Login as regular user
- [ ] Verify invite button NOT visible
- [ ] Verify remove buttons NOT visible
- [ ] Login as admin
- [ ] Verify all buttons visible

---

## Summary Checklist

### User Management
- [ ] Create user (success)
- [ ] Create user (duplicate)
- [ ] View users
- [ ] Update user
- [ ] Delete user
- [ ] Role-based access

### Team Management
- [ ] Create team (success)
- [ ] Create team (duplicate)
- [ ] View teams
- [ ] Update team
- [ ] Delete team
- [ ] Add user to team

### Security
- [ ] Authentication required
- [ ] Role-based authorization
- [ ] Token validation
- [ ] Input validation

### Edge Cases
- [ ] Concurrent requests
- [ ] Invalid inputs
- [ ] SQL injection
- [ ] XSS attempts

---

## Test Results Template

```
Test ID: TC-XXX
Status: ✅ Pass / ❌ Fail / ⚠️ Partial
Notes: [Any observations]
Screenshots: [If applicable]
```

---

## Sign-Off

**Tester:** _________________  
**Date:** _________________  
**Environment:** _________________  
**Overall Status:** ✅ Pass / ❌ Fail

---

## Notes

- Run tests in order
- Document any failures
- Take screenshots of errors
- Report bugs immediately
- Verify fixes before closing

