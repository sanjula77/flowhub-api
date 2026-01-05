# Database Schema Explanation

## Overview

This schema implements a multi-tenant SaaS database design with teams, users, and role-based access control.

## Table Structure

### 1. Teams Table

**Purpose:** Represents organizational units (companies, departments, etc.)

**Key Fields:**
- `id` (UUID): Primary key, auto-generated
- `name`: Team display name
- `slug`: URL-friendly identifier (unique, indexed)
- `deleted_at`: Soft delete timestamp

**Design Decisions:**
- UUID primary keys: Better for distributed systems, no sequential ID leaks
- Slug field: Enables friendly URLs (`/teams/engineering`) and prevents name conflicts
- Soft delete: Preserves data integrity, allows recovery

**Constraints:**
- Name cannot be empty (CHECK constraint)
- Slug must match format: lowercase, alphanumeric, hyphens only

---

### 2. Users Table

**Purpose:** User accounts with team membership and roles

**Key Fields:**
- `id` (UUID): Primary key
- `email`: Unique identifier (UNIQUE constraint + index)
- `password`: Bcrypt hashed password
- `team_id`: Foreign key to teams (one-to-many relationship)
- `role`: Enum type (USER/ADMIN) - enforced at DB level
- `deleted_at`: Soft delete timestamp

**Design Decisions:**
- Email uniqueness: Database-level UNIQUE constraint prevents duplicates
- Team relationship: Foreign key with ON DELETE RESTRICT prevents orphaned users
- Role enum: Database-level type safety, prevents invalid values
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

When you need users in multiple teams:

1. Add `user_teams` junction table (already designed, commented out)
2. Change `users.team_id` to nullable (or keep as "primary team")
3. Migrate existing data to `user_teams`
4. Update application code to use junction table

---

## Indexes Explained

### Partial Indexes (WHERE deleted_at IS NULL)

**Why:** Only index active records, smaller index size, faster queries

**Examples:**
- `idx_users_email`: Fast email lookup for active users only
- `idx_users_team_id`: Fast team member queries (excludes deleted)

### Composite Indexes

**Why:** Optimize common query patterns

**Example:**
- `idx_users_team_role`: Optimizes queries like "get all ADMIN users in team X"

---

## Constraints & Safety

### 1. Email Uniqueness

**Database Level:**
```sql
email VARCHAR(255) NOT NULL UNIQUE
```

**Application Level:**
- TypeORM unique constraint
- Service-level validation before insert

**Protection:**
- Prevents duplicate emails even with race conditions
- Database rejects duplicate before application sees it

---

### 2. Role Enforcement

**Database Level:**
```sql
role user_role NOT NULL DEFAULT 'USER'
-- user_role is ENUM('USER', 'ADMIN')
```

**Application Level:**
- TypeScript enum type
- RolesGuard validation

**Protection:**
- Database rejects invalid role values (e.g., 'SUPER_ADMIN' not in enum)
- Application can't accidentally insert invalid role

---

### 3. Safe Delete Behavior

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

**Protection:**
- No accidental data loss
- Can recover deleted records
- Maintains referential integrity

---

## Edge Cases Handled

### 1. Duplicate Emails

**Scenario:** Two requests try to create same email simultaneously

**Protection:**
- Database UNIQUE constraint catches it
- Application gets constraint violation error
- Can retry or show user-friendly message

---

### 2. Invalid Role Values

**Scenario:** Application bug tries to insert 'SUPER_USER'

**Protection:**
- Database ENUM rejects it
- Query fails before data corruption
- Application must use valid enum value

---

### 3. Deleting Team with Users

**Scenario:** Admin tries to delete team that has active users

**Protection:**
- `ON DELETE RESTRICT` prevents deletion
- Database throws foreign key constraint error
- Application must delete/migrate users first

---

### 4. Email Format Validation

**Scenario:** User tries to register with invalid email 'notanemail'

**Protection:**
- Database CHECK constraint validates format
- Regex pattern ensures basic email structure
- Application can add more sophisticated validation

---

### 5. Empty Values

**Scenario:** Application tries to insert empty email or password

**Protection:**
- CHECK constraints prevent empty strings
- NOT NULL constraints prevent NULL values
- Database enforces data quality

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

1. **Create junction table:**
   ```sql
   CREATE TABLE user_teams (...);
   ```

2. **Migrate existing data:**
   ```sql
   INSERT INTO user_teams (user_id, team_id, role)
   SELECT id, team_id, role FROM users WHERE deleted_at IS NULL;
   ```

3. **Make team_id nullable (or keep as primary team):**
   ```sql
   ALTER TABLE users ALTER COLUMN team_id DROP NOT NULL;
   ```

4. **Update application code:**
   - Change queries to use `user_teams` table
   - Update TypeORM entities
   - Update service methods

**Benefits:**
- Users can belong to multiple teams
- Different roles per team
- Maintains historical data (joined_at)

---

## Query Examples

### Get all users in a team:
```sql
SELECT * FROM active_users WHERE team_slug = 'engineering';
```

### Get all admins in a team:
```sql
SELECT * FROM active_users 
WHERE team_slug = 'engineering' AND role = 'ADMIN';
```

### Count users per team:
```sql
SELECT t.name, COUNT(u.id) as user_count
FROM teams t
LEFT JOIN users u ON u.team_id = t.id AND u.deleted_at IS NULL
WHERE t.deleted_at IS NULL
GROUP BY t.id, t.name;
```

### Soft delete a user:
```sql
UPDATE users 
SET deleted_at = CURRENT_TIMESTAMP 
WHERE id = 'user-uuid';
```

### Check if email exists:
```sql
SELECT EXISTS(
    SELECT 1 FROM users 
    WHERE email = 'test@example.com' 
    AND deleted_at IS NULL
);
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
- ✅ Multi-tenant support (teams)
- ✅ User management with roles
- ✅ Database-level constraints for safety
- ✅ Soft delete for data preservation
- ✅ Scalable to many-to-many relationships
- ✅ Performance optimized with indexes
- ✅ Edge case protection

The design balances flexibility, safety, and performance while maintaining clear migration paths for future requirements.

