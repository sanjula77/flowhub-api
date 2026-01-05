# Clean Architecture Implementation - Projects Module

## Overview

This implementation follows Clean Architecture principles with clear separation of concerns, SOLID principles, and proper dependency management. The Projects module is designed for a multi-tenant SaaS platform with team-based isolation.

## Architecture Layers

### 1. **Domain Layer** (Entity)
- **File:** `project.entity.ts`
- **Purpose:** Core business entity, database-agnostic
- **Contains:** Project properties, relationships, TypeORM decorators
- **No dependencies:** Pure domain model

### 2. **Repository Layer** (Data Access)
- **Interface:** `repositories/project.repository.interface.ts`
- **Implementation:** `repositories/project.repository.ts`
- **Purpose:** Abstracts data access, follows Repository Pattern
- **Benefits:** 
  - Easy to swap implementations (TypeORM → Prisma → MongoDB)
  - Testable (can mock interface)
  - Follows Dependency Inversion Principle

### 3. **DTO Layer** (Data Transfer Objects)
- **CreateProjectDto:** Input validation for project creation
- **UpdateProjectDto:** Input validation for project updates
- **ProjectResponseDto:** Output format
- **Purpose:** 
  - Input validation via class-validator
  - Output transformation
  - API contract definition

### 4. **Service Layer** (Business Logic)
- **File:** `projects.service.ts`
- **Purpose:** Contains business rules and orchestration
- **Responsibilities:**
  - Multi-tenant isolation validation
  - Data transformation (Entity → DTO)
  - Business rule enforcement
- **No HTTP concerns:** Pure business logic

### 5. **Controller Layer** (Presentation)
- **File:** `projects.controller.ts`
- **Purpose:** HTTP request/response handling
- **Responsibilities:**
  - Route definitions
  - DTO validation (automatic via ValidationPipe)
  - Multi-tenant context extraction (teamId from user)
  - Response formatting
- **No business logic:** Delegates to services

## SOLID Principles Applied

### Single Responsibility Principle (SRP)
- **Entity:** Only data structure
- **Repository:** Only data access
- **Service:** Only business logic
- **Controller:** Only HTTP handling

### Open/Closed Principle (OCP)
- Repository interface allows extension without modification
- Can add new repository implementations (e.g., caching layer)

### Liskov Substitution Principle (LSP)
- Any implementation of `IProjectRepository` can replace `ProjectRepository`
- Service depends on interface, not implementation

### Interface Segregation Principle (ISP)
- Repository interface contains only methods needed by service
- No fat interfaces

### Dependency Inversion Principle (DIP)
- Service depends on `IProjectRepository` (interface), not `ProjectRepository` (concrete)
- High-level modules (Service) don't depend on low-level modules (Repository)

## Dependency Injection

### Module Configuration

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([Project])],
  providers: [
    ProjectsService,
    {
      provide: 'IProjectRepository', // Token for interface
      useClass: ProjectRepository, // Implementation
    },
    ProjectRepository, // Also provide concrete class
  ],
  controllers: [ProjectsController],
  exports: [ProjectsService, 'IProjectRepository'],
})
```

### Injection Pattern

**Service:**
```typescript
constructor(@Inject('IProjectRepository') private readonly projectRepository: IProjectRepository)
```

**Benefits:**
- Service depends on interface (abstraction)
- Can easily swap implementations
- Easy to mock for testing

## Multi-Tenancy Isolation

### Team-Based Isolation

All project operations are scoped to a team:

1. **Controller extracts teamId from authenticated user:**
   ```typescript
   const teamId = user.teamId || user.team?.id;
   ```

2. **Service validates team membership:**
   ```typescript
   async findByIdAndTeamId(id: string, teamId: string)
   ```

3. **Repository filters by teamId:**
   ```typescript
   where: { id, teamId, deletedAt: IsNull() }
   ```

### Security Layers

1. **Authentication:** JWT guard ensures user is authenticated
2. **Authorization:** Roles guard for admin endpoints
3. **Data Isolation:** Repository queries filter by teamId
4. **Validation:** Service validates team membership before operations

## File Structure

```
projects/
├── project.entity.ts                    # Domain entity
├── dto/
│   ├── create-project.dto.ts           # Input DTO (validation)
│   ├── update-project.dto.ts           # Input DTO (validation)
│   └── project-response.dto.ts         # Output DTO
├── repositories/
│   ├── project.repository.interface.ts # Repository contract
│   └── project.repository.ts           # TypeORM implementation
├── projects.service.ts                  # Business logic
├── projects.controller.ts               # HTTP handling
├── projects.module.ts                   # Dependency injection setup
└── ARCHITECTURE.md                      # This file
```

## Component Responsibilities

### Project Entity
- **Purpose:** Domain model representing a project
- **Contains:**
  - Properties (id, name, description, teamId, createdById)
  - Relationships (Team, User)
  - TypeORM decorators
- **No business logic**

### IProjectRepository Interface
- **Purpose:** Contract for data access operations
- **Methods:**
  - `create()` - Create new project
  - `findById()` - Find by ID
  - `findByIdAndTeamId()` - Find by ID and team (multi-tenant)
  - `findByTeamId()` - Find all in team
  - `findByCreatedById()` - Find all created by user
  - `findAll()` - Find all (admin only)
  - `update()` - Update project
  - `softDelete()` - Soft delete project

### ProjectRepository
- **Purpose:** TypeORM implementation of repository interface
- **Responsibilities:**
  - Database queries
  - Soft delete filtering (`deletedAt IS NULL`)
  - Relationship loading (team, createdBy)
  - Ordering (newest first)

### ProjectsService
- **Purpose:** Business logic layer
- **Responsibilities:**
  - Multi-tenant validation
  - Entity to DTO transformation
  - Business rule enforcement
  - Error handling (NotFoundException)

### ProjectsController
- **Purpose:** HTTP request/response handling
- **Responsibilities:**
  - Route definitions
  - Authentication/Authorization (Guards)
  - Team context extraction (from JWT user)
  - DTO validation (via ValidationPipe)
  - Status codes

## Usage Examples

### Creating a Project

```typescript
// Controller receives CreateProjectDto
@Post()
async create(@Body() createProjectDto: CreateProjectDto, @Request() req) {
  const userId = req.user.sub;
  const teamId = req.user.teamId;
  
  // Validate team matches user's team
  if (createProjectDto.teamId !== teamId) {
    throw new Error('Cannot create project in different team');
  }
  
  return this.projectsService.create(createProjectDto, userId);
}

