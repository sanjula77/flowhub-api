# Team Domain - Relationships

Entity relationships and safety considerations.

## Entity Relationships

### 1. Team → Users (One-to-Many)

```
Team (1) ──────< (Many) Users
```

**Implementation:**
- `Team.users` - OneToMany relationship
- `User.team` - ManyToOne relationship
- `User.teamId` - Foreign key (NOT NULL)

**Database Constraint:**
```typescript
@ManyToOne(() => Team, (team) => team.users, { 
  nullable: false, 
  onDelete: 'RESTRICT' 
})
```

**Safety:**
- `nullable: false` - Every user MUST belong to a team
- `onDelete: 'RESTRICT'` - **Prevents deleting a team if it has users**

**Why RESTRICT?**
- Prevents orphaned users (users without a team)
- Forces explicit user removal/reassignment before team deletion
- Maintains data integrity

---

### 2. Team → Admin User (Many-to-One, Optional)

```
Team (Many) ──────> (1) User (admin)
```

**Implementation:**
- `Team.adminUser` - ManyToOne relationship (optional)
- `Team.adminUserId` - Foreign key (nullable)
- `onDelete: 'SET NULL'` - If admin user is deleted, team admin is cleared

**Safety:**
- `nullable: true` - Team can exist without an admin
- `onDelete: 'SET NULL'` - **If admin user is deleted, team.adminUserId becomes NULL**
- Team continues to exist, just loses admin assignment

**Why SET NULL?**
- Team shouldn't be deleted if admin user is deleted
- Team can continue operating without admin
- Admin can be reassigned later

---

## Delete Rules Explained

### Scenario 1: Delete Team with Users

**Attempt:**
```typescript
await teamsService.softDelete(teamId);
```

**What Happens:**

1. **Service Layer Check:**
   ```typescript
   const hasActiveUsers = await this.teamRepository.hasActiveUsers(id);
   if (hasActiveUsers) {
     throw new ConflictException('Cannot delete team: X active users...');
   }
   ```

2. **Database Level Protection:**
   - Even if service check is bypassed, database `RESTRICT` constraint prevents deletion
   - Foreign key constraint enforces: "Cannot delete team if users reference it"

**Result:** Deletion prevented with error message

**Solution:**
1. Remove users from team (soft delete users or reassign to another team)
2. Then delete team

---

### Scenario 2: Delete Admin User

**Attempt:**
```typescript
await usersService.softDelete(adminUserId);
```

**What Happens:**

1. **User is soft deleted** (`deletedAt` set)
2. **Team.adminUserId** → Automatically set to `NULL` (via `SET NULL`)
3. **Team continues to exist** - just loses admin assignment

**Result:**
- User deleted
- Team preserved
- Team has no admin (can be reassigned)

---

### Scenario 3: Delete User (Non-Admin)

**Attempt:**
```typescript
await usersService.softDelete(userId);
```

**What Happens:**

1. **User is soft deleted** (`deletedAt` set)
2. **Team remains unchanged**
3. **Relationship preserved** (user still references team, just soft-deleted)

**Result:**
- User deleted
- Team preserved
- Relationship preserved (for audit/history)

---

## Safety Mechanisms

### 1. Database-Level Constraints

**Foreign Key RESTRICT:**
```sql
-- User.team_id references Team.id
-- ON DELETE RESTRICT prevents team deletion if users exist
```

**Protection:**
- Even if application code has bugs, database enforces safety
- Cannot accidentally delete team with users

### 2. Application-Level Checks

**Service Layer Validation:**
```typescript
const hasActiveUsers = await this.teamRepository.hasActiveUsers(id);
if (hasActiveUsers) {
  throw new ConflictException('Cannot delete team...');
}
```

**Benefits:**
- User-friendly error messages
- Prevents unnecessary database operations
- Can provide specific user count

### 3. Soft Delete Pattern

**Both Teams and Users:**
- Use `deletedAt` timestamp instead of hard delete
- Preserves data for audit/recovery
- Maintains referential integrity

**Queries:**
- Always filter `WHERE deletedAt IS NULL`
- Partial indexes only index active records
- Efficient queries

---

## Future Extensibility

### 1. Many-to-Many Users ↔ Teams

**Current:** One user, one team

**Future:** One user, many teams

**Migration Path:**
```sql
-- Create junction table
CREATE TABLE user_teams (
    user_id UUID → users.id,
    team_id UUID → teams.id,
    role user_role,
    joined_at timestamp
);

-- Migrate existing data
INSERT INTO user_teams (user_id, team_id, role)
SELECT id, team_id, role FROM users;

-- Make users.team_id nullable (or keep as "primary team")
ALTER TABLE users ALTER COLUMN team_id DROP NOT NULL;
```

**Benefits:**
- Users can belong to multiple teams
- Different roles per team
- Historical tracking (joined_at)

---

## Best Practices

1. **Always Check Before Delete:**
   ```typescript
   if (await this.teamRepository.hasActiveUsers(id)) {
     throw new ConflictException('Cannot delete...');
   }
   ```

2. **Use Soft Delete:**
   ```typescript
   team.deletedAt = new Date();  // Good - preserves data
   await repository.remove(team); // Bad - loses data forever
   ```

3. **Filter Deleted Records:**
   ```typescript
   WHERE deletedAt IS NULL  // Good - only active records
   WHERE id = :id           // Bad - includes deleted records
   ```

4. **Provide Clear Error Messages:**
   ```typescript
   throw new ConflictException(
     `Cannot delete team: ${userCount} active user(s) still belong to this team. 
      Please remove or reassign users first.`
   );
   ```

---

## Summary

### Relationships:
- **Team → Users:** One-to-Many, RESTRICT on delete
- **Team → Admin:** Many-to-One, SET NULL on delete

### Safety:
- **Database constraints:** RESTRICT prevents orphaned users
- **Application checks:** User-friendly error messages
- **Soft delete:** Preserves data integrity

### Extensibility:
- **Many-to-many ready:** Clear migration path
- **Hierarchy ready:** Can add parent teams
- **Roles ready:** Can add team-level roles
