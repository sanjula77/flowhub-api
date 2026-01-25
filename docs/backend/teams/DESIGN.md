# Team Domain Architecture

Clean Architecture design with repository pattern and relationship management.

## Architecture Layers

### 1. Domain Layer (Entity)
- **File:** `team.entity.ts`
- **Purpose:** Core business entity
- **Contains:** Team properties, admin ownership, one-to-many users relationship, soft delete support

### 2. Repository Layer (Data Access)
- **Interface:** `repositories/team.repository.interface.ts`
- **Implementation:** `repositories/team.repository.ts`
- **Purpose:** Abstracts data access operations
- **Benefits:** Testable, swappable, follows DIP

### 3. DTO Layer
- **CreateTeamDto:** Input validation for team creation
- **UpdateTeamDto:** Input validation for team updates
- **TeamResponseDto:** Output format (excludes deletedAt)

### 4. Service Layer (Business Logic)
- **File:** `teams.service.ts`
- **Purpose:** Contains business rules
- **Responsibilities:**
  - Slug uniqueness validation
  - Admin user validation
  - Delete safety checks (prevent deletion if users exist)
  - Entity → DTO transformation

### 5. Controller Layer (Presentation)
- **File:** `teams.controller.ts`
- **Purpose:** HTTP request/response handling
- **Responsibilities:** Route definitions, DTO validation, Authentication/Authorization

---

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
└── teams.module.ts                   # DI setup
```

---

## Usage Examples

### Create Team

```typescript
@Post()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
async create(@Body() createTeamDto: CreateTeamDto) {
  return this.teamsService.create(createTeamDto);
}
```

### Delete Team (Safe)

```typescript
async softDelete(id: string): Promise<void> {
  if (await this.teamRepository.hasActiveUsers(id)) {
    const count = await this.teamRepository.countActiveUsers(id);
    throw new ConflictException(
      `Cannot delete team: ${count} active user(s) still belong to this team`
    );
  }
  await this.teamRepository.softDelete(id);
}
```

---

## Future Extensibility

### 1. Many-to-Many Users ↔ Teams
- Create `user_teams` junction table
- Migrate existing data
- Make `users.team_id` nullable (or keep as primary)

### 2. Team Hierarchy
- Teams can have parent teams
- Add `parentTeam` relationship

### 3. Team Roles
- Role-based access within teams
- Add `TeamRole` enum (OWNER, ADMIN, MEMBER, VIEWER)

---

## Summary

The Team domain provides:
- Clean Architecture structure
- Admin ownership concept
- Safe delete operations
- One-to-many relationship with users
- Future extensibility (many-to-many ready)
- Database + application level safety
