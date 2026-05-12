# Swipe-to-delete design

## Summary
Replace the always-visible delete buttons in the shared list UI with a swipe-to-reveal delete action for both pending and completed items. The default row should emphasize content and completion state, while deletion becomes a secondary action revealed by a left swipe.

## Problem
The current delete button is always visible in each row, which makes the destructive action visually louder than it should be. In `src/components/local/shared-list-page.tsx`, the delete icon sits alongside other row actions, so the list feels busier than a typical todo app and the destructive affordance draws too much attention.

## Goals
- Remove the always-visible delete affordance from both list sections.
- Use the same interaction model for `해야 할 항목` and `완료됨`.
- Keep deletion intentionally secondary while still easy on mobile.
- Preserve the existing undo toast after deletion.

## Non-goals
- Instant delete on swipe release.
- Adding a confirmation modal.
- Redesigning item editing, tag display, link actions, or map actions beyond what is necessary to support swipe behavior.
- Changing deletion backend behavior.

## Recommended approach
Use swipe-to-reveal for both sections.
- Default state: no visible delete button.
- User swipes a row left.
- A delete action is revealed on the right side.
- The row stays open after passing the open threshold.
- Actual deletion only happens when the revealed delete button is tapped.
- Tapping elsewhere or swiping back closes the row.
- Only one row can stay open at a time.

This matches common mobile todo patterns better than a permanently visible X button, and it solves the current visual hierarchy problem without adding another visible menu control.

## Alternatives considered
### 1. Reveal actions only on hover or long press
- Pros: cleaner than today, relatively light implementation.
- Cons: weaker discoverability on mobile, inconsistent with the user’s preferred swipe model.

### 2. Overflow menu per row
- Pros: safest destructive pattern and easy to understand.
- Cons: adds an always-visible menu trigger, which still adds row chrome and feels slower for a high-frequency action.

### 3. Immediate swipe-to-delete
- Pros: fastest deletion path.
- Cons: higher accidental-delete risk, especially in a shared list app. This is not recommended even with undo.

## Interaction design
### Closed row
Each row shows its primary content only.
- Pending item: completion control, title, tags, optional link/map affordances, timestamp.
- Completed item: reopen control, title, optional secondary metadata if already present.
- Delete action is hidden.

### Swipe behavior
- Horizontal left drag moves the row with the finger.
- Small drags that do not cross the open threshold return to rest.
- Drags that cross the threshold settle into an open state.
- In the open state, the delete action remains visible until dismissed or used.
- Swiping right from the open state closes the row.

### Delete action
- The revealed action appears behind the row on the right edge.
- Visual treatment should clearly indicate danger, using a destructive color and label/icon combination.
- Tapping the delete action triggers the existing delete flow and undo toast.
- Delete should not trigger on drag release alone.

### Single-open-row rule
- If the user opens a new row, any previously open row closes first.
- If the user taps outside an open row, it closes.
- This prevents the list from becoming visually noisy.

## Gesture rules
- Prioritize vertical scrolling unless horizontal intent is clear.
- Only begin swipe mode after a small horizontal movement threshold.
- Ignore swipe handling when the gesture begins on a clearly interactive sub-control such as the completion button, link button, or map button.
- Once swipe mode is active, suppress accidental taps caused by the same gesture.

## Desktop behavior
Keep the same swipe interaction model as the primary design target. Desktop support can accept mouse drag for parity, but the design should optimize first for touch. If desktop drag feels awkward during implementation, preserving the clean hidden-delete layout is more important than perfect desktop gesture ergonomics.

## Visual design guidance
- Remove the current always-visible X buttons from both pending and completed rows.
- Keep the row at rest visually calm and content-first.
- The revealed delete area should be wide enough to tap comfortably.
- The delete action should feel secondary when closed and obvious when revealed.
- Use the same spacing and motion language already present in the list so the interaction feels native to the current UI.

## Data and state model
Likely UI state additions in `src/components/local/shared-list-page.tsx`:
- A single `openSwipeItemId` to track which row is currently open.
- Drag offset state for the actively swiped row.
- Gesture mode state to distinguish horizontal swipe from ordinary tap/scroll.

Deletion should continue to call the existing `handleDeleteItem` path so the optimistic removal and undo flow remain unchanged.

## Error handling
- If deletion fails, the current restore behavior should remain unchanged.
- If a swipe is interrupted or cancelled, the row should snap cleanly to either closed or open based on threshold.
- If another action is triggered while a row is open, the row can close first to reduce conflicts.

## Testing focus
- Swipe left below threshold closes back to rest.
- Swipe left above threshold opens the delete action.
- Swipe right closes an open row.
- Only one row can be open at a time.
- Tapping the revealed delete action deletes the item and shows undo.
- Undo still restores the deleted item.
- Completion toggle, link tap, map tap, and editing entry do not regress.
- Vertical scrolling remains reliable on mobile.

## Rollout recommendation
Implement this first for the shared list page only in `src/components/local/shared-list-page.tsx`. Keep the backend deletion logic unchanged and treat this as a UI interaction refinement.

## Decision
Proceed with a unified swipe-to-reveal delete interaction for both pending and completed items, with delete confirmed by tapping the revealed action rather than by swipe release.