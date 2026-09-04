# Guest commerce database boundary

OORO uses a hybrid persistence boundary:

- PostgreSQL/Prisma remains authoritative for users, admins, drivers, vehicles, displays, campaigns, creatives, assets, assignments, proof-of-play, and device commands.
- MongoDB stores guest campaign orders, guest checkout contact data, Razorpay order/payment state, receipt/email state, and webhook idempotency records.

Guest form data is written to MongoDB before Razorpay order creation. If Razorpay is unavailable or not configured, the order remains stored with `CREATED` (configuration unavailable) or `PAYMENT_FAILED` status. The Mongo order may hold a PostgreSQL `campaignId` string after an authorized admin creates a campaign; service logic validates the PostgreSQL campaign and no cross-database foreign key is assumed.

Local API configuration:

```env
MONGODB_URI=mongodb://localhost:27017/ooro
```

Razorpay webhook URL:

```text
POST /api/webhooks/razorpay
```

`RAZORPAY_WEBHOOK_SECRET` is the signing secret configured in Razorpay. It is not the webhook URL.
