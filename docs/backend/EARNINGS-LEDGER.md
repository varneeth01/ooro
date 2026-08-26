# Earnings and ledger

The client sends measurements, never amounts. The backend calculates earnings after ride completion and proof finalization. `EarningEntry` is append-only in application behavior; wallet balances are derived from ledger rows. Payouts use a provider interface and remain `PROCESSING` until a real payout provider is integrated.
