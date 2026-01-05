# API Route Table

## Users Controller (`/users`)

| Method | Route | Description | Auth | Roles | Status Code |
|--------|-------|-------------|------|-------|-------------|
| GET | `/users/me` | Get current user's profile | ✅ | Any | 200 OK |
| GET | `/users` | Get all users | ✅ | ADMIN | 200 OK |
| GET | `/users/:id` | Get user by ID | ✅ | ADMIN | 200 OK |
| GET | `/users/team/:teamId` | Get users by team | ✅ | ADMIN | 200 OK |
| POST | `/users` | Create new user | ✅ | ADMIN | 201 Created |
| PUT | `/users/:id` | Update user | ✅ | ADMIN | 200 OK |
| PUT | `/users/me` | Update own profile | ✅ | Any | 200 OK |
| DELETE | `/users/:id` | Soft delete user | ✅ | ADMIN | 204 No Content |

---

## Teams Controller (`/teams`)

| Method | Route | Description | Auth | Roles | Status Code |
|--------|-------|-------------|------|-------|-------------|
| GET | `/teams/me` | Get current user's team | ✅ | Any | 200 OK |
| GET | `/teams` | Get all teams | ✅ | ADMIN | 200 OK |
| GET | `/teams/:id` | Get team by ID | ✅ | ADMIN | 200 OK |
| GET | `/teams/slug/:slug` | Get team by slug | ✅ | ADMIN | 200 OK |
| POST | `/teams` | Create new team | ✅ | ADMIN | 201 Created |
| POST | `/teams/:teamId/users/:userId` | Add user to team | ✅ | ADMIN, USER* | 200 OK |
| PUT | `/teams/:id` | Update team | ✅ | ADMIN | 200 OK |
| DELETE | `/teams/:id` | Soft delete team | ✅ | ADMIN | 204 No Content |

\* Service validates team admin status

---

## Authentication Controller (`/auth`)

| Method | Route | Description | Auth | Roles | Status Code |
|--------|-------|-------------|------|-------|-------------|
| POST | `/auth/signup` | Register new user | ❌ | None | 201 Created |
| POST | `/auth/login` | Login user | ❌ | None | 200 OK |
| POST | `/auth/refresh-token` | Refresh access token | ❌ | None | 200 OK |
| POST | `/auth/logout` | Logout user | ✅ | Any | 200 OK |

---

## Invitations Controller (`/invitations`)

| Method | Route | Description | Auth | Roles | Status Code |
|--------|-------|-------------|------|-------|-------------|
| POST | `/invitations` | Create invitation | ✅ | ADMIN, USER* | 201 Created |
| POST | `/invitations/accept` | Accept invitation | ❌ | None | 200 OK |
| GET | `/invitations/validate/:token` | Validate token | ❌ | None | 200 OK |
| GET | `/invitations/team/:teamId` | Get team invitations | ✅ | ADMIN, USER* | 200 OK |

\* Service validates team admin status

---

## Projects Controller (`/projects`)

| Method | Route | Description | Auth | Roles | Status Code |
|--------|-------|-------------|------|-------|-------------|
| GET | `/projects` | Get projects | ✅ | Any | 200 OK |
| POST | `/projects` | Create project | ✅ | ADMIN | 200 OK |
| DELETE | `/projects/:id` | Delete project | ✅ | ADMIN | 200 OK |
| GET | `/projects/my-projects` | Get my projects | ✅ | ADMIN, USER | 200 OK |

---

## HTTP Status Codes Used

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

1. **Thin Controllers**: All business logic is in services
2. **DTO Validation**: Automatic via ValidationPipe
3. **Error Handling**: Proper HTTP exceptions with status codes
4. **Security**: Role guards applied at controller level
5. **RESTful**: Follows REST conventions for HTTP methods and status codes

