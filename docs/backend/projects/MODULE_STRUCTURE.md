# Projects Module Structure & Responsibilities

## Folder Structure

```
backend/src/projects/
├── project.entity.ts                      # Domain Entity
├── dto/
│   ├── create-project.dto.ts             # Input DTO (Create)
│   ├── update-project.dto.ts             # Input DTO (Update)
│   └── project-response.dto.ts           # Output DTO
├── repositories/
│   ├── project.repository.interface.ts   # Repository Interface
│   └── project.repository.ts             # Repository Implementation (TypeORM)
├── projects.service.ts                    # Business Logic Layer
├── projects.controller.ts                 # HTTP Request/Response Layer
├── projects.module.ts                     # NestJS Module Configuration
├── ARCHITECTURE.md                        # Clean Architecture Documentation
├── MODULE_STRUCTURE.md                    # This file (Structure & Responsibilities)
├── PROJECT_ER_DIAGRAM.md                  # ER Diagram Explanation
├── PROJECT_BEST_PRACTICES.md              # Indexing & Constraints Guide
└── README.md                              # Quick Reference Guide
```

## Component Responsibilities

### 1. Domain Entity (`project.entity.ts`)

**Purpose:** Pure domain model representing a Project

**Responsibilities:**
- Define Project data structure
- TypeORM decorators for database mapping
- Relationships (Team, User)
- Index definitions

**Key Features:**
- UUID primary key
- Soft delete support (`deletedAt`)
- Audit fields (`createdAt`, `updatedAt`)
- Foreign keys (`teamId`, `createdById`)

**Dependencies:** None (pure domain model)

---

### 2. DTOs (`dto/`)

#### `create-project.dto.ts`
**Purpose:** Input validation for project creation

**Responsibilities:**
- Validate incoming request data
- Define API contract for creation
- Class-validator decorators

**Fields:**
- `name` (required, string, min length 1)
- `description` (optional, string)
- `teamId` (required, UUID)

**Dependencies:** `class-validator`

---

#### `update-project.dto.ts`
**Purpose:** Input validation for project updates

