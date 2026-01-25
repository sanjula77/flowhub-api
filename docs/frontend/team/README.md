# Team Dashboard

Next.js Team Dashboard with role-based access control and secure API integration.

## Features

- **Team Information Display:** Team name, slug, description, member count, role badges
- **Member Management:** List all team members, view member roles, remove members (admin only)
- **Invitation System:** Invite new members (admin only), role selection, custom invitation message
- **Role-Based Access:** Admin-only features hidden from regular users, team admin permissions
- **Modern UI/UX:** Gradient design, responsive layout, smooth animations

---

## Component Structure

```
app/team/
├── page.tsx                    # Main dashboard page

components/team/
├── TeamHeader.tsx              # Team header with invite button
├── TeamMembers.tsx             # Members list component
└── InviteUserModal.tsx         # Invite modal form

lib/
├── api.ts                      # API integration utilities
└── auth.ts                     # Auth utilities
```

---

## API Integration

### Secure Cookie-Based Authentication

All API calls use `fetchWithAuth` which:
- Sends HTTP-only cookies automatically (`credentials: 'include'`)
- Handles token refresh on 401 errors
- Redirects to login if refresh fails

**Example:**
```typescript
import { getMyTeam } from '@/lib/api';
const team = await getMyTeam();
```

### API Functions (`lib/api.ts`)

- `getMyTeam()` - Get current user's team
- `getMyProfile()` - Get current user profile
- `getTeamMembers(teamId)` - Get team members (admin only)
- `inviteUser(data)` - Send invitation (admin only)
- `removeUser(userId)` - Remove user (admin only)

---

## Role-Based Rendering

### Admin Check

```typescript
const isAdmin = 
  currentUser?.role === 'ADMIN' || 
  currentUser?.id === team?.adminUserId;
```

### Conditional Rendering

```typescript
{isAdmin && <InviteButton />}
{isAdmin && !isCurrentUser && <RemoveButton />}
```

### Features by Role

**USER Role:**
- View team information
- View own role
- Cannot see member list
- Cannot invite members
- Cannot remove members

**Team Admin:**
- All USER features
- View member list
- Invite members to their team
- Remove members from their team

**System ADMIN:**
- All features
- Full access to all teams

---

## Usage

### Accessing the Dashboard

Navigate to: `/team`

**Requirements:**
- User must be authenticated
- User must belong to a team

**Redirects:**
- Not authenticated → `/login`
- No team assigned → Error message

---

## API Endpoints Used

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/users/me` | GET | Get current user | Yes |
| `/teams/me` | GET | Get user's team | Yes |
| `/users/team/:teamId` | GET | Get team members | Yes (Admin) |
| `/invitations` | POST | Create invitation | Yes (Admin) |
| `/users/:id` | DELETE | Remove user | Yes (Admin) |

---

## Security

### Frontend (UI)
- Hides unauthorized features
- Prevents accidental actions
- Better UX

### Backend (API)
- **CRITICAL:** Validates all permissions
- Returns 403 if unauthorized
- Enforces business rules

### Defense in Depth
1. Frontend hides features
2. Backend validates permissions
3. Database enforces constraints

---

## Design Highlights

- **Color Scheme:** Blue to Purple gradient
- **Components:** Rounded corners, subtle shadows, gradient accents
- **Responsive:** Mobile-first, flexible layouts, touch-friendly

---

## Error Handling

- **Loading States:** Full-page spinner, button loading states
- **Error States:** User-friendly error messages, retry mechanisms
- **Edge Cases:** No team assigned, no members, API failures

---

## Best Practices

1. **Component Separation:** Single responsibility, reusable components
2. **Type Safety:** TypeScript interfaces, typed props, typed API responses
3. **Error Handling:** Try-catch blocks, user-friendly messages
4. **Performance:** Efficient re-renders, conditional loading

---

## Summary

**Components:** Modular and reusable  
**API Integration:** Secure cookie-based auth  
**Role-Based Rendering:** Proper access control  
**UI/UX Design:** Modern and professional

The Team Dashboard is production-ready with proper security, role-based access, and excellent user experience.
