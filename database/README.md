# PayMemo Database

PayMemo stores private payment context as encrypted blobs. The browser encrypts sensitive metadata
with the wallet-derived vault key before sending records to the backend.

Production uses Supabase when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured on the
server. Local development falls back to `database/paymemo-dev-db.json`, which is created
automatically on the first API write and is ignored by git.

Production should use the schema in `schema.sql` with Postgres/Supabase. Keep these fields
encrypted client-side:

- category
- private note
- counterparty label
- invoice/project references
- accounting/tax labels
- payroll context
- agent task/tool/reason context

Public chain facts such as wallet address, chain ID, tx hash, token, amount, status, and timestamp
can remain queryable.
