alter type public.approval_status add value if not exists 'recorded';
alter type public.cash_count_status add value if not exists 'balanced';
alter type public.cash_count_status add value if not exists 'minor_difference';
alter type public.cash_count_status add value if not exists 'needs_review';

create or replace function public.get_cash_overview()
returns table (
  expected_cash numeric,
  counted_cash numeric,
  transferred_cash numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_location_id uuid;
  v_session_id uuid;
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

  return query
  select
    coalesce((
      select sum(sales.total)
      from sales
      where sales.location_id = v_location_id
        and (v_session_id is null or sales.session_id = v_session_id)
        and sales.status = 'completed'
    ), 0)
    -
    coalesce((
      select sum(cash_transfers.amount)
      from cash_transfers
      where cash_transfers.location_id = v_location_id
        and (v_session_id is null or cash_transfers.session_id = v_session_id)
        and cash_transfers.status in ('recorded', 'approved')
    ), 0) as expected_cash,
    coalesce((
      select cash_counts.actual_cash
      from cash_counts
      where cash_counts.location_id = v_location_id
        and (v_session_id is null or cash_counts.session_id = v_session_id)
      order by cash_counts.created_at desc
      limit 1
    ), 0) as counted_cash,
    coalesce((
      select sum(cash_transfers.amount)
      from cash_transfers
      where cash_transfers.location_id = v_location_id
        and (v_session_id is null or cash_transfers.session_id = v_session_id)
        and cash_transfers.status in ('recorded', 'approved')
    ), 0) as transferred_cash;
end;
$$;

create or replace function public.record_cash_count(
  p_denominations jsonb default '[]'::jsonb,
  p_other_coins numeric default 0,
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
  v_cash_count_id uuid;
  v_item jsonb;
  v_denomination numeric;
  v_quantity integer;
  v_actual_cash numeric := coalesce(p_other_coins, 0);
  v_expected_cash numeric := 0;
  v_difference numeric;
  v_status cash_count_status;
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

  if jsonb_typeof(p_denominations) is distinct from 'array' then
    raise exception 'INVALID_DENOMINATIONS';
  end if;

  for v_item in select value from jsonb_array_elements(p_denominations)
  loop
    v_denomination := coalesce((v_item ->> 'denomination')::numeric, 0);
    v_quantity := coalesce((v_item ->> 'count')::integer, 0);

    if v_denomination <= 0 or v_quantity < 0 then
      raise exception 'INVALID_DENOMINATION';
    end if;

    v_actual_cash := v_actual_cash + (v_denomination * v_quantity);
  end loop;

  select expected_cash into v_expected_cash
  from public.get_cash_overview()
  limit 1;

  v_expected_cash := coalesce(v_expected_cash, 0);
  v_difference := v_actual_cash - v_expected_cash;
  v_status := case
    when v_difference = 0 then 'balanced'::cash_count_status
    when abs(v_difference) <= 5 then 'minor_difference'::cash_count_status
    else 'needs_review'::cash_count_status
  end;

  insert into cash_counts (
    location_id,
    session_id,
    expected_cash,
    actual_cash,
    status,
    is_final,
    counted_by,
    notes
  )
  values (
    v_location_id,
    v_session_id,
    v_expected_cash,
    v_actual_cash,
    v_status,
    true,
    v_user_id,
    nullif(trim(coalesce(p_notes, '')), '')
  )
  returning id into v_cash_count_id;

  for v_item in select value from jsonb_array_elements(p_denominations)
  loop
    v_denomination := coalesce((v_item ->> 'denomination')::numeric, 0);
    v_quantity := coalesce((v_item ->> 'count')::integer, 0);

    insert into cash_count_denominations (
      cash_count_id,
      denomination,
      quantity
    )
    values (
      v_cash_count_id,
      v_denomination,
      v_quantity
    );
  end loop;

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
    'cash_count_recorded',
    'cash_count',
    v_cash_count_id,
    jsonb_build_object(
      'expected_cash', v_expected_cash,
      'actual_cash', v_actual_cash,
      'difference', v_difference,
      'status', v_status
    ),
    nullif(trim(coalesce(p_notes, '')), '')
  );

  return v_cash_count_id;
end;
$$;

create or replace function public.record_cash_transfer(
  p_amount numeric,
  p_destination text,
  p_method text,
  p_reference text default null,
  p_transfer_date date default null,
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
  v_transfer_id uuid;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  if nullif(trim(coalesce(p_destination, '')), '') is null then
    raise exception 'DESTINATION_REQUIRED';
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

  insert into cash_transfers (
    location_id,
    session_id,
    amount,
    destination,
    method,
    reference,
    notes,
    status,
    recorded_by,
    recorded_at,
    approved_by,
    approved_at
  )
  values (
    v_location_id,
    v_session_id,
    p_amount,
    trim(p_destination),
    trim(p_method),
    nullif(trim(coalesce(p_reference, '')), ''),
    nullif(trim(coalesce(p_notes, '')), ''),
    'recorded',
    v_user_id,
    coalesce(p_transfer_date::timestamptz, now()),
    v_user_id,
    now()
  )
  returning id into v_transfer_id;

  insert into cash_movements (
    location_id,
    session_id,
    movement_type,
    amount,
    reference_type,
    reference_id,
    description,
    created_by,
    approved_by
  )
  values (
    v_location_id,
    v_session_id,
    'transfer_out',
    -p_amount,
    'cash_transfer',
    v_transfer_id,
    'Cash transferred to ' || trim(p_destination),
    v_user_id,
    v_user_id
  );

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
    'cash_transfer_recorded',
    'cash_transfer',
    v_transfer_id,
    jsonb_build_object(
      'amount', p_amount,
      'destination', trim(p_destination),
      'method', trim(p_method),
      'reference', nullif(trim(coalesce(p_reference, '')), '')
    ),
    nullif(trim(coalesce(p_notes, '')), '')
  );

  return v_transfer_id;
end;
$$;

create or replace function public.close_daily_session(
  p_notes text default null,
  p_exception_reason text default null
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
  v_business_date date;
  v_closing_id uuid;
  v_sales_total numeric := 0;
  v_cash_sales_total numeric := 0;
  v_expected_cash numeric := 0;
  v_actual_cash numeric := 0;
  v_cash_difference numeric := 0;
  v_total_units_sold integer := 0;
  v_stock_difference integer := 0;
  v_stock_issues integer := 0;
  v_cash_issues integer := 0;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select profiles.role, profiles.location_id into v_role, v_location_id
  from profiles
  where profiles.id = v_user_id
    and profiles.is_active = true;

  if v_location_id is null then
    raise exception 'NO_LOCATION_ASSIGNED';
  end if;

  if v_role not in ('supervisor', 'administrator') then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select daily_sessions.id, daily_sessions.business_date
    into v_session_id, v_business_date
  from daily_sessions
  where daily_sessions.location_id = v_location_id
    and daily_sessions.business_date = current_date
    and daily_sessions.status in ('open', 'reopened')
  order by daily_sessions.opened_at desc
  limit 1;

  if v_session_id is null then
    raise exception 'NO_OPEN_DAILY_SESSION';
  end if;

  select coalesce(sum(total), 0) into v_sales_total
  from sales
  where session_id = v_session_id
    and status = 'completed';

  select coalesce(sum(total), 0) into v_cash_sales_total
  from sales
  where session_id = v_session_id
    and status = 'completed';

  select coalesce(sum(sale_items.quantity), 0) into v_total_units_sold
  from sale_items
  join sales on sales.id = sale_items.sale_id
  where sales.session_id = v_session_id
    and sales.status = 'completed';

  select
    coalesce(cash_counts.expected_cash, 0),
    coalesce(cash_counts.actual_cash, 0),
    coalesce(cash_counts.difference, 0)
  into v_expected_cash, v_actual_cash, v_cash_difference
  from cash_counts
  where cash_counts.session_id = v_session_id
  order by cash_counts.created_at desc
  limit 1;

  v_expected_cash := coalesce(v_expected_cash, 0);
  v_actual_cash := coalesce(v_actual_cash, 0);
  v_cash_difference := coalesce(v_cash_difference, 0);

  select coalesce(sum(abs(difference)), 0), count(*)
    into v_stock_difference, v_stock_issues
  from stock_discrepancies
  where session_id = v_session_id
    and status = 'pending';

  select count(*) into v_cash_issues
  from cash_counts
  where session_id = v_session_id
    and status = 'needs_review';

  insert into daily_closings (
    session_id,
    location_id,
    business_date,
    sales_total,
    cash_sales_total,
    expected_cash,
    actual_cash,
    cash_difference,
    total_units_sold,
    total_stock_difference,
    unresolved_stock_discrepancies,
    unresolved_cash_issues,
    exception_approved,
    exception_reason,
    closed_by,
    approved_by,
    closed_at,
    snapshot
  )
  values (
    v_session_id,
    v_location_id,
    v_business_date,
    v_sales_total,
    v_cash_sales_total,
    v_expected_cash,
    v_actual_cash,
    v_cash_difference,
    v_total_units_sold,
    v_stock_difference,
    v_stock_issues,
    v_cash_issues,
    (v_stock_issues > 0 or v_cash_issues > 0),
    nullif(trim(coalesce(p_exception_reason, '')), ''),
    v_user_id,
    v_user_id,
    now(),
    jsonb_build_object(
      'notes', nullif(trim(coalesce(p_notes, '')), ''),
      'closed_at', now()
    )
  )
  returning id into v_closing_id;

  update daily_sessions
  set status = 'closed',
      closed_by = v_user_id,
      closed_at = now(),
      close_notes = nullif(trim(coalesce(p_notes, '')), ''),
      updated_at = now()
  where id = v_session_id;

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
    'daily_session_closed',
    'daily_closing',
    v_closing_id,
    jsonb_build_object(
      'sales_total', v_sales_total,
      'expected_cash', v_expected_cash,
      'actual_cash', v_actual_cash,
      'cash_difference', v_cash_difference,
      'stock_issues', v_stock_issues,
      'cash_issues', v_cash_issues
    ),
    nullif(trim(coalesce(p_notes, '')), '')
  );

  return v_closing_id;
end;
$$;

grant execute on function public.get_cash_overview() to authenticated;
grant execute on function public.record_cash_count(jsonb, numeric, text) to authenticated;
grant execute on function public.record_cash_transfer(numeric, text, text, text, date, text) to authenticated;
grant execute on function public.close_daily_session(text, text) to authenticated;
