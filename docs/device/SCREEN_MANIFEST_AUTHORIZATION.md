# Screen manifest authorization and offline playback

The Screen API currently issues an authenticated manifest lease for 15 minutes. The Android player refreshes two minutes before `validUntil`, retries transient failures with capped exponential backoff and jitter, and keeps the last successfully committed manifest if a refresh fails. It checks the server-issued expiry before selecting cached main or sponsored media; there is no client-side grace period.

V3 adds a connectivity-restoration refresh trigger throttled to one request per 30 seconds. A successful authenticated empty manifest replaces the prior playlist. A failed request does not replace it. A revoked or expired lease fails closed when its `validUntil` is reached.

The 15-minute lease is a tradeoff: shorter leases reduce the maximum stale authorization window but make intermittent mobile connectivity more likely to interrupt offline playback; longer leases improve connectivity tolerance but delay enforcement of revocation. This change deliberately does not alter the lease. Any server policy change should be authorized by the business owner and must keep the lease bounded by campaign, schedule, allocation and revocation constraints. Alternatives include a server-selected lease duration by device/connectivity class or per-manifest lease bounded by the earliest applicable campaign/allocation expiry. Neither is enabled here.

V1 and V2 display configuration remain the default. V3 is opt-in per display through Admin → display zones and should only be selected for a Screen Player build that understands the V3 sponsored slot. Main and sponsored assets are downloaded and checksum-verified before the manifest is committed; both slots share the same authorization lease and item schedule checks.