// Service validates and creates
async create(dto: CreateProjectDto, createdById?: string): Promise<ProjectResponseDto> {
  const project = await this.projectRepository.create({
    name: dto.name,
    description: dto.description,
    teamId: dto.teamId,
    createdById,
  });
  
  return this.toResponseDto(project);
}
```

### Finding Projects by Team

```typescript
// Controller extracts teamId from user
@Get()
async findAll(@Request() req) {
  const teamId = req.user.teamId;
  return this.projectsService.findByTeamId(teamId);
}

// Service delegates to repository
async findByTeamId(teamId: string): Promise<ProjectResponseDto[]> {
  const projects = await this.projectRepository.findByTeamId(teamId);
  return projects.map(p => this.toResponseDto(p));
}

// Repository queries database
async findByTeamId(teamId: string): Promise<Project[]> {
  return this.typeOrmRepository.find({
    where: { teamId, deletedAt: IsNull() },
    relations: ['team', 'createdBy'],
    order: { createdAt: 'DESC' },
  });
}
```

## Testing Strategy

### Unit Testing

**Service Tests:**
```typescript
// Mock repository interface
const mockRepository: IProjectRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findByIdAndTeamId: jest.fn(),
  // ... other methods
};

// Test service in isolation
const service = new ProjectsService(mockRepository);
```

**Repository Tests:**
- Use TypeORM in-memory database
- Test query logic
- Test soft delete filtering

**Controller Tests:**
- Mock service
- Test route handlers
- Test guards and authorization

### Integration Testing

- Test full request/response cycle
- Test database operations
- Test multi-tenant isolation

## Best Practices

### 1. Always Filter by TeamId

**Why:** Multi-tenant isolation
```typescript
// ✅ Good
await this.projectRepository.findByIdAndTeamId(id, teamId);

// ❌ Bad (no team isolation)
await this.projectRepository.findById(id);
```

### 2. Use DTOs for Input/Output

**Why:** Validation, security, API contract
```typescript
// ✅ Good
async create(dto: CreateProjectDto): Promise<ProjectResponseDto>

// ❌ Bad (exposes entity)
async create(dto: any): Promise<Project>
```

### 3. Depend on Interfaces

**Why:** Testability, flexibility
```typescript
// ✅ Good
constructor(@Inject('IProjectRepository') private repo: IProjectRepository)

// ❌ Bad (tight coupling)
constructor(private repo: ProjectRepository)
```

### 4. Thin Controllers, Fat Services

**Why:** Separation of concerns
```typescript
// ✅ Good (controller delegates)
@Post()
async create(@Body() dto: CreateProjectDto) {
  return this.service.create(dto);
}

// ❌ Bad (business logic in controller)
@Post()
async create(@Body() dto: CreateProjectDto) {
  // Business logic here - WRONG
  const project = await this.repository.create(dto);
  // ...
}
```

### 5. Soft Delete Pattern

**Why:** Data preservation, audit trail
```typescript
// ✅ Good (soft delete)
project.deletedAt = new Date();
await repository.save(project);

// ❌ Bad (hard delete)
await repository.delete(id);
```

## Summary

This architecture provides:

✅ **Separation of Concerns** - Clear layer boundaries  
✅ **Testability** - Easy to mock and test each layer  
✅ **Flexibility** - Can swap implementations (Repository)  
✅ **Maintainability** - Single Responsibility Principle  
✅ **Security** - Multi-tenant isolation at every layer  
✅ **Scalability** - Clean structure supports growth  

The design follows industry best practices and Clean Architecture principles, making it easy to maintain, test, and extend.

