# Project Domain Model - ER Diagram Explanation

## Overview

This document describes the Entity-Relationship (ER) diagram for the **Project** domain model in the FlowHub multi-tenant SaaS platform. The Project entity connects Users and Teams in a controlled relationship structure.

---

## Entity-Relationship Diagram (Text Representation)

```
┌─────────────┐
│    User     │
│             │
│  id (PK)    │
│  email      │
│  team_id    │
│  ...        │
└──────┬──────┘
       │
       │ (1) created_by
       │
       │
┌──────▼──────────────┐
│      Project        │
│                     │
│  id (PK)            │◄────┐
│  name               │     │
│  description        │     │
│  team_id (FK)       │─────┤ (Many) belongs_to (1)
│  created_by_id (FK) │     │
│  created_at         │     │
│  updated_at         │     │
│  deleted_at         │     │
└─────────────────────┘     │
                            │
                            │
                    ┌───────┴──────┐
                    │     Team     │
                    │              │
                    │  id (PK)     │
                    │  name        │
                    │  slug        │
                    │  ...         │
                    └──────────────┘
```

---

## Relationships

### 1. Project → Team (Many-to-One)

**Relationship:** A project **belongs to** exactly one team  
**Cardinality:** Many Projects → One Team  
**Direction:** Project (Many) → Team (One)

**Implementation:**
- Foreign key: `projects.team_id` → `teams.id`
- Constraint: `ON DELETE RESTRICT` (prevents deleting a team with active projects)
- Not nullable: A project must belong to a team

**Business Rule:**
- Projects are isolated per team (multi-tenant isolation)
- One team can have multiple projects
- Cannot delete a team if it has active (non-deleted) projects

---

### 2. Project → User (Many-to-One)

**Relationship:** A project is **created by** exactly one user  
**Cardinality:** Many Projects → One User  
**Direction:** Project (Many) → User (One)

**Implementation:**
- Foreign key: `projects.created_by_id` → `users.id`
- Constraint: `ON DELETE SET NULL` (preserves project if creator is deleted)
- Nullable: Allows project to exist even if creator is removed

**Business Rule:**
- Every project tracks who created it (audit trail)
- Projects can exist independently of the creator (soft delete handling)
- Useful for audit and permission checks

---

### 3. Team → Projects (One-to-Many)

**Relationship:** A team **has** many projects  
**Cardinality:** One Team → Many Projects  
**Direction:** Team (One) → Projects (Many)

**Implementation:**
- Inverse relationship of Project → Team
- TypeORM: `@OneToMany(() => Project, (project) => project.team)`
- No database foreign key (implemented on Project side)

**Business Rule:**
- Teams can manage multiple projects
- Projects are tenant-scoped (team isolation)

---

## Entity Attributes

### Project Entity

| Attribute | Type | Constraints | Description |
|-----------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier (auto-generated) |
| `name` | VARCHAR(255) | NOT NULL, CHECK | Project display name (non-empty) |
| `description` | TEXT | NULLABLE | Optional project description |
| `team_id` | UUID | NOT NULL, FOREIGN KEY | References `teams.id` |
| `created_by_id` | UUID | NULLABLE, FOREIGN KEY | References `users.id` (creator) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW | Last update timestamp |
| `deleted_at` | TIMESTAMPTZ | NULLABLE, INDEXED | Soft delete timestamp |

---

## Multi-Tenancy Isolation

The Project entity enforces multi-tenant isolation through:

1. **Team Scoping:**
   - Every project must belong to a team (`team_id` NOT NULL)
   - Queries filter by `team_id` to ensure data isolation
   - Foreign key constraint prevents orphaned projects

2. **Soft Delete:**
   - Projects are soft-deleted (`deleted_at` timestamp)
   - Partial indexes exclude deleted records
   - Maintains referential integrity

3. **Data Isolation Pattern:**
   ```sql
   -- Always filter by team_id AND deleted_at
   SELECT * FROM projects 
   WHERE team_id = :teamId 
   AND deleted_at IS NULL;
   ```

