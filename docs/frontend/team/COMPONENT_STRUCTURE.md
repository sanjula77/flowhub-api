# Team Dashboard - Component Structure

Modular component structure following React best practices.

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

---

## API Integration Pattern

### Secure Cookie-Based Auth

```typescript
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

1. **Component Separation:** Each component has single responsibility
2. **Type Safety:** TypeScript interfaces for all data
3. **Error Handling:** Try-catch blocks, user-friendly messages
4. **Loading States:** Loading spinners, disabled buttons during actions
5. **Accessibility:** Semantic HTML, ARIA labels, keyboard navigation

---

## Summary

**Component Structure:**
- Modular and reusable
- Clear separation of concerns
- Well-organized file structure

**API Integration:**
- Secure cookie-based auth
- Proper error handling
- Type-safe API calls

**User Experience:**
- Loading states
- Error messages
- Smooth interactions
- Responsive design
