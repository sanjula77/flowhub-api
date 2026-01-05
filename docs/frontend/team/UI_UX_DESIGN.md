# Team Dashboard - UI/UX Design

## Design Principles

### 1. Modern & Clean
- Gradient accents (blue to purple)
- White cards with subtle shadows
- Generous spacing
- Rounded corners

### 2. Responsive
- Mobile-first approach
- Flexible layouts
- Touch-friendly buttons
- Readable text sizes

### 3. Accessible
- High contrast ratios
- Clear visual hierarchy
- Intuitive navigation
- Error states

### 4. Professional
- Consistent color scheme
- Professional typography
- Smooth animations
- Polished interactions

---

## Color Palette

### Primary Colors
- **Blue**: `#2563eb` (blue-600)
- **Purple**: `#9333ea` (purple-600)
- **Gradient**: `from-blue-600 to-purple-600`

### Status Colors
- **Success**: `#10b981` (green-500)
- **Error**: `#ef4444` (red-500)
- **Warning**: `#f59e0b` (amber-500)

### Neutral Colors
- **Gray Scale**: `gray-50` to `gray-900`
- **Background**: `gray-50` to `gray-100` (gradient)
- **Cards**: `white`
- **Borders**: `gray-200`

---

## Typography

### Headings
- **H1**: `text-2xl md:text-3xl font-bold` (Team name)
- **H2**: `text-lg font-semibold` (Section titles)
- **H3**: `text-base font-medium` (Card titles)

### Body Text
- **Primary**: `text-sm text-gray-900`
- **Secondary**: `text-sm text-gray-500`
- **Muted**: `text-xs text-gray-400`

---

## Component Design

### 1. Team Header Card

**Layout:**
- Large team avatar (gradient background)
- Team name and slug
- Description (if available)
- Member count badge
- Role badges
- Invite button (admin only)

**Visual Hierarchy:**
1. Team avatar (most prominent)
2. Team name
3. Description
4. Metadata (count, roles)
5. Actions (invite button)

**Spacing:**
- Padding: `p-6 md:p-8`
- Gap between elements: `gap-4`
- Margin bottom: `mb-8`

---

### 2. Team Members List

**Layout:**
- Header section (title + count)
- Member cards in list
- Avatar + name + email
- Role badge
- Remove button (admin only)

**Member Card:**
- Avatar (gradient circle)
- Name and email
- "You" badge for current user
- Role badge (colored)
- Remove button (admin only, not for self)

**Empty State:**
- Large icon
- Message text
- Helpful description

**Interactions:**
- Hover effect on cards
- Smooth transitions
- Loading states

---

### 3. Invite Modal

**Layout:**
- Centered modal
- Backdrop overlay
- Form fields
- Action buttons

**Form Fields:**
- Email input (required)
- Role select (required)
- Message textarea (optional)
- Error display
- Submit button

**Visual Design:**
- White background
- Rounded corners
- Shadow for depth
- Focus states on inputs

---

## UI Patterns

### 1. Cards

**Style:**
```css
bg-white rounded-xl shadow-sm border border-gray-200
```

**Usage:**
- Team header
- Member list container
- Modal background

---

### 2. Buttons

**Primary Button:**
```css
bg-gradient-to-r from-blue-600 to-purple-600
text-white font-medium rounded-lg
hover:from-blue-700 hover:to-purple-700
```

**Secondary Button:**
```css
bg-gray-100 text-gray-700
hover:bg-gray-200
```

**Danger Button:**
```css
text-red-600 hover:bg-red-50
```

---

### 3. Badges

**Role Badge (ADMIN):**
```css
bg-purple-100 text-purple-700 border border-purple-200
```

**Role Badge (USER):**
```css
bg-gray-100 text-gray-700 border border-gray-200
```

**Status Badge:**
```css
bg-blue-100 text-blue-700
```

---

### 4. Avatars

**Team Avatar:**
- Large (48px)
- Gradient background
- First letter of team name
- Rounded corners

**User Avatar:**
- Medium (40px)
- Gradient background
- Initials or first letter
- Circular

---

## Responsive Design

### Mobile (< 640px)
- Single column layout
- Stacked elements
- Full-width buttons
- Touch-friendly sizes (min 44px)

### Tablet (640px - 1024px)
- Two-column where appropriate
- Adjusted spacing
- Flexible layouts

### Desktop (> 1024px)
- Multi-column layouts
- Maximum width container
- Optimal spacing
- Hover effects

---

## Animations & Transitions

### Loading States
- Spinning loader
- Smooth rotation
- Dual-ring effect

### Hover Effects
- Button color transitions
- Card background changes
- Shadow elevation
- Transform scale (subtle)

### Modal
- Fade-in backdrop
- Slide-up modal
- Smooth transitions

---

## Accessibility Features

### 1. Color Contrast
- WCAG AA compliant
- High contrast text
- Clear visual indicators

### 2. Focus States
- Visible focus rings
- Keyboard navigation
- Tab order

### 3. Screen Readers
- Semantic HTML
- ARIA labels (can be added)
- Alt text for icons

### 4. Error States
- Clear error messages
- Visual error indicators
- Helpful guidance

---

## User Experience Flow

### 1. First Visit
1. User logs in
2. Redirected to team dashboard
3. Loading spinner shown
4. Team data loads
5. Dashboard renders

### 2. Viewing Team
1. See team header with info
2. See member count
3. See own role badge
4. (If admin) See member list
5. (If admin) See invite button

### 3. Inviting Member
1. Click "Invite Member"
2. Modal opens
3. Fill form
4. Submit
5. Success message
6. Modal closes
7. Members list refreshes

### 4. Removing Member
1. Click "Remove" on member
2. Confirm dialog
3. Member removed
4. List refreshes
5. Success feedback

---

## Design Tokens

### Spacing Scale
- `2` = 0.5rem (8px)
- `4` = 1rem (16px)
- `6` = 1.5rem (24px)
- `8` = 2rem (32px)

### Border Radius
- `rounded-lg` = 0.5rem (8px)
- `rounded-xl` = 0.75rem (12px)
- `rounded-full` = 9999px (circle)

### Shadows
- `shadow-sm` = Subtle shadow
- `shadow-md` = Medium shadow
- `shadow-lg` = Large shadow

---

## Best Practices

### 1. Visual Hierarchy
- Most important = largest, boldest
- Secondary = smaller, lighter
- Actions = prominent buttons

### 2. Consistency
- Same spacing scale
- Same color usage
- Same component styles

### 3. Feedback
- Loading states
- Success messages
- Error messages
- Hover effects

### 4. Performance
- Lazy loading (if needed)
- Optimized images
- Efficient re-renders

---

## Summary

**Design System:**
- ✅ Modern gradient accents
- ✅ Clean white cards
- ✅ Professional typography
- ✅ Consistent spacing

**Responsive:**
- ✅ Mobile-first
- ✅ Flexible layouts
- ✅ Touch-friendly
- ✅ Desktop optimized

**Accessibility:**
- ✅ High contrast
- ✅ Clear focus states
- ✅ Semantic HTML
- ✅ Error handling

**User Experience:**
- ✅ Smooth animations
- ✅ Clear feedback
- ✅ Intuitive navigation
- ✅ Polished interactions

The UI/UX design is modern, accessible, and provides an excellent user experience across all devices.

