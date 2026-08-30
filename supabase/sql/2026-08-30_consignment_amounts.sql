-- 2026-08-30 consignment amounts: snapshot selling price so settlement can
-- compute the money owed for sold units, and support loose units alongside boxes.

alter table public.stock_issue_items
  add column if not exists selling_price_snapshot numeric(12, 2) not null default 0;

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
  v_selling_price numeric;
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

    select product_prices.selling_price into v_selling_price
    from product_prices
    where product_prices.product_id = v_product_id
      and product_prices.effective_to is null
    order by product_prices.effective_from desc
    limit 1;

    if v_selling_price is null or v_selling_price < 0 then
      raise exception 'PRICE_NOT_FOUND';
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
      units_issued,
      selling_price_snapshot
    )
    values (
      v_issue_id,
      v_product_id,
      v_units_per_box,
      v_units,
      v_selling_price
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