# Homepage Modernization Implementation Plan

**Spec ID**: SPEC-homepage-modernization-1
**Branch**: feat/modernize-homepage-design
**Created**: 2025-11-08
**Status**: Planning Complete

---

## Executive Summary

Modernize the homepage design to improve user experience, visual appeal, and interactivity. The update includes a hero section, sticky navigation, dark mode support, and micro-animations.

### Goals
1. **Improve First Impression**: Modern hero section with dynamic content
2. **Better Navigation**: Sticky header for easier access
3. **User Preference**: Dark mode support with persistence
4. **Polish**: Smooth animations and professional loading states

### Effort Estimate
**Total**: 6 hours
**Tasks**: 4 (sequential with dependencies)

---

## Task Breakdown

### Task 1: Modern Hero Section (TASK-homepage-001)
**Priority**: High
**Effort**: 2 hours
**Dependencies**: None

#### What to Build
- Hero component with gradient background
- Welcome message and tagline
- Real-time statistics (total games, available games)
- Search/filter bar (UI only, functionality later)

#### Technical Approach
```tsx
// New component: web/src/components/HeroSection.tsx
- Gradient background using Tailwind
- Flex layout for content
- Grid for statistics cards
- Responsive design (mobile-first)
```

#### Acceptance Criteria
- [ ] Hero section displays with animated gradient background
- [ ] Statistics update based on game data
- [ ] Responsive on mobile/tablet/desktop
- [ ] Fade-in animation on page load

#### Files to Create/Modify
- CREATE: `web/src/components/HeroSection.tsx`
- CREATE: `web/src/components/StatsCard.tsx`
- MODIFY: `web/src/pages/HomePage.tsx`

---

### Task 2: Layout & Navigation (TASK-homepage-002)
**Priority**: High
**Effort**: 1.5 hours
**Dependencies**: TASK-homepage-001

#### What to Build
- Sticky header component
- Enhanced game card hover effects
- Section dividers (Featured Games, All Games)
- Improved typography hierarchy

#### Technical Approach
```tsx
// New component: web/src/components/Header.tsx
- Position: sticky with transition
- Backdrop blur on scroll
- Responsive navigation

// Enhanced: web/src/components/GameCard.tsx
- Hover: scale, shadow, lift effect
- Smooth transitions
- Improved spacing
```

#### Acceptance Criteria
- [ ] Header becomes sticky after scrolling 100px
- [ ] Smooth backdrop blur transition
- [ ] Game cards have hover effects (scale 1.02, shadow-lg)
- [ ] Clear visual hierarchy between sections

#### Files to Create/Modify
- CREATE: `web/src/components/Header.tsx`
- MODIFY: `web/src/components/GameCard.tsx`
- MODIFY: `web/src/pages/HomePage.tsx`
- MODIFY: `web/src/globals.css` (add utilities)

---

### Task 3: Dark Mode Support (TASK-homepage-003)
**Priority**: Medium
**Effort**: 1 hour
**Dependencies**: TASK-homepage-002

#### What to Build
- Theme context and provider
- Dark mode toggle button (moon/sun icon)
- localStorage persistence
- Smooth theme transitions

#### Technical Approach
```tsx
// New context: web/src/contexts/ThemeContext.tsx
- useState for theme ('light' | 'dark')
- useEffect for localStorage sync
- useEffect for DOM class toggle

// New component: web/src/components/ThemeToggle.tsx
- Toggle button with icon
- Smooth rotation animation
```

#### Acceptance Criteria
- [ ] Toggle button switches theme correctly
- [ ] Theme persists across page reloads
- [ ] Smooth transition animation (0.3s)
- [ ] All components render correctly in dark mode

#### Files to Create/Modify
- CREATE: `web/src/contexts/ThemeContext.tsx`
- CREATE: `web/src/components/ThemeToggle.tsx`
- MODIFY: `web/src/App.tsx` (add ThemeProvider)
- MODIFY: `web/src/components/Header.tsx` (add toggle)

---

### Task 4: Micro-animations & Loading (TASK-homepage-004)
**Priority**: Medium
**Effort**: 1.5 hours
**Dependencies**: TASK-homepage-003

#### What to Build
- Install Framer Motion
- Stagger animation for game cards
- Skeleton UI for loading states
- Page transition animations

#### Technical Approach
```tsx
// Install: framer-motion
npm install framer-motion

// Enhanced: web/src/components/GameList.tsx
- Use motion.div for cards
- Stagger children animation
- Respect prefers-reduced-motion

// New component: web/src/components/SkeletonCard.tsx
- Animated gradient background
- Placeholder for image/text
```

#### Acceptance Criteria
- [ ] Game cards fade in with stagger (delay: i * 0.05s)
- [ ] Loading state shows skeleton UI
- [ ] All transitions respect prefers-reduced-motion
- [ ] Animations are smooth (60fps)

#### Files to Create/Modify
- CREATE: `web/src/components/SkeletonCard.tsx`
- MODIFY: `web/src/components/GameList.tsx`
- MODIFY: `web/src/pages/HomePage.tsx`
- MODIFY: `web/package.json` (add framer-motion)

---

## Technical Specifications

