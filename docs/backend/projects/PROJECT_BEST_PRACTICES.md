# Project Domain Model - Best Practices: Indexing & Constraints

## Overview

This document outlines best practices for indexing and constraints in the Project domain model, designed for a multi-tenant SaaS platform using NestJS + PostgreSQL + TypeORM.

---

## 1. Primary Key Design

### UUID Primary Keys

**Best Practice:** Use UUIDs instead of sequential integers

```typescript
@PrimaryGeneratedColumn('uuid')
id: string;
```

**Why:**
- ✅ Prevents ID enumeration attacks (security)
- ✅ Better for distributed systems (no sequence conflicts)
- ✅ Safe for merging data from multiple sources
- ✅ No information leakage about data volume

**PostgreSQL:**
```sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
```

**Index:**
- Automatically indexed (PRIMARY KEY constraint)
- No additional index needed

---

## 2. Foreign Key Constraints

### Team Relationship (team_id)

**Constraint:**
```sql
team_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT
```

**Best Practices:**

1. **NOT NULL:**
   - Every project must belong to a team (multi-tenant isolation)
   - Prevents orphaned projects

2. **ON DELETE RESTRICT:**
   - Prevents deleting a team with active projects
   - Forces explicit cleanup (delete/migrate projects first)
   - Maintains referential integrity

**TypeORM:**
```typescript
@ManyToOne(() => Team, (team) => team.projects, { 
  nullable: false, 
  onDelete: 'RESTRICT' 
})
@JoinColumn({ name: 'team_id' })
team: Team;
```

**Indexing:**
- **CRITICAL:** Index foreign keys used in WHERE clauses
- Most queries filter by `team_id`
- Use partial index for active records only

```sql
CREATE INDEX idx_projects_team_id ON projects(team_id) 
WHERE deleted_at IS NULL;
```

---

### Creator Relationship (created_by_id)

**Constraint:**
```sql
created_by_id UUID REFERENCES users(id) ON DELETE SET NULL
```

**Best Practices:**

1. **Nullable:**
   - Project can exist even if creator is deleted
   - Preserves audit trail (project remains)
   - Soft delete handling

2. **ON DELETE SET NULL:**
   - If creator is deleted, set to NULL
   - Project data is preserved
   - Prevents cascade deletion

**TypeORM:**
```typescript
@ManyToOne(() => User, { 
  nullable: true, 
  onDelete: 'SET NULL' 
})
@JoinColumn({ name: 'created_by_id' })
createdBy?: User;
```

**Indexing:**
- Index if frequently queried (user dashboards)
- Partial index for active records

```sql
CREATE INDEX idx_projects_created_by_id ON projects(created_by_id) 
WHERE deleted_at IS NULL;
```

---

## 3. Index Strategy

### Partial Indexes (WHERE deleted_at IS NULL)

**Best Practice:** Only index active (non-deleted) records

**Why:**
- Smaller index size (excludes deleted records)
- Faster queries (fewer rows to scan)
- Better cache utilization
- Matches common query pattern (active records only)

**Example:**
```sql
CREATE INDEX idx_projects_team_id ON projects(team_id) 
WHERE deleted_at IS NULL;
```

**TypeORM:**
```typescript
@Index(['teamId'], { where: '"deleted_at" IS NULL' })
```

---

### Composite Indexes

**Best Practice:** Create composite indexes for common query patterns

**Common Pattern:**
```sql
SELECT * FROM projects 
WHERE team_id = :teamId 
AND deleted_at IS NULL 
ORDER BY created_at DESC;
```

**Optimized Index:**
```sql
CREATE INDEX idx_projects_team_deleted ON projects(team_id, deleted_at) 
WHERE deleted_at IS NULL;
```

**When to Use:**
- ✅ Two or more columns frequently queried together
- ✅ Column order matters (most selective first)
- ✅ Covers WHERE + ORDER BY clauses

**TypeORM:**
```typescript
@Index(['teamId', 'deletedAt'], { where: '"deleted_at" IS NULL' })
```

---

### Index Types Summary

