# STYLE_GUIDE.md: Mobile UI/UX Standards

## Core Design Philosophy
- **Identity:** Modern, Minimalist, and High-Contrast.
- **Platform Feel:** Use "Platform-Agnostic" patterns that look natural on both iOS and Android.
- **Responsiveness:** All layouts must be fluid but capped at 480px width for large screens to maintain a "mobile-first" appearance.

## Layout & Geometry (The "Native" Look)
AI agents must follow these structural rules to ensure the app doesn't look like a "website":

- **Safe Areas:** Use `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` for all headers and footers to avoid overlaps with the iPhone notch or Android navigation bar.
- **Padding:** Standardize on a **16px (1rem)** or **20px (1.25rem)** gutter for all screen edges.
- **Border Radius:** 
    - Large Components (Cards, Modals): `16px`
    - Small Components (Buttons, Inputs): `8px`
- **Scrolling:** Use `-webkit-overflow-scrolling: touch` for all containers. Hide scrollbars by default.

## Design Tokens (Color & Typography)
*Do not use hardcoded hex values. Use the following CSS Variable names:*

### Colors
| Variable | Value | Usage |
| :--- | :--- | :--- |
| `--primary` | `#3880ff` | Action buttons, active states |
| `--background` | `#ffffff` | Main screen background |
| `--surface` | `#f4f5f8` | Cards, input fields, subtle sections |
| `--text-main` | `#121212` | Headings and primary body text |
| `--text-muted` | `#666666` | Secondary labels, timestamps |
| `--error` | `#eb445a` | Error messages, destructive actions |

### Typography
- **System Font Stack:** `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`.
- **Heading 1:** `24px`, Semi-bold, `tight` tracking.
- **Body:** `16px`, Regular, `1.5` line-height.
- **Caption:** `12px`, Medium, uppercase (for small labels).

## Component Standards

### Buttons
- **Height:** Minimum `48px` to ensure a "Fat Finger" friendly touch target.
- **Active State:** On `:active`, reduce opacity to `0.7` or scale down to `0.98` to provide tactile feedback.
- **No Hover:** Do not implement `:hover` styles (irrelevant on mobile).

### Form Inputs
- **Font Size:** Must be at least `16px` (prevents iOS from auto-zooming the input).
- **Background:** Use `--surface` color with no border; use a 2px bottom-border on focus.

### Cards
- **Shadow:** `0 4px 12px rgba(0, 0, 0, 0.05)`. Avoid heavy black shadows.
- **Interaction:** Cards that are clickable must show a ripple effect or background color change on press.

### Context Menus & Action Sheets
Context menus must be used for *item-specific actions* only, never for primary navigation.

#### Visual Style
- **Background:** `--surface` color with a stronger shadow than cards: `0 8px 24px rgba(0,0,0,0.12)`.
- **Border:** `0.5px solid rgba(0,0,0,0.1)` for definition.
- **Rounding:** `12px` (slightly more rounded than buttons).
- **Item Height:** Minimum `44px` for touch accuracy.
- **Divider:** Use a `1px` subtle line to group related actions (e.g., separating "Edit/Share" from "Delete").

#### Interaction Rules
- **Trigger:** Use a `vertical-ellipsis` icon for list items or a `settings` icon for page-level actions.
- **Destructive Actions:** Items like "Delete" or "Remove" must use `--error` (red) text color.
- **Placement:** 
    - **Small Menus (1-3 items):** Use a **Popover** that appears near the trigger icon.
    - **Large Menus (4+ items):** Use a **Bottom Sheet** (a menu that slides up from the bottom of the screen). This is much easier for users to reach with their thumbs.
- **Dismissal:** Clicking outside the menu or clicking a "Cancel" button must close the menu immediately.

### Headers
- **Background:** Use `--primary` color with white text for consistent branding.
- **Height:** Fixed padding of `1rem` (16px) on all sides. Total height should be compact (~60-70px including safe area).
- **Layout:** Flexbox with `align-items: center` and `gap: 1rem`.
- **Structure:**
  - Left: Navigation button (Hamburger Menu on root screens, Back Button on sub-pages).
  - Center/Right: Title container (`.header-title`) with `flex: 1`.
- **Title Styling:**
  - Font size: `1.25rem` (20px), Semi-bold.
  - Line height: `1.2` for compact vertical spacing.
  - Text alignment: Left-aligned (not centered).
  - Optional subtitle (e.g., memo count): `0.85rem`, opacity `0.85`.
- **Navigation Buttons:**
  - Minimum touch target: `44x44px`.
  - Use `flex-shrink: 0` to prevent shrinking in flexbox.
  - No `:hover` states; use `:active` with opacity `0.7` for tactile feedback.
- **Safe Area:** Use `padding-top: max(1rem, env(safe-area-inset-top))` to handle device notches.
- **Consistency:** All screens (root, sub-pages, trash bin) must use identical header geometry.

