# Team Dashboard - UI/UX Design

Design principles and visual guidelines.

## Design Principles

1. **Modern & Clean:** Gradient accents, white cards, generous spacing, rounded corners
2. **Responsive:** Mobile-first approach, flexible layouts, touch-friendly buttons
3. **Accessible:** High contrast ratios, clear visual hierarchy, intuitive navigation
4. **Professional:** Consistent color scheme, professional typography, smooth animations

---

## Color Palette

### Primary Colors
- **Blue:** `#2563eb` (blue-600)
- **Purple:** `#9333ea` (purple-600)
- **Gradient:** `from-blue-600 to-purple-600`

### Status Colors
- **Success:** `#10b981` (green-500)
- **Error:** `#ef4444` (red-500)
- **Warning:** `#f59e0b` (amber-500)

### Neutral Colors
- **Gray Scale:** `gray-50` to `gray-900`
- **Background:** `gray-50` to `gray-100` (gradient)
- **Cards:** `white`
- **Borders:** `gray-200`

---

## Typography

### Headings
- **H1:** `text-2xl md:text-3xl font-bold` (Team name)
- **H2:** `text-lg font-semibold` (Section titles)
- **H3:** `text-base font-medium` (Card titles)

### Body Text
- **Primary:** `text-sm text-gray-900`
- **Secondary:** `text-sm text-gray-500`
- **Muted:** `text-xs text-gray-400`

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

---

## UI Patterns

### Cards
```css
bg-white rounded-xl shadow-sm border border-gray-200
```

### Buttons

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

### Badges

**Role Badge (ADMIN):**
```css
bg-purple-100 text-purple-700 border border-purple-200
```

**Role Badge (USER):**
```css
bg-gray-100 text-gray-700 border border-gray-200
```

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

- **Loading States:** Spinning loader, smooth rotation
- **Hover Effects:** Button color transitions, card background changes, shadow elevation
- **Modal:** Fade-in backdrop, slide-up modal, smooth transitions

---

## Accessibility Features

1. **Color Contrast:** WCAG AA compliant, high contrast text
2. **Focus States:** Visible focus rings, keyboard navigation
3. **Screen Readers:** Semantic HTML, ARIA labels, alt text for icons
4. **Error States:** Clear error messages, visual error indicators

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

1. **Visual Hierarchy:** Most important = largest, boldest
2. **Consistency:** Same spacing scale, same color usage, same component styles
3. **Feedback:** Loading states, success messages, error messages, hover effects
4. **Performance:** Lazy loading, optimized images, efficient re-renders

---

## Summary

**Design System:**
- Modern gradient accents
- Clean white cards
- Professional typography
- Consistent spacing

**Responsive:**
- Mobile-first
- Flexible layouts
- Touch-friendly
- Desktop optimized

**Accessibility:**
- High contrast
- Clear focus states
- Semantic HTML
- Error handling

**User Experience:**
- Smooth animations
- Clear feedback
- Intuitive navigation
- Polished interactions
