# Team Service - Business Rules & Error Handling

## Business Rules

### 1. createTeam(adminUser, createTeamDto)

**Rule:** Only ADMIN users can create teams

**Authorization Check:**
```typescript
if (adminUser.role !== UserRole.ADMIN) {
  throw new ForbiddenException('Only ADMIN users can create teams');
}
```

**Validations:**
- ✅ User must have ADMIN role
- ✅ User account must be active (not soft-deleted)
- ✅ Team slug must be unique
- ✅ Admin user becomes team owner (unless specified otherwise)

**Error Cases:**
- `403 Forbidden` - User is not ADMIN
- `401 Unauthorized` - User account is inactive
- `409 Conflict` - Team slug already exists

---

### 2. getMyTeam(user)

**Rule:** Users can only see their own team

**Authorization Check:**
- No explicit role check needed - any authenticated user can access
- Service validates user belongs to a team
- Service ensures team exists and is active

**Validations:**
- ✅ User account must be active
- ✅ User must belong to a team
- ✅ Team must exist and be active

**Error Cases:**
- `401 Unauthorized` - User account is inactive
- `404 Not Found` - User does not belong to any team
- `404 Not Found` - Team not found or deleted

**Security:**
- Users cannot access other teams' data
- Only returns user's own team
- Prevents cross-team data leakage

---

### 3. addUserToTeam(admin, userId)

**Rule:** Only team admin or system ADMIN can add users

**Authorization Check:**
```typescript
const isSystemAdmin = admin.role === UserRole.ADMIN;
const isTeamAdmin = await this.isTeamAdmin(admin);

if (!isSystemAdmin && !isTeamAdmin) {
  throw new ForbiddenException('Only team admins or system administrators...');
}
```

**Validations:**
- ✅ Admin must be system ADMIN OR team admin
- ✅ Admin account must be active
- ✅ Target user must exist and be active
- ✅ Cannot add user from different team (cross-team prevention)
- ✅ Cannot add user already in the same team

**Error Cases:**
- `403 Forbidden` - User is not team admin or system admin
- `401 Unauthorized` - Admin account is inactive
- `404 Not Found` - Target user not found
- `400 Bad Request` - Target user is inactive
- `403 Forbidden` - Cannot add user from another team
- `409 Conflict` - User already in team

**Cross-Team Prevention:**
```typescript
if (targetUser.teamId && targetUser.teamId !== adminTeam.id) {
  throw new ForbiddenException(
    'Cannot add user from another team. User must be removed from their current team first.'
  );
}
```

---

## Error Handling Strategy

### HTTP Exception Types Used

#### 1. **ForbiddenException (403)**
**When:** Authorization failure
- User doesn't have required role
- User doesn't have team admin permissions
- Cross-team access attempt

**Examples:**
```typescript
throw new ForbiddenException('Only ADMIN users can create teams');
throw new ForbiddenException('Cannot add user from another team');
```

---

#### 2. **UnauthorizedException (401)**
**When:** Authentication/account status issues
- User account is soft-deleted
- User session invalid

**Examples:**
```typescript
throw new UnauthorizedException('User account is inactive');
```

---

#### 3. **NotFoundException (404)**
**When:** Resource doesn't exist
- User doesn't belong to any team
- Team not found
- User not found

**Examples:**
```typescript
throw new NotFoundException('User does not belong to any team');
throw new NotFoundException('Team not found');
```

---

#### 4. **ConflictException (409)**
**When:** Business rule violation
- Team slug already exists
- User already in team

**Examples:**
```typescript
throw new ConflictException('Team with this slug already exists');
throw new ConflictException('User is already a member of this team');
```

---

#### 5. **BadRequestException (400)**
**When:** Invalid input/data state
- Trying to add inactive user
- Invalid data format

**Examples:**
```typescript
throw new BadRequestException('Cannot add inactive user to team');
```

---

## Security Considerations

### 1. Cross-Team Access Prevention

**Problem:** User from Team A trying to add user from Team B

**Solution:**
```typescript
// Check if target user belongs to different team
if (targetUser.teamId && targetUser.teamId !== adminTeam.id) {
  throw new ForbiddenException('Cannot add user from another team...');
}
```

**Protection:**
- Prevents unauthorized team modifications
- Ensures data isolation between teams
- Maintains team boundaries

---

### 2. Team Admin Verification

**Problem:** User claims to be team admin

**Solution:**
```typescript
private async isTeamAdmin(user: User): Promise<boolean> {
  const team = await this.teamRepository.findById(user.teamId);
  return team.adminUserId === user.id;
}
```

**Protection:**
- Verifies admin status from database
- Not just relying on user role
- Checks actual team ownership

---

### 3. Soft Delete Checks

**Problem:** Inactive users/teams being used

**Solution:**
```typescript
if (adminUser.deletedAt) {
  throw new UnauthorizedException('User account is inactive');
}

if (team.deletedAt) {
  throw new NotFoundException('Team not found');
}
```

**Protection:**
- Prevents operations on deleted entities
- Maintains data integrity
- Clear error messages

---

## Usage Examples

### Example 1: Create Team (ADMIN)

```typescript
// Controller
@Post()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
async create(@Request() req, @Body() dto: CreateTeamDto) {
  const user = await getUserEntity(req.user.id);
  return this.teamsService.createTeam(user, dto);
}

// Success: Returns TeamResponseDto
// Error: 403 Forbidden if not ADMIN
// Error: 409 Conflict if slug exists
```

---

### Example 2: Get My Team (Any User)

```typescript
// Controller
@Get('me')
@UseGuards(JwtAuthGuard)
async getMyTeam(@Request() req) {
  const user = await getUserEntity(req.user.id);
  return this.teamsService.getMyTeam(user);
}

// Success: Returns user's team
// Error: 404 Not Found if no team
// Error: 401 Unauthorized if user inactive
```

---

### Example 3: Add User to Team (Team Admin)

```typescript
// Controller
@Post(':teamId/users/:userId')
@UseGuards(JwtAuthGuard, RolesGuard)
async addUser(@Request() req, @Param('userId') userId: string) {
  const admin = await getUserEntity(req.user.id);
  return this.teamsService.addUserToTeam(admin, userId);
}

// Success: Returns success message + user info
// Error: 403 Forbidden if not team admin
// Error: 403 Forbidden if cross-team attempt
// Error: 409 Conflict if user already in team
```

---

## Error Response Format

All exceptions follow NestJS standard format:

```json
{
  "statusCode": 403,
  "message": "Only ADMIN users can create teams",
  "error": "Forbidden"
}
```

**Benefits:**
- Consistent error format
- HTTP status codes follow REST conventions
- Clear error messages for debugging
- Frontend can handle errors uniformly

---

## Summary

### Business Rules:
- ✅ Only ADMIN can create teams
- ✅ Users can only see their own team
- ✅ Only team admin or system ADMIN can add users
- ✅ Prevent cross-team access

### Error Handling:
- ✅ Proper HTTP status codes
- ✅ Clear error messages
- ✅ Security-focused exceptions
- ✅ Consistent error format

### Security:
- ✅ Authorization checks at service level
- ✅ Cross-team access prevention
- ✅ Soft delete validation
- ✅ Team admin verification

The implementation ensures proper authorization, prevents unauthorized access, and provides clear error messages for all failure scenarios.

