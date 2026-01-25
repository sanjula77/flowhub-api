# Projects Module Structure

Component responsibilities and data flow.

## File Structure

```
projects/
├── project.entity.ts                    # Domain Entity
├── dto/
│   ├── create-project.dto.ts           # Input DTO (Create)
│   ├── update-project.dto.ts           # Input DTO (Update)
│   └── project-response.dto.ts         # Output DTO
├── repositories/
│   ├── project.repository.interface.ts # Repository Interface
│   └── project.repository.ts           # Repository Implementation
├── projects.service.ts                  # Business Logic Layer
├── projects.controller.ts               # HTTP Request/Response Layer
└── projects.module.ts                   # NestJS Module Configuration
```

---

## Component Responsibilities

### Project Entity
- Define Project data structure
- TypeORM decorators for database mapping
- Relationships (Team, User)
- Index definitions

### DTOs

**CreateProjectDto:**
- Validate incoming request data
- Fields: `name` (required), `description` (optional), `teamId` (required)

**UpdateProjectDto:**
- Validate incoming update data
- All fields optional
- Note: `teamId` intentionally excluded (projects shouldn't move teams)

**ProjectResponseDto:**
- Define response structure
- Exclude sensitive/internal fields
- Consistent API contract

### Repository Layer

**IProjectRepository Interface:**
- Contract definition for data access operations
- Methods: `create()`, `findById()`, `findByIdAndTeamId()`, `findByTeamId()`, etc.

**ProjectRepository:**
- TypeORM implementation of repository interface
- Database queries
- Soft delete filtering (`deletedAt IS NULL`)
- Relationship loading (team, createdBy)

### ProjectsService
- Business logic orchestration
- Multi-tenant isolation validation
- Entity to DTO transformation
- Error handling (NotFoundException)

### ProjectsController
- HTTP request/response handling
- Route definitions
- Authentication/Authorization (Guards)
- Team context extraction (from JWT)
- DTO validation (via ValidationPipe)

---

## Data Flow

### Creating a Project

```
1. HTTP Request
   ↓
2. Controller (validates DTO, extracts userId/teamId)
   ↓
3. Service (business logic validation)
   ↓
4. Repository (executes database insert)
   ↓
5. Service (transforms Entity → DTO)
   ↓
6. Controller (returns HTTP 201 Created)
```

### Finding Projects by Team

```
1. HTTP Request (GET /projects)
   ↓
2. Controller (extracts teamId from JWT user)
   ↓
3. Service (calls repository)
   ↓
4. Repository (queries: WHERE teamId = ? AND deletedAt IS NULL)
   ↓
5. Service (transforms each Entity → DTO)
   ↓
6. Controller (returns HTTP 200 OK)
```

---

## Dependency Graph

```
Controller
  ↓ (depends on)
Service
  ↓ (depends on interface)
IProjectRepository (interface)
  ↑ (implemented by)
ProjectRepository (concrete)
  ↓ (uses)
TypeORM Repository<Project>
  ↓ (manages)
Project Entity
```

---

## Multi-Tenancy Isolation

**At Controller Level:**
```typescript
const teamId = user.teamId || user.team?.id;
```

**At Service Level:**
```typescript
async findByIdAndTeamId(id: string, teamId: string)
```

**At Repository Level:**
```typescript
where: { id, teamId, deletedAt: IsNull() }
```

**Security Layers:**
1. Authentication: JWT Guard
2. Authorization: Roles Guard
3. Isolation: Team filtering at every layer
4. Validation: Service validates team membership

---

## Summary

The Projects module follows Clean Architecture principles with:
- **Entity:** Pure domain model
- **DTOs:** Input/output contracts
- **Repository:** Data access abstraction
- **Service:** Business logic
- **Controller:** HTTP handling
- **Module:** Dependency injection

Each layer has a clear responsibility, making the codebase maintainable, testable, and scalable.
