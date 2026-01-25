# Projects Module Architecture

Clean Architecture implementation with clear separation of concerns and SOLID principles.

## Architecture Layers

### 1. Domain Layer (Entity)
- **File:** `project.entity.ts`
- **Purpose:** Core business entity, database-agnostic
- **Contains:** Project properties, relationships, TypeORM decorators
- **No dependencies:** Pure domain model

### 2. Repository Layer (Data Access)
- **Interface:** `repositories/project.repository.interface.ts`
- **Implementation:** `repositories/project.repository.ts`
- **Purpose:** Abstracts data access, follows Repository Pattern
- **Benefits:** Easy to swap implementations, testable, follows DIP

### 3. DTO Layer (Data Transfer Objects)
- **CreateProjectDto:** Input validation for project creation
- **UpdateProjectDto:** Input validation for project updates
- **ProjectResponseDto:** Output format
- **Purpose:** Input validation, output transformation, API contract definition

### 4. Service Layer (Business Logic)
- **File:** `projects.service.ts`
- **Purpose:** Contains business rules and orchestration
- **Responsibilities:**
  - Multi-tenant isolation validation
  - Data transformation (Entity → DTO)
  - Business rule enforcement
- **No HTTP concerns:** Pure business logic

### 5. Controller Layer (Presentation)
- **File:** `projects.controller.ts`
- **Purpose:** HTTP request/response handling
- **Responsibilities:**
  - Route definitions
  - DTO validation (automatic via ValidationPipe)
  - Multi-tenant context extraction (teamId from user)
  - Response formatting
- **No business logic:** Delegates to services

---

## SOLID Principles Applied

- **Single Responsibility:** Each layer has one job
- **Open/Closed:** Repository interface allows extension without modification
- **Liskov Substitution:** Any implementation of `IProjectRepository` can replace `ProjectRepository`
- **Interface Segregation:** Repository interface contains only methods needed
- **Dependency Inversion:** Service depends on interface, not implementation

---

## Dependency Injection

**Module Configuration:**
```typescript
@Module({
  imports: [TypeOrmModule.forFeature([Project])],
  providers: [
    ProjectsService,
    {
      provide: 'IProjectRepository',
      useClass: ProjectRepository,
    },
  ],
  controllers: [ProjectsController],
})
```

**Service Injection:**
```typescript
constructor(@Inject('IProjectRepository') private readonly projectRepository: IProjectRepository)
```

---

## Multi-Tenancy Isolation

All project operations are scoped to a team:

1. **Controller extracts teamId from authenticated user**
2. **Service validates team membership**
3. **Repository filters by teamId**

**Security Layers:**
1. Authentication: JWT guard ensures user is authenticated
2. Authorization: Roles guard for admin endpoints
3. Data Isolation: Repository queries filter by teamId
4. Validation: Service validates team membership before operations

---

## File Structure

```
projects/
├── project.entity.ts                    # Domain entity
├── dto/
│   ├── create-project.dto.ts           # Input DTO
│   ├── update-project.dto.ts           # Input DTO
│   └── project-response.dto.ts         # Output DTO
├── repositories/
│   ├── project.repository.interface.ts # Repository contract
│   └── project.repository.ts           # TypeORM implementation
├── projects.service.ts                  # Business logic
├── projects.controller.ts              # HTTP handling
└── projects.module.ts                   # DI setup
```

---

## Usage Examples

### Creating a Project

```typescript
// Controller receives CreateProjectDto
@Post()
async create(@Body() createProjectDto: CreateProjectDto, @Request() req) {
  const userId = req.user.sub;
  const teamId = req.user.teamId;
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

// Repository queries database
async findByTeamId(teamId: string): Promise<Project[]> {
  return this.typeOrmRepository.find({
    where: { teamId, deletedAt: IsNull() },
    relations: ['team', 'createdBy'],
    order: { createdAt: 'DESC' },
  });
}
```

---

## Testing Strategy

**Service Tests:** Mock repository interface, test business logic in isolation  
**Repository Tests:** Use TypeORM in-memory database, test query logic  
**Controller Tests:** Mock service, test route handlers and guards

---

## Best Practices

1. **Always Filter by TeamId:** Multi-tenant isolation
2. **Use DTOs for Input/Output:** Validation, security, API contract
3. **Depend on Interfaces:** Testability, flexibility
4. **Thin Controllers, Fat Services:** Separation of concerns
5. **Soft Delete Pattern:** Data preservation, audit trail

---

## Summary

This architecture provides:
- **Separation of Concerns** - Clear layer boundaries
- **Testability** - Easy to mock and test each layer
- **Flexibility** - Can swap implementations
- **Maintainability** - Single Responsibility Principle
- **Security** - Multi-tenant isolation at every layer
- **Scalability** - Clean structure supports growth