| Index Name | Columns | Type | Purpose |
|------------|---------|------|---------|
| `PRIMARY KEY` | `id` | B-tree | Direct ID lookups |
| `idx_projects_team_id` | `team_id` | Partial B-tree | Team-scoped queries |
| `idx_projects_created_by_id` | `created_by_id` | Partial B-tree | Creator queries |
| `idx_projects_team_deleted` | `team_id, deleted_at` | Partial Composite | Common team queries |
| `idx_projects_deleted_at` | `deleted_at` | Partial B-tree | Cleanup queries |

---

## 4. Check Constraints

### Name Validation

**Constraint:**
```sql
CONSTRAINT projects_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
```

**Best Practices:**

1. **Database-Level Validation:**
   - Enforces data quality at DB level
   - Prevents empty/whitespace-only names
   - Works even if application logic fails

2. **TypeORM:** (Application-level validation)
   ```typescript
   @Column({ type: 'varchar', length: 255 })
   @IsNotEmpty()
   @IsString()
   @Length(1, 255)
   name: string;
   ```

**Defense in Depth:**
- Database constraint: Last line of defense
- Application validation: Better error messages
- Both layers provide protection

---

## 5. Soft Delete Indexing

### Soft Delete Pattern

**Column:**
```sql
deleted_at TIMESTAMP WITH TIME ZONE NULL
```

**Best Practices:**

1. **Partial Indexes:**
   - Exclude deleted records from main indexes
   - Smaller, faster indexes

2. **Separate Cleanup Index:**
   ```sql
   CREATE INDEX idx_projects_deleted_at ON projects(deleted_at) 
   WHERE deleted_at IS NOT NULL;
   ```
   - Optimizes cleanup queries
   - Only indexes deleted records

3. **Query Pattern:**
   ```sql
   -- Always filter by deleted_at
   SELECT * FROM projects 
   WHERE team_id = :teamId 
   AND deleted_at IS NULL;
   ```

**TypeORM:**
```typescript
@Column({ type: 'timestamptz', nullable: true, name: 'deleted_at' })
@Index()
deletedAt?: Date;
```

---

## 6. Audit Fields

### Timestamp Fields

**Best Practices:**

1. **Use TIMESTAMPTZ:**
   ```sql
   created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
   ```
   - Stores timezone-aware timestamps
   - Consistent across timezones

2. **Automatic Updates:**
   - Use database triggers for `updated_at`
   - Application can't forget to update
   - Consistent behavior

3. **Default Values:**
   ```sql
   DEFAULT CURRENT_TIMESTAMP
   ```
   - Database sets timestamp
   - Works even with bulk inserts

**TypeORM:**
```typescript
@CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
createdAt: Date;

@UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
updatedAt: Date;
```

