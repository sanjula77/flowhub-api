# Manual Test Checklist

User & Team Management manual testing checklist.

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

- [ ] Admin creates user → Verify 201 Created
- [ ] Duplicate email → Verify 409 Conflict
- [ ] Invalid email format → Verify 400 Bad Request
- [ ] Missing required fields → Verify 400 Bad Request
- [ ] Non-admin creates user → Verify 403 Forbidden

### View Users

- [ ] Get own profile → Verify 200 OK, password excluded
- [ ] Admin gets all users → Verify 200 OK, array of users
- [ ] User gets all users → Verify 403 Forbidden
- [ ] Get user by ID (admin) → Verify 200 OK
- [ ] Get non-existent user → Verify 404 Not Found

### Update User

- [ ] Admin updates user → Verify 200 OK
- [ ] User updates own profile → Verify 200 OK, role/teamId unchanged
- [ ] User tries to update other user → Verify 403 Forbidden
- [ ] Duplicate email on update → Verify 409 Conflict

### Delete User

- [ ] Admin deletes user → Verify 204 No Content, soft deleted
- [ ] User tries to delete user → Verify 403 Forbidden
- [ ] Delete non-existent user → Verify 404 Not Found

---

## Team Management Tests

### Create Team

- [ ] Admin creates team → Verify 201 Created
- [ ] Duplicate slug → Verify 409 Conflict
- [ ] Invalid slug format → Verify 400 Bad Request
- [ ] User tries to create team → Verify 403 Forbidden

### View Teams

- [ ] Get own team → Verify 200 OK
- [ ] User without team → Verify 404 Not Found
- [ ] Admin gets all teams → Verify 200 OK
- [ ] User gets all teams → Verify 403 Forbidden

### Update Team

- [ ] Admin updates team → Verify 200 OK
- [ ] Duplicate slug on update → Verify 409 Conflict

### Delete Team

- [ ] Admin deletes empty team → Verify 204 No Content
- [ ] Admin tries to delete team with users → Verify 409 Conflict
- [ ] User tries to delete team → Verify 403 Forbidden

---

## Authorization Tests

### Role-Based Access

- [ ] ADMIN full access → Verify all succeed
- [ ] USER limited access → Verify 403 Forbidden for admin endpoints
- [ ] Unauthenticated access → Verify 401 Unauthorized

---

## Edge Cases

- [ ] Concurrent requests → Verify one succeeds, one fails (duplicate)
- [ ] Very long inputs → Verify 400 Bad Request
- [ ] Special characters → Verify proper validation
- [ ] SQL injection attempt → Verify 400 Bad Request, database not affected
- [ ] XSS attempt → Verify proper sanitization

---

## Security Tests

- [ ] Token expiration → Verify 401 Unauthorized
- [ ] Invalid token → Verify 401 Unauthorized
- [ ] Token manipulation → Verify 401 Unauthorized (signature invalid)

---

## Integration Tests

- [ ] Complete user flow → Create, login, get profile, update, get team
- [ ] Complete team flow → Create team, add users, view members, update, delete

---

## Browser Testing (Frontend)

- [ ] Team dashboard → Login, navigate to `/team`, verify team displayed
- [ ] Invite user → Login as team admin, click "Invite Member", fill form, submit
- [ ] Role-based UI → Login as regular user, verify invite button NOT visible

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

---

## Test Results Template

```
Test ID: TC-XXX
Status: Pass / Fail / Partial
Notes: [Any observations]
Screenshots: [If applicable]
```

---

## Sign-Off

**Tester:** _________________  
**Date:** _________________  
**Environment:** _________________  
**Overall Status:** Pass / Fail