**Responsibilities:**
- Validate incoming update data
- All fields optional
- Note: `teamId` intentionally excluded (projects shouldn't move teams via update)

**Fields:**
- `name` (optional, string, min length 1)
- `description` (optional, string)

**Dependencies:** `class-validator`

---

#### `project-response.dto.ts`
**Purpose:** Output format for API responses

**Responsibilities:**
- Define response structure
- Exclude sensitive/internal fields
- Consistent API contract

**Fields:**
- `id`, `name`, `description`, `teamId`, `createdById`
- `createdAt`, `updatedAt`

**Dependencies:** None (plain class)

---

### 3. Repository Layer (`repositories/`)

#### `project.repository.interface.ts`
**Purpose:** Contract definition for data access operations

**Responsibilities:**
- Define repository methods
- Abstract data access layer
- Enable dependency inversion

**Methods:**
- `create()` - Create new project
- `findById()` - Find by ID
- `findByIdAndTeamId()` - Find by ID and team (multi-tenant)
- `findByTeamId()` - Find all in team
- `findByCreatedById()` - Find all created by user
- `findAll()` - Find all (admin only)
- `update()` - Update project
- `softDelete()` - Soft delete project

**Dependencies:** `Project` entity

---

#### `project.repository.ts`
**Purpose:** TypeORM implementation of repository interface

**Responsibilities:**
- Execute database queries
- Filter soft-deleted records
- Load relationships (team, createdBy)
- Order results (newest first)

**Key Features:**
- Implements `IProjectRepository`
- Uses TypeORM `Repository<Project>`
- Filters `deletedAt IS NULL` in all queries
- Eager loads relationships for performance

**Dependencies:**
- `@nestjs/typeorm`
- `IProjectRepository` interface
- `Project` entity

---

### 4. Service Layer (`projects.service.ts`)

**Purpose:** Business logic orchestration

**Responsibilities:**
- Business rule enforcement
- Multi-tenant isolation validation
- Entity to DTO transformation
- Error handling (NotFoundException)

**Key Methods:**
- `create()` - Create project with creator tracking
- `findById()` - Find project by ID
- `findByIdAndTeamId()` - Find with team validation
- `findByTeamId()` - Find all in team
- `findByCreatedById()` - Find all created by user
- `findAll()` - Find all (admin)
- `update()` - Update with team validation
- `softDelete()` - Delete with team validation
- `toResponseDto()` - Private helper for transformation

**Business Rules:**
- Projects must belong to a team
- Operations validate team membership
- Creator ID tracked for audit

**Dependencies:**
- `IProjectRepository` (interface)
- DTOs

---

### 5. Controller Layer (`projects.controller.ts`)

**Purpose:** HTTP request/response handling

**Responsibilities:**
- Route definitions
- Authentication/Authorization (Guards)
- Team context extraction (from JWT)
- DTO validation (automatic via ValidationPipe)
- HTTP status codes

**Routes:**
- `GET /projects` - Get all projects in user's team
- `GET /projects/my-projects` - Get projects created by user
- `GET /projects/:id` - Get project by ID (team-scoped)
- `POST /projects` - Create new project
- `PUT /projects/:id` - Update project (team-scoped)
- `DELETE /projects/:id` - Soft delete project (team-scoped)
- `GET /projects/admin/all` - Get all projects (ADMIN)
- `GET /projects/admin/team/:teamId` - Get projects by team (ADMIN)

**Key Features:**
- JWT authentication required (all routes)
- Multi-tenant isolation (teamId from user)
- Admin-only routes for cross-team access
- Automatic DTO validation

**Dependencies:**
- `ProjectsService`
- DTOs
- Auth guards (`JwtAuthGuard`, `RolesGuard`)

---

### 6. Module (`projects.module.ts`)

**Purpose:** NestJS dependency injection configuration

**Responsibilities:**
- Register providers (Service, Repository)
- Register controllers
- Configure TypeORM feature module
- Export services for other modules

**Configuration:**
```typescript
@Module({
  imports: [TypeOrmModule.forFeature([Project])],
  providers: [
    ProjectsService,
    {
      provide: 'IProjectRepository',      // Interface token
      useClass: ProjectRepository,        // Implementation
    },
    ProjectRepository,                    // Also provide concrete class
  ],
  controllers: [ProjectsController],
  exports: [ProjectsService, 'IProjectRepository'],
})
```

**Key Features:**
- Interface-based dependency injection
- TypeORM integration
- Exports for module reuse

**Dependencies:**
- `@nestjs/common`
- `@nestjs/typeorm`
- All module components

---

## Data Flow

### Creating a Project

```
1. HTTP Request
   ↓
2. Controller (projects.controller.ts)
   - Validates DTO (CreateProjectDto)
   - Extracts userId and teamId from JWT
   - Validates teamId matches user's team
   ↓
3. Service (projects.service.ts)
   - Business logic validation
   - Calls repository
   ↓
4. Repository (project.repository.ts)
   - Executes database insert
   - Returns Project entity
   ↓
5. Service
   - Transforms Entity → DTO
   - Returns ProjectResponseDto
   ↓
6. Controller
   - Returns HTTP 201 Created
   - Sends ProjectResponseDto
```

### Finding Projects by Team

```
1. HTTP Request (GET /projects)
   ↓
2. Controller
   - Extracts teamId from JWT user
   - Calls service
   ↓
3. Service
   - Calls repository
   ↓
4. Repository
   - Queries: WHERE teamId = ? AND deletedAt IS NULL
   - Loads relationships (team, createdBy)
   - Orders by createdAt DESC
   - Returns Project[] entities
   ↓
5. Service
   - Transforms each Entity → DTO
   - Returns ProjectResponseDto[]
   ↓
6. Controller
   - Returns HTTP 200 OK
   - Sends ProjectResponseDto[]
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

**Key Points:**
- Controller depends on Service (concrete)
- Service depends on Interface (abstraction)
- Repository implements Interface
- Repository uses TypeORM Repository
- TypeORM manages Entity

---

## Clean Architecture Layers

```
┌─────────────────────────────────────────┐
│  Presentation Layer (Controller)        │  ← HTTP, Guards, DTOs
├─────────────────────────────────────────┤
│  Application Layer (Service)            │  ← Business Logic
├─────────────────────────────────────────┤
│  Domain Layer (Entity)                  │  ← Pure Domain Model
├─────────────────────────────────────────┤
│  Infrastructure Layer (Repository)      │  ← Data Access (TypeORM)
└─────────────────────────────────────────┘
```

**Dependency Rule:** Dependencies point inward
- Controller → Service → Repository → Entity
- Outer layers depend on inner layers
- Inner layers have no dependencies on outer layers

---

## Multi-Tenancy Isolation

### Team-Based Isolation Pattern

**At Controller Level:**
```typescript
const teamId = user.teamId || user.team?.id;
// Pass teamId to service
```

**At Service Level:**
```typescript
async findByIdAndTeamId(id: string, teamId: string)
// Validates project belongs to team
```

**At Repository Level:**
```typescript
where: { id, teamId, deletedAt: IsNull() }
// Database-level filtering
```

**Security Layers:**
1. **Authentication:** JWT Guard (user authenticated)
2. **Authorization:** Roles Guard (admin endpoints)
3. **Isolation:** Team filtering at every layer
4. **Validation:** Service validates team membership

---

## Testing Strategy

### Unit Tests

**Repository Tests:**
- Mock TypeORM Repository
- Test query logic
- Test soft delete filtering

**Service Tests:**
- Mock IProjectRepository interface
- Test business logic
- Test error handling

**Controller Tests:**
- Mock ProjectsService
- Test route handlers
- Test guards and authorization

### Integration Tests

- Full request/response cycle
- Database operations
- Multi-tenant isolation
- End-to-end workflows

---

## Best Practices Applied

✅ **Single Responsibility** - Each component has one job  
✅ **Dependency Inversion** - Service depends on interface  
✅ **Repository Pattern** - Abstracted data access  
✅ **DTO Pattern** - Separate input/output models  
✅ **Multi-Tenancy** - Team-based isolation at every layer  
✅ **Soft Delete** - Data preservation  
✅ **Validation** - DTO validation at controller level  
✅ **Error Handling** - Proper HTTP status codes  
✅ **Documentation** - Clear comments and docs  

---

## Summary

The Projects module follows Clean Architecture principles with clear separation of concerns:

- **Entity:** Pure domain model
- **DTOs:** Input/output contracts
- **Repository:** Data access abstraction
- **Service:** Business logic
- **Controller:** HTTP handling
- **Module:** Dependency injection

Each layer has a clear responsibility, making the codebase maintainable, testable, and scalable.

