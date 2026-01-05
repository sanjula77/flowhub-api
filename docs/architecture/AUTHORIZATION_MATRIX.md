# Authorization Matrix

## Overview

This matrix shows which roles can access which endpoints.

**Legend:**
- ✅ = Allowed
- ❌ = Denied
- ⚠️ = Service-level validation (team admin check)
- 🟡 = Own resource only

---

## Users Endpoints

| Endpoint | Public | USER | ADMIN | Notes |
|----------|--------|------|-------|-------|
| `GET /users/me` | ❌ | ✅ | ✅ | Own profile only |
| `GET /users` | ❌ | ❌ | ✅ | List all users |
| `GET /users/:id` | ❌ | ❌ | ✅ | Any user by ID |
| `GET /users/team/:teamId` | ❌ | ❌ | ✅ | Users in team |
| `POST /users` | ❌ | ❌ | ✅ | Create user |
| `PUT /users/:id` | ❌ | ❌ | ✅ | Update any user |
| `PUT /users/me` | ❌ | 🟡 | 🟡 | Update own profile (role/teamId restricted) |
| `DELETE /users/:id` | ❌ | ❌ | ✅ | Soft delete user |

---

## Teams Endpoints

| Endpoint | Public | USER | ADMIN | Notes |
|----------|--------|------|-------|-------|
| `GET /teams/me` | ❌ | ✅ | ✅ | Own team only |
| `GET /teams` | ❌ | ❌ | ✅ | List all teams |
| `GET /teams/:id` | ❌ | ❌ | ✅ | Any team by ID |
| `GET /teams/slug/:slug` | ❌ | ❌ | ✅ | Team by slug |
| `POST /teams` | ❌ | ❌ | ✅ | Create team |
| `POST /teams/:teamId/users/:userId` | ❌ | ⚠️ | ✅ | Team admin or system ADMIN |
| `PUT /teams/:id` | ❌ | ❌ | ✅ | Update team |
| `DELETE /teams/:id` | ❌ | ❌ | ✅ | Soft delete team |

---

## Authentication Endpoints

| Endpoint | Public | USER | ADMIN | Notes |
|----------|--------|------|-------|-------|
| `POST /auth/signup` | ✅ | ✅ | ✅ | Anyone can signup |
| `POST /auth/login` | ✅ | ✅ | ✅ | Anyone can login |
| `POST /auth/refresh-token` | ✅ | ✅ | ✅ | Anyone with valid refresh token |
| `POST /auth/logout` | ❌ | ✅ | ✅ | Any authenticated user |

---

## Invitations Endpoints

| Endpoint | Public | USER | ADMIN | Notes |
|----------|--------|------|-------|-------|
| `POST /invitations` | ❌ | ⚠️ | ✅ | Team admin or system ADMIN |
| `POST /invitations/accept` | ✅ | ✅ | ✅ | Public (token provides auth) |
| `GET /invitations/validate/:token` | ✅ | ✅ | ✅ | Public validation |
| `GET /invitations/team/:teamId` | ❌ | ⚠️ | ✅ | Team admin or system ADMIN |

---

## Projects Endpoints

| Endpoint | Public | USER | ADMIN | Notes |
|----------|--------|------|-------|-------|
| `GET /projects` | ❌ | ✅ | ✅ | Any authenticated user |
| `POST /projects` | ❌ | ❌ | ✅ | Create project |
| `DELETE /projects/:id` | ❌ | ❌ | ✅ | Delete project |
| `GET /projects/my-projects` | ❌ | ✅ | ✅ | Both roles can access |

---

## Permission Summary

### USER Role Permissions

**Can:**
- ✅ View own profile (`GET /users/me`)
- ✅ Update own profile (`PUT /users/me`) - restricted fields
- ✅ View own team (`GET /teams/me`)
- ✅ View projects (`GET /projects`)
- ✅ View own projects (`GET /projects/my-projects`)
- ⚠️ Invite users to own team (if team admin)
- ⚠️ View own team invitations (if team admin)
- ⚠️ Add users to own team (if team admin)

**Cannot:**
- ❌ View other users
- ❌ Create/update/delete users
- ❌ View all teams
- ❌ Create/update/delete teams
- ❌ Create/delete projects
- ❌ Access admin endpoints

---

### ADMIN Role Permissions

**Can:**
- ✅ All USER permissions
- ✅ View all users (`GET /users`)
- ✅ Create users (`POST /users`)
- ✅ Update any user (`PUT /users/:id`)
- ✅ Delete users (`DELETE /users/:id`)
- ✅ View all teams (`GET /teams`)
- ✅ Create teams (`POST /teams`)
- ✅ Update teams (`PUT /teams/:id`)
- ✅ Delete teams (`DELETE /teams/:id`)
- ✅ Add users to any team
- ✅ Create/delete projects
- ✅ Invite users to any team

**Cannot:**
- ❌ Nothing (full access)

---

## Service-Level Validations

Some endpoints allow both USER and ADMIN roles but perform additional validation:

### Team Admin Check

**Endpoints:**
- `POST /teams/:teamId/users/:userId`
- `POST /invitations`
- `GET /invitations/team/:teamId`

**Validation:**
```typescript
const isSystemAdmin = user.role === UserRole.ADMIN;
const isTeamAdmin = team.adminUserId === user.id;

if (!isSystemAdmin && !isTeamAdmin) {
  throw new ForbiddenException('Only team admins can perform this action');
}
```

**Result:**
- System ADMIN: ✅ Can access any team
- Team Admin: ✅ Can access own team only
- Regular USER: ❌ Cannot access

---

## Security Rules

### Rule 1: Users Can Only View Own Profile

**Endpoint:** `GET /users/me`
**Implementation:** Uses `req.user.id` from JWT token
**Security:** Cannot access other users' profiles

---

### Rule 2: Users Cannot Change Own Role

**Endpoint:** `PUT /users/me`
**Implementation:** Removes `role` from DTO before update
**Security:** Prevents self-promotion

---

### Rule 3: Users Cannot Change Own Team

**Endpoint:** `PUT /users/me`
**Implementation:** Removes `teamId` from DTO before update
**Security:** Prevents unauthorized team changes

---

### Rule 4: Team Admin Validation

**Endpoints:** Team management endpoints
**Implementation:** Service checks `team.adminUserId === user.id`
**Security:** Only actual team admins can manage their team

---

## Access Control Flow

```
1. Request arrives
   ↓
2. JwtAuthGuard validates token
   ↓
3. RolesGuard checks @Roles() decorator
   ↓
4. If role matches → Allow
   ↓
5. If service validation needed → Check team admin
   ↓
6. If authorized → Proceed
   ↓
7. If unauthorized → Throw 403 Forbidden
```

---

## Summary

### Public Access:
- Authentication endpoints (signup, login, refresh)
- Invitation acceptance
- Token validation

### Authenticated Access (Any User):
- Own profile management
- Own team viewing
- Project viewing

### Admin-Only Access:
- User management
- Team management
- Project creation/deletion

### Service-Validated Access:
- Team admin operations
- Cross-team restrictions

The authorization matrix ensures proper access control at multiple levels: route guards, service validation, and business rules.

