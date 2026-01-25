# API Route Table

Complete reference of all API endpoints.

## Users Controller (`/users`)

| Method | Route | Description | Auth | Roles | Status |
|--------|-------|-------------|------|-------|--------|
| GET | `/users/me` | Get current user's profile | Yes | Any | 200 OK |
| GET | `/users` | Get all users | Yes | ADMIN | 200 OK |
| GET | `/users/:id` | Get user by ID | Yes | ADMIN | 200 OK |
| GET | `/users/team/:teamId` | Get users by team | Yes | ADMIN | 200 OK |
| POST | `/users` | Create new user | Yes | ADMIN | 201 Created |
| PUT | `/users/:id` | Update user | Yes | ADMIN | 200 OK |
| PUT | `/users/me` | Update own profile | Yes | Any | 200 OK |
| DELETE | `/users/:id` | Soft delete user | Yes | ADMIN | 204 No Content |

---

## Teams Controller (`/teams`)

| Method | Route | Description | Auth | Roles | Status |
|--------|-------|-------------|------|-------|--------|
| GET | `/teams/me` | Get current user's team | Yes | Any | 200 OK |
| GET | `/teams` | Get all teams | Yes | ADMIN | 200 OK |
| GET | `/teams/:id` | Get team by ID | Yes | ADMIN | 200 OK |
| GET | `/teams/slug/:slug` | Get team by slug | Yes | ADMIN | 200 OK |
| POST | `/teams` | Create new team | Yes | ADMIN | 201 Created |
| POST | `/teams/:teamId/users/:userId` | Add user to team | Yes | ADMIN, USER* | 200 OK |
| PUT | `/teams/:id` | Update team | Yes | ADMIN | 200 OK |
| DELETE | `/teams/:id` | Soft delete team | Yes | ADMIN | 204 No Content |

\* Service validates team admin status

---

## Authentication Controller (`/auth`)

| Method | Route | Description | Auth | Roles | Status |
|--------|-------|-------------|------|-------|--------|
| POST | `/auth/signup` | Register new user | No | None | 201 Created |
| POST | `/auth/login` | Login user | No | None | 200 OK |
| POST | `/auth/refresh-token` | Refresh access token | No | None | 200 OK |
| POST | `/auth/logout` | Logout user | Yes | Any | 200 OK |

---

## Invitations Controller (`/invitations`)

| Method | Route | Description | Auth | Roles | Status |
|--------|-------|-------------|------|-------|--------|
| POST | `/invitations` | Create invitation | Yes | ADMIN, USER* | 201 Created |
| POST | `/invitations/accept` | Accept invitation | No | None | 200 OK |
| GET | `/invitations/validate/:token` | Validate token | No | None | 200 OK |
| GET | `/invitations/team/:teamId` | Get team invitations | Yes | ADMIN, USER* | 200 OK |

\* Service validates team admin status

---

## Projects Controller (`/projects`)

| Method | Route | Description | Auth | Roles | Status |
|--------|-------|-------------|------|-------|--------|
| GET | `/projects` | Get projects | Yes | Any | 200 OK |
| POST | `/projects` | Create project | Yes | ADMIN | 200 OK |
| DELETE | `/projects/:id` | Delete project | Yes | ADMIN | 200 OK |
| GET | `/projects/my-projects` | Get my projects | Yes | ADMIN, USER | 200 OK |

---

## HTTP Status Codes

- **200 OK** - Successful GET, PUT, POST (non-create)
- **201 Created** - Successful resource creation
- **204 No Content** - Successful deletion (no response body)
- **400 Bad Request** - Invalid input data
- **401 Unauthorized** - Authentication required/failed
- **403 Forbidden** - Insufficient permissions
- **404 Not Found** - Resource not found
- **409 Conflict** - Resource conflict (duplicate, constraint violation)

---

## Route Patterns

### Public Routes (No Auth)
- `/auth/*` (except logout)
- `/invitations/accept`
- `/invitations/validate/:token`

### Authenticated Routes (Any User)
- `/users/me`
- `/users/me` (PUT)
- `/teams/me`
- `/projects` (GET)
- `/auth/logout`

### Admin-Only Routes
- `/users` (all except `/me`)
- `/teams` (all except `/me`)
- `/projects` (POST, DELETE)

### Service-Validated Routes
- `/teams/:teamId/users/:userId` - Team admin or system ADMIN
- `/invitations` - Team admin or system ADMIN
- `/invitations/team/:teamId` - Team admin or system ADMIN

---

## Notes

1. **Thin Controllers:** All business logic is in services
2. **DTO Validation:** Automatic via ValidationPipe
3. **Error Handling:** Proper HTTP exceptions with status codes
4. **Security:** Role guards applied at controller level
5. **RESTful:** Follows REST conventions for HTTP methods and status codes
