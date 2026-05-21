-- PayMemo encrypted cloud sync schema.
-- Private user metadata is stored only as encrypted blobs produced client-side.

create table if not exists vault_records (
  id text primary key,
  wallet_address text not null,
  public_record jsonb not null,
  encrypted_metadata jsonb not null,
  sync_status text not null default 'synced' check (
    sync_status in ('local', 'synced', 'sync-failed')
  ),
  updated_at timestamptz not null default now()
);

create index if not exists vault_records_wallet_updated_idx
  on vault_records (wallet_address, updated_at desc);

create table if not exists extension_records (
  id text primary key,
  record jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists extension_records_updated_idx
  on extension_records (updated_at desc);

create table if not exists extension_pairings (
  install_token text not null,
  wallet_address text not null,
  created_at timestamptz not null default now(),
  primary key (install_token, wallet_address)
);

create index if not exists extension_pairings_wallet_idx
  on extension_pairings (wallet_address);

create table if not exists agent_memory_records (
  id text primary key,
  record jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_memory_records_updated_idx
  on agent_memory_records (updated_at desc);

create table if not exists paymemo_domain_records (
  id text primary key,
  wallet_address text not null,
  type text not null check (
    type in ('invoice', 'batch-payout', 'agent-payment-intent')
  ),
  public_data jsonb not null,
  encrypted_metadata jsonb not null,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists paymemo_domain_records_wallet_type_updated_idx
  on paymemo_domain_records (wallet_address, type, updated_at desc);

create table if not exists users (
  wallet_address text primary key,
  created_at timestamptz not null default now()
);

create table if not exists payment_intents (
  id text primary key,
  wallet_address text not null references users(wallet_address),
  chain_id integer not null,
  expected_from text,
  expected_to text not null,
  expected_token text not null,
  expected_amount text not null,
  encrypted_metadata jsonb not null,
  status text not null check (
    status in (
      'pending_signature',
      'pending_chain',
      'confirmed',
      'failed',
      'rejected',
      'needs-review'
    )
  ),
  tx_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists transactions (
  id text primary key,
  wallet_address text not null references users(wallet_address),
  chain_id integer not null,
  tx_hash text not null,
  from_address text,
  to_address text,
  token text not null,
  amount text not null,
  status text not null,
  encrypted_metadata jsonb not null,
  block_number bigint,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists invoices (
  id text primary key,
  owner_wallet text not null references users(wallet_address),
  invoice_number text not null,
  amount text not null,
  token text not null,
  payer text,
  payee text not null,
  encrypted_invoice_metadata jsonb not null,
  status text not null check (status in ('draft', 'sent', 'paid', 'cancelled')),
  linked_tx_hash text,
  created_at timestamptz not null default now()
);

create table if not exists counterparties (
  id text primary key,
  owner_wallet text not null references users(wallet_address),
  counterparty_wallet text,
  encrypted_name jsonb not null,
  encrypted_role jsonb,
  encrypted_notes jsonb,
  created_at timestamptz not null default now()
);

create table if not exists batch_payouts (
  id text primary key,
  owner_wallet text not null references users(wallet_address),
  chain_id integer not null,
  encrypted_batch_name jsonb not null,
  encrypted_notes jsonb,
  status text not null,
  created_at timestamptz not null default now()
);

create table if not exists batch_payout_items (
  id text primary key,
  batch_id text not null references batch_payouts(id) on delete cascade,
  recipient_address text not null,
  amount text not null,
  token text not null,
  status text not null,
  tx_hash text,
  encrypted_metadata jsonb not null
);

create table if not exists agent_payment_intents (
  id text primary key,
  owner_wallet text not null references users(wallet_address),
  agent_id text not null,
  task_id text not null,
  tool_or_service text,
  expected_recipient text not null,
  expected_amount text not null,
  token text not null,
  encrypted_reason_context jsonb not null,
  status text not null,
  tx_hash text,
  created_at timestamptz not null default now()
);

create table if not exists linked_transactions (
  id text primary key,
  source_tx text not null,
  destination_tx text,
  relation_type text not null check (
    relation_type in ('bridge', 'swap', 'invoice', 'payroll', 'refund', 'agent-task')
  ),
  encrypted_metadata jsonb,
  created_at timestamptz not null default now()
);

-- RLS hardening.
-- PayMemo currently reads/writes through server APIs using the Supabase service-role key.
-- Enabling RLS blocks direct anon/client access to encrypted tables by default.
-- The service-role key bypasses RLS server-side; keep it out of VITE_* env vars.

alter table if exists vault_records enable row level security;
alter table if exists extension_records enable row level security;
alter table if exists agent_memory_records enable row level security;
alter table if exists paymemo_domain_records enable row level security;
alter table if exists users enable row level security;
alter table if exists payment_intents enable row level security;
alter table if exists transactions enable row level security;
alter table if exists invoices enable row level security;
alter table if exists counterparties enable row level security;
alter table if exists batch_payouts enable row level security;
alter table if exists batch_payout_items enable row level security;
alter table if exists agent_payment_intents enable row level security;
alter table if exists linked_transactions enable row level security;

drop policy if exists "service role manages vault records" on vault_records;
create policy "service role manages vault records"
  on vault_records for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role manages extension records" on extension_records;
create policy "service role manages extension records"
  on extension_records for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role manages agent memory records" on agent_memory_records;
create policy "service role manages agent memory records"
  on agent_memory_records for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role manages domain records" on paymemo_domain_records;
create policy "service role manages domain records"
  on paymemo_domain_records for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role manages users" on users;
create policy "service role manages users"
  on users for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role manages payment intents" on payment_intents;
create policy "service role manages payment intents"
  on payment_intents for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role manages transactions" on transactions;
create policy "service role manages transactions"
  on transactions for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role manages invoices" on invoices;
create policy "service role manages invoices"
  on invoices for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role manages counterparties" on counterparties;
create policy "service role manages counterparties"
  on counterparties for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role manages batch payouts" on batch_payouts;
create policy "service role manages batch payouts"
  on batch_payouts for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role manages batch payout items" on batch_payout_items;
create policy "service role manages batch payout items"
  on batch_payout_items for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role manages agent payment intents" on agent_payment_intents;
create policy "service role manages agent payment intents"
  on agent_payment_intents for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role manages linked transactions" on linked_transactions;
create policy "service role manages linked transactions"
  on linked_transactions for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
