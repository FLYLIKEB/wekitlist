# Main integration design

## Summary
Integrate the remaining unmerged work into `main` with a hybrid approach that prioritizes the web search feature first, then absorbs the still-unmerged home-screen changes in a way that fits the current `main` branch.

## Goals
- Restore the local web search feature on the current `main` branch.
- Preserve the current hydration fix already on `main`.
- Absorb relevant unmerged branch work without blindly replaying every commit.
- End with verified behavior and push the final result to remote `main`.

## Non-goals
- No broad refactor outside the affected local home screen and shared list UI.
- No replay of unrelated historical commits just to preserve commit shape.
- No new product scope beyond web search and the known unmerged home-screen adjustments.

## Current state
- `main` is aligned with `origin/main` at `e0761c4`.
- Historical local work includes `6f256cc feat: add google search shortcut`, which modified `src/components/local/shared-list-page.tsx` and `tests/shared-list-page.test.tsx`.
- The unmerged branch `feat/home-screen-redesign` differs from `main` in `src/components/local/local-app.tsx` and `tests/local-app.test.tsx`.
- `main` currently contains a hydration mismatch fix in `src/components/local/local-app.tsx` using `useSyncExternalStore`; the redesign branch uses an older `typeof window === 'undefined'` guard and should not replace the current fix wholesale.

## Chosen approach
Chosen direction: hybrid integration.

Use commit history and branch diffs as source material, but integrate by feature rather than by blindly merging or cherry-picking whole branch history.

### Why this approach
- The web search feature already exists in prior local work and can likely be restored with minimal change.
- The redesign branch overlaps a file that has since received a correctness fix on `main`, so a full branch merge would risk regressing hydration behavior.
- A feature-by-feature integration keeps the blast radius small and makes verification clearer.

## Integration scope
### 1. Web search restoration
Primary source:
- historical commit `6f256cc`

Target files:
- `src/components/local/shared-list-page.tsx`
- `tests/shared-list-page.test.tsx`

Planned outcome:
- Each shared list item should expose a Google search link beside the Kakao map action.
- The link should open a Google search for the item title in a new tab.
- Existing item actions and accessibility labels should remain intact.

### 2. Home-screen unmerged branch absorption
Primary source:
- branch `feat/home-screen-redesign`

Target files:
- `src/components/local/local-app.tsx`
- `tests/local-app.test.tsx`

Planned outcome:
- Keep the current premium home-screen design already present on `main`.
- Keep the hydration-safe `useSyncExternalStore` behavior from `main`.
- Manually absorb only the branch changes that are still relevant after the hydration fix, such as test expectations that should match current behavior.
- Do not replace the current `main` implementation with the branch version if that would regress hydration safety.

## Data flow and behavior
### Shared list actions
- Shared list items continue to render their existing action row.
- The Google search action derives its URL from `item.title` via URL encoding.
- The Kakao map button remains a button-based deep-link action.
- The Google action remains a normal external link.

### Home screen entry handling
- `main` remains the source of truth for entry-context and redirect logic.
- Redirect behavior based on `lastVisitedListPath` must not change.
- Any unmerged branch adjustment is subordinate to preserving the current redirect and hydration behavior.

## Error handling
- No new user-visible error state is needed for the Google search link because it is a normal anchor navigation.
- Existing home-screen error handling for list creation remains unchanged.
- If branch absorption reveals contradictory test expectations, update tests to reflect the preserved `main` behavior rather than weakening the implementation.

## Testing and verification
### Automated checks
- Run targeted tests for `tests/shared-list-page.test.tsx`.
- Run targeted tests for `tests/local-app.test.tsx`.
- Run any additional focused test command needed if related failures appear.

### UI verification
- Start the local app and verify the shared list page in a browser.
- Confirm the Google search action appears next to the Kakao map action for shared list items.
- Confirm the link opens the expected Google search URL.
- Confirm the home screen still renders without hydration mismatch behavior and that return navigation still works.

## Implementation steps
1. Restore the Google search UI and test coverage from the historical local commit into current `main`.
2. Compare the redesign branch changes against current `main` and absorb only still-relevant adjustments.
3. Run targeted tests.
4. Run the app and verify the shared-list and home-screen flows in the browser.
5. Commit the integrated changes.
6. Push the final result to `origin/main`.

## Success criteria
- Google search is available again on shared list items.
- Home-screen behavior on `main` remains hydration-safe.
- Relevant unmerged branch differences are resolved into current `main` without regressions.
- Tests pass for the affected areas.
- The final integrated result is pushed to remote `main`.