### Dependencies to Add
```json
{
  "framer-motion": "^11.0.0"
}
```

### Tailwind Utilities to Add
```css
/* web/src/globals.css */

/* Smooth transitions */
.transition-smooth {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Backdrop blur for sticky header */
.backdrop-blur-header {
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

/* Card hover effects */
.card-hover {
  @apply transition-smooth hover:scale-102 hover:shadow-lg;
}

/* Skeleton loading animation */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.2) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

### Color Scheme Enhancement
```css
/* Dark mode improvements */
.dark {
  --hero-gradient-from: #1e3a8a; /* blue-900 */
  --hero-gradient-to: #0f766e; /* teal-700 */
}

:root {
  --hero-gradient-from: #3b82f6; /* blue-500 */
  --hero-gradient-to: #2dd4bf; /* teal-400 */
}
```

---

## Design Mockup (Text)

### Desktop Layout
```
┌─────────────────────────────────────────────┐
│ [Sticky Header]                    [Theme]  │
├─────────────────────────────────────────────┤
│                                             │
│         ╔═══════════════════════════╗       │
│         ║   🎲 청람보드              ║       │
│         ║   보드게임 대여 서비스     ║       │
│         ║                           ║       │
│         ║   [총 게임: 50] [대여가능: 35] ║   │
│         ║   [검색창 미리보기]        ║       │
│         ╚═══════════════════════════╝       │
│                                             │
├─────────────────────────────────────────────┤
│ 인기 게임                                    │
├─────────────────────────────────────────────┤
│ [Card] [Card] [Card] [Card]                 │
│ [Card] [Card] [Card] [Card]                 │
├─────────────────────────────────────────────┤
│ 전체 게임                                    │
├─────────────────────────────────────────────┤
│ [Card] [Card] [Card] [Card]                 │
│ [Card] [Card] [Card] [Card]                 │
└─────────────────────────────────────────────┘
```

### Mobile Layout
```
┌───────────────────┐
│ [Header]    [🌙] │
├───────────────────┤
│   🎲 청람보드     │
│   보드게임 대여   │
│                   │
│   [총: 50]        │
│   [가능: 35]      │
├───────────────────┤
│ [Card]            │
│ [Card]            │
│ [Card]            │
└───────────────────┘
```

---

## Animation Specifications

### Hero Section Entrance
```tsx
// Fade in from top
initial={{ opacity: 0, y: -20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.6, ease: "easeOut" }}
```

### Statistics Cards
```tsx
// Stagger from left
initial={{ opacity: 0, x: -20 }}
animate={{ opacity: 1, x: 0 }}
transition={{ duration: 0.4, delay: index * 0.1 }}
```

### Game Cards
```tsx
// Fade in with scale
initial={{ opacity: 0, scale: 0.95 }}
animate={{ opacity: 1, scale: 1 }}
transition={{ duration: 0.3, delay: index * 0.05 }}
```

### Hover Effects
```tsx
// Lift on hover
whileHover={{ y: -4, scale: 1.02 }}
transition={{ duration: 0.2 }}
```

---

## Testing Strategy

### Visual Regression
- [ ] Test on Chrome, Firefox, Safari
- [ ] Test on mobile (iOS Safari, Chrome Android)
- [ ] Test dark mode rendering
- [ ] Test reduced motion mode

### Performance
- [ ] Lighthouse score > 90
- [ ] FCP < 1.5s
- [ ] LCP < 2.5s
- [ ] No layout shift (CLS = 0)

### Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader labels correct
- [ ] Color contrast ratio > 4.5:1
- [ ] Focus indicators visible

---

## Rollout Plan

### Phase 1: Development (This PR)
1. Complete all 4 tasks sequentially
2. Test locally on all viewports
3. Verify dark mode works
4. Check animations are smooth

### Phase 2: Review
1. Self-review code quality
2. Test on production-like environment
3. Check bundle size impact

### Phase 3: Deployment
1. Merge to main
2. Deploy to production
3. Monitor for issues

---

## Success Metrics

### Before
- Plain gradient title
- Static game cards
- No loading feedback
- Light mode only

### After
- Modern hero with stats
- Sticky navigation
- Smooth animations
- Dark mode support
- Skeleton loading UI

### KPIs
- User engagement: +20% (estimated)
- Bounce rate: -10% (estimated)
- Mobile usability score: 95+ (target)

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Bundle size increase | Medium | Use tree-shaking, lazy loading |
| Animation performance on low-end devices | Low | Respect prefers-reduced-motion |
| Dark mode color contrast issues | Medium | Test with accessibility tools |
| Breaking existing functionality | Low | Incremental changes, testing |

---

## References

### Design Inspiration
- Modern SaaS landing pages
- Game catalog websites (Steam, BoardGameGeek)
- Korean web design trends

### Technical Resources
- [Framer Motion Docs](https://www.framer.com/motion/)
- [Tailwind CSS v4 Docs](https://tailwindcss.com/docs)
- [React Router v6](https://reactrouter.com/)

---

**Trace**: SPEC-homepage-modernization-1
**Author**: AI Agent (Claude)
**Reviewed by**: TBD
**Last Updated**: 2025-11-08
