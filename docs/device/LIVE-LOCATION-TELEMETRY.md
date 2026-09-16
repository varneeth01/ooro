# Live screen location and retention

Screen location is operationally sensitive. GPS is collected only by the paired kiosk player after fine/coarse permission is granted. Playback does not depend on permission, and the app does not request background-location access. Device API tokens remain in the existing device-auth flow and are never included in admin DTOs.

Moving devices heartbeat at approximately 15-second intervals; stationary or unavailable-speed devices heartbeat at approximately 90 seconds. Android requests location updates no more frequently than 10 seconds and with a 75-meter minimum displacement. The API rejects non-finite/out-of-range coordinates and location fixes older than 10 minutes or more than 2 minutes in the future. Append-only route points are deduplicated until about 125 meters of movement or 90 seconds have elapsed. Admin history requests default to 24 hours and are capped at 1,000 points.

There is currently no automatic deletion or archival job for `DisplayLocationEvent`. Preserve history until an operator-approved retention job is configured. The intended initial policy is 30 days of high-resolution points, followed by a reviewed downsample/archive policy; do not treat this target as enforced until that job is deployed. The main dashboard reads display current-state columns and does not load route history.

Admin location endpoints require an authenticated admin role. Avoid logging coordinates, exporting them to public endpoints, or adding public geocoding. For local physical-device work, use a reachable developer LAN API URL via Gradle properties; never bake that address into production source.
