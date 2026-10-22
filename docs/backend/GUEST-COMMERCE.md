# Historical guest campaign records

PostgreSQL/Prisma is authoritative for users, admins, campaigns, creatives, assets, assignments, proof-of-play and device commands. MongoDB may retain historical guest campaign orders, provider references, receipts and audit state for reporting.

MongoDB is optional historical-record access only. OORO no longer creates orders, calls a payment provider, verifies signatures, captures payments, processes webhooks or activates campaigns from payment events. Existing financial records and references are retained read-only.

```env
MONGODB_URI=mongodb://localhost:27017/ooro
```

The legacy endpoint remains addressable for clients that have not migrated, but returns HTTP 410 without acknowledging or mutating events:

```text
POST /api/webhooks/razorpay
```
