# Axora UI/UX Refactor — Wireframe Specification

Status: proposal for review; no production UI changes.
Branch: `audit/ui-ux-audit`
Direction: rethink layout, distinctive editorial-tech identity, preserve product behavior.

## Design intent

Axora should feel like a focused social product for people sharing ideas and work—not a generic admin dashboard. Use a deliberate editorial grid, strong typographic hierarchy, restrained separators, and one recognizable accent. Avoid decorative gradients, oversized rounded cards, excessive glass effects, fake metrics, and gratuitous animation.

### Initial visual tokens (proposal, not final)

- Dark canvas: near-black charcoal (`#101114`); elevated surface: `#181A1F`; border: subtle neutral gray.
- Primary text: warm off-white; secondary text must meet WCAG AA contrast against its actual surface.
- Accent: acid-lime family for selected navigation, primary action, and focus indication only. Validate color pairs before adoption.
- Light mode: warm white canvas, neutral surface, dark text, a darker lime/olive accent with sufficient contrast. Do not reuse dark-mode accent values blindly.
- Typography: retain the actual font family already shipped by Axora. Use a compact, clear hierarchy rather than importing a trendy font without reason.
- Shape: mostly square-to-moderate corner radii; reserve pill shapes for filters/tabs where appropriate.
- Motion: short, reduced-motion-aware transitions; no motion required to understand state.

## Wireframe A — Home desktop (1440 × 1000 reference viewport)

Use a three-zone composition with a centered content system rather than three equally prominent cards.

### Global grid
- Canvas width: 1440.
- Left navigation rail: 232 px; fixed/sticky while scrolling.
- Main feed: 620–680 px preferred readable width.
- Right context rail: 280–320 px.
- Gutters: 24–32 px between zones.
- Keep main content aligned to a consistent grid; allow the right rail to collapse before compressing the feed.
- At widths where all zones no longer fit comfortably, hide/collapse the right rail; do not shrink post text to preserve three columns.

### Left navigation
1. Axora wordmark with a small distinctive mark; avoid oversized logo treatment.
2. Primary destinations: Home, Explore, Notifications, Messages.
3. Secondary destinations: Bookmarks and profile/account.
4. Clear active state: slim accent rule plus text/icon change, not color alone.
5. Primary “Create post” action near the destination list.
6. Bottom account area: avatar, handle, compact menu.
7. Admin destination only for authorized accounts and visually separated from normal navigation.

### Main feed
1. Header row: “Home” title, optional compact feed controls, no giant hero banner.
2. Feed selector: For You / Following / Trending. Distinguish selected tab with a clear underline or accent marker.
3. Composer: avatar + “What’s on your mind?” prompt, with attachment/action row and one primary Post button. Emoji and hashtag controls must work or be visibly disabled with explanation.
4. Feed items: subtle divider-based list by default; use a contained surface only where it improves grouping.
5. Each post hierarchy: author/avatar/time/menu; readable body; media when present; engagement/action row.
6. Loading skeletons, empty state, error/retry, and infinite-scroll loading must retain current behavior.
7. Keep optimistic like/bookmark behavior and rollback semantics unchanged.

### Right context rail
1. Search field with explicit accessible label and clear affordance.
2. Trending/topics module with concise labels and restrained metadata.
3. Suggested accounts or useful context only when data is available; no fabricated numbers or placeholder analytics.
4. Optional footer links at the bottom.
5. Rail should not compete with the feed. Hide at intermediate breakpoints.

### Desktop interaction states to design
- Default, hover, keyboard focus, active navigation.
- Composer focused, validation error, posting/loading.
- Post menu open; like/bookmark success and failure rollback.
- Feed loading, empty, error, and end-of-feed.
- Right rail collapsed at narrower widths.

## Wireframe B — Home mobile (390 × 844 reference viewport)

