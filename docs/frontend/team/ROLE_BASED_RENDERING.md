# Role-Based Rendering Logic

## Overview

The Team Dashboard implements role-based rendering to show/hide features based on user permissions.

## Roles

### USER Role
- Regular team member
- Can view team information
- Can view team members
- Cannot invite members
- Cannot remove members

### ADMIN Role
- System administrator
- Full access to all features
- Can invite members to any team
- Can remove any member

### Team Admin
- User who is the `adminUserId` of a team
- Can invite members to their team
- Can remove members from their team
- Same permissions as ADMIN for their team

## Rendering Logic

### 1. Admin Check

```typescript
const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.id === team?.adminUserId;
```

**Logic:**
- User is ADMIN role OR
- User is the team's adminUserId

**Used for:**
- Showing invite button
- Showing remove member buttons
- Loading team members list

---

### 2. Invite Button

```typescript
{isAdmin && (
  <button onClick={onInviteClick}>
    Invite Member
  </button>
)}
```

**Visibility:**
- ✅ ADMIN role: Always visible
- ✅ Team Admin: Visible for their team
- ❌ Regular USER: Hidden

---

### 3. Remove Member Button

```typescript
{isAdmin && !isCurrentUser && (
  <button onClick={handleRemoveMember}>
    Remove
  </button>
)}
```

**Visibility:**
- ✅ ADMIN role: Visible for all members (except self)
- ✅ Team Admin: Visible for team members (except self)
- ❌ Regular USER: Hidden
- ❌ Current user: Hidden (cannot remove self)

---

### 4. Team Members List

```typescript
if (userData.role === 'ADMIN' || userData.id === teamData.adminUserId) {
  await loadTeamMembers(teamData.id);
}
```

**Loading:**
- ✅ ADMIN role: Always loads
- ✅ Team Admin: Loads for their team
- ❌ Regular USER: Not loaded (empty list shown)

---

### 5. Role Badges

```typescript
<span className={isMemberAdmin ? 'bg-purple-100' : 'bg-gray-100'}>
  {member.role}
</span>
```

**Display:**
- Shows user's role (USER or ADMIN)
- Different styling for ADMIN vs USER
- Always visible to all authenticated users

---

## Component Structure

### TeamHeader Component

**Props:**
- `team`: Team data
- `currentUser`: Current user data
- `isAdmin`: Boolean flag
- `onInviteClick`: Callback for invite button

**Rendering:**
- Team name and description (always visible)
- Member count (always visible)
- Role badges (always visible)
- Invite button (admin only)

---

### TeamMembers Component

**Props:**
- `members`: Array of team members
- `currentUserId`: Current user's ID
- `isAdmin`: Boolean flag
- `onRefresh`: Callback to refresh data

**Rendering:**
- Member list (admin sees all, user sees empty)
- Remove button (admin only, not for self)
- "You" badge for current user

---

### InviteUserModal Component

**Props:**
- `teamId`: Team ID to invite to
- `onClose`: Close callback
- `onSuccess`: Success callback

**Rendering:**
- Always accessible when modal is open
- Backend validates permissions
- Shows error if unauthorized

---

## Security Considerations

### Frontend (UI)
- Hides features based on role
- Prevents accidental unauthorized actions
- Better UX (no confusing buttons)

### Backend (API)
- **CRITICAL**: Backend validates all permissions
- Frontend hiding is for UX only
- API returns 403 if unauthorized

### Defense in Depth
1. Frontend hides unauthorized actions
2. Backend validates permissions
3. Database enforces constraints

---

## Example Flow

### Regular User
1. Logs in → `role: 'USER'`
2. Views team dashboard
3. Sees team name, description
4. Does NOT see invite button
5. Does NOT see member list
6. Cannot invite members (button hidden)
7. API would reject if called directly

### Team Admin
1. Logs in → `role: 'USER'`, but `id === team.adminUserId`
2. Views team dashboard
3. Sees team name, description
4. Sees invite button (isAdmin = true)
5. Sees member list
6. Can invite members
7. Can remove members (except self)
8. API validates team admin status

### System Admin
1. Logs in → `role: 'ADMIN'`
2. Views team dashboard
3. Sees all features
4. Can invite to any team
5. Can remove any member
6. Full access

---

## Implementation Notes

### Checking Team Admin Status

```typescript
// In TeamDashboard component
const isAdmin = 
  currentUser?.role === 'ADMIN' || 
  currentUser?.id === team?.adminUserId;
```

**Why both checks:**
- System ADMIN has access to everything
- Team admin has access to their team only
- Both need invite/remove capabilities

### Conditional Rendering

```typescript
{isAdmin && <InviteButton />}
{isAdmin && !isCurrentUser && <RemoveButton />}
```

**Pattern:**
- Use `&&` for conditional rendering
- Check multiple conditions with `&&`
- Keep logic simple and readable

---

## Summary

**Role-Based Rendering:**
- ✅ Hides unauthorized features
- ✅ Shows appropriate UI for each role
- ✅ Prevents confusion
- ✅ Better UX

**Security:**
- ✅ Backend validates all permissions
- ✅ Frontend is UX layer only
- ✅ Defense in depth

**Implementation:**
- ✅ Simple boolean checks
- ✅ Conditional rendering
- ✅ Clear component structure

