# Next-Agent Handoff: Hospitality 2035 Events

## Start here

1. Import `hospitality/.forgewp/hospitality.zip` into the local WordPress site. The ZIP has not been imported yet, so the live local site still runs the older theme.
2. After import, move the currently active **Events Manager** (`/events-manager`) and **Event Manager Bookings** (`/event-manager-bookings`) pages to Trash. Keep **Events** (`/events`) and **My Bookings** (`/my-bookings`). The old installed theme recreated the duplicate pages after earlier Trash attempts; the new export no longer declares their templates.
3. Test `/events`, `/events/test-berlin-event/`, and `/my-bookings`. Check event card/single-event styling, button alignment, and Add to Calendar on a visible active page.
4. Do not implement event payments until the user chooses a payment flow.

## Current setup and behavior

- Events Manager is the only event data source. In Events Manager → Settings → Pages, **Events** and **My Bookings** were selected; WordPress Event Archives were disabled.
- Theme routes are `/events`, `/events/{event-slug}`, and `/my-bookings`. The event and bookings presentation components remain in use; they were moved out of `src/app/pages` so ForgeWP does not generate extra WordPress pages from them.
- Latest CSS changes increase event detail typography, align CTA buttons, and standardize their sizing. The static event description is used instead of the event excerpt.
- A previous real click on Add to Calendar in an active browser tab opened the five-option dropdown. Re-test after importing the latest ZIP; don’t treat an earlier timeout on a hidden tab as proof it is broken.
- **Book Now does not charge.** It links to the Events Manager booking form. EDD/Stripe handles EDD purchases and is not integrated with Events Manager. Until a payment flow is designed and tested, use free events or treat bookings as unpaid requests.
- My Bookings depends on the account associated with the booking. A booking made while logged out with an existing account’s email may not appear as expected; see the setup guide for the guest-booking setting.

## Deliverables and validation

- Theme ZIP: `hospitality/.forgewp/hospitality.zip`
- Setup guide: `hospitality/EVENTS_MANAGER_SETUP_GUIDE.md`
- Latest changes include `hospitality/src/app/routes.tsx`, `hospitality/src/app/globals.css`, the event and bookings page components under `hospitality/src/app/components/`, and the setup guide.
- Typecheck, Vite build, and theme export passed. PHP lint passed for 80 generated files. ZIP checks confirmed updated CSS, retained `/my-bookings`, and absence of the obsolete page templates/auto-page names.
- The guide was updated after export; it is a repository document and is not needed to install the ZIP.

## WordPress and workspace cautions

- At the last Pages-list check, duplicate active copies had reappeared as **Events Manager** (ID `3289`) and **Event Manager Bookings** (ID `3291`). Recheck the list after importing before trashing; IDs may change.
- Shared browser pages are available: active Pages list `6703012d-ff1d-4523-9fd3-462f36e68aa9`; Events Manager Settings `6ec96209-6e14-488f-9656-570320c6b6fc`; test event `9246859f-8aa2-4b5a-b3bb-465c01ace77f`; duplicate bookings page `fcbccbaf-ed0b-4b5e-a6c1-a82bf464518e`.
- The worktree contains many unrelated pre-existing modifications. Do not revert or commit them as part of this handoff.