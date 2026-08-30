alter type public.inventory_movement_type add value if not exists 'sale_cancelled';

create or replace function public.approve_sale_cancellation(
  p_approval_id uuid,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_sale_id uuid;
  v_location_id uuid;
  v_session_id uuid;
  v_item record;
  v_balance_id uuid;
  v_quantity_before integer;
  v_quantity_after integer;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select profiles.role into v_role
  from profiles
  where profiles.id = v_user_id
    and profiles.is_active = true;

  if v_role not in ('supervisor', 'administrator') then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select approvals.entity_id
    into v_sale_id
  from approvals
  where approvals.id = p_approval_id
    and approvals.entity_type = 'sale'
    and approvals.action_type = 'cancel_sale'
    and approvals.status = 'pending'
  for update;

  if v_sale_id is null then
    raise exception 'APPROVAL_NOT_FOUND';
  end if;

  select sales.location_id, sales.session_id
    into v_location_id, v_session_id
  from sales
  where sales.id = v_sale_id
    and sales.status = 'completed'
  for update;

  if v_location_id is null then
    raise exception 'SALE_NOT_FOUND';
  end if;

  for v_item in
    select sale_items.product_id, sale_items.quantity
    from sale_items
    where sale_items.sale_id = v_sale_id
  loop
    select inventory_balances.id, inventory_balances.quantity
      into v_balance_id, v_quantity_before
    from inventory_balances
    where inventory_balances.location_id = v_location_id
      and inventory_balances.product_id = v_item.product_id
    for update;

    if v_balance_id is null then
      v_quantity_before := 0;
      v_quantity_after := v_item.quantity;

      insert into inventory_balances (
        location_id,
        product_id,
        quantity
      )
      values (
        v_location_id,
        v_item.product_id,
        v_quantity_after
      );
    else
      v_quantity_after := v_quantity_before + v_item.quantity;

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
      created_by,
      approved_by
    )
    values (
      v_location_id,
      v_item.product_id,
      v_session_id,
      'sale_cancelled',
      v_quantity_before,
      v_item.quantity,
      v_quantity_after,
      'sale',
      v_sale_id,
      'sale_cancellation',
      'Sale cancellation approved',
      v_user_id,
      v_user_id
    );
  end loop;

  update sales
  set status = 'cancelled',
      cancelled_at = now(),
      cancelled_by = v_user_id,
      cancellation_reason = coalesce(
        nullif(trim(coalesce(p_notes, '')), ''),
        cancellation_reason,
        'Cancellation approved'
      )
  where id = v_sale_id;

  update approvals
  set status = 'approved',
      reviewed_by = v_user_id,
      reviewed_at = now(),
      review_notes = nullif(trim(coalesce(p_notes, '')), '')
  where id = p_approval_id;

  insert into audit_logs (
    user_id,
    location_id,
    session_id,
    action,
    entity_type,
    entity_id,
    new_values,
    reason
  )
  values (
    v_user_id,
    v_location_id,
    v_session_id,
    'sale_cancellation_approved',
    'sale',
    v_sale_id,
    jsonb_build_object('approval_id', p_approval_id),
    nullif(trim(coalesce(p_notes, '')), '')
  );

  return v_sale_id;
end;
$$;

grant execute on function public.approve_sale_cancellation(uuid, text) to authenticated;
