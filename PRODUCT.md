# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

OORO administrators and operations staff monitoring the physical advertising-screen fleet, campaign delivery, creative approval, proof-of-play, drivers, payouts, and system access.

## Product Purpose

OORO Control gives the operations team one place to understand what the network is doing now, find delivery or device problems, and take the next operational action. The primary admin home is fleet-first: operators scan screen health, see the creative reported as playing, inspect proof and schedules, and act without losing context.

## Positioning

The product connects campaign operations to authenticated, location-aware screens inside vehicles. Device-reported playback and proof-of-play are distinct from scheduled delivery; the interface must not present a schedule as evidence that an ad actually played.

## Operating Context

The team manages live screens, creative assets, campaigns, schedules, screen groups, vehicles and routes, device health, DeviceOS, proof-of-play, orders, agencies, verification, and role-based team access. Operators frequently move from a fleet overview into one screen, its current creative, recent heartbeat, location, schedule, proof, and safe device commands.

## Capabilities and Constraints

- Preserve the existing role-based admin navigation and permissions.
- Preserve all current admin routes and workflows.
- Show the current creative only from device-reported playback state. Label stale or offline reports as unverified.
- Creative previews are asset previews, not live video streams from a screen.
- Existing device commands remain on the acknowledged command queue; destructive device actions must not be implied by interface-only controls.
- The interface must support desktop operations and remain usable on small screens.

## Brand Commitments

OORO uses a deep-black and titanium-neutral operating surface with neon yellow as a precise brand signal. The experience should feel direct, premium, and operational rather than decorative. Existing OORO naming and logo assets remain authoritative.

## Evidence on Hand

- Existing admin implementation and API contracts in this repository.
- User-supplied reference screenshots showing screen management, creative library, playlists, scheduling, and layouts; these are workflow references, not OORO visual-brand references.
- Device heartbeat, current playback, creative asset, location, manifest, and proof-of-play fields already exist in the backend.

## Product Principles

1. Live network truth before scheduled intent.
2. One scan should reveal what needs attention.
3. Keep action next to evidence and preserve operational context.
4. Make stale, missing, and unverified states explicit.
5. Brand through disciplined contrast and detail, never at the cost of scanability.

## Accessibility & Inclusion

All essential controls must be keyboard reachable, carry visible focus, preserve readable contrast, and expose loading, empty, error, and reduced-motion states.
