-- 2026-08-30 reset system: wipe all business data, keep administrator accounts

create or replace function public.reset_system(
  p_confirmation text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_profile_location_id uuid;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select profiles.role, profiles.location_id
    into v_role, v_profile_location_id
  from profiles
  where profiles.id = v_user_id
    and profiles.is_active = true;

  if v_role is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if v_role <> 'administrator' then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if coalesce(upper(trim(coalesce(p_confirmation, ''))), '') <> 'RESET' then
    raise exception 'WRONG_CONFIRMATION';
  end if;

  truncate table
    public.stock_issue_items,
    public.stock_issues,
    public.stock_count_items,
    public.stock_counts,
    public.stock_discrepancies,
    public.sale_items,
    public.sales,
    public.delivery_items,
    public.deliveries,
    public.cash_count_denominations,
    public.cash_counts,
    public.cash_movements,
    public.cash_transfers,
    public.inventory_movements,
    public.inventory_balances,
    public.approvals,
    public.audit_logs,
    public.daily_closings,
    public.daily_sessions,
    public.product_prices,
    public.product_packaging_history,
    public.products
  restart identity
  cascade;

  alter sequence if exists public.stock_issue_seq restart with 1;

  delete from public.profiles
  where role <> 'administrator';

  insert into public.audit_logs (
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
    v_profile_location_id,
    null,
    'system_reset',
    'system',
    null,
    null,
    jsonb_build_object('reset', true),
    'System reset by administrator'
  );

  return 'RESET_COMPLETE';
end;
$$;

grant execute on function public.reset_system(text) to authenticated;