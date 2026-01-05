# Team Domain - Clean Architecture Design

## Overview

The Team domain follows Clean Architecture principles with clear separation of concerns, repository pattern, and proper relationship management.

## Architecture Layers

### 1. **Domain Layer** (Entity)
- **File:** `team.entity.ts`
- **Purpose:** Core business entity, database-agnostic
- **Contains:** 
  - Team properties (name, slug, description)
  - Admin ownership relationship
  - One-to-many users relationship
  - Soft delete support

### 2. **Repository Layer** (Data Access)
- **Interface:** `repositories/team.repository.interface.ts`
- **Implementation:** `repositories/team.repository.ts`
- **Purpose:** Abstracts data access operations
- **Benefits:** Testable, swappable, follows DIP

### 3. **DTO Layer** (Data Transfer Objects)
- **CreateTeamDto:** Input validation for team creation
- **UpdateTeamDto:** Input validation for team updates
- **TeamResponseDto:** Output format (excludes deletedAt)

### 4. **Service Layer** (Business Logic)
- **File:** `teams.service.ts`
- **Purpose:** Contains business rules
- **Responsibilities:**
  - Slug uniqueness validation
  - Admin user validation
  - Delete safety checks (prevent deletion if users exist)
  - Entity → DTO transformation

### 5. **Controller Layer** (Presentation)
- **File:** `teams.controller.ts`
- **Purpose:** HTTP request/response handling
- **Responsibilities:**
  - Route definitions
  - DTO validation (automatic via ValidationPipe)
  - Authentication/Authorization

## Key Features

### 1. Admin Ownership

**Concept:**
- Each team can have an admin/owner user
- Admin is optional (nullable)
- Admin can be changed/reassigned

**Implementation:**
```typescript
@ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
adminUser?: User;

@Column({ name: 'admin_user_id', nullable: true })
adminUserId?: string;
```

**Use Cases:**
- Track team ownership
- Assign team management permissions
- Query teams by admin

**Safety:**
- If admin user is deleted → `adminUserId` set to NULL
- Team continues to exist
- Can assign new admin later

---

### 2. One-to-Many Relationship

**Concept:**
- One team has many users
- Each user belongs to exactly one team

**Implementation:**
```typescript
// Team side
@OneToMany(() => User, (user) => user.team)
users: User[];

// User side
@ManyToOne(() => Team, (team) => team.users, { 
  nullable: false, 
  onDelete: 'RESTRICT' 
})
team: Team;
```

**Safety:**
- `nullable: false` - User MUST have a team
- `onDelete: 'RESTRICT'` - Cannot delete team if users exist

---

### 3. Delete Safety

**Multi-Layer Protection:**

1. **Service Layer:**
   ```typescript
   const hasActiveUsers = await this.teamRepository.hasActiveUsers(id);
   if (hasActiveUsers) {
     throw new ConflictException('Cannot delete team...');
   }
   ```

2. **Database Layer:**
   ```sql
   -- Foreign key constraint
   ON DELETE RESTRICT
   ```

**Result:**
- User-friendly error messages
- Database-level enforcement
- No orphaned users possible

---

### 4. Soft Delete

**Implementation:**
```typescript
@Column({ type: 'timestamptz', nullable: true, name: 'deleted_at' })
@Index()
deletedAt?: Date;
```

**Benefits:**
- Preserves data for audit/recovery
- Maintains referential integrity
- Efficient queries (partial indexes)

---

## File Structure

```
teams/
├── team.entity.ts                    # Domain entity
├── dto/
│   ├── create-team.dto.ts           # Input validation
│   ├── update-team.dto.ts           # Input validation
│   └── team-response.dto.ts         # Output format
├── repositories/
│   ├── team.repository.interface.ts # Contract
│   └── team.repository.ts           # TypeORM impl
├── teams.service.ts                  # Business logic
├── teams.controller.ts              # HTTP handling
├── teams.module.ts                   # DI setup
├── DESIGN.md                         # This file
└── RELATIONSHIPS.md                  # Relationship details
```

## Usage Examples

### Create Team

```typescript
// Controller
@Post()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
async create(@Body() createTeamDto: CreateTeamDto) {
  return this.teamsService.create(createTeamDto);
}

// Service
async create(dto: CreateTeamDto): Promise<TeamResponseDto> {
  // Validate slug uniqueness
  if (await this.teamRepository.slugExists(dto.slug)) {
    throw new ConflictException('Slug already exists');
  }
  
  // Create via repository
  const team = await this.teamRepository.create(dto);
  
  // Return DTO
  return this.toResponseDto(team);
}
```

### Delete Team (Safe)

```typescript
// Service
async softDelete(id: string): Promise<void> {
  // Check for active users
  if (await this.teamRepository.hasActiveUsers(id)) {
    const count = await this.teamRepository.countActiveUsers(id);
    throw new ConflictException(
      `Cannot delete team: ${count} active user(s) still belong to this team`
    );
  }
  
  // Safe to delete
  await this.teamRepository.softDelete(id);
}
```

## Future Extensibility

### 1. Many-to-Many Users ↔ Teams

**Current:** One user, one team  
**Future:** One user, many teams

**Migration:**
- Create `user_teams` junction table
- Migrate existing data
- Make `users.team_id` nullable (or keep as primary)

### 2. Team Hierarchy

**Future:** Teams can have parent teams

**Design:**
```typescript
@ManyToOne(() => Team)
parentTeam?: Team;

@OneToMany(() => Team, (team) => team.parentTeam)
children?: Team[];
```

### 3. Team Roles

**Future:** Role-based access within teams

**Design:**
```typescript
enum TeamRole {
  OWNER,
  ADMIN,
  MEMBER,
  VIEWER
}
```

## Benefits

1. **Safe:** Multi-layer delete protection
2. **Flexible:** Easy to extend (many-to-many, hierarchy)
3. **Testable:** Repository interface allows mocking
4. **Maintainable:** Clear separation of concerns
5. **Secure:** Input validation, output sanitization
6. **SOLID:** Follows all principles

## Summary

The Team domain provides:
- ✅ Clean Architecture structure
- ✅ Admin ownership concept
- ✅ Safe delete operations
- ✅ One-to-many relationship with users
- ✅ Future extensibility (many-to-many ready)
- ✅ Database + application level safety

