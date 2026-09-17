# Walkthrough: Property & Manager Card Strict Horizontal Navigation

## Overview

Fixed gesture and scroll handling on the **Property + Assigned Property Manager** card on the **Lease & Rent** page (`/my-lease`) so that vertical scroll/swipe movement has zero effect on the active lease and allows standard vertical page scrolling, while horizontal trackpad/touch movements navigate between leased properties.

---

## 1. Interaction & Gesture Rules Applied

### [`PropertyManagerHeaderCard.jsx`](file:///c:/Users/sanka/OneDrive/Desktop/tenant-management-system/client/src/components/lease/PropertyManagerHeaderCard.jsx)

- **Mouse Wheel / Trackpad**:
  - `deltaY` (vertical wheel scrolling) is completely ignored for lease switching.
  - Normal vertical page scrolling proceeds without interruption (no `preventDefault()` on vertical delta).
  - Only when horizontal movement is dominant (`Math.abs(deltaX) > Math.abs(deltaY)`):
    - `deltaX > 0` (scroll right / trackpad swipe left) → Next leased property.
    - `deltaX < 0` (scroll left / trackpad swipe right) → Previous leased property.
    - `e.preventDefault()` is called ONLY during horizontal gestures to prevent browser history back/forward traversal.
- **Touch / Mobile Gestures**:
  - Calculates `deltaX = currentX - startX` and `deltaY = currentY - startY`.
  - Only triggers property switching when horizontal gesture is dominant: `Math.abs(deltaX) > Math.abs(deltaY)`.
  - Vertical finger dragging over the card allows the mobile browser to scroll the page up/down normally.
- **Keyboard Navigation**:
  - `ArrowRight` → Next leased property.
  - `ArrowLeft` → Previous leased property.
  - `ArrowDown` / `ArrowUp` → Retained for normal vertical page scrolling.
- **Visuals & Indicators**:
  - Retains existing `1 / 2` counter and `<` / `>` arrow controls.
  - Text hint: `Swipe horizontally to switch`.

---

## 2. Verification

- **Acceptance Tests**:
  - ✓ Cursor over card → scroll mouse wheel up/down → lease does NOT change, page scrolls vertically.
  - ✓ Cursor over card → horizontal trackpad swipe left/right → lease changes.
  - ✓ Touch the card → swipe up/down → lease does NOT change and page scrolls normally.
  - ✓ Touch the card → swipe left/right → next/previous lease changes.
  - ✓ Existing `1 / 2` indicator and arrow buttons continue working.
- **Client Build**: `npm run build` compiled with exit code `0`.
- **Git Commit**: `9c8f21e` pushed to `origin/main`.
