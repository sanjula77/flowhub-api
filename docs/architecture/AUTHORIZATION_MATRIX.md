# Authorization Matrix

Role-based access control matrix for all API endpoints.

## Legend

- Allowed = Permission granted
- Denied = Permission denied
- Service-level validation = Team admin check required
- Own resource only = Can only access own resource

---

## Users Endpoints

| Endpoint | Public | USER | ADMIN | Notes |
|----------|--------|------|-------|-------|
| `GET /users/me` | No | Yes | Yes | Own profile only |
| `GET /users` | No | No | Yes | List all users |
| `GET /users/:id` | No | No | Yes | Any user by ID |
| `GET /users/team/:teamId` | No | No | Yes | Users in team |
| `POST /users` | No | No | Yes | Create user |
| `PUT /users/:id` | No | No | Yes | Update any user |
| `PUT /users/me` | No | Own | Own | Update own profile (role/teamId restricted) |
| `DELETE /users/:id` | No | No | Yes | Soft delete user |

---

## Teams Endpoints

| Endpoint | Public | USER | ADMIN | Notes |
|----------|--------|------|-------|-------|
| `GET /teams/me` | No | Yes | Yes | Own team only |
| `GET /teams` | No | No | Yes | List all teams |
| `GET /teams/:id` | No | No | Yes | Any team by ID |
| `GET /teams/slug/:slug` | No | No | Yes | Team by slug |
| `POST /teams` | No | No | Yes | Create team |
| `POST /teams/:teamId/users/:userId` | No | Service | Yes | Team admin or system ADMIN |
| `PUT /teams/:id` | No | No | Yes | Update team |
| `DELETE /teams/:id` | No | No | Yes | Soft delete team |

---

## Authentication Endpoints

| Endpoint | Public | USER | ADMIN | Notes |
|----------|--------|------|-------|-------|
| `POST /auth/signup` | Yes | Yes | Yes | Public registration |
| `POST /auth/login` | Yes | Yes | Yes | Public login |
| `POST /auth/refresh-token` | Yes | Yes | Yes | Token refresh |
| `POST /auth/logout` | No | Yes | Yes | Authenticated users |

---

## Invitations Endpoints

| Endpoint | Public | USER | ADMIN | Notes |
|----------|--------|------|-------|-------|
| `POST /invitations` | No | Service | Yes | Team admin or system ADMIN |
| `POST /invitations/accept` | Yes | Yes | Yes | Public (token provides auth) |
| `GET /invitations/validate/:token` | Yes | Yes | Yes | Public validation |
| `GET /invitations/team/:teamId` | No | Service | Yes | Team admin or system ADMIN |

---

## Projects Endpoints

| Endpoint | Public | USER | ADMIN | Notes |
|----------|--------|------|-------|-------|
| `GET /projects` | No | Yes | Yes | Any authenticated user |
| `POST /projects` | No | No | Yes | Create project |
| `DELETE /projects/:id` | No | No | Yes | Delete project |
| `GET /projects/my-projects` | No | Yes | Yes | Own projects |

---

## Permission Summary

### USER Role

**Can:**
- View own profile (`GET /users/me`)
- Update own profile (`PUT /users/me`) - restricted fields
- View own team (`GET /teams/me`)
- View projects (`GET /projects`)
- View own projects (`GET /projects/my-projects`)
- Invite users to own team (if team admin)
- View own team invitations (if team admin)

**Cannot:**
- View other users
- Create/update/delete users
- View all teams
- Create/update/delete teams
- Create/delete projects

### ADMIN Role

**Can:**
- All USER permissions
- View all users (`GET /users`)
- Create users (`POST /users`)
- Update any user (`PUT /users/:id`)
- Delete users (`DELETE /users/:id`)
- View all teams (`GET /teams`)
- Create/update/delete teams
- Create/delete projects
- Full system access

---

## Service-Level Validations

Endpoints marked with "Service-level validation" allow both USER and ADMIN roles but perform additional validation:

**Team Admin Check:**
- `POST /teams/:teamId/users/:userId`
- `POST /invitations`
- `GET /invitations/team/:teamId`

**Validation Logic:**
```typescript
const isSystemAdmin = user.role === UserRole.ADMIN;
const isTeamAdmin = team.adminUserId === user.id;

if (!isSystemAdmin && !isTeamAdmin) {
  throw new ForbiddenException('Only team admins can perform this action');
}
```

**Result:**
- System ADMIN: Can access any team
- Team Admin: Can access own team only
- Regular USER: Cannot access

---

## Security Rules

1. **Users can only view own profile** - `GET /users/me` uses `req.user.id` from JWT
2. **Users cannot change own role** - `PUT /users/me` removes `role` from DTO
3. **Users cannot change own team** - `PUT /users/me` removes `teamId` from DTO
4. **Team admin validation** - Service checks `team.adminUserId === user.id`

---

## Access Control Flow

```
Request → JwtAuthGuard (token validation) → RolesGuard (role check) → Service Validation (team admin) → Controller
```
