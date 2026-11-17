create table if not exists ledger_lines (
  id text primary key,
  created_at timestamptz not null default now(),
  line_type text not null,
  skill text,
  channel text,
  buyer text,
  amount_micro_usdc bigint not null,
  commission_micro_usdc bigint not null default 0,
  status text not null,
  payment_reference text,
  settlement_network text,
  settlement_response text,
  settled_at timestamptz,
  settled_by text,
  notes text,
  item_ref text,
  signature_hash text
);

create unique index if not exists ledger_payment_reference_uidx
  on ledger_lines (payment_reference)
  where payment_reference is not null;

create unique index if not exists ledger_signature_hash_uidx
  on ledger_lines (signature_hash)
  where signature_hash is not null;

create index if not exists ledger_status_idx on ledger_lines (status, created_at);

create table if not exists listings (
  id text primary key,
  created_at timestamptz not null default now(),
  stock_item text not null,
  title text not null,
  body text not null,
  ask_micro_usdc bigint,
  status text not null default 'draft',
  updated_at timestamptz not null default now()
);

create table if not exists looks (
  id text primary key,
  created_at timestamptz not null default now(),
  skill text not null,
  query_label text not null,
  tags text not null default '',
  source text not null
);

create index if not exists looks_created_idx on looks (created_at desc);

create table if not exists offers (
  id text primary key,
  created_at timestamptz not null default now(),
  skill text not null,
  pitch text not null,
  amount_micro_usdc bigint not null,
  status text not null,
  receipt_id text,
  buyer text not null default 'desk',
  query_label text not null,
  source text not null
);

create index if not exists offers_created_idx on offers (created_at desc);

create table if not exists desk_settings (
  id int primary key,
  commission_bps int,
  quote_boost jsonb not null default '{}'::jsonb,
  loop_ticks int not null default 0,
  last_loop_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into desk_settings (id) values (1) on conflict (id) do nothing;
