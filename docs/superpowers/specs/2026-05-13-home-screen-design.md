# Home screen redesign spec

## Summary
Redesign the home screen to feel more premium, minimal, and Apple-like while keeping the primary action focused on creating a new list. The screen should emphasize the Wekitlist brand more clearly than today, reduce visual noise, and be optimized primarily for mobile use.

## Goals
- Make the home screen feel more polished and product-like.
- Put new list creation at the visual center of the experience.
- Increase brand presence with a more explicit Wekitlist header.
- Preserve the current lightweight and approachable feel.
- Maximize mobile usability since the product is used mainly on mobile.

## Non-goals
- No change to the list creation flow logic.
- No change to routing or redirect behavior.
- No broader redesign of list detail pages or the about page.

## Current state
The current home screen in `src/components/local/local-app.tsx` is functional and minimal, but it reads more like a basic form than a refined product landing screen. Brand presence is light, the layout hierarchy is shallow, and the create form blends too closely into the rest of the page.

## Design direction
Chosen direction: brand hero layout.

The new home screen should use a quiet, Apple Notes-like visual language with stronger structure:
- a clearly branded top section
- a short, firm product headline
- a single prominent rounded creation card
- minimal supporting copy
- strong whitespace and restrained contrast

The tone should feel calm, premium, and direct rather than playful or feature-heavy.

## Layout
### Overall structure
- Keep the existing narrow centered column layout.
- Increase perceived quality through spacing, typography hierarchy, and grouping rather than additional elements.
- Preserve a single-column composition for all sizes, especially mobile.

### Section order
1. Brand block
2. Headline and short supporting copy
3. Primary creation card
4. Low-emphasis contextual navigation when returning from a list

### Brand block
- Show the Wekitlist brand more explicitly than today.
- Use a small logo mark if available plus the `Wekitlist` wordmark.
- Place it at the top with restrained sizing so it feels premium, not loud.

### Hero copy
- Replace the current softer marketing copy with a shorter, more product-like heading.
- Keep the supporting line concise and utility-driven.
- The copy should explain the core value quickly without introducing multiple concepts.

### Creation card
- The form should sit inside a clearly separated rounded container.
- The card should become the main focal point of the page.
- Inputs and button should feel quieter and more intentional than the current raw stack.
- The CTA should use stronger contrast than the rest of the screen.

### Return navigation
- If `entryContext` exists, keep the return affordance visible but secondary.
- It should not visually compete with the creation card or headline.
- Prefer a softer text-link or low-emphasis pill treatment.

## Visual system
### Tone
- Bright white background.
- Soft neutral borders.
- Deep black text for emphasis.
- Minimal accent usage.
- Strong reliance on whitespace.

### Typography
- Small but clear brand label.
- More refined headline hierarchy than the current `text-4xl` treatment if needed for mobile balance.
- Supporting text should remain readable but quiet.
- Avoid long paragraphs.

### Shape and surfaces
- Rounded card corners with a more premium surface feel.
- Inputs should feel integrated into the card rather than floating as separate generic controls.
- Keep shadows subtle or nearly absent.

## Interaction behavior
### Visual flow
The screen should guide attention in this order:
1. Brand
2. Headline
3. Creation card
4. Primary button

### Inputs
- Keep borders soft at rest.
- Increase clarity on focus without making the screen feel busy.
- Ensure touch targets remain comfortable on mobile.

### CTA
- Change the primary button copy to `새 리스트 만들기`.
- Keep the button visually dominant as the single strongest emphasis point.

### Error handling
- Keep inline error messaging.
- Tone should remain calm and compact so the page does not feel alarm-heavy.

### Loading state
- Preserve the existing submit loading state behavior.
- Ensure loading text still fits comfortably on smaller screens.

## Mobile-first requirements
Because users mainly use the app on mobile, mobile optimization is mandatory:
- Design for small screens first rather than scaling down from desktop.
- Keep all primary content above the fold as much as reasonably possible on common mobile heights.
- Maintain generous tap targets for inputs, button, and return navigation.
- Avoid visual density that makes the top section push the form too low.
- Ensure spacing works with iPhone-sized widths and safe areas.
- Maintain clean visual rhythm without requiring horizontal scanning.

## Content guidance
Exact final copy can be refined during implementation, but it should follow these rules:
- headline: short and firm
- supporting text: one concise utility sentence
- button: direct action wording
- brand: clearly visible, more prominent than current

## Implementation scope
Primary file:
- `src/components/local/local-app.tsx`

Possible supporting file if needed:
- `src/app/layout.tsx` only if surrounding spacing or footer treatment needs minor adjustment for harmony

The redesign should stay contained to the home screen unless a very small layout adjustment is required for visual consistency.

## Testing and verification
- Verify the golden path for creating a new list on the redesigned home screen.
- Verify the returning-from-list state still shows a usable secondary navigation control.
- Verify the loading state and error state still read clearly.
- Verify the screen on mobile-sized viewports first.
- Confirm no regression in redirect behavior when `lastVisitedListPath` exists.

## Success criteria
- The home screen feels noticeably more premium and intentional.
- Brand presence is stronger without becoming noisy.
- New list creation is the unmistakable primary action.
- The page feels excellent on mobile and remains clean on larger screens.
- Existing functionality continues to work unchanged.
