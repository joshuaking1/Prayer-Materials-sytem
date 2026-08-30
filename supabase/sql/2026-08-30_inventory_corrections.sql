alter type public.inventory_movement_type add value if not exists 'stock_adjustment';

create or replace function public.correct_inventory_quantity(
  p_product_id uuid,
  p_correct_quantity integer,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_location_id uuid;
  v_session_id uuid;
  v_balance_id uuid;
  v_quantity_before integer := 0;
  v_quantity_after integer := p_correct_quantity;
  v_quantity_change integer;
  v_movement_id uuid;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_product_id is null then
    raise exception 'PRODUCT_REQUIRED';
  end if;

  if p_correct_quantity is null or p_correct_quantity < 0 then
    raise exception 'INVALID_QUANTITY';
  end if;

  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'REASON_REQUIRED';
  end if;

  select profiles.role, profiles.location_id
    into v_role, v_location_id
  from profiles
  where profiles.id = v_user_id
    and profiles.is_active = true;

  if v_location_id is null then
    raise exception 'NO_LOCATION_ASSIGNED';
  end if;

  if v_role not in ('supervisor', 'administrator') then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if not exists (
    select 1
    from products
    where products.id = p_product_id
  ) then
    raise exception 'INVALID_PRODUCT';
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

  select inventory_balances.id, inventory_balances.quantity
    into v_balance_id, v_quantity_before
  from inventory_balances
  where inventory_balances.location_id = v_location_id
    and inventory_balances.product_id = p_product_id
  for update;

  v_quantity_before := coalesce(v_quantity_before, 0);
  v_quantity_change := v_quantity_after - v_quantity_before;

  if v_balance_id is null then
    insert into inventory_balances (
      location_id,
      product_id,
      quantity
    )
    values (
      v_location_id,
      p_product_id,
      v_quantity_after
    );
  else
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
    reason_code,
    reason,
    created_by,
    approved_by
  )
  values (
    v_location_id,
    p_product_id,
    v_session_id,
    'stock_adjustment',
    v_quantity_before,
    v_quantity_change,
    v_quantity_after,
    'manual_correction',
    'inventory_correction',
    trim(p_reason),
    v_user_id,
    v_user_id
  )
  returning id into v_movement_id;

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
    'inventory_quantity_corrected',
    'product',
    p_product_id,
    jsonb_build_object('quantity', v_quantity_before),
    jsonb_build_object(
      'quantity', v_quantity_after,
      'quantity_change', v_quantity_change,
      'movement_id', v_movement_id
    ),
    trim(p_reason)
  );

  return v_movement_id;
end;
$$;

grant execute on function public.correct_inventory_quantity(uuid, integer, text) to authenticated;
