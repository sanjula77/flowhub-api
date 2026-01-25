# Database Schema

Multi-tenant SaaS database design with teams, users, and role-based access control.

## Table Structure

### Teams Table

**Purpose:** Organizational units (companies, departments)

**Key Fields:**
- `id` (UUID): Primary key
- `name`: Team display name
- `slug`: URL-friendly identifier (unique, indexed)
- `deleted_at`: Soft delete timestamp

**Design Decisions:**
- UUID primary keys for distributed systems
- Slug field for friendly URLs and name conflict prevention
- Soft delete for data preservation

**Constraints:**
- Name cannot be empty (CHECK constraint)
- Slug must match format: lowercase, alphanumeric, hyphens only

---

### Users Table

**Purpose:** User accounts with team membership and roles

**Key Fields:**
- `id` (UUID): Primary key
- `email`: Unique identifier (UNIQUE constraint + index)
- `password`: Bcrypt hashed password
- `team_id`: Foreign key to teams (one-to-many relationship)
- `role`: Enum type (USER/ADMIN) - enforced at DB level
- `deleted_at`: Soft delete timestamp

**Design Decisions:**
- Email uniqueness: Database-level UNIQUE constraint
- Team relationship: Foreign key with ON DELETE RESTRICT
- Role enum: Database-level type safety
- Soft delete: Maintains referential integrity

**Constraints:**
- Email format validation (regex CHECK constraint)
- Password cannot be empty
- Cannot be deleted if team is deleted (CHECK constraint)

---

## Relationships

### Current: One-to-Many (User → Team)

```
Team (1) ──────< (Many) Users
```

- Each user belongs to exactly ONE team
- Each team can have MANY users
- Enforced by: `team_id` foreign key with NOT NULL

**Migration Path to Many-to-Many:**

1. Add `user_teams` junction table
2. Change `users.team_id` to nullable (or keep as "primary team")
3. Migrate existing data to `user_teams`
4. Update application code to use junction table

---

## Indexes

### Partial Indexes (WHERE deleted_at IS NULL)

Only index active records for smaller index size and faster queries.

**Examples:**
- `idx_users_email`: Fast email lookup for active users only
- `idx_users_team_id`: Fast team member queries (excludes deleted)

### Composite Indexes

Optimize common query patterns:

- `idx_users_team_role`: Optimizes queries like "get all ADMIN users in team X"

---

## Constraints & Safety

### Email Uniqueness

**Database Level:**
```sql
email VARCHAR(255) NOT NULL UNIQUE
```

**Application Level:**
- TypeORM unique constraint
- Service-level validation before insert

**Protection:** Prevents duplicate emails even with race conditions

### Role Enforcement

**Database Level:**
```sql
role user_role NOT NULL DEFAULT 'USER'
-- user_role is ENUM('USER', 'ADMIN')
```

**Application Level:**
- TypeScript enum type
- RolesGuard validation

**Protection:** Database rejects invalid role values

### Safe Delete Behavior

**ON DELETE RESTRICT:**
```sql
team_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT
```

**What it does:**
- Prevents deleting a team if it has users
- Forces explicit user deletion/migration first

**Soft Delete:**
- `deleted_at` timestamp instead of hard delete
- Data preserved for audit/recovery
- Queries filter out deleted records

---

## Edge Cases Handled

1. **Duplicate Emails:** Database UNIQUE constraint catches simultaneous requests
2. **Invalid Role Values:** Database ENUM rejects invalid values
3. **Deleting Team with Users:** `ON DELETE RESTRICT` prevents deletion
4. **Email Format Validation:** Database CHECK constraint validates format
5. **Empty Values:** CHECK constraints prevent empty strings

---

## Scaling to Many-to-Many

### Current Schema (One-to-Many)
```sql
users.team_id → teams.id (one team per user)
```

### Future Schema (Many-to-Many)
```sql
users (no team_id)
user_teams (junction table)
  - user_id → users.id
  - team_id → teams.id
  - role (role within this team)
```

**Migration Steps:**
1. Create junction table
2. Migrate existing data
3. Make team_id nullable (or keep as primary team)
4. Update application code

---

## Query Examples

```sql
-- Get all users in a team
SELECT * FROM active_users WHERE team_slug = 'engineering';

-- Get all admins in a team
SELECT * FROM active_users 
WHERE team_slug = 'engineering' AND role = 'ADMIN';

-- Count users per team
SELECT t.name, COUNT(u.id) as user_count
FROM teams t
LEFT JOIN users u ON u.team_id = t.id AND u.deleted_at IS NULL
WHERE t.deleted_at IS NULL
GROUP BY t.id, t.name;

-- Soft delete a user
UPDATE users 
SET deleted_at = CURRENT_TIMESTAMP 
WHERE id = 'user-uuid';
```

---

## Performance Considerations

1. **Partial Indexes:** Only index active records (smaller, faster)
2. **Composite Indexes:** Optimize common query patterns
3. **UUID vs Serial:** UUIDs prevent ID enumeration attacks
4. **Soft Delete:** Queries filter deleted records efficiently

---

## Security Features

1. **Password Storage:** Bcrypt hashed (application level)
2. **Email Uniqueness:** Database-enforced
3. **Role Validation:** Enum type prevents invalid values
4. **Referential Integrity:** Foreign keys prevent orphaned records
5. **Soft Delete:** Preserves audit trail

---

## Summary

This schema provides:
- Multi-tenant support (teams)
- User management with roles
- Database-level constraints for safety
- Soft delete for data preservation
- Scalable to many-to-many relationships
- Performance optimized with indexes
- Edge case protection
