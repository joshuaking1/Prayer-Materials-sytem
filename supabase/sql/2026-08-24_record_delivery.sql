create or replace function public.record_delivery(
  p_invoice_number text,
  p_invoice_date date,
  p_supplier text default null,
  p_items jsonb default '[]'::jsonb,
  p_notes text default null,
  p_idempotency_key text default null
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
  v_delivery_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_boxes integer;
  v_loose_units integer;
  v_units_per_box integer;
  v_total_units integer;
  v_balance_id uuid;
  v_quantity_before integer;
  v_quantity_after integer;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select profiles.location_id
    into v_location_id
  from profiles
  where profiles.id = v_user_id
    and profiles.is_active = true;

  if v_location_id is null then
    raise exception 'NO_LOCATION_ASSIGNED';
  end if;

  select daily_sessions.id
    into v_session_id
  from daily_sessions
  where daily_sessions.location_id = v_location_id
    and daily_sessions.business_date = current_date
    and daily_sessions.status in ('open', 'reopened')
  order by daily_sessions.opened_at desc
  limit 1;

  if v_session_id is null then
    raise exception 'NO_OPEN_DAILY_SESSION';
  end if;

  if nullif(trim(p_invoice_number), '') is null then
    raise exception 'INVOICE_NUMBER_REQUIRED';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'DELIVERY_ITEMS_REQUIRED';
  end if;

  insert into deliveries (
    invoice_number,
    invoice_date,
    location_id,
    session_id,
    supplier,
    status,
    notes,
    received_by,
    received_at,
    submitted_at,
    approved_by,
    approved_at
  )
  values (
    trim(p_invoice_number),
    p_invoice_date,
    v_location_id,
    v_session_id,
    nullif(trim(coalesce(p_supplier, '')), ''),
    'approved',
    nullif(trim(coalesce(p_notes, '')), ''),
    v_user_id,
    now(),
    now(),
    v_user_id,
    now()
  )
  returning id into v_delivery_id;

  for v_item in
    select value from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_boxes := coalesce((v_item ->> 'boxes')::integer, 0);
    v_loose_units := coalesce((v_item ->> 'loose_units')::integer, 0);

    if v_product_id is null or v_boxes < 0 or v_loose_units < 0 or (v_boxes + v_loose_units) <= 0 then
      raise exception 'INVALID_DELIVERY_ITEM';
    end if;

    if not exists (
      select 1
      from products
      where products.id = v_product_id
        and products.is_active = true
    ) then
      raise exception 'INVALID_PRODUCT';
    end if;

    select product_packaging_history.units_per_box
      into v_units_per_box
    from product_packaging_history
    where product_packaging_history.product_id = v_product_id
      and product_packaging_history.effective_to is null
    order by product_packaging_history.effective_from desc
    limit 1;

    if v_units_per_box is null or v_units_per_box <= 0 then
      raise exception 'PACKAGING_NOT_FOUND';
    end if;

    v_total_units := (v_boxes * v_units_per_box) + v_loose_units;

    insert into delivery_items (
      delivery_id,
      product_id,
      boxes,
      loose_units,
      units_per_box_snapshot
    )
    values (
      v_delivery_id,
      v_product_id,
      v_boxes,
      v_loose_units,
      v_units_per_box
    );

    select inventory_balances.id, inventory_balances.quantity
      into v_balance_id, v_quantity_before
    from inventory_balances
    where inventory_balances.location_id = v_location_id
      and inventory_balances.product_id = v_product_id
    for update;

    if v_balance_id is null then
      v_quantity_before := 0;
      v_quantity_after := v_total_units;

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
      v_quantity_after := v_quantity_before + v_total_units;

      update inventory_balances
      set quantity = v_quantity_after,
          updated_at = now()
      where inventory_balances.id = v_balance_id;
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
      'received',
      v_quantity_before,
      v_total_units,
      v_quantity_after,
      'delivery',
      v_delivery_id,
      'received_materials',
      'Delivery invoice ' || trim(p_invoice_number),
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
    reason,
    metadata
  )
  values (
    v_user_id,
    v_location_id,
    v_session_id,
    'delivery_created',
    'delivery',
    v_delivery_id,
    null,
    jsonb_build_object(
      'invoice_number', trim(p_invoice_number),
      'invoice_date', p_invoice_date,
      'supplier', nullif(trim(coalesce(p_supplier, '')), ''),
      'items', p_items
    ),
    nullif(trim(coalesce(p_notes, '')), ''),
    jsonb_build_object(
      'idempotency_key', p_idempotency_key
    )
  );

  return v_delivery_id;
end;
$$;

grant execute on function public.record_delivery(text, date, text, jsonb, text, text) to authenticated;
