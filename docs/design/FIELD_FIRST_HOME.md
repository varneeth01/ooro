# OORO field-first landing page

This branch replaces the abstract landing-page illustration with an editorial homepage designed around **real OORO field media** supplied by the founder.

## Changes
- Short, direct headline about passengers in autos; clear product explanation and existing /advertise conversion link.
- Image-first real-world hero, four-step campaign process, original field photo gallery, native click-to-play installation video, business audience paths, final conversion section.
- Scoped styles, responsive layouts, restrained entrance and hover motion, reduced-motion accessibility.
- No new APIs, booking changes, guaranteed reach claims, fabricated customer counts or production configuration changes.

## Required media assets — NOT IN THIS BRANCH YET
The following assets are available as an optimized downloadable bundle in the associated ChatGPT conversation and **must be committed into public/field before merging**:
- public/field/ooro-bengaluru-auto-01.webp
- public/field/ooro-bengaluru-auto-02.webp
- public/field/ooro-installation-01.mp4

Additional original clip: public/field/ooro-installation-02.mp4 (not referenced on the page).

The media is not included in this GitHub branch because the repository connector cannot upload the local conversation's binary assets. This is an explicit release blocker: **do not merge/deploy until media assets are added and verified**, and verify consent and any visible identifying vehicle registration numbers.

## Acceptance required
- Install real files, run build/typecheck/lint.
- Verify desktop (1440), tablet (768), mobile (390), real media loading, keyboard tab/focus, reduced motion, native video controls, hero crop, all CTAs.
- Test the full /advertise flow up to but excluding live payment/booking submission.
- Capture true browser screenshots in a disposable local/preview environment; review typographic rhythm, image cropping, cumulative layout shift.
- Keep the existing Coolify production deployment untouched until acceptance.
