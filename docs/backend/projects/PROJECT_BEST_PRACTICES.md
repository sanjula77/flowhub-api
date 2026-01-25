# Project Domain Best Practices

Indexing and constraints for the Project domain model.

## Primary Key Design

### UUID Primary Keys

**Best Practice:** Use UUIDs instead of sequential integers

```typescript
@PrimaryGeneratedColumn('uuid')
id: string;
```

**Why:**
- Prevents ID enumeration attacks (security)
- Better for distributed systems (no sequence conflicts)
- Safe for merging data from multiple sources
- No information leakage about data volume

**Index:** Automatically indexed (PRIMARY KEY constraint)

---

## Foreign Key Constraints

### Team Relationship (team_id)

**Constraint:**
```sql
team_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT
```

**Best Practices:**
1. **NOT NULL:** Every project must belong to a team (multi-tenant isolation)
2. **ON DELETE RESTRICT:** Prevents deleting a team with active projects

**Indexing:**
```sql
CREATE INDEX idx_projects_team_id ON projects(team_id) 
WHERE deleted_at IS NULL;
```

### Creator Relationship (created_by_id)

**Constraint:**
```sql
created_by_id UUID REFERENCES users(id) ON DELETE SET NULL
```

**Best Practices:**
1. **Nullable:** Project can exist even if creator is deleted
2. **ON DELETE SET NULL:** If creator is deleted, set to NULL

**Indexing:**
```sql
CREATE INDEX idx_projects_created_by_id ON projects(created_by_id) 
WHERE deleted_at IS NULL;
```

---

## Index Strategy

### Partial Indexes (WHERE deleted_at IS NULL)

**Best Practice:** Only index active (non-deleted) records

**Why:**
- Smaller index size (excludes deleted records)
- Faster queries (fewer rows to scan)
- Better cache utilization
- Matches common query pattern

**Example:**
```sql
CREATE INDEX idx_projects_team_id ON projects(team_id) 
WHERE deleted_at IS NULL;
```

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

---

## Check Constraints

### Name Validation

**Constraint:**
```sql
CONSTRAINT projects_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
```

**Best Practices:**
- Database-level validation enforces data quality
- Prevents empty/whitespace-only names
- Works even if application logic fails

**TypeORM:**
```typescript
@Column({ type: 'varchar', length: 255 })
@IsNotEmpty()
@IsString()
@Length(1, 255)
name: string;
```

---

## Soft Delete Indexing

### Soft Delete Pattern

**Column:**
```sql
deleted_at TIMESTAMP WITH TIME ZONE NULL
```

**Best Practices:**
1. **Partial Indexes:** Exclude deleted records from main indexes
2. **Separate Cleanup Index:** Optimizes cleanup queries
3. **Query Pattern:** Always filter `WHERE deleted_at IS NULL`

---

## Audit Fields

### Timestamp Fields

**Best Practices:**
1. **Use TIMESTAMPTZ:** Stores timezone-aware timestamps
2. **Automatic Updates:** Use database triggers for `updated_at`
3. **Default Values:** `DEFAULT CURRENT_TIMESTAMP`

**TypeORM:**
```typescript
@CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
createdAt: Date;

@UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
updatedAt: Date;
```

---

## Multi-Tenancy Isolation

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

---

## Index Maintenance

### Monitoring Index Usage

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
- Low `idx_scan`: Index might be unused
- High `idx_tup_read` / low `idx_scan`: Index might be inefficient
- Missing index: Slow queries

---

## Essential Indexes

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

---

## Essential Constraints

```sql
-- Multi-tenant isolation
team_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT

-- Audit trail
created_by_id UUID REFERENCES users(id) ON DELETE SET NULL

-- Data quality
CONSTRAINT projects_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
```

---

## Summary

**Indexes:**
- Primary key (UUID)
- Foreign key indexes (team_id, created_by_id)
- Partial indexes (exclude soft-deleted)
- Composite indexes for common queries

**Constraints:**
- Foreign key constraints with appropriate ON DELETE
- Check constraints for data validation
- NOT NULL where required

**Best Practices:**
- Multi-tenant isolation via team_id
- Soft delete with partial indexes
- Audit fields (created_by, timestamps)
- Database-level validation
