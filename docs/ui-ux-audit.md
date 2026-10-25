# Axora UI/UX Audit — Baseline

**Repository:** `reyncore/axora`  
**Audit branch:** `audit/ui-ux-audit`  
**Scope:** Read-only review of the existing UI implementation. No production UI or behavior has been changed.  
**Review date:** 2026-10-25

## Executive summary

Axora already has a coherent base: a three-column desktop shell, mobile bottom navigation, reusable post cards, dark/light theme tokens, a feed composer, trending content, and account settings. The next step should be targeted refinement, not a full visual rewrite.

The main opportunities are accessibility and navigation clarity, plus a few visible controls that imply functionality they do not currently perform.

## Findings

### P1 — Mobile users cannot directly navigate to Bookmarks from the visible mobile navigation

**Evidence:** `src/components/layout/MobileSidebar.tsx` lists Home, Explore, Compose, Notifications, Messages, and Account. `src/components/ui/MobileUserDrawer.tsx` provides Profile, Settings, Admin (when applicable), and Logout, but no Bookmarks link. The desktop sidebar does contain a Bookmarks link.

**Impact:** A core saved-content feature is difficult to discover on mobile. Search is reachable through Explore's search field, but the standalone Search route is also absent from mobile navigation.

**Recommendation:** Add Bookmarks to the account drawer or adjust the mobile navigation information architecture without crowding the five primary destinations. Decide whether Search should be a direct mobile destination or consistently route all search entry points through Explore.

**Acceptance check:** A mobile user can reach Bookmarks in no more than two deliberate taps; all existing routes and bookmark behavior remain unchanged.

### P1 — Viewport configuration disables user zoom

**Evidence:** `src/app/layout.tsx` sets `maximumScale: 1` and `userScalable: false`.

**Impact:** Users who need browser zoom for readability may be unable to enlarge the interface. This is an accessibility concern, especially on smaller screens.

**Recommendation:** Remove the zoom restriction unless a documented, tested requirement justifies it. Responsive layout should handle zoom rather than preventing it.

**Acceptance check:** Pinch/browser zoom works on mobile, and the interface remains usable at increased zoom.

### P1 — Theme text tokens have insufficient contrast for small text in both themes

**Evidence:** `src/app/globals.css` defines muted and hint text tokens. Using the current token values against the primary background, approximate WCAG contrast ratios are:
- Dark `#5a5a66` on `#0f0f11`: **2.82:1**
- Dark `#3a3a48` on `#0f0f11`: **1.71:1**
- Light `#8e8e9e` on `#ffffff`: **3.22:1**
- Light `#c4c4cf` on `#ffffff`: **1.73:1**

These are below WCAG AA's 4.5:1 target for normal-sized text. The ratio depends on the actual background and opacity, so component-level verification is still needed.

**Impact:** Secondary labels, timestamps, helper text, and inactive navigation can be hard to read, especially on low-quality displays or at lower brightness.

**Recommendation:** Adjust semantic text tokens for readable contrast; reserve low-contrast values for nonessential decorative elements only. Test muted text on elevated surfaces as well as the primary background.

**Acceptance check:** Normal-sized meaningful text meets at least 4.5:1 contrast, with component-specific checks for icons, borders, and large text.

### P2 — Composer buttons for emoji and hashtag look functional but have no action

**Evidence:** `src/components/feed/CreatePostBox.tsx` renders buttons labelled “Tambah emoji” and “Tambah hashtag” without `onClick` handlers.

**Impact:** The interface promises two actions that do nothing, which can reduce trust and interrupt posting.

**Recommendation:** Either implement a small, reliable interaction (emoji picker and insertion of `#`) or remove/visually disable the controls until ready. Do not silently change the existing upload or post-submit behavior.

**Acceptance check:** Every enabled composer control has a working, keyboard-accessible action and clear feedback.

### P2 — Post overflow actions are hover-dependent on desktop

**Evidence:** `src/components/feed/PostCard.tsx` styles the owner-only overflow button with `opacity-0 group-hover:opacity-100 focus:opacity-100`.

**Impact:** On touch devices, hover does not behave consistently; keyboard focus reveals the control, but discoverability can still be poor.

**Recommendation:** Keep the feed visually calm, but make the action affordance visible on touch layouts and reliably available to keyboard users. Avoid making every action permanently prominent on desktop if that adds clutter.

**Acceptance check:** Owners can discover and use Edit/Delete on mouse, touch, and keyboard; non-owners do not see owner actions.

### P2 — Mobile drawer visibility and keyboard behavior need a focused accessibility test

**Evidence:** `src/components/ui/MobileUserDrawer.tsx` keeps the dialog markup mounted while closed and moves it off-screen with a transform. Escape closes it and body scroll is locked while open, but the code shown does not implement focus trapping or restore focus to the trigger.

**Impact:** Keyboard and assistive-technology users may encounter off-screen controls or lose their place after closing the drawer.

**Recommendation:** Test focus order when opening and closing. If needed, add correct hidden/inert behavior while closed, focus containment while open, and focus restoration. Preserve the existing drawer animation and menu behavior.

**Acceptance check:** When closed, drawer controls are not keyboard reachable; when open, focus remains in the dialog and returns to the account trigger after close.

## Design observations (not confirmed defects)

- The current dark palette and violet accent are consistent, but color alone is not enough to establish a distinctive visual identity. Refine typography, spacing, content hierarchy, and state feedback before adding decoration.
- Desktop uses a 72 px compact sidebar that expands to 260 px at XL and a 320 px right panel at XL. Validate the feed width and line lengths at common viewport sizes before changing these dimensions.
- Home uses feed tabs (For You, Following, Trending) while Explore is a separate route with its own search input. Clarify the distinction between “Trending” in the home feed and Explore so the information architecture feels intentional.
- The app uses multiple sticky page headers and translucent surfaces. Verify stacking, scroll behavior, and visual consistency on mobile before standardizing them into shared components.
- Do not replace the existing Axora visual language with generic gradient-heavy cards, excessive rounded panels, or decorative dashboard metrics.

## Recommended implementation order

1. Fix accessibility fundamentals: zoom, contrast, and drawer focus behavior.
2. Improve mobile information architecture for Bookmarks and Search.
3. Resolve inert composer controls and make post actions discoverable on touch.
4. Audit and standardize page headers, spacing, typography, and responsive content width.
5. Create Figma wireframes for Home, Explore, Post detail/Profile, Messages, and Settings based on the findings.
6. Implement one screen at a time on a feature branch; run type-check, lint (verify the Next.js 15 lint script), build, and manual responsive checks before opening a pull request.

## Guardrails

- No changes to `main` or production deployment as part of this audit.
- Keep existing features and API contracts intact.
- No broad rewrite of the feed, authentication, database, or upload pipeline.
- Validate each visual change against desktop, mobile, keyboard, light theme, and dark theme.
- Treat visual taste decisions as hypotheses to review in Figma, not as bugs by default.