### Overlays (Modals)
- **Use Case:** Temporary tasks like "Create New," "Edit," "Filter," or confirmation dialogs.
- **Backdrop:**
  - Background: `rgba(15, 23, 42, 0.45)` with `backdrop-filter: blur(4px)`.
  - Must cover the entire screen (`position: fixed; inset: 0`).
  - Clicking the backdrop should close the overlay.
- **Panel:**
  - Width: `min(480px, 100%)` - capped at 480px for tablet/desktop.
  - Background: `var(--background)` (white).
  - Border radius: `16px` for large components.
  - Padding: `1rem` (16px).
  - Max height: `90vh` with `overflow-y: auto` for scrollable content.
  - Shadow: `var(--shadow-lg)` for depth.
- **Animation:**
  - Slide up from bottom: `transform: translateY(100%)` → `translateY(0)`.
  - Duration: `0.25s` with `ease` timing.
  - Use hardware-accelerated `transform` for smooth performance.
- **Header:**
  - Layout: Flexbox with `justify-content: space-between` and `align-items: center`.
  - Margin bottom: `1.5rem` to separate from content.
  - **Title (left side):**
    - Use `<h2>` element.
    - Font size: `1.25rem`, Semi-bold.
    - Color: `var(--text-main)` (default).
    - Margin: 0 (reset default).
  - **Close Button (right side):**
    - Background: `none`, Border: `none`.
    - Font size: `1.5rem` (typically `×` character).
    - Color: `var(--text-muted)`.
    - Padding: `0.5rem`.
    - Minimum touch target: `44x44px`.
    - Display: `flex` with `align-items: center` and `justify-content: center`.
    - Active state: Optional opacity change for tactile feedback.
  - **Structure Example:**
    ```html
    <div class="overlay-header">
      <h2>Overlay Title</h2>
      <button class="overlay-close">×</button>
    </div>
    ```
- **Scrolling:**
  - Use `-webkit-overflow-scrolling: touch` for smooth iOS scrolling.
  - Hide scrollbars: `scrollbar-width: none` and `::-webkit-scrollbar { display: none }`.
- **Z-index:** Use `z-index: 100` for overlay container (below side menu at 999-1000).

### Side Menu (Drawer)
The side menu provides global navigation and should be used for app-level actions, not item-specific operations.

#### Visual Style
- **Container:**
  - Position: `fixed`, anchored to the left edge (`top: 0; left: 0`).
  - Width: `75%` on desktop, `80%` on mobile, capped at `max-width: 300px` (desktop) or `280px` (mobile).
  - Height: `100vh` or `100dvh` (dynamic viewport height for mobile browsers).
  - Background: `var(--background)` (white).
  - Shadow: `var(--shadow-lg)` for depth.
  - Z-index: `1000` (above backdrop).
- **Backdrop:**
  - Background: `rgba(0, 0, 0, 0.5)` with `backdrop-filter: blur(4px)`.
  - Z-index: `999` (below menu panel).
  - Must cover entire screen (`position: fixed; inset: 0`).
- **Header:**
  - Background: `var(--primary)` color with white text.
  - Layout: Flexbox with `justify-content: space-between` and `align-items: center`.
  - Padding: `1rem` (16px).
  - Border-bottom: `1px solid var(--border-color)`.
  - Title: `<h2>` element, font-size `1.25rem`, no margin.
  - Close Button:
    - Font-size: `2rem` (typically `×` character).
    - Touch target: `44x44px`.
    - No background or border.
- **Content Area:**
  - Flex: `1` to fill remaining space.
  - Overflow: `overflow-y: auto; overflow-x: hidden`.
  - Padding: `1rem 0` (vertical only).
  - Scrollbar: Hidden (`scrollbar-width: none` and `::-webkit-scrollbar { display: none }`).
  - Smooth scrolling: `-webkit-overflow-scrolling: touch`.

#### Menu Items
- **Height:** Minimum `48px` for touch accuracy.
- **Width:** `100%`, text left-aligned.
- **Padding:** `1rem` (16px).
- **Font-size:** `1rem`.
- **Layout:** Flexbox with `align-items: center` and `gap: 0.75rem`.
- **Icons:** Use emoji or icon font, placed before text.
- **Active State:** Background changes to `var(--surface)` on `:active`.
- **No Hover:** Do not implement `:hover` styles (irrelevant on mobile).

#### Animation
- **Open:** Slide in from left using `transform: translateX(-100%)` → `translateX(0)`.
- **Close:** Slide out to left using `transform: translateX(0)` → `translateX(-100%)`.
- **Duration:** `0.3s` with `ease` timing.
- **Performance:** Use `will-change: transform` and hardware-accelerated transforms.
- **Backdrop:** Fade in animation `0.25s ease`.

#### Interaction Rules
- **Trigger:** Hamburger icon (`☰`) in the top-left of the header on root screens.
- **Trigger Button:** Minimum touch target `44x44px`, uses `flex-shrink: 0`.
- **Open Behavior:**
  - Backdrop appears first with fade-in.
  - Menu slides in from left.
  - Content behind menu is dimmed and non-interactive.
