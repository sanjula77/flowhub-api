# Team Dashboard - Component Structure

## Overview

The Team Dashboard is built with a modular component structure following React best practices.

## Component Hierarchy

```
TeamDashboard (page.tsx)
├── Navigation (inline)
├── TeamHeader
│   ├── Team Avatar
│   ├── Team Info
│   ├── Member Count
│   └── Invite Button (admin only)
├── TeamMembers
│   ├── Member List
│   ├── Member Cards
│   └── Remove Buttons (admin only)
└── InviteUserModal (conditional)
    ├── Email Input
    ├── Role Select
    ├── Message Textarea
    └── Submit Button
```

---

## Components

### 1. TeamDashboard (`app/team/page.tsx`)

**Purpose:** Main page component, orchestrates data loading and state management

**Responsibilities:**
- Load team data
- Load user profile
- Load team members (if admin)
- Manage modal state
- Handle errors
- Handle refresh

**State:**
- `team`: Team data
- `members`: Team members array
- `currentUser`: Current user data
- `loading`: Loading state
- `error`: Error message
- `showInviteModal`: Modal visibility
- `refreshing`: Refresh state

**API Calls:**
- `GET /users/me` - Get current user
- `GET /teams/me` - Get user's team
- `GET /users/team/:teamId` - Get team members (admin only)

---

### 2. TeamHeader (`components/team/TeamHeader.tsx`)

**Purpose:** Display team information and invite button

**Props:**
- `team`: Team object
- `currentUser`: Current user object
- `isAdmin`: Boolean flag
- `onInviteClick`: Callback function

**Features:**
- Team name and slug
- Team description
- Member count
- Role badges
- Invite button (admin only)

**Rendering Logic:**
```typescript
{isAdmin && <InviteButton />}
```

---

### 3. TeamMembers (`components/team/TeamMembers.tsx`)

**Purpose:** Display list of team members

**Props:**
- `members`: Array of user objects
- `currentUserId`: Current user's ID
- `isAdmin`: Boolean flag
- `onRefresh`: Refresh callback

**Features:**
- Member avatars
- Member names and emails
- Role badges
- "You" indicator
- Remove buttons (admin only, not for self)

**Rendering Logic:**
```typescript
{isAdmin && !isCurrentUser && <RemoveButton />}
```

**Empty State:**
- Shows message when no members
- Only admins see members (regular users see empty)

---

### 4. InviteUserModal (`components/team/InviteUserModal.tsx`)

**Purpose:** Modal form for inviting team members

**Props:**
- `teamId`: Team ID to invite to
- `onClose`: Close callback
- `onSuccess`: Success callback

**Features:**
- Email input (required)
- Role select (USER/ADMIN)
- Custom message (optional)
- Form validation
- Error handling
- Loading state

**API Call:**
- `POST /invitations` - Create invitation

---

### 5. LoadingSpinner (`components/ui/LoadingSpinner.tsx`)

**Purpose:** Reusable loading indicator

**Features:**
- Animated spinner
- Centered layout
- Full screen overlay

---

### 6. ErrorMessage (`components/ui/ErrorMessage.tsx`)

**Purpose:** Reusable error display

**Props:**
- `message`: Error message
- `onRetry`: Optional retry callback

**Features:**
- Error icon
- Error message
- Retry button (optional)

---

## File Structure

```
frontend/
├── app/
│   └── team/
│       ├── page.tsx                    # Main dashboard page
│       └── COMPONENT_STRUCTURE.md       # This file
├── components/
│   ├── team/
│   │   ├── TeamHeader.tsx              # Team header component
│   │   ├── TeamMembers.tsx             # Members list component
│   │   ├── InviteUserModal.tsx         # Invite modal component
│   │   └── ROLE_BASED_RENDERING.md     # Role logic documentation
│   └── ui/
│       ├── LoadingSpinner.tsx           # Loading component
│       └── ErrorMessage.tsx            # Error component
├── lib/
│   ├── auth.ts                         # Auth utilities
│   └── api.ts                          # API integration
└── types/
    ├── team.ts                         # Team type definitions
    └── user.ts                          # User type definitions
```

---

## Data Flow

### Initial Load

```
1. TeamDashboard mounts
   ↓
2. Load user profile (GET /users/me)
   ↓
3. Load team data (GET /teams/me)
   ↓
4. If admin: Load team members (GET /users/team/:id)
   ↓
5. Render components with data
```

### Invite Flow

```
1. User clicks "Invite Member"
   ↓
2. Open InviteUserModal
   ↓
3. User fills form and submits
   ↓
4. POST /invitations
   ↓
5. On success: Close modal, refresh members
   ↓
6. On error: Show error message
```

### Remove Member Flow

```
1. Admin clicks "Remove" on member
   ↓
2. Confirm dialog
   ↓
3. DELETE /users/:id
   ↓
4. On success: Refresh members list
   ↓
5. On error: Show error message
```

---

## API Integration Pattern

### Secure Cookie-Based Auth

```typescript
// All API calls use fetchWithAuth
const res = await fetchWithAuth(`${API_URL}/teams/me`, {
  credentials: 'include', // Sends cookies
});
```

**Benefits:**
- HTTP-only cookies (secure)
- Automatic token refresh
- No token in JavaScript
- CSRF protection ready

### Error Handling

```typescript
try {
  const res = await fetchWithAuth(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message);
  }
  return res.json();
} catch (err) {
  // Handle error
}
```

**Pattern:**
- Try-catch for network errors
- Check response.ok
- Extract error message
- Show user-friendly message

---

## Styling

### Design System

**Colors:**
- Primary: Blue gradient (blue-600 to purple-600)
- Success: Green
- Error: Red
- Neutral: Gray scale

**Components:**
- Rounded corners (rounded-lg, rounded-xl)
- Shadows (shadow-sm, shadow-md)
- Borders (border-gray-200)
- Gradients (bg-gradient-to-r)

**Spacing:**
- Consistent padding (p-4, p-6, p-8)
- Gap spacing (gap-2, gap-4)
- Margin (mb-4, mt-8)

---

## Best Practices

### 1. Component Separation

- Each component has single responsibility
- Props are well-defined
- Components are reusable

### 2. Type Safety

- TypeScript interfaces for all data
- Props are typed
- API responses are typed

### 3. Error Handling

- Try-catch blocks
- User-friendly error messages
- Retry mechanisms

### 4. Loading States

- Loading spinners
- Disabled buttons during actions
- Skeleton screens (optional)

### 5. Accessibility

- Semantic HTML
- ARIA labels (can be added)
- Keyboard navigation
- Screen reader friendly

---

## Summary

**Component Structure:**
- ✅ Modular and reusable
- ✅ Clear separation of concerns
- ✅ Well-organized file structure

**API Integration:**
- ✅ Secure cookie-based auth
- ✅ Proper error handling
- ✅ Type-safe API calls

**User Experience:**
- ✅ Loading states
- ✅ Error messages
- ✅ Smooth interactions
- ✅ Responsive design

The component structure follows React and Next.js best practices for maintainability and scalability.

