# Driver payouts

Payout amounts are not calculated from client input. The server creates immutable ledger entries such as `RIDE_EARNING`, `AD_EARNING`, `BONUS`, `REVERSAL`, and `PAYOUT`; wallet summaries are derived from that ledger. The app displays cached summaries and queues payout requests, but never mutates a balance directly.