- **Close Behavior:**
  - Click/tap on backdrop closes menu.
  - Click/tap on close button (`×`) closes menu.
  - Swipe left on menu closes menu (touch gesture).
  - Android hardware back button closes menu (Capacitor).
- **Navigation:** When a menu item is clicked, close the menu first, then navigate to the target screen.
- **Disabled on Sub-pages:** On detail/edit pages, replace hamburger with back button and disable side menu.

#### Structure Example
```html
{isOpen && <div class="side-menu-backdrop" onClick={closeMenu} />}
<div class={`side-menu ${isOpen ? 'side-menu--open' : ''}`}>
  <div class="side-menu-header">
    <h2>Menu</h2>
    <button class="side-menu-close">×</button>
  </div>
  <div class="side-menu-content">
    <button class="side-menu-item">🗑️ Trash Bin</button>
    <button class="side-menu-item">📤 Export Data</button>
    <button class="side-menu-item">📥 Import Data</button>
  </div>
</div>
```

#### Z-index Hierarchy
- Side Menu Panel: `z-index: 1000`
- Side Menu Backdrop: `z-index: 999`
- Overlays/Modals: `z-index: 100`
- Regular Content: `z-index: auto` or lower

## Navigation & Transitions

### Transition Logic
- **Push Navigation (Hierarchical):** When moving "deeper" into the app (e.g., List -> Detail), the new screen must **Slide in from the Right**.
- **Back Navigation:** When hitting "Back," the current screen must **Slide out to the Right**, revealing the previous screen underneath.
- **Modal Navigation:** When opening a temporary task (e.g., "Create New," "Filter," or "Login"), the screen should **Slide up from the Bottom**.

### Transition Performance (Crucial for Capacitor)
- Use hardware-accelerated transitions. 
- **Instruction to AI:** "Use `transform: translateX()` or `translate3d()` for screen transitions. Do not animate the `left` or `margin` properties, as this causes lag in a Capacitor WebView."

### Platform-Specific Navigation Details
- **iOS:** Ensure "Swipe-from-left-to-go-back" is enabled. The header title should be centered.
- **Android:** The header title should be left-aligned. The app must respond to the hardware system "Back" button by popping the navigation stack.

## Side Menu (Drawer) vs. Context Menu

### The Side Menu (Main Navigation)
- **Use Case:** Use the Side Menu for global navigation (e.g., Home, Profile, Settings, Logout).
- **Trigger:** A "Hamburger" icon (`menu`) located in the **top-left** of the Header on main screens.
- **Behavior:** 
    - It must slide in from the **Left**.
    - It must use an overlay/backdrop to dim the rest of the screen (`rgba(0,0,0,0.5)`).
    - Closing: Users should be able to close it by tapping the backdrop or swiping it back to the left.
- **Visuals:** The menu should be full height and cover about 70-80% of the screen width.

### The Context Menu (Local Actions)
- **Use Case:** **DO NOT** use this for primary navigation. Only use context menus for specific actions on items (e.g., "Edit Post," "Delete Photo," "Share").
- **Trigger:** A "Triple Dot" icon (`ellipsis-vertical`) or a long-press.
- **AI Rule:** If the user needs to go to a completely different section of the app, use the **Side Menu**. If the user needs to perform an action on the current screen, use a **Context Menu**.

### Sidebar Structure (AI Layout Instructions)
When building the Side Menu, use this vertical structure:
1. **Header Section:** User Profile picture, Name, and Email on a `--surface` background.
2. **Body Section:** A list of navigation links with icons (use `outline` icons).
3. **Footer Section:** App version number and "Logout" button at the very bottom.

### Navigation Conflict Rules
- **Rule 1:** On "Root" screens (Home, Dashboard), the top-left icon must be the **Hamburger Menu**.
- **Rule 2:** On "Sub-pages" (Product Detail, Edit Profile), the top-left icon must be a **Back Button**, and the Side Menu should be disabled/locked to prevent navigation errors.

## Capacitor & Native Integration Rules
When implementing UI, the AI must consider Capacitor hardware constraints:

1. **Haptics:** Every primary button click should ideally trigger `Haptics.impact({ style: ImpactStyle.Light })`.
2. **Status Bar:** The UI should be designed with the status bar color in mind (e.g., if the header is white, the status bar text must be dark).
3. **Keyboard:** Use `IonFooter` (or equivalent) to ensure input fields are not covered by the software keyboard.
4. **Icons:** Use **Ionicons** or **Lucide-React**. Never mix icon sets. Use `outline` style for inactive tabs and `filled` for active tabs.

## AI Implementation Instructions (The "Prompt")
> "When building a new component or screen, strictly adhere to the `STYLE_GUIDE.md`. 
> 1. Use the CSS variables defined in the tokens.
> 2. Ensure all touch targets are at least 44x44px.
> 3. Use standard 16px padding for screen gutters.
> 4. If creating a list, use a 'Chevron Right' icon for items that navigate to a new screen.
> 5. Never use hardcoded colors; always use the theme variables."