### Layout
1. Top app bar: compact Axora mark/title and only high-value actions. Avoid duplicating every desktop navigation control.
2. Feed tabs directly below the app bar, horizontally scrollable only if needed; selected state remains obvious.
3. Composer entry: compact but visibly actionable. Opening it should preserve draft text if the user dismisses it.
4. Post list: full-width with consistent horizontal padding (target 16 px); separators should preserve visual grouping without boxing every post.
5. Bottom navigation: Home, Explore, Create, Notifications, Messages. Create may be a central accent action but must not obscure content.
6. Account, Settings, Bookmarks, and admin access live in the account drawer/menu. Bookmarks must be reachable in no more than two clear actions.
7. Respect safe-area insets and ensure the bottom bar never covers the last post/action row.
8. Media uses a responsive width and preserves intrinsic aspect ratio; lightbox remains keyboard/screen-reader accessible where applicable.

### Mobile touch and accessibility
- Touch targets aim for 44 × 44 CSS px where practical.
- Do not hide essential post actions until hover; hover does not exist on touch screens.
- Drawer/dialog: move focus inside on open, keep focus contained, close with Escape, restore focus to trigger, and prevent background interaction while open.
- Do not disable browser zoom. Ensure visible focus and contrast in both themes.
- Reduced-motion preference is respected.
- Keep body scroll behavior predictable when drawers/lightboxes are open.

## Responsive behavior

- Wide desktop (>= 1280): left navigation + feed + right context rail.
- Laptop/tablet landscape (900–1279): left navigation + feed; right rail hidden or converted into inline modules.
- Tablet/narrow (600–899): compact navigation or drawer + single feed column; avoid a squeezed three-column layout.
- Mobile (<600): top bar + single feed + bottom navigation.
- These are design targets, not a mandate to alter existing breakpoints without checking the current implementation.

## Wireframe C — key post states (both themes)

- Text-only post.
- Post with image/media.
- Long text with expand/collapse if current behavior supports it.
- Own post menu and other-user post actions.
- Liked, unliked, bookmarked, and failed optimistic action.
- No actions hidden exclusively behind hover.
- Focus outlines and accessible names for icon-only buttons.

## Preserve existing behavior

Do not remove or silently change:
- Authentication/protected routes.
- Theme selection and anti-flash theme initialization.
- Feed cursor pagination/infinite scrolling.
- Optimistic like/bookmark updates and rollback.
- Post create/edit/delete and media lightbox.
- Mentions/tags, notifications, messages, and PWA behavior.
- Loading, empty, and error states.

## Audit items to resolve before implementation

1. Improve contrast for muted text after checking real rendered color pairs.
2. Remove zoom restrictions unless a documented accessibility requirement exists.
3. Make composer emoji/hashtag controls functional or intentionally disabled with clear state.
4. Ensure Bookmarks are reachable on mobile.
5. Test drawer focus trap, focus restoration, Escape, and background inertness.
6. Verify post actions remain discoverable on touch devices.
7. Confirm typography/font already used in the product before setting Figma styles.

## Implementation sequence and acceptance criteria

### Pass 1 — accessibility and interaction defects
- Correct contrast with measured WCAG AA text contrast.
- Restore browser zoom.
- Fix inert controls and drawer focus behavior.
- Confirm mobile bookmark route.
- No API, database, auth, or feed algorithm changes.

### Pass 2 — layout primitives
- Introduce/refine tokens and responsive containers.
- Verify light and dark theme parity.
- No one-off styling copied across every page.

### Pass 3 — Home desktop
- Implement only after wireframe review.
- Keep feed behavior and all existing actions.
- Verify 1440, 1280, 1024, and 768 widths.

### Pass 4 — Home mobile
- Verify 390 × 844 and a narrow 320–360 px viewport.
- Check safe areas, bottom navigation overlap, touch targets, long text, media, and keyboard.

### Quality gate
- Typecheck, lint, and production build pass.
- Manually test create/edit/delete, like/bookmark rollback, pagination, themes, mobile drawer, auth and post media.
- Review keyboard-only navigation and reduced motion.
- Use a feature branch and preview deployment. Merge only after explicit review; do not push the redesign directly to production.
