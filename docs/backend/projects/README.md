# Project Domain Model

## Overview

Complete domain model implementation for the **Project** entity in the FlowHub multi-tenant SaaS platform.

## Deliverables

### 1. ER Diagram Explanation
📄 **File:** `PROJECT_ER_DIAGRAM.md`

Comprehensive text-based ER diagram with:
- Entity relationships (Project → Team, Project → User)
- Cardinality explanations
- Multi-tenancy isolation patterns
- Query patterns and data flow

### 2. PostgreSQL Table Schema
📄 **File:** `backend/src/database/schema.sql`

Complete SQL schema including:
- `projects` table definition
- Foreign key constraints
- Indexes (partial and composite)
- Triggers for `updated_at`
- Database view for active projects

### 3. TypeORM Entity Code
📄 **File:** `project.entity.ts`

TypeORM entity implementation with:
- UUID primary key
- Foreign key relationships (Team, User)
- Audit fields (created_at, updated_at, deleted_at)
- Soft delete support
- Index decorators

### 4. Best Practices Guide
📄 **File:** `PROJECT_BEST_PRACTICES.md`

Comprehensive guide covering:
- Indexing strategies (partial, composite)
- Constraint design (foreign keys, check constraints)
- Multi-tenancy isolation
- Performance optimization
- Maintenance and monitoring

## Quick Start

### Entity Registration

The Project entity is already registered in `app.module.ts`:

```typescript
import { Project } from './projects/project.entity';

TypeOrmModule.forRoot({
  entities: [User, Team, Invitation, Project],
  // ...
})
```

### Relationships

**Project → Team (Many-to-One)**
- Each project belongs to one team
- Foreign key: `team_id` → `teams.id`
- Constraint: `ON DELETE RESTRICT`

**Project → User (Many-to-One)**
- Each project is created by one user
- Foreign key: `created_by_id` → `users.id`
- Constraint: `ON DELETE SET NULL`

**Team → Projects (One-to-Many)**
- Each team can have many projects
- TypeORM: `@OneToMany(() => Project, (project) => project.team)`

## Key Features

✅ **Multi-tenant isolation** via `team_id`  
✅ **UUID primary keys** for security  
✅ **Soft delete** support  
✅ **Audit fields** (created_by, timestamps)  
✅ **Optimized indexes** (partial, composite)  
✅ **Database constraints** for data integrity  

## Files Structure

```
backend/src/projects/
├── project.entity.ts              # TypeORM entity
├── PROJECT_ER_DIAGRAM.md          # ER diagram explanation
├── PROJECT_BEST_PRACTICES.md      # Indexing & constraints guide
└── README.md                      # This file
```

## Database Schema

The projects table schema is defined in:
- `backend/src/database/schema.sql` (lines 76-94)

## Next Steps

1. **Create Repository:** Implement `ProjectRepository` following the pattern used in `UserRepository`
2. **Create Service:** Implement `ProjectsService` with business logic
3. **Update Controller:** Wire up service methods in `ProjectsController`
4. **Add DTOs:** Create DTOs for create/update operations
5. **Add Validation:** Add class-validator decorators to entity/DTOs

## Related Files

- `backend/src/teams/team.entity.ts` - Updated with `projects` relationship
- `backend/src/app.module.ts` - Updated with Project entity registration
- `backend/src/database/schema.sql` - Updated with projects table and indexes

