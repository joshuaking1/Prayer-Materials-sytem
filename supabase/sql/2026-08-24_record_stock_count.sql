create or replace function public.record_stock_count(
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
  v_stock_count_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_boxes_counted integer;
  v_loose_units_counted integer;
  v_units_per_box integer;
  v_expected_quantity integer;
  v_actual_quantity integer;
  v_difference integer;
  v_stock_count_item_id uuid;
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

  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'STOCK_COUNT_ITEMS_REQUIRED';
  end if;

  insert into stock_counts (
    location_id,
    session_id,
    count_type,
    status,
    started_by,
    started_at,
    submitted_at,
    notes
  )
  values (
    v_location_id,
    v_session_id,
    'full',
    'submitted',
    v_user_id,
    now(),
    now(),
    nullif(trim(coalesce(p_notes, '')), '')
  )
  returning id into v_stock_count_id;

  for v_item in
    select value from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_boxes_counted := coalesce((v_item ->> 'boxes_counted')::integer, 0);
    v_loose_units_counted := coalesce((v_item ->> 'loose_units_counted')::integer, 0);

    if v_product_id is null or v_boxes_counted < 0 or v_loose_units_counted < 0 then
      raise exception 'INVALID_STOCK_COUNT_ITEM';
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

    select coalesce(inventory_balances.quantity, 0) into v_expected_quantity
    from inventory_balances
    where inventory_balances.location_id = v_location_id
      and inventory_balances.product_id = v_product_id;

    v_expected_quantity := coalesce(v_expected_quantity, 0);
    v_actual_quantity := (v_boxes_counted * v_units_per_box) + v_loose_units_counted;
    v_difference := v_actual_quantity - v_expected_quantity;

    insert into stock_count_items (
      stock_count_id,
      product_id,
      expected_quantity,
      boxes_counted,
      loose_units_counted,
      units_per_box_snapshot,
      actual_quantity,
      difference,
      counted_at
    )
    values (
      v_stock_count_id,
      v_product_id,
      v_expected_quantity,
      v_boxes_counted,
      v_loose_units_counted,
      v_units_per_box,
      v_actual_quantity,
      v_difference,
      now()
    )
    returning id into v_stock_count_item_id;

    if v_difference <> 0 then
      insert into stock_discrepancies (
        stock_count_item_id,
        location_id,
        product_id,
        session_id,
        expected_quantity,
        actual_quantity,
        difference,
        provisional_reason_code,
        provisional_notes,
        submitted_by,
        status
      )
      values (
        v_stock_count_item_id,
        v_location_id,
        v_product_id,
        v_session_id,
        v_expected_quantity,
        v_actual_quantity,
        v_difference,
        'needs_review',
        nullif(trim(coalesce(p_notes, '')), ''),
        v_user_id,
        'pending'
      );
    end if;
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
    'stock_count_submitted',
    'stock_count',
    v_stock_count_id,
    null,
    jsonb_build_object('items', p_items),
    nullif(trim(coalesce(p_notes, '')), '')
  );

  return v_stock_count_id;
end;
$$;

grant execute on function public.record_stock_count(jsonb, text) to authenticated;