**Trigger:**
```sql
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## 7. Multi-Tenancy Isolation

### Team-Scoped Queries

**Best Practice:** Always filter by `team_id` in queries

**Query Pattern:**
```sql
SELECT * FROM projects 
WHERE team_id = :teamId  -- ALWAYS include team filter
AND deleted_at IS NULL
AND id = :projectId;
```

**TypeORM Repository:**
```typescript
async findByTeam(teamId: string): Promise<Project[]> {
  return this.find({
    where: { teamId, deletedAt: IsNull() },
    relations: ['team', 'createdBy'],
  });
}
```

**Security:**
- Prevents cross-tenant data access
- Index on `team_id` optimizes filtering
- Application must enforce team context

---

## 8. Index Maintenance

### Monitoring Index Usage

**Query to Check Index Usage:**
```sql
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'projects'
ORDER BY idx_scan DESC;
```

**When to Review:**
- ✅ Low `idx_scan`: Index might be unused
- ✅ High `idx_tup_read` / low `idx_scan`: Index might be inefficient
- ✅ Missing index: Slow queries (check `pg_stat_statements`)

---

### Index Bloat

**Check Index Size:**
```sql
SELECT 
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) AS size
FROM pg_indexes
WHERE tablename = 'projects';
```

**Maintenance:**
```sql
-- Rebuild index if needed
REINDEX INDEX CONCURRENTLY idx_projects_team_id;
```

---

## 9. Performance Considerations

### Query Optimization

**Good Query Pattern:**
```sql
-- Uses: idx_projects_team_deleted
SELECT * FROM projects 
WHERE team_id = :teamId 
AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 20;
```

**Bad Query Pattern:**
```sql
-- No index on status column
SELECT * FROM projects 
WHERE team_id = :teamId 
AND status = 'active'  -- No index on status!
AND deleted_at IS NULL;
```

**Solution:** Add composite index if `status` is frequently queried
```sql
CREATE INDEX idx_projects_team_status ON projects(team_id, status) 
WHERE deleted_at IS NULL;
```

---

### Index Selectivity

**High Selectivity (Good for Index):**
- `team_id`: Many values, good distribution
- `created_by_id`: Many values, good distribution

**Low Selectivity (Poor for Index):**
- `status`: Few values (e.g., 'active', 'inactive')
- Use composite indexes instead: `(team_id, status)`

---

## 10. Constraint Best Practices Summary

### Foreign Key Constraints

| Column | Constraint | Rationale |
|--------|------------|-----------|
| `team_id` | NOT NULL, ON DELETE RESTRICT | Multi-tenant isolation, data integrity |
| `created_by_id` | NULLABLE, ON DELETE SET NULL | Audit trail preservation |

### Check Constraints

| Constraint | Purpose |
|------------|---------|
| `projects_name_not_empty` | Data quality, prevent empty names |

### Index Constraints

| Index | Type | Coverage |
|-------|------|----------|
| PRIMARY KEY | B-tree | All records |
| Partial indexes | B-tree | Active records only (`deleted_at IS NULL`) |
| Composite indexes | B-tree | Multi-column queries |

---

## 11. Migration Strategy

### Adding New Indexes

**Safe Migration (CONCURRENTLY):**
```sql
CREATE INDEX CONCURRENTLY idx_projects_team_status 
ON projects(team_id, status) 
WHERE deleted_at IS NULL;
```

**Why CONCURRENTLY:**
- ✅ Doesn't lock table
- ✅ Safe for production
- ✅ Can't use in transaction

**Adding Constraints:**
```sql
-- Check existing data first
SELECT COUNT(*) FROM projects 
WHERE LENGTH(TRIM(name)) = 0;

-- Add constraint
ALTER TABLE projects 
ADD CONSTRAINT projects_name_not_empty 
CHECK (LENGTH(TRIM(name)) > 0);
```

---

## 12. TypeORM Best Practices

### Entity Decorators

**Recommended Pattern:**
```typescript
@Entity('projects')
@Index(['teamId'], { where: '"deleted_at" IS NULL' })
@Index(['createdById'], { where: '"deleted_at" IS NULL' })
@Index(['teamId', 'deletedAt'], { where: '"deleted_at" IS NULL' })
export class Project {
  // Entity definition
}
```

**Benefits:**
- Indexes defined alongside entity
- Type-safe column references
- Synchronized with schema

**Note:**
- TypeORM `synchronize: true` creates indexes automatically
- Production: Use migrations, set `synchronize: false`

---

## Summary Checklist

### Indexes ✅
- [x] Primary key (UUID)
- [x] Foreign key indexes (`team_id`, `created_by_id`)
- [x] Partial indexes (exclude soft-deleted)
- [x] Composite indexes for common queries
- [x] Cleanup index for deleted records

### Constraints ✅
- [x] Foreign key constraints with appropriate ON DELETE
- [x] Check constraints for data validation
- [x] NOT NULL where required
- [x] NULLABLE where appropriate (audit fields)

### Best Practices ✅
- [x] Multi-tenant isolation via `team_id`
- [x] Soft delete with partial indexes
- [x] Audit fields (created_by, timestamps)
- [x] Database-level validation
- [x] Performance-optimized indexes

---

## Quick Reference

**Essential Indexes:**
```sql
-- Team-scoped queries (MOST IMPORTANT)
CREATE INDEX idx_projects_team_id ON projects(team_id) 
WHERE deleted_at IS NULL;

-- Creator queries
CREATE INDEX idx_projects_created_by_id ON projects(created_by_id) 
WHERE deleted_at IS NULL;

-- Composite for common pattern
CREATE INDEX idx_projects_team_deleted ON projects(team_id, deleted_at) 
WHERE deleted_at IS NULL;
```

**Essential Constraints:**
```sql
-- Multi-tenant isolation
team_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT

-- Audit trail
created_by_id UUID REFERENCES users(id) ON DELETE SET NULL

-- Data quality
CONSTRAINT projects_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
```

This design ensures data integrity, performance, and multi-tenant isolation while following PostgreSQL and TypeORM best practices.

