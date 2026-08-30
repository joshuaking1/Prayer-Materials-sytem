-- 2026-08-30 consignment: give stock to sellers to go and sell

alter type public.inventory_movement_type add value if not exists 'stock_issued';
alter type public.inventory_movement_type add value if not exists 'stock_returned';

create sequence if not exists public.stock_issue_seq;

create table if not exists public.stock_issues (
  id uuid primary key default gen_random_uuid(),
  issue_number text not null,
  location_id uuid not null,
  session_id uuid,
  seller_name text not null,
  seller_contact text,
  status text not null default 'issued' check (status in ('issued', 'settled', 'cancelled')),
  notes text,
  settlement_notes text,
  issued_by uuid not null,
  issued_at timestamptz not null default now(),
  settled_by uuid,
  settled_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.stock_issue_items (
  id uuid primary key default gen_random_uuid(),
  stock_issue_id uuid not null references public.stock_issues(id) on delete cascade,
  product_id uuid not null,
  units_per_box_snapshot integer not null default 1,
  units_issued integer not null default 0,
  units_sold integer not null default 0,
  units_returned integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.stock_issues enable row level security;
alter table public.stock_issue_items enable row level security;

create policy "Authenticated read stock_issues"
  on public.stock_issues
  for select
  to authenticated
  using (true);

create policy "Authenticated read stock_issue_items"
  on public.stock_issue_items
  for select
  to authenticated
  using (true);

create or replace function public.record_stock_issue(
  p_seller_name text,
  p_seller_contact text default null,
  p_items jsonb default '[]'::jsonb,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_location_id uuid;
  v_session_id uuid;
  v_issue_number text;
  v_issue_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_units integer;
  v_units_per_box integer;
  v_balance_id uuid;
  v_quantity_before integer;
  v_quantity_after integer;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select profiles.location_id into v_location_id
  from profiles
  where profiles.id = v_user_id
    and profiles.is_active = true;

  if v_location_id is null then
    raise exception 'NO_LOCATION_ASSIGNED';
  end if;

  select daily_sessions.id into v_session_id
  from daily_sessions
  where daily_sessions.location_id = v_location_id
    and daily_sessions.business_date = current_date
    and daily_sessions.status in ('open', 'reopened')
  order by daily_sessions.opened_at desc
  limit 1;

  if v_session_id is null then
    raise exception 'NO_OPEN_DAILY_SESSION';
  end if;

  if nullif(trim(coalesce(p_seller_name, '')), '') is null then
    raise exception 'SELLER_NAME_REQUIRED';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'ISSUE_ITEMS_REQUIRED';
  end if;

  v_issue_number := 'CONS-' || lpad(nextval('public.stock_issue_seq')::text, 5, '0');

  insert into stock_issues (
    issue_number,
    location_id,
    session_id,
    seller_name,
    seller_contact,
    status,
    notes,
    issued_by,
    issued_at
  )
  values (
    v_issue_number,
    v_location_id,
    v_session_id,
    trim(p_seller_name),
    nullif(trim(coalesce(p_seller_contact, '')), ''),
    'issued',
    nullif(trim(coalesce(p_notes, '')), ''),
    v_user_id,
    now()
  )
  returning id into v_issue_id;

  for v_item in
    select value from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_units := coalesce((v_item ->> 'units')::integer, 0);

    if v_product_id is null or v_units <= 0 then
      raise exception 'INVALID_ISSUE_ITEM';
    end if;

    if not exists (
      select 1 from products
      where products.id = v_product_id
        and products.is_active = true
    ) then
      raise exception 'INVALID_PRODUCT';
    end if;

    select product_packaging_history.units_per_box into v_units_per_box
    from product_packaging_history
    where product_packaging_history.product_id = v_product_id
      and product_packaging_history.effective_to is null
    order by product_packaging_history.effective_from desc
    limit 1;

    if v_units_per_box is null or v_units_per_box <= 0 then
      raise exception 'PACKAGING_NOT_FOUND';
    end if;

    select inventory_balances.id, inventory_balances.quantity
      into v_balance_id, v_quantity_before
    from inventory_balances
    where inventory_balances.location_id = v_location_id
      and inventory_balances.product_id = v_product_id
    for update;

    if v_balance_id is null then
      raise exception 'INSUFFICIENT_STOCK';
    end if;

    if v_quantity_before < v_units then
      raise exception 'INSUFFICIENT_STOCK';
    end if;

    v_quantity_after := v_quantity_before - v_units;

    update inventory_balances
    set quantity = v_quantity_after,
        updated_at = now()
    where id = v_balance_id;

    insert into stock_issue_items (
      stock_issue_id,
      product_id,
      units_per_box_snapshot,
      units_issued
    )
    values (
      v_issue_id,
      v_product_id,
      v_units_per_box,
      v_units
    );

    insert into inventory_movements (
      location_id,
      product_id,
      session_id,
      movement_type,
      quantity_before,
      quantity_change,
      quantity_after,
      reference_type,
      reference_id,
      reason_code,
      reason,
      created_by
    )
    values (
      v_location_id,
      v_product_id,
      v_session_id,
      'stock_issued',
      v_quantity_before,
      -v_units,
      v_quantity_after,
      'stock_issue',
      v_issue_id,
      'stock_issued_to_seller',
      'Stock issued to ' || trim(p_seller_name),
      v_user_id
    );
  end loop;

  insert into audit_logs (
    user_id,
    location_id,
    session_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values,
    reason
  )
  values (
    v_user_id,
    v_location_id,
    v_session_id,
    'stock_issue_created',
    'stock_issue',
    v_issue_id,
    null,
    jsonb_build_object(
      'issue_number', v_issue_number,
      'seller_name', trim(p_seller_name),
      'items', p_items
    ),
    nullif(trim(coalesce(p_notes, '')), '')
  );

  return v_issue_id;
end;
$$;

grant execute on function public.record_stock_issue(text, text, jsonb, text) to authenticated;

create or replace function public.settle_stock_issue(
  p_stock_issue_id uuid,
  p_items jsonb default '[]'::jsonb,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_location_id uuid;
  v_session_id uuid;
  v_status text;
  v_seller_name text;
  v_item jsonb;
  v_product_id uuid;
  v_units_sold integer;
  v_units_returned integer;
  v_units_issued integer;
  v_balance_id uuid;
  v_quantity_before integer;
  v_quantity_after integer;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select profiles.location_id into v_location_id
  from profiles
  where profiles.id = v_user_id
    and profiles.is_active = true;

  if v_location_id is null then
    raise exception 'NO_LOCATION_ASSIGNED';
  end if;

  select daily_sessions.id into v_session_id
  from daily_sessions
  where daily_sessions.location_id = v_location_id
    and daily_sessions.business_date = current_date
    and daily_sessions.status in ('open', 'reopened')
  order by daily_sessions.opened_at desc
  limit 1;

  if v_session_id is null then
    raise exception 'NO_OPEN_DAILY_SESSION';
  end if;

  select stock_issues.status, stock_issues.seller_name
    into v_status, v_seller_name
  from stock_issues
  where stock_issues.id = p_stock_issue_id
    and stock_issues.location_id = v_location_id
  for update;

  if v_status is null then
    raise exception 'ISSUE_NOT_FOUND';
  end if;

  if v_status <> 'issued' then
    raise exception 'ISSUE_ALREADY_SETTLED';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'SETTLE_ITEMS_REQUIRED';
  end if;

  for v_item in
    select value from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_units_sold := coalesce((v_item ->> 'units_sold')::integer, 0);
    v_units_returned := coalesce((v_item ->> 'units_returned')::integer, 0);

    if v_product_id is null or v_units_sold < 0 or v_units_returned < 0 then
      raise exception 'INVALID_SETTLE_ITEM';
    end if;

    select stock_issue_items.units_issued into v_units_issued
    from stock_issue_items
    where stock_issue_items.stock_issue_id = p_stock_issue_id
      and stock_issue_items.product_id = v_product_id
    for update;

    if v_units_issued is null then
      raise exception 'ITEM_NOT_IN_ISSUE';
    end if;

    if (v_units_sold + v_units_returned) > v_units_issued then
      raise exception 'SETTLEMENT_EXCEEDS_ISSUED';
    end if;

    update stock_issue_items
    set units_sold = v_units_sold,
        units_returned = v_units_returned
    where stock_issue_id = p_stock_issue_id
      and product_id = v_product_id;

    if v_units_returned > 0 then
      select inventory_balances.id, inventory_balances.quantity
        into v_balance_id, v_quantity_before
      from inventory_balances
      where inventory_balances.location_id = v_location_id
        and inventory_balances.product_id = v_product_id
      for update;

      if v_balance_id is null then
        v_quantity_before := 0;
        v_quantity_after := v_units_returned;

        insert into inventory_balances (
          location_id,
          product_id,
          quantity
        )
        values (
          v_location_id,
          v_product_id,
          v_quantity_after
        );
      else
        v_quantity_after := v_quantity_before + v_units_returned;

        update inventory_balances
        set quantity = v_quantity_after,
            updated_at = now()
        where id = v_balance_id;
      end if;

      insert into inventory_movements (
        location_id,
        product_id,
        session_id,
        movement_type,
        quantity_before,
        quantity_change,
        quantity_after,
        reference_type,
        reference_id,
        reason_code,
        reason,
        created_by
      )
      values (
        v_location_id,
        v_product_id,
        v_session_id,
        'stock_returned',
        v_quantity_before,
        v_units_returned,
        v_quantity_after,
        'stock_issue',
        p_stock_issue_id,
        'stock_returned_from_seller',
        'Stock returned by ' || v_seller_name,
        v_user_id
      );
    end if;
  end loop;

  update stock_issues
  set status = 'settled',
      settled_by = v_user_id,
      settled_at = now(),
      settlement_notes = nullif(trim(coalesce(p_notes, '')), '')
  where id = p_stock_issue_id;

  insert into audit_logs (
    user_id,
    location_id,
    session_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values,
    reason
  )
  values (
    v_user_id,
    v_location_id,
    v_session_id,
    'stock_issue_settled',
    'stock_issue',
    p_stock_issue_id,
    null,
    jsonb_build_object('items', p_items),
    nullif(trim(coalesce(p_notes, '')), '')
  );

  return p_stock_issue_id;
end;
$$;

grant execute on function public.settle_stock_issue(uuid, jsonb, text) to authenticated;

-- foreign keys so PostgREST can resolve embedded relationships
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'stock_issues_location_id_fkey'
  ) then
    alter table public.stock_issues
      add constraint stock_issues_location_id_fkey
      foreign key (location_id) references public.locations(id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'stock_issues_session_id_fkey'
  ) then
    alter table public.stock_issues
      add constraint stock_issues_session_id_fkey
      foreign key (session_id) references public.daily_sessions(id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'stock_issues_issued_by_fkey'
  ) then
    alter table public.stock_issues
      add constraint stock_issues_issued_by_fkey
      foreign key (issued_by) references public.profiles(id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'stock_issues_settled_by_fkey'
  ) then
    alter table public.stock_issues
      add constraint stock_issues_settled_by_fkey
      foreign key (settled_by) references public.profiles(id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'stock_issue_items_product_id_fkey'
  ) then
    alter table public.stock_issue_items
      add constraint stock_issue_items_product_id_fkey
      foreign key (product_id) references public.products(id);
  end if;
end;
$$;