---

## Relationship Rules & Constraints

### Foreign Key Constraints

1. **`projects.team_id` → `teams.id`**
   - `ON DELETE RESTRICT`: Cannot delete a team with active projects
   - Prevents data loss and maintains referential integrity
   - Application must delete/migrate projects first

2. **`projects.created_by_id` → `users.id`**
   - `ON DELETE SET NULL`: If creator is deleted, set to NULL
   - Preserves project data for audit purposes
   - Projects can exist without a creator reference

### Check Constraints

1. **Name Validation:**
   ```sql
   CHECK (LENGTH(TRIM(name)) > 0)
   ```
   - Prevents empty or whitespace-only project names

---

## Index Strategy

### Primary Indexes

1. **Primary Key:** `id` (UUID)
   - Automatic index (PRIMARY KEY constraint)
   - Used for direct lookups by ID

### Foreign Key Indexes

2. **Team Lookup:** `idx_projects_team_id`
   - Partial index: `WHERE deleted_at IS NULL`
   - Optimizes: "Get all projects for a team"
   - Critical for multi-tenant queries

3. **Creator Lookup:** `idx_projects_created_by_id`
   - Partial index: `WHERE deleted_at IS NULL`
   - Optimizes: "Get all projects created by a user"
   - Useful for user dashboards

### Composite Indexes

4. **Team + Active Filter:** `idx_projects_team_deleted`
   - Composite: `(team_id, deleted_at)`
   - Optimizes: Team-scoped queries with soft delete filtering
   - Most common query pattern

5. **Soft Delete Cleanup:** `idx_projects_deleted_at`
   - Index: `deleted_at WHERE deleted_at IS NOT NULL`
   - Optimizes: Cleanup queries for permanently deleted records

---

## Query Patterns

### Common Queries

1. **Get all active projects for a team:**
   ```sql
   SELECT * FROM projects 
   WHERE team_id = :teamId 
   AND deleted_at IS NULL 
   ORDER BY created_at DESC;
   ```
   - Uses: `idx_projects_team_deleted`

2. **Get projects created by a user:**
   ```sql
   SELECT * FROM projects 
   WHERE created_by_id = :userId 
   AND deleted_at IS NULL;
   ```
   - Uses: `idx_projects_created_by_id`

3. **Get project by ID (with team validation):**
   ```sql
   SELECT * FROM projects 
   WHERE id = :projectId 
   AND team_id = :teamId 
   AND deleted_at IS NULL;
   ```
   - Uses: Primary key + team_id filter

4. **Count projects per team:**
   ```sql
   SELECT team_id, COUNT(*) as project_count
   FROM projects 
   WHERE deleted_at IS NULL
   GROUP BY team_id;
   ```
   - Uses: `idx_projects_team_deleted`

---

## Data Flow

### Creating a Project

1. User creates project in their team context
2. System sets:
   - `team_id` = User's team (from authenticated session)
   - `created_by_id` = Current user ID
   - `created_at` = Current timestamp
   - `deleted_at` = NULL
3. Database enforces constraints (team exists, user exists)
4. Project is tenant-isolated automatically

### Updating a Project

1. User updates project (name, description, etc.)
2. System sets `updated_at` = Current timestamp (via trigger)
3. `team_id` and `created_by_id` remain unchanged
4. Soft delete check: `deleted_at IS NULL`

### Deleting a Project

1. Soft delete: Set `deleted_at` = Current timestamp
2. Project remains in database (for audit/recovery)
3. Queries exclude it via `deleted_at IS NULL` filter
4. Hard delete: Only for cleanup after retention period

---

## Summary

The Project domain model implements:

✅ **Multi-tenant isolation** via team_id foreign key  
✅ **Audit trail** via created_by_id and timestamps  
✅ **Soft delete** for data preservation  
✅ **Referential integrity** via foreign key constraints  
✅ **Performance optimization** via strategic indexes  
✅ **Data safety** via check constraints  

The design follows the same patterns as User and Team entities, ensuring consistency across the codebase.